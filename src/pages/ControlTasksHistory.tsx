import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useClientContext } from "@/context/ClientContext";
import {
  Archive,
  Loader2,
  Search,
  Filter,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

// --- Types ---

type TaskArea =
  | "fiscal_estructura"
  | "tesoreria_caja"
  | "relacion_terceros"
  | "operativa_estrategica";
type ImpactTag = "fiscal" | "caja" | "legal" | "estrategico" | "operativo";

interface HistoryTask {
  id: string;
  title: string;
  area: TaskArea;
  status: string;
  impact_tag?: ImpactTag;
  micro_summary?: string;
  estimated_impact?: string;
  created_at: string;
  completed_at: string;
  duration_days: number | null;
  client_code?: string;
}

// --- Options ---

const clientOptions = [
  { value: "CLIENT_001", label: "Blacktar SL" },
  { value: "CLIENT_002", label: "YMBI SL" },
  { value: "CLIENT_004", label: "Fatima (autónoma)" },
];

const areaOptions: { value: TaskArea; label: string }[] = [
  { value: "fiscal_estructura", label: "Fiscal / Estructura" },
  { value: "tesoreria_caja", label: "Tesorería / Caja" },
  { value: "relacion_terceros", label: "Relación terceros" },
  { value: "operativa_estrategica", label: "Operativa / Estratégica" },
];

const AREA_LABELS: Record<TaskArea, string> = {
  fiscal_estructura: "Fiscal",
  tesoreria_caja: "Tesorería",
  relacion_terceros: "Terceros",
  operativa_estrategica: "Operativa",
};

const IMPACT_COLORS: Record<ImpactTag, string> = {
  fiscal:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  caja: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  legal: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  estrategico:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  operativo:
    "bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400",
};

// --- Helpers ---

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatMonthYear(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function getMonthKey(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  } catch {
    return "";
  }
}

function getClientLabel(code: string): string {
  return clientOptions.find((c) => c.value === code)?.label ?? code;
}

// --- Build month options from data ---

function buildMonthOptions(
  tasks: HistoryTask[]
): { value: string; label: string }[] {
  const months = new Set<string>();
  for (const t of tasks) {
    if (t.completed_at) {
      months.add(getMonthKey(t.completed_at));
    }
  }
  return Array.from(months)
    .sort()
    .reverse()
    .map((m) => ({
      value: m,
      label: formatMonthYear(`${m}-15`),
    }));
}

// --- Component ---

export default function ControlTasksHistory() {
  const { session } = useAuth();
  const { selectedClient, canSwitchClient } = useClientContext();
  const navigate = useNavigate();

  const isAdmin = canSwitchClient;
  const clientCode = selectedClient?.code ?? null;

  // Data
  const [tasks, setTasks] = useState<HistoryTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterClient, setFilterClient] = useState<string>("ALL");
  const [filterArea, setFilterArea] = useState<string>("ALL");
  const [filterMonth, setFilterMonth] = useState<string>("ALL");
  const [searchText, setSearchText] = useState("");

  // --- Load history ---

  const loadHistory = async () => {
    if (!session) return;

    setLoading(true);
    setError(null);

    try {
      if (isAdmin) {
        // Admin: load for all clients (or filtered one)
        const codes =
          filterClient === "ALL"
            ? clientOptions.map((c) => c.value)
            : [filterClient];

        const allTasks: HistoryTask[] = [];

        for (const code of codes) {
          const { data, error: invokeError } =
            await supabase.functions.invoke("control-tasks", {
              body: { action: "history", client_code: code },
            });

          if (invokeError) {
            console.error(`Error loading history for ${code}:`, invokeError);
            continue;
          }

          const rows = (data?.data ?? []) as HistoryTask[];
          // Tag each row with client_code for admin view
          allTasks.push(...rows.map((r) => ({ ...r, client_code: code })));
        }

        setTasks(allTasks);
      } else {
        // Client: load only their own
        if (!clientCode) {
          setTasks([]);
          return;
        }

        const { data, error: invokeError } =
          await supabase.functions.invoke("control-tasks", {
            body: { action: "history", client_code: clientCode },
          });

        if (invokeError) {
          throw new Error(invokeError.message);
        }

        setTasks((data?.data as HistoryTask[]) ?? []);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [session, clientCode, isAdmin, filterClient]);

  // --- Filtered tasks ---

  const monthOptions = useMemo(() => buildMonthOptions(tasks), [tasks]);

  const filteredTasks = useMemo(() => {
    let result = tasks;

    if (filterArea !== "ALL") {
      result = result.filter((t) => t.area === filterArea);
    }

    if (filterMonth !== "ALL") {
      result = result.filter(
        (t) => t.completed_at && getMonthKey(t.completed_at) === filterMonth
      );
    }

    if (searchText.trim()) {
      const q = searchText.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.micro_summary && t.micro_summary.toLowerCase().includes(q))
      );
    }

    return result;
  }, [tasks, filterArea, filterMonth, searchText]);

  // --- Clear filters ---

  const hasFilters =
    filterArea !== "ALL" ||
    filterMonth !== "ALL" ||
    searchText.trim() !== "" ||
    (isAdmin && filterClient !== "ALL");

  const clearFilters = () => {
    setFilterArea("ALL");
    setFilterMonth("ALL");
    setSearchText("");
    if (isAdmin) setFilterClient("ALL");
  };

  // --- Render ---

  if (!session) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">
            Inicia sesión para ver el historial.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
            <Archive className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Historial de gestiones</h1>
            <p className="text-sm text-muted-foreground">
              Gestiones completadas y archivadas.
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                Filtros
              </span>
              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="ml-auto text-xs h-7"
                >
                  Limpiar filtros
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Client filter (admin only) */}
              {isAdmin && (
                <Select value={filterClient} onValueChange={setFilterClient}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Todos los clientes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos los clientes</SelectItem>
                    {clientOptions.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Area filter */}
              <Select value={filterArea} onValueChange={setFilterArea}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Todas las áreas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas las áreas</SelectItem>
                  {areaOptions.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Month filter */}
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Todos los meses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos los meses</SelectItem>
                  {monthOptions.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Text search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Buscar por título…"
                  className="h-9 text-sm pl-8"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              Gestiones archivadas{" "}
              <span className="text-muted-foreground font-normal text-sm">
                ({filteredTasks.length}
                {filteredTasks.length !== tasks.length
                  ? ` de ${tasks.length}`
                  : ""}
                )
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="py-8 text-center">
                <p className="text-sm font-medium text-destructive">
                  No se pudo cargar el historial
                </p>
                <p className="text-xs text-muted-foreground mt-1">{error}</p>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="py-12 text-center">
                <Archive className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {tasks.length === 0
                    ? "Aún no hay gestiones archivadas."
                    : "Ninguna gestión coincide con los filtros seleccionados."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {isAdmin && <TableHead>Cliente</TableHead>}
                      <TableHead>Gestión</TableHead>
                      <TableHead>Área</TableHead>
                      <TableHead>Impacto</TableHead>
                      <TableHead>Completada</TableHead>
                      <TableHead className="text-right">Duración</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks.map((task) => (
                      <TableRow key={task.id}>
                        {isAdmin && (
                          <TableCell className="text-xs font-medium">
                            {getClientLabel(task.client_code ?? "")}
                          </TableCell>
                        )}
                        <TableCell className="max-w-[320px]">
                          <p className="text-sm font-medium truncate">
                            {task.title}
                          </p>
                          {task.micro_summary && (
                            <p className="text-xs text-muted-foreground truncate">
                              {task.micro_summary}
                            </p>
                          )}
                          {task.estimated_impact && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {task.estimated_impact}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs">
                            {AREA_LABELS[task.area] ?? task.area}
                          </span>
                        </TableCell>
                        <TableCell>
                          {task.impact_tag && (
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-[10px] font-normal border-0",
                                IMPACT_COLORS[task.impact_tag]
                              )}
                            >
                              {task.impact_tag}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(task.completed_at)}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                          {task.duration_days !== null
                            ? `${task.duration_days} ${task.duration_days === 1 ? "día" : "días"}`
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
