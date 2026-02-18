// supabase/functions/admin-tax-filing-upsert/index.ts
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

function pick<T = unknown>(obj: Record<string, unknown>, keys: string[]): T | undefined {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k] as T;
  }
  return undefined;
}

function isString(x: unknown): x is string {
  return typeof x === "string";
}

function normalizeDate(input: unknown): string | null {
  if (input === null || input === undefined || input === "") return null;
  if (!isString(input)) return null;

  const s = input.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;

  const t = Date.parse(s);
  if (!Number.isNaN(t)) return new Date(t).toISOString().slice(0, 10);

  return null;
}

function normalizeTimestamptz(input: unknown): string | null {
  if (input === null || input === undefined || input === "") return null;
  if (!isString(input)) return null;

  const s = input.trim();
  if (s.includes("--:--")) return null;

  const t = Date.parse(s);
  if (!Number.isNaN(t)) return new Date(t).toISOString();

  const d = normalizeDate(s);
  if (d) return new Date(`${d}T00:00:00.000Z`).toISOString();

  return null;
}

/**
 * Enum BD (tax_filing_status): DRAFT, PRESENTED, SETTLED
 */
function normalizeStatusToEnum(input: unknown): string | null {
  if (input === null || input === undefined) return null;
  if (!isString(input)) return null;

  const raw = input.trim();
  const up = raw.toUpperCase();

  const map: Record<string, string> = {
    DRAFT: "DRAFT",
    PRESENTED: "PRESENTED",
    SETTLED: "SETTLED",

    BORRADOR: "DRAFT",
    PRESENTADO: "PRESENTED",
    CERRADO: "SETTLED",
    PAGADO: "SETTLED",

    CLOSED: "SETTLED",
    PAID: "SETTLED",
    "SETTLED/PAID": "SETTLED",
  };

  return map[up] ?? raw;
}

/**
 * Enum BD (tax_filing_result): PAYABLE, COMPENSABLE, REFUNDABLE, ZERO
 */
function normalizeResultToEnum(input: unknown): string | null {
  if (input === null || input === undefined) return null;
  if (!isString(input)) return null;

  const raw = input.trim();
  const up = raw.toUpperCase();

  const map: Record<string, string> = {
    PAYABLE: "PAYABLE",
    COMPENSABLE: "COMPENSABLE",
    REFUNDABLE: "REFUNDABLE",
    ZERO: "ZERO",

    "A PAGAR": "PAYABLE",
    A_PAGAR: "PAYABLE",
    APAGAR: "PAYABLE",

    "A DEVOLVER": "REFUNDABLE",
    A_DEVOLVER: "REFUNDABLE",
    ADEVOLVER: "REFUNDABLE",

    "A COMPENSAR": "COMPENSABLE",
    A_COMPENSAR: "COMPENSABLE",
    ACOMPENSAR: "COMPENSABLE",

    CERO: "ZERO",
    "0": "ZERO",
  };

  return map[up] ?? raw;
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

  // 2) Validar usuario con ANON (no service role)
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

  // 4) Parse JSON
  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Body JSON inválido" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const nowIso = new Date().toISOString();
  const incomingId = pick<string>(payload, ["id"]);
  const isInsert = !incomingId;

  const status = normalizeStatusToEnum(pick(payload, ["status", "estado"]));
  const result = normalizeResultToEnum(pick(payload, ["result", "resultado"]));

  const row: Record<string, unknown> = {
    id: incomingId ?? crypto.randomUUID(),

    client_code: pick<string>(payload, ["client_code", "clientCode", "client"]),
    tax_model_code: pick<string>(payload, [
      "tax_model_code",
      "taxModelCode",
      "tax_model",
      "taxModel",
      "model",
      "modelo_fiscal",
      "modeloFiscal",
    ]),

    period_start: normalizeDate(pick(payload, ["period_start", "periodStart", "inicio_periodo", "inicioDelPeriodo"])),
    period_end: normalizeDate(pick(payload, ["period_end", "periodEnd", "fin_periodo", "finDelPeriodo"])),

    status,
    result,

    amount: pick<number | string>(payload, ["amount", "importe"]),
    currency: pick<string>(payload, ["currency", "moneda"]),

    presented_at: normalizeTimestamptz(
      pick(payload, ["presented_at", "presentedAt", "fecha_presentacion", "fechaDePresentacion"]),
    ),
    settled_at: normalizeTimestamptz(
      pick(payload, ["settled_at", "settledAt", "fecha_cierre", "fechaDeCierre"]),
    ),

    reference: pick<string>(payload, ["reference", "referencia"]),
    notes: pick<string>(payload, ["notes", "notas"]),

    ...(isInsert ? { created_at: nowIso } : {}),
    updated_at: nowIso,
  };

  const missing: string[] = [];
  const must = ["client_code", "tax_model_code", "period_start", "period_end", "status", "result", "amount", "currency"];
  for (const k of must) {
    if (row[k] === undefined || row[k] === null || row[k] === "") missing.push(k);
  }

  if (missing.length) {
    return new Response(
      JSON.stringify({
        error: "Faltan campos requeridos",
        missing,
        received_keys: Object.keys(payload),
        normalized: { status, result },
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // 5) Upsert con service role
  const { data, error } = await supabaseSrv
    .from("tax_filings")
    .upsert(row, { onConflict: "id" })
    .select("*")
    .maybeSingle();

  if (error) {
    return new Response(
      JSON.stringify({
        error: error.message,
        details: (error as any).details ?? null,
        hint: (error as any).hint ?? null,
        code: (error as any).code ?? null,
        sent_row: row,
        received_keys: Object.keys(payload),
        normalized: { status, result },
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
