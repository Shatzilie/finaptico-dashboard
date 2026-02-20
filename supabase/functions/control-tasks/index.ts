import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Client as PgClient } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
);

const DB_URL = Deno.env.get("TREASURY_DB_URL") ?? Deno.env.get("DATABASE_URL");

// --- Auth ---

interface AuthContext {
  userId: string;
  isAdmin: boolean;
  allowedClientCodes: string[];
}

async function resolveAuth(req: Request, pg: PgClient): Promise<AuthContext | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await supabaseAuth.auth.getUser(token);
  if (error || !user) return null;

  // Check admin
  const adminResult = await pg.queryObject<{ role: string }>({
    text: `SELECT role FROM erp_core.user_roles WHERE user_id = $1 AND role = 'admin_global' AND is_active = true LIMIT 1`,
    args: [user.id],
  });
  const isAdmin = adminResult.rows.length > 0;

  // Get allowed client codes
  const clientResult = await pg.queryObject<{ client_code: string }>({
    text: `
      SELECT DISTINCT ci.client_code
      FROM erp_core.user_company_memberships ucm
      JOIN erp_core.company_integrations ci ON ci.company_id = ucm.company_id AND ci.is_active = true
      WHERE ucm.user_id = $1 AND ucm.is_active = true
    `,
    args: [user.id],
  });

  const codes = clientResult.rows.map((r) => r.client_code);
  if (codes.length === 0 && !isAdmin) return null;

  return { userId: user.id, isAdmin, allowedClientCodes: codes };
}

// --- Client fields by visibility ---

const CLIENT_FIELDS_SIMPLIFIED = `id, title, area, status, created_at`;
const CLIENT_FIELDS_COMPLETE = `id, title, area, status, impact_tag, micro_summary, estimated_impact, waiting_on, created_at, completed_at`;

// --- Handlers ---

type Action = "list" | "history" | "create" | "update" | "delete";

async function handleList(pg: PgClient, auth: AuthContext, clientCode: string) {
  // Validate access
  if (!auth.isAdmin && !auth.allowedClientCodes.includes(clientCode)) {
    return json({ error: "Access denied" }, 403);
  }

  if (auth.isAdmin) {
    // Admin sees everything
    const result = await pg.queryObject({
      text: `
        SELECT *
        FROM erp_core.control_tasks
        WHERE client_code = $1
          AND (completed_at IS NULL OR completed_at > now() - interval '7 days')
        ORDER BY
          CASE status
            WHEN 'en_ejecucion' THEN 1
            WHEN 'en_analisis' THEN 2
            WHEN 'pendiente_tercero' THEN 3
            WHEN 'supervisado' THEN 4
          END,
          created_at DESC
      `,
      args: [clientCode],
    });
    return json({ data: result.rows });
  }

  // Client: filtered by visibility, fields depend on level
  // We fetch with all client-visible fields, then strip in code
  const result = await pg.queryObject({
    text: `
      SELECT id, title, area, status, impact_tag, micro_summary, estimated_impact,
             waiting_on, visibility, created_at, completed_at
      FROM erp_core.control_tasks
      WHERE client_code = $1
        AND visibility != 'interna'
        AND (completed_at IS NULL OR completed_at > now() - interval '7 days')
      ORDER BY
        CASE status
          WHEN 'en_ejecucion' THEN 1
          WHEN 'en_analisis' THEN 2
          WHEN 'pendiente_tercero' THEN 3
          WHEN 'supervisado' THEN 4
        END,
        created_at DESC
    `,
    args: [clientCode],
  });

  // Strip fields based on visibility level
  const rows = result.rows.map((row: any) => {
    if (row.visibility === 'visible_simplificada') {
      return {
        id: row.id,
        title: row.title,
        area: row.area,
        status: row.status,
      };
    }
    // visible_completa
    const out: any = {
      id: row.id,
      title: row.title,
      area: row.area,
      status: row.status,
      impact_tag: row.impact_tag,
      micro_summary: row.micro_summary,
      estimated_impact: row.estimated_impact,
      created_at: row.created_at,
      completed_at: row.completed_at,
    };
    if (row.status === 'pendiente_tercero' && row.waiting_on) {
      out.waiting_on = row.waiting_on;
    }
    return out;
  });

  return json({ data: rows });
}

async function handleHistory(pg: PgClient, auth: AuthContext, clientCode: string) {
  if (!auth.isAdmin && !auth.allowedClientCodes.includes(clientCode)) {
    return json({ error: "Access denied" }, 403);
  }

  const visibilityFilter = auth.isAdmin ? '' : `AND visibility != 'interna'`;

  const result = await pg.queryObject({
    text: `
      SELECT id, title, area, status, impact_tag, micro_summary, estimated_impact,
             created_at, completed_at,
             CASE WHEN completed_at IS NOT NULL
               THEN EXTRACT(DAY FROM completed_at - created_at)::int
               ELSE NULL
             END AS duration_days
      FROM erp_core.control_tasks
      WHERE client_code = $1
        AND status = 'supervisado'
        AND completed_at IS NOT NULL
        AND completed_at <= now() - interval '7 days'
        ${visibilityFilter}
      ORDER BY completed_at DESC
      LIMIT 50
    `,
    args: [clientCode],
  });

  return json({ data: result.rows });
}

async function handleCreate(pg: PgClient, auth: AuthContext, body: any) {
  if (!auth.isAdmin) return json({ error: "Admin only" }, 403);

  const { client_code, title, area, status, impact_tag, micro_summary,
          estimated_impact, waiting_on, visibility, priority,
          internal_notes, next_followup_date, is_recurring, recurrence_pattern } = body;

  if (!client_code || !title || !area) {
    return json({ error: "client_code, title, and area are required" }, 400);
  }

  const result = await pg.queryObject({
    text: `
      INSERT INTO erp_core.control_tasks (
        client_code, title, area, status, impact_tag, micro_summary,
        estimated_impact, waiting_on, visibility, priority,
        internal_notes, next_followup_date, is_recurring, recurrence_pattern
      ) VALUES (
        $1, $2, $3, COALESCE($4, 'en_analisis')::erp_core.control_task_status,
        COALESCE($5, 'operativo')::erp_core.control_task_impact_tag,
        $6, $7, $8,
        COALESCE($9, 'interna')::erp_core.control_task_visibility,
        COALESCE($10, 'media'), $11, $12::date, COALESCE($13, false), $14
      )
      RETURNING *
    `,
    args: [
      client_code, title, area, status || null, impact_tag || null,
      micro_summary || null, estimated_impact || null, waiting_on || null,
      visibility || null, priority || null, internal_notes || null,
      next_followup_date || null, is_recurring ?? false, recurrence_pattern || null,
    ],
  });

  // Record history
  if (result.rows.length > 0) {
    const task = result.rows[0] as any;
    await pg.queryObject({
      text: `INSERT INTO erp_core.control_task_history (task_id, old_status, new_status, changed_by) VALUES ($1, NULL, $2, $3)`,
      args: [task.id, task.status, auth.userId],
    });
  }

  return json({ data: result.rows[0] }, 201);
}

async function handleUpdate(pg: PgClient, auth: AuthContext, body: any) {
  if (!auth.isAdmin) return json({ error: "Admin only" }, 403);

  const { id, ...updates } = body;
  if (!id) return json({ error: "id is required" }, 400);

  // Get current state for history
  const current = await pg.queryObject<{ status: string }>({
    text: `SELECT status FROM erp_core.control_tasks WHERE id = $1`,
    args: [id],
  });
  if (current.rows.length === 0) return json({ error: "Task not found" }, 404);
  const oldStatus = current.rows[0].status;

  // Build dynamic SET clause
  const allowed = [
    'title', 'area', 'status', 'impact_tag', 'micro_summary',
    'estimated_impact', 'waiting_on', 'visibility', 'priority',
    'internal_notes', 'next_followup_date', 'is_recurring', 'recurrence_pattern',
  ];

  const setClauses: string[] = ['updated_at = now()'];
  const args: any[] = [id];
  let argIdx = 2;

  for (const key of allowed) {
    if (key in updates) {
      let cast = '';
      if (key === 'status') cast = '::erp_core.control_task_status';
      if (key === 'area') cast = '::erp_core.control_task_area';
      if (key === 'impact_tag') cast = '::erp_core.control_task_impact_tag';
      if (key === 'visibility') cast = '::erp_core.control_task_visibility';
      if (key === 'next_followup_date') cast = '::date';

      setClauses.push(`${key} = $${argIdx}${cast}`);
      args.push(updates[key]);
      argIdx++;
    }
  }

  // Auto-set completed_at when moving to supervisado
  if (updates.status === 'supervisado') {
    setClauses.push('completed_at = now()');
  }
  // Clear completed_at if moving away from supervisado
  if (updates.status && updates.status !== 'supervisado' && oldStatus === 'supervisado') {
    setClauses.push('completed_at = NULL');
  }

  const result = await pg.queryObject({
    text: `UPDATE erp_core.control_tasks SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
    args,
  });

  // Record history if status changed
  if (updates.status && updates.status !== oldStatus) {
    await pg.queryObject({
      text: `INSERT INTO erp_core.control_task_history (task_id, old_status, new_status, changed_by, notes) VALUES ($1, $2::erp_core.control_task_status, $3::erp_core.control_task_status, $4, $5)`,
      args: [id, oldStatus, updates.status, auth.userId, updates.history_note || null],
    });
  }

  return json({ data: result.rows[0] });
}

async function handleDelete(pg: PgClient, auth: AuthContext, body: any) {
  if (!auth.isAdmin) return json({ error: "Admin only" }, 403);

  const { id } = body;
  if (!id) return json({ error: "id is required" }, 400);

  await pg.queryObject({
    text: `DELETE FROM erp_core.control_tasks WHERE id = $1`,
    args: [id],
  });

  return json({ success: true });
}

// --- Main ---

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  if (!DB_URL) {
    console.error("[control-tasks] Missing DB_URL");
    return json({ error: "Server misconfigured" }, 500);
  }

  const pg = new PgClient(DB_URL);

  try {
    await pg.connect();

    const auth = await resolveAuth(req, pg);
    if (!auth) return json({ error: "Unauthorized" }, 401);

    let body: any;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    const action = body.action as Action;

    switch (action) {
      case "list":
        return await handleList(pg, auth, body.client_code);
      case "history":
        return await handleHistory(pg, auth, body.client_code);
      case "create":
        return await handleCreate(pg, auth, body);
      case "update":
        return await handleUpdate(pg, auth, body);
      case "delete":
        return await handleDelete(pg, auth, body);
      default:
        return json({ error: `Unknown action: ${action}. Valid: list, history, create, update, delete` }, 400);
    }

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[control-tasks] ERROR: ${msg}`);
    return json({ error: "Internal server error" }, 500);
  } finally {
    try { await pg.end(); } catch { /* ignore */ }
  }
});
