// supabase/functions/admin-tax-filing-delete/index.ts
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
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": requestedHeaders ? requestedHeaders : baseHeaders,
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin, Access-Control-Request-Headers",
  };
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

  if (req.method !== "POST") {
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

  // 1) Exigir JWT
  const token = getBearerToken(req);
  if (!token) {
    return new Response(JSON.stringify({ error: "Falta Authorization Bearer token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 2) Validar usuario con ANON
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

  // 3) Check admin_global
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

  // 4) Leer body
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Body JSON inválido" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const id = body["id"];
  if (typeof id !== "string" || !id) {
    return new Response(JSON.stringify({ error: "Falta id" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 5) Leer estado actual
  const { data: row, error: readErr } = await supabaseSrv
    .from("tax_filings")
    .select("id,status")
    .eq("id", id)
    .maybeSingle();

  if (readErr) {
    return new Response(JSON.stringify({ error: readErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!row) {
    // Idempotente
    return new Response(JSON.stringify({ ok: true, id, deleted: false, reason: "No existe" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 6) Solo se puede borrar si está en DRAFT
  if (row.status !== "DRAFT") {
    return new Response(
      JSON.stringify({ error: "Solo se puede eliminar en estado Borrador (DRAFT)", status: row.status }),
      {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // 7) Borrar
  const { error: delErr } = await supabaseSrv.from("tax_filings").delete().eq("id", id);

  if (delErr) {
    return new Response(JSON.stringify({ error: delErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, id, deleted: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
