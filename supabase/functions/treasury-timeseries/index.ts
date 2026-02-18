import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const supabaseAuth = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const dbUrl = Deno.env.get("TREASURY_DB_URL");
  if (!dbUrl) {
    return new Response("Missing TREASURY_DB_URL", { status: 500, headers: corsHeaders });
  }

  const ah = req.headers.get("Authorization") || "";
  if (!ah.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Missing Authorization" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const tk = ah.replace("Bearer ", "");
  const { data: ud, error: ue } = await supabaseAuth.auth.getUser(tk);
  if (ue || !ud?.user) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = ud.user.id;

  const reqUrl = new URL(req.url);
  let clientCode: string | null = reqUrl.searchParams.get("client_code");
  let fromDate: string | null = reqUrl.searchParams.get("from");
  let toDate: string | null = reqUrl.searchParams.get("to");

  if (req.method !== "GET") {
    const rawBody = await req.text();
    if (rawBody) {
      try {
        const body = JSON.parse(rawBody);
        if (!clientCode) clientCode = body.client_code || body.query?.client_code || null;
        if (!fromDate) fromDate = body.from || body.query?.from || null;
        if (!toDate) toDate = body.to || body.query?.to || null;
      } catch (_e) { /* noop */ }
    }
  }

  const pgClient = new Client(dbUrl);
  try {
    await pgClient.connect();

    const ar = await pgClient.queryObject(
      "SELECT DISTINCT ci.client_code FROM erp_core.user_company_memberships ucm JOIN erp_core.companies c ON c.id = ucm.company_id JOIN erp_core.company_integrations ci ON ci.company_id = c.id AND ci.is_active = true WHERE ucm.user_id = $1 AND ucm.is_active = true",
      [userId]
    );
    const allowed: string[] = [];
    for (const r of ar.rows) {
      const row = r as Record<string, unknown>;
      if (typeof row.client_code === "string") allowed.push(row.client_code);
    }
    if (allowed.length === 0) {
      return new Response(JSON.stringify({ error: "No client access" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (clientCode && !allowed.includes(clientCode)) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const targets = clientCode ? [clientCode] : allowed;

    let text = "SELECT client_code, snapshot_date, sum(balance) as balance, max(currency) as currency FROM erp_core.v_treasury_timeseries WHERE client_code = ANY($1)";
    const args: unknown[] = [targets];
    let idx = 2;

    if (fromDate) {
      text += " AND snapshot_date >= $" + idx++;
      args.push(fromDate);
    }
    if (toDate) {
      text += " AND snapshot_date <= $" + idx++;
      args.push(toDate);
    }
    text += " GROUP BY client_code, snapshot_date ORDER BY snapshot_date ASC, client_code";

    const result = await pgClient.queryObject({ text, args });

    console.log("[treasury-timeseries] rows:", result.rows.length, "user:", userId, "clients:", targets.join(","));

    return new Response(JSON.stringify(result.rows), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[treasury-timeseries] error", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } finally {
    try { await pgClient.end(); } catch (_e) { /* noop */ }
  }
});
