import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Client as PgClient } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

type PeriodType = "monthly" | "quarterly" | "annual" | "one_off" | "custom";
type TaxEventStatus = "planned" | "done" | "postponed" | "cancelled";

interface CalendarTaxEvent {
  id: string;
  clientId: string;
  title: string;
  subtitle: string | null;
  eventDate: string;
  dueDate: string | null;
  period: { type: PeriodType | null; start: string | null; end: string | null };
  status: TaxEventStatus;
  modelCode: string | null;
  authority: string | null;
  flags: { isMandatory: boolean; isVisibleInCalendar: boolean };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("CORS_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-id, x-requested-with, x-lovable-secret, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

const supabaseAuth = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
);

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // 1. Validate JWT
  const ah = req.headers.get("Authorization") || "";
  if (!ah.startsWith("Bearer ")) {
    return jsonResponse({ error: "Missing Authorization header" }, 401);
  }
  const token = ah.replace("Bearer ", "");
  const { data: ud, error: ue } = await supabaseAuth.auth.getUser(token);
  if (ue || !ud?.user) {
    return jsonResponse({ error: "Invalid or expired token" }, 401);
  }
  const userId = ud.user.id;

  const url = new URL(req.url);
  const clientId = url.searchParams.get("client_id");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  if (!clientId) {
    return jsonResponse({ error: "Missing required parameter: client_id" }, 400);
  }

  // 2. Validate user has access to this client_id (via company memberships)
  const dbUrl = Deno.env.get("TREASURY_DB_URL") || Deno.env.get("DATABASE_URL");
  if (!dbUrl) return jsonResponse({ error: "Server misconfigured" }, 500);

  const pg = new PgClient(dbUrl);
  try {
    await pg.connect();

    // client_tax_events uses client_id (uuid FK to clients.id)
    // Validate: user -> memberships -> company -> clients.id matches client_id
    const accessCheck = await pg.queryObject(
      "SELECT COUNT(*)::int as cnt FROM erp_core.user_company_memberships ucm JOIN erp_core.companies c ON c.id = ucm.company_id JOIN erp_core.clients cl ON cl.id = $2 JOIN erp_core.company_integrations ci ON ci.company_id = c.id AND ci.is_active = true WHERE ucm.user_id = $1 AND ucm.is_active = true AND EXISTS (SELECT 1 FROM erp_core.client_tax_events cte WHERE cte.client_id = cl.id LIMIT 1)",
      [userId, clientId]
    );
    const cnt = (accessCheck.rows[0] as Record<string, unknown>)?.cnt;
    if (!cnt || cnt === 0) {
      return jsonResponse({ error: "Access denied to this client" }, 403);
    }

    // 3. Query tax events (using service_role via direct pg)
    let text = "SELECT * FROM erp_core.client_tax_events WHERE client_id = $1 AND is_visible_in_calendar = true";
    const args: unknown[] = [clientId];
    let idx = 2;
    if (from) {
      text += " AND event_date >= $" + idx++;
      args.push(from);
    }
    if (to) {
      text += " AND event_date <= $" + idx++;
      args.push(to);
    }
    text += " ORDER BY event_date ASC";

    const result = await pg.queryObject({ text, args });

    const events: CalendarTaxEvent[] = (result.rows as Array<Record<string, unknown>>).map((row) => {
      const modelPart = row.model_code ? "Modelo " + row.model_code : null;
      let periodPart: string | null = null;
      if (row.period_type) {
        const label = row.period_type === "monthly" ? "Mensual" : row.period_type === "quarterly" ? "Trimestral" : row.period_type === "annual" ? "Anual" : row.period_type === "one_off" ? "Puntual" : "Personalizado";
        if (row.period_start && row.period_end) {
          periodPart = label + " (" + row.period_start + " -> " + row.period_end + ")";
        } else {
          periodPart = label;
        }
      }
      const subtitleParts = [modelPart, periodPart].filter(Boolean);

      return {
        id: row.id as string,
        clientId: row.client_id as string,
        title: row.title as string,
        subtitle: subtitleParts.length > 0 ? subtitleParts.join(" · ") : null,
        eventDate: row.event_date as string,
        dueDate: (row.due_date as string) || null,
        period: {
          type: (row.period_type as PeriodType) || null,
          start: (row.period_start as string) || null,
          end: (row.period_end as string) || null,
        },
        status: row.status as TaxEventStatus,
        modelCode: (row.model_code as string) || null,
        authority: (row.authority as string) || null,
        flags: {
          isMandatory: row.is_mandatory as boolean,
          isVisibleInCalendar: row.is_visible_in_calendar as boolean,
        },
      };
    });

    return jsonResponse({ events });
  } catch (e) {
    console.error("[tax-events-feed] error:", e);
    return jsonResponse({ error: "Unexpected error", details: String(e) }, 500);
  } finally {
    try { await pg.end(); } catch (_e) { /* noop */ }
  }
});
