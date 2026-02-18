import { useEffect, useState } from "react";
import { ClipboardList, AlertCircle, Clock, Play, UserCheck, CheckCircle2 } from "lucide-react";
import { DashboardCard } from "./DashboardCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useClientContext } from "@/context/ClientContext";

// --- Types ---

type TaskStatus = "en_analisis" | "en_ejecucion" | "pendiente_tercero" | "supervisado";
type TaskArea = "fiscal_estructura" | "tesoreria_caja" | "relacion_terceros" | "operativa_estrategica";
type ImpactTag = "fiscal" | "caja" | "legal" | "estrategico" | "operativo";

interface ControlTask {
  id: string;
  title: string;
  area: TaskArea;
  status: TaskStatus;
  impact_tag?: ImpactTag;
  micro_summary?: string;
  estimated_impact?: string;
  waiting_on?: string;
  created_at?: string;
  completed_at?: string;
}

// --- Column config ---

const COLUMNS: { key: TaskStatus; label: string; icon: React.ElementType; color: string }[] = [
  { key: "en_analisis", label: "En análisis", icon: Clock, color: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  { key: "en_ejecucion", label: "En ejecución", icon: Play, color: "bg-blue-500/15 text-blue-700 dark:text-blue-400" },
  { key: "pendiente_tercero", label: "Pendiente de tercero", icon: UserCheck, color: "bg-orange-500/15 text-orange-700 dark:text-orange-400" },
  { key: "supervisado", label: "Supervisado", icon: CheckCircle2, color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
];

const AREA_LABELS: Record<TaskArea, string> = {
  fiscal_estructura: "Fiscal",
  tesoreria_caja: "Tesorería",
  relacion_terceros: "Terceros",
  operativa_estrategica: "Operativa",
};

const IMPACT_COLORS: Record<ImpactTag, string> = {
  fiscal: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  caja: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  legal: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  estrategico: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  operativo: "bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400",
};

// --- Component ---

export function ControlTasksCard() {
  const { selectedClient, loading: clientsLoading } = useClientContext();
  const [tasks, setTasks] = useState<ControlTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clientCode = selectedClient?.code ?? null;

  useEffect(() => {
    if (!clientCode) {
      setTasks([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    const fetchTasks = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data: responseData, error: invokeError } = await supabase.functions.invoke(
          "control-tasks",
          {
            body: { action: "list", client_code: clientCode },
          }
        );

        if (invokeError) {
          throw new Error(invokeError.message);
        }

        setTasks((responseData?.data as ControlTask[]) ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTasks();
  }, [clientCode]);

  // Group tasks by status
  const grouped: Record<TaskStatus, ControlTask[]> = {
    en_analisis: [],
    en_ejecucion: [],
    pendiente_tercero: [],
    supervisado: [],
  };

  for (const task of tasks) {
    if (grouped[task.status]) {
      grouped[task.status].push(task);
    }
  }

  // Loading skeleton
  if (clientsLoading || isLoading) {
    return (
      <DashboardCard title="Panel de gestiones" icon={ClipboardList}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-5 w-24 animate-pulse rounded bg-muted" />
              <div className="h-16 animate-pulse rounded-lg bg-muted" />
              <div className="h-16 animate-pulse rounded-lg bg-muted" />
            </div>
          ))}
        </div>
      </DashboardCard>
    );
  }

  // Error
  if (error) {
    return (
      <DashboardCard title="Panel de gestiones" icon={ClipboardList}>
        <div className="py-6 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-destructive mb-2" />
          <p className="text-sm font-medium text-foreground">No se han podido cargar las gestiones</p>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
        </div>
      </DashboardCard>
    );
  }

  // No client
  if (!clientCode) {
    return (
      <DashboardCard title="Panel de gestiones" icon={ClipboardList}>
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">Selecciona una empresa para ver las gestiones.</p>
        </div>
      </DashboardCard>
    );
  }

  const totalActive = tasks.filter((t) => t.status !== "supervisado").length;

  return (
    <DashboardCard
      title="Panel de gestiones"
      icon={ClipboardList}
      action={
        <Button variant="ghost" size="sm" className="text-primary text-xs">
          Ver historial
        </Button>
      }
    >
      {tasks.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">No hay gestiones activas en este momento.</p>
        </div>
      ) : (
        <>
          {/* Summary line */}
          <p className="text-xs text-muted-foreground mb-4">
            {totalActive} {totalActive === 1 ? "gestión activa" : "gestiones activas"}
          </p>

          {/* Kanban columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {COLUMNS.map((col) => {
              const colTasks = grouped[col.key];
              const ColIcon = col.icon;

              return (
                <div key={col.key} className="min-w-0">
                  {/* Column header */}
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <ColIcon className={cn("h-3.5 w-3.5", col.color.split(" ").slice(1).join(" "))} />
                    <span className="text-xs font-medium text-muted-foreground">{col.label}</span>
                    {colTasks.length > 0 && (
                      <span className="ml-auto text-[10px] font-medium text-muted-foreground/70">
                        {colTasks.length}
                      </span>
                    )}
                  </div>

                  {/* Tasks */}
                  <div className="space-y-2">
                    {colTasks.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border/50 py-4 text-center">
                        <p className="text-[10px] text-muted-foreground/50">Sin gestiones</p>
                      </div>
                    ) : (
                      colTasks.map((task) => (
                        <TaskCard key={task.id} task={task} statusColor={col.color} />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </DashboardCard>
  );
}

// --- Task card ---

function TaskCard({ task, statusColor }: { task: ControlTask; statusColor: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-2.5 space-y-1.5 transition-colors hover:bg-muted/30">
      {/* Title */}
      <p className="text-xs font-medium text-foreground leading-snug line-clamp-2">
        {task.title}
      </p>

      {/* Micro summary (only visible_completa) */}
      {task.micro_summary && (
        <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2">
          {task.micro_summary}
        </p>
      )}

      {/* Waiting on (only pendiente_tercero) */}
      {task.waiting_on && task.status === "pendiente_tercero" && (
        <p className="text-[10px] text-orange-600 dark:text-orange-400">
          Esperando: {task.waiting_on}
        </p>
      )}

      {/* Tags row */}
      <div className="flex items-center gap-1 flex-wrap">
        <Badge
          variant="secondary"
          className="text-[9px] px-1.5 py-0 h-4 font-normal"
        >
          {AREA_LABELS[task.area] ?? task.area}
        </Badge>

        {task.impact_tag && (
          <Badge
            variant="secondary"
            className={cn(
              "text-[9px] px-1.5 py-0 h-4 font-normal border-0",
              IMPACT_COLORS[task.impact_tag]
            )}
          >
            {task.impact_tag}
          </Badge>
        )}

        {task.estimated_impact && (
          <span className="text-[9px] text-muted-foreground ml-auto">
            {task.estimated_impact}
          </span>
        )}
      </div>
    </div>
  );
}
