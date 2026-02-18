import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Client as PgClient } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const supabaseAuth = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
);

const DB_URL = Deno.env.get("TREASURY_DB_URL") ?? Deno.env.get("DATABASE_URL");

const WIDGETS: Record<string, string> = {
  treasury_snapshot:
    "SELECT * FROM erp_core.v_dashboard_treasury_snapshot WHERE client_code = ANY($1)",
  treasury_client_totals:
    "SELECT * FROM erp_core.v_treasury_client_totals WHERE client_code = ANY($1) ORDER BY snapshot_date ASC",
  treasury_weekly_client_totals:
    "SELECT * FROM erp_core.v_treasury_weekly_client_totals WHERE client_code = ANY($1) ORDER BY week_start ASC",
  treasury_biweekly_client_totals:
    "SELECT * FROM erp_core.v_treasury_biweekly_client_totals WHERE client_code = ANY($1) ORDER BY period_start ASC",
  treasury_monthly_client_totals:
    "SELECT * FROM erp_core.v_treasury_monthly_client_totals WHERE client_code = ANY($1) ORDER BY month ASC LIMIT 12",
  revenue_12m:
    "SELECT * FROM erp_core.v_dashboard_revenue_12m WHERE client_code = ANY($1) ORDER BY month ASC",
  client_overview:
    "SELECT * FROM erp_core.v_dashboard_client_overview_current WHERE client_code = ANY($1)",
  fiscal_snapshot:
    "SELECT * FROM erp_core.v_fiscal_current_snapshot WHERE client_code = ANY($1)",
  fiscal_irpf_split:
    "SELECT * FROM erp_core.v_dashboard_fiscal_irpf_qtd_split WHERE client_code = ANY($1)",
  sales_invoices_pending:
    "SELECT * FROM erp_core.v_dashboard_sales_invoices_pending WHERE client_code = ANY($1) ORDER BY due_date ASC",
  tax_payments_settled:
    "SELECT id, tax_model_code, period_start, period_end, status, result, amount, currency, settled_at, notes FROM public.tax_filings WHERE client_code = ANY($1) AND status = 'SETTLED' AND result = 'PAYABLE' AND settled_at IS NOT NULL AND settled_at >= date_trunc('year', now()) AND settled_at < date_trunc('year', now()) + interval '1 year' ORDER BY settled_at DESC",
};

interface AuthContext {
  userId: string;
  allowedClientCodes: string[];
}

async function resolveAuth(
  req: Request,
  pg: PgClient
): Promise<AuthContext | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.replace("Bearer ", "");

  const {
    data: { user },
    error,
  } = await supabaseAuth.auth.getUser(token);

  if (error || !user) return null;

  const result = await pg.queryObject<{ client_code: string }>({
    text: `
      SELECT DISTINCT ci.client_code
      FROM erp_core.user_company_memberships ucm
      JOIN erp_core.companies c ON c.id = ucm.company_id
      JOIN erp_core.company_integrations ci
        ON ci.company_id = c.id AND ci.is_active = true
      WHERE ucm.user_id = $1
        AND ucm.is_active = true
    `,
    args: [user.id],
  });

  const codes = result.rows.map((r) => r.client_code);
  if (codes.length === 0) return null;

  return { userId: user.id, allowedClientCodes: codes };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  if (!DB_URL) {
    console.error("[dashboard] Missing DB_URL");
    return json({ error: "Server misconfigured" }, 500);
  }

  const pg = new PgClient(DB_URL);

  try {
    await pg.connect();

    const auth = await resolveAuth(req, pg);
    if (!auth) {
      return json({ error: "Unauthorized" }, 401);
    }

    let body: { widget?: string; client_code?: string };
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    const widgetName = body.widget;

    // Special case: my_clients returns allowed clients with display names
    // companies.display_name (NOT label)
    if (widgetName === "my_clients") {
      const result = await pg.queryObject({
        text: `
          SELECT DISTINCT ci.client_code AS code, c.display_name AS label
          FROM erp_core.user_company_memberships ucm
          JOIN erp_core.companies c ON c.id = ucm.company_id
          JOIN erp_core.company_integrations ci
            ON ci.company_id = c.id AND ci.is_active = true
          WHERE ucm.user_id = $1
            AND ucm.is_active = true
          ORDER BY ci.client_code
        `,
        args: [auth.userId],
      });

      console.log(`[dashboard] my_clients user=${auth.userId} rows=${result.rows.length}`);
      return json({ data: result.rows });
    }

    // Validate standard widget
    if (!widgetName || !WIDGETS[widgetName]) {
      return json({ error: `Unknown widget: ${widgetName}` }, 400);
    }

    // Resolve target
    let targetCodes: string[];
    if (body.client_code) {
      if (!auth.allowedClientCodes.includes(body.client_code)) {
        return json({ error: "Access denied" }, 403);
      }
      targetCodes = [body.client_code];
    } else {
      targetCodes = auth.allowedClientCodes;
    }

    const sql = WIDGETS[widgetName];
    const result = await pg.queryObject({
      text: sql,
      args: [targetCodes],
    });

    console.log(`[dashboard] ${widgetName} user=${auth.userId} clients=${targetCodes.join(",")} rows=${result.rows.length}`);
    return json({ data: result.rows });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[dashboard] ERROR: ${msg}`);
    return json({ error: "Internal server error" }, 500);
  } finally {
    try { await pg.end(); } catch { /* ignore */ }
  }
});
