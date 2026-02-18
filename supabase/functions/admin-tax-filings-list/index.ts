// supabase/functions/admin-tax-filings-list/index.ts
// SECURED: verify_jwt=true + existing internal auth validation preserved
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const ALLOWED_ORIGINS = new Set([
  "https://preview--clientesfinaptico.com.lovable.app",
  "https://lovable.dev",
  "http://localhost:3000",
  "http://localhost:5173",
]);

function buildCorsHeaders(req: Request) {
  const origin = req.headers.get("origin");
  const allowOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : "null";

  const requestedHeaders = req.headers.get("access-control-request-headers");
  const baseHeaders = [
    "authorization",
    "apikey",
    "content-type",
    "x-client-info",
    "accept",
    "prefer",
    "x-supabase-auth",
    "x-supabase-client-platform",
    "x-supabase-client-info",
    "x-supabase-client-version",
  ].join(", ");

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": requestedHeaders ? requestedHeaders : baseHeaders,
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin, Access-Control-Request-Headers",
  };
}

function labelStatus(status: unknown): string {
  const s = typeof status === "string" ? status.trim().toUpperCase() : "";
  const map: Record<string, string> = {
    DRAFT: "Borrador",
    PRESENTED: "Presentado",
    SETTLED: "Liquidado",
  };
  return map[s] ?? (typeof status === "string" ? status : "");
}

function labelResult(result: unknown): string {
  const r = typeof result === "string" ? result.trim().toUpperCase() : "";
  const map: Record<string, string> = {
    PAYABLE: "A pagar",
    REFUNDABLE: "A devolver",
    COMPENSABLE: "A compensar",
    ZERO: "Cero",
  };
  return map[r] ?? (typeof result === "string" ? result : "");
}

function getBearerToken(req: Request): string | null {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!auth) return null;
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método no permitido" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const origin = req.headers.get("origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return new Response(JSON.stringify({ error: "Origin no permitido" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Faltan secretos en la function" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 1) Exigir JWT (usuario logueado)
  const token = getBearerToken(req);
  if (!token) {
    return new Response(JSON.stringify({ error: "Falta Authorization Bearer token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 2) Verificar JWT con un cliente anon (NO service role)
  const supabaseAuth = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });

  const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "Token inválido o sesión caducada" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = userData.user.id;

  // 3) Comprobar admin_global en erp_core (con service role, pero validando por userId)
  const supabaseSrv = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: isAdminRow, error: isAdminErr } = await supabaseSrv
    .schema("erp_core")
    .rpc("is_admin_global", { p_user_id: userId })
    .maybeSingle();

  if (isAdminErr) {
    return new Response(JSON.stringify({ error: "No se pudo validar rol admin_global" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const isAdmin =
    (typeof isAdminRow === "boolean" && isAdminRow === true) ||
    (isAdminRow && typeof isAdminRow === "object" && (isAdminRow as any).is_admin_global === true);

  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 4) Query real (ya con service role)
  const { data, error } = await supabaseSrv
    .from("tax_filings")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rows = (data ?? []).map((r: Record<string, unknown>) => ({
    ...r,
    status_label: labelStatus(r["status"]),
    result_label: labelResult(r["result"]),
  }));

  return new Response(JSON.stringify(rows), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
