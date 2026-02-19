import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useClientContext } from "@/context/ClientContext";
import { toast } from "@/hooks/use-toast";
import {
  Pencil,
  Plus,
  Loader2,
  ShieldAlert,
  Trash2,
  Filter,
  Copy,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

// --- Types ---

type TaskStatus = "en_analisis" | "en_ejecucion" | "pendiente_tercero" | "supervisado";
type TaskArea = "fiscal_estructura" | "tesoreria_caja" | "relacion_terceros" | "operativa_estrategica";
type ImpactTag = "fiscal" | "caja" | "legal" | "estrategico" | "operativo";
type Visibility = "interna" | "visible_simplificada" | "visible_completa";
type Priority = "alta" | "media" | "baja";

interface ControlTask {
  id: string;
  client_code: string;
  title: string;
  area: TaskArea;
  status: TaskStatus;
  impact_tag: ImpactTag;
  micro_summary: string | null;
  estimated_impact: string | null;
  waiting_on: string | null;
  visibility: Visibility;
  priority: Priority;
  internal_notes: string | null;
  next_followup_date: string | null;
  is_recurring: boolean;
  recurrence_pattern: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

interface FormData {
  id: string;
  client_code: string;
  title: string;
  area: TaskArea;
  status: TaskStatus;
  impact_tag: ImpactTag;
  micro_summary: string;
  estimated_impact: string;
  waiting_on: string;
  visibility: Visibility;
  priority: Priority;
  internal_notes: string;
  next_followup_date: string;
  is_recurring: boolean;
  recurrence_pattern: string;
}

const emptyForm: FormData = {
  id: "",
  client_code: "CLIENT_001",
  title: "",
  area: "fiscal_estructura",
  status: "en_analisis",
  impact_tag: "operativo",
  micro_summary: "",
  estimated_impact: "",
  waiting_on: "",
  visibility: "interna",
  priority: "media",
  internal_notes: "",
  next_followup_date: "",
  is_recurring: false,
  recurrence_pattern: "",
};

// --- Options ---

const clientOptions = [
  { value: "CLIENT_001", label: "Blacktar SL" },
  { value: "CLIENT_002", label: "YMBI SL" },
  { value: "CLIENT_004", label: "Fatima (autónoma)" },
];

const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: "en_analisis", label: "En análisis" },
  { value: "en_ejecucion", label: "En ejecución" },
  { value: "pendiente_tercero", label: "Pendiente de tercero" },
  { value: "supervisado", label: "Supervisado" },
];

const areaOptions: { value: TaskArea; label: string }[] = [
  { value: "fiscal_estructura", label: "Fiscal / Estructura" },
  { value: "tesoreria_caja", label: "Tesorería / Caja" },
  { value: "relacion_terceros", label: "Relación terceros" },
  { value: "operativa_estrategica", label: "Operativa / Estratégica" },
];

const impactOptions: { value: ImpactTag; label: string }[] = [
  { value: "fiscal", label: "Fiscal" },
  { value: "caja", label: "Caja" },
  { value: "legal", label: "Legal" },
  { value: "estrategico", label: "Estratégico" },
  { value: "operativo", label: "Operativo" },
];

const visibilityOptions: { value: Visibility; label: string }[] = [
  { value: "interna", label: "Interna (solo admin)" },
  { value: "visible_simplificada", label: "Simplificada (cliente ve título)" },
  { value: "visible_completa", label: "Completa (cliente ve todo)" },
];

const priorityOptions: { value: Priority; label: string }[] = [
  { value: "alta", label: "Alta" },
  { value: "media", label: "Media" },
  { value: "baja", label: "Baja" },
];

// --- Visual helpers ---

const STATUS_COLORS: Record<TaskStatus, string> = {
  en_analisis: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  en_ejecucion: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  pendiente_tercero: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  supervisado: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
};

const PRIORITY_COLORS: Record<Priority, string> = {
  alta: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  media: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
  baja: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400",
};

const VISIBILITY_COLORS: Record<Visibility, string> = {
  interna: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  visible_simplificada: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  visible_completa: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

// --- Component ---

export default function AdminControlTasks() {
  const { session } = useAuth();
  const { canSwitchClient } = useClientContext();

  // Data
  const [tasks, setTasks] = useState<ControlTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [isEditing, setIsEditing] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  // Filter
  const [filterClient, setFilterClient] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterArea, setFilterArea] = useState<string>("ALL");

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<ControlTask | null>(null);
  const [deleting, setDeleting] = useState(false);

  // --- Load tasks ---

  const loadTasks = async () => {
    setLoading(true);
    try {
      // Load for each client (or just filtered one)
      const clientCodes =
        filterClient === "ALL"
          ? clientOptions.map((c) => c.value)
          : [filterClient];

      const allTasks: ControlTask[] = [];

      for (const code of clientCodes) {
        const { data, error } = await supabase.functions.invoke("control-tasks", {
          body: { action: "list", client_code: code },
        });

        if (error) {
          console.error(`Error loading tasks for ${code}:`, error);
          continue;
        }

        const rows = data?.data ?? [];
        allTasks.push(...(rows as ControlTask[]));
      }

      setTasks(allTasks);
    } catch (err) {
      console.error("Error loading tasks:", err);
      toast({
        title: "Error",
        description: "No se pudieron cargar las tareas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [filterClient]);

  // --- Auth guards (same pattern as AdminTaxFilings) ---

  if (!session) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <ShieldAlert className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <CardTitle>Acceso restringido</CardTitle>
            </CardHeader>
            <CardContent className="text-center text-muted-foreground">
              Inicia sesión para ver esta sección.
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!canSwitchClient) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <ShieldAlert className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <CardTitle>Acceso restringido</CardTitle>
            </CardHeader>
            <CardContent className="text-center text-muted-foreground">
              No tienes permisos para ver esta sección.
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // --- Handlers ---

  const handleInputChange = (field: keyof FormData, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNewTask = () => {
    setFormData({
      ...emptyForm,
      client_code: filterClient !== "ALL" ? filterClient : "CLIENT_001",
    });
    setIsEditing(false);
    setFormOpen(true);
  };

  const handleEdit = (task: ControlTask) => {
    setFormData({
      id: task.id,
      client_code: task.client_code,
      title: task.title,
      area: task.area,
      status: task.status,
      impact_tag: task.impact_tag,
      micro_summary: task.micro_summary || "",
      estimated_impact: task.estimated_impact || "",
      waiting_on: task.waiting_on || "",
      visibility: task.visibility,
      priority: task.priority,
      internal_notes: task.internal_notes || "",
      next_followup_date: task.next_followup_date
        ? task.next_followup_date.slice(0, 10)
        : "",
      is_recurring: task.is_recurring,
      recurrence_pattern: task.recurrence_pattern || "",
    });
    setIsEditing(true);
    setFormOpen(true);
  };

  const handleDuplicate = (task: ControlTask) => {
    setFormData({
      id: "",
      client_code: task.client_code,
      title: task.title,
      area: task.area,
      status: "en_analisis",
      impact_tag: task.impact_tag,
      micro_summary: task.micro_summary || "",
      estimated_impact: task.estimated_impact || "",
      waiting_on: task.waiting_on || "",
      visibility: task.visibility,
      priority: task.priority,
      internal_notes: task.internal_notes || "",
      next_followup_date: "",
      is_recurring: task.is_recurring,
      recurrence_pattern: task.recurrence_pattern || "",
    });
    setIsEditing(false);
    setFormOpen(true);
    toast({
      title: "Tarea duplicada",
      description: "Cambia el cliente u otros campos y pulsa Guardar.",
    });
  };

  const handleDeleteClick = (task: ControlTask) => {
    setTaskToDelete(task);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!taskToDelete) return;

    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("control-tasks", {
        body: { action: "delete", id: taskToDelete.id },
      });

      if (error) throw error;

      toast({
        title: "Tarea eliminada",
        description: "La tarea se ha eliminado correctamente.",
      });

      setDeleteDialogOpen(false);
      setTaskToDelete(null);
      loadTasks();
    } catch (err) {
      console.error("Error deleting task:", err);
      toast({
        title: "Error",
        description: "No se pudo eliminar la tarea.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async () => {
    if (!session?.access_token) {
      toast({
        title: "Error",
        description: "No hay sesión activa.",
        variant: "destructive",
      });
      return;
    }

    // Validación básica
    if (!formData.client_code || !formData.title || !formData.area) {
      toast({
        title: "Error",
        description: "Completa los campos obligatorios: cliente, título y área.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const action = formData.id ? "update" : "create";

      const body: Record<string, unknown> = {
        action,
        client_code: formData.client_code,
        title: formData.title,
        area: formData.area,
        status: formData.status,
        impact_tag: formData.impact_tag,
        micro_summary: formData.micro_summary || null,
        estimated_impact: formData.estimated_impact || null,
        waiting_on: formData.waiting_on || null,
        visibility: formData.visibility,
        priority: formData.priority,
        internal_notes: formData.internal_notes || null,
        next_followup_date: formData.next_followup_date || null,
        is_recurring: formData.is_recurring,
        recurrence_pattern: formData.recurrence_pattern || null,
      };

      if (formData.id) {
        body.id = formData.id;
      }

      const { data, error } = await supabase.functions.invoke("control-tasks", {
        body,
      });

      if (error) throw error;

      toast({
        title: "Guardado",
        description: formData.id
          ? "Tarea actualizada correctamente."
          : "Tarea creada correctamente.",
      });

      await loadTasks();

      // Si estamos editando, actualizar el form con la respuesta del servidor
      if (data?.data && isEditing) {
        const task = data.data as ControlTask;
        handleEdit(task);
      } else {
        setFormOpen(false);
        setFormData(emptyForm);
        setIsEditing(false);
      }
    } catch (err) {
      console.error("Error saving task:", err);
      toast({
        title: "Error",
        description: "No se pudo guardar la tarea.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // --- Helpers ---

  const getClientLabel = (code: string) =>
    clientOptions.find((c) => c.value === code)?.label ?? code;

  const getStatusLabel = (status: TaskStatus) =>
    statusOptions.find((s) => s.value === status)?.label ?? status;

  const getAreaLabel = (area: TaskArea) =>
    areaOptions.find((a) => a.value === area)?.label ?? area;

  const getVisibilityLabel = (v: Visibility) =>
    visibilityOptions.find((o) => o.value === v)?.label ?? v;

  // --- Filtered tasks ---

  const filteredTasks = tasks.filter((task) => {
    if (filterStatus !== "ALL" && task.status !== filterStatus) return false;
    if (filterArea !== "ALL" && task.area !== filterArea) return false;
    return true;
  });

  // --- Render ---

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-foreground">
            Admin · Gestiones Kanban
          </h1>
          <Button onClick={handleNewTask} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nueva tarea
          </Button>
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterClient} onValueChange={setFilterClient}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos los clientes</SelectItem>
              {clientOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos los estados</SelectItem>
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterArea} onValueChange={setFilterArea}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Área" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas las áreas</SelectItem>
              {areaOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(filterClient !== "ALL" || filterStatus !== "ALL" || filterArea !== "ALL") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterClient("ALL");
                setFilterStatus("ALL");
                setFilterArea("ALL");
              }}
              className="text-xs text-muted-foreground"
            >
              Limpiar filtros
            </Button>
          )}
        </div>

        {/* Formulario (colapsable) */}
        {formOpen && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {isEditing ? "Editar tarea" : "Crear tarea"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* client_code */}
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <Select
                  value={formData.client_code}
                  onValueChange={(v) => handleInputChange("client_code", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* title */}
              <div className="space-y-2 lg:col-span-2">
                <Label>Título *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  placeholder="Descripción breve de la tarea"
                />
              </div>

              {/* area */}
              <div className="space-y-2">
                <Label>Área *</Label>
                <Select
                  value={formData.area}
                  onValueChange={(v) => handleInputChange("area", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {areaOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* status */}
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => handleInputChange("status", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* impact_tag */}
              <div className="space-y-2">
                <Label>Etiqueta de impacto</Label>
                <Select
                  value={formData.impact_tag}
                  onValueChange={(v) => handleInputChange("impact_tag", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {impactOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* visibility */}
              <div className="space-y-2">
                <Label>Visibilidad</Label>
                <Select
                  value={formData.visibility}
                  onValueChange={(v) => handleInputChange("visibility", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {visibilityOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* priority */}
              <div className="space-y-2">
                <Label>Prioridad</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(v) => handleInputChange("priority", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* next_followup_date */}
              <div className="space-y-2">
                <Label>Próximo seguimiento</Label>
                <Input
                  type="date"
                  value={formData.next_followup_date}
                  onChange={(e) =>
                    handleInputChange("next_followup_date", e.target.value)
                  }
                />
              </div>

              {/* micro_summary */}
              <div className="space-y-2 lg:col-span-2">
                <Label>Resumen para el cliente (si es visible)</Label>
                <Input
                  value={formData.micro_summary}
                  onChange={(e) =>
                    handleInputChange("micro_summary", e.target.value)
                  }
                  placeholder="Resumen que verá el cliente en vista completa"
                />
                <p className="text-[11px] text-muted-foreground">
                  El resumen debe explicar el objetivo o impacto, no la tarea administrativa.
                </p>
              </div>

              {/* estimated_impact */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label>Impacto estimado</Label>
                  <span
                    title="Opcional. Úsalo cuando la tarea tenga impacto económico relevante."
                    className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-muted text-muted-foreground text-[10px] cursor-help"
                  >
                    ?
                  </span>
                </div>
                <Input
                  value={formData.estimated_impact}
                  onChange={(e) =>
                    handleInputChange("estimated_impact", e.target.value)
                  }
                  placeholder="Ej: ~2.400 € / trimestre"
                />
              </div>

              {/* waiting_on */}
              <div className="space-y-2">
                <Label>Esperando a</Label>
                <Input
                  value={formData.waiting_on}
                  onChange={(e) =>
                    handleInputChange("waiting_on", e.target.value)
                  }
                  placeholder="Ej: Gestoría, banco, cliente…"
                />
              </div>

              {/* is_recurring + recurrence_pattern */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 pt-1">
                  <Switch
                    checked={formData.is_recurring}
                    onCheckedChange={(v) =>
                      handleInputChange("is_recurring", v)
                    }
                  />
                  <Label className="cursor-pointer">Recurrente</Label>
                </div>
                {formData.is_recurring && (
                  <Input
                    value={formData.recurrence_pattern}
                    onChange={(e) =>
                      handleInputChange("recurrence_pattern", e.target.value)
                    }
                    placeholder="Ej: mensual, trimestral…"
                    className="mt-2"
                  />
                )}
              </div>

              {/* internal_notes */}
              <div className="space-y-2 md:col-span-2 lg:col-span-3">
                <Label>Notas internas (solo admin)</Label>
                <Textarea
                  value={formData.internal_notes}
                  onChange={(e) =>
                    handleInputChange("internal_notes", e.target.value)
                  }
                  placeholder="Notas privadas, contexto adicional…"
                  rows={3}
                />
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Guardar
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setFormOpen(false);
                  setFormData(emptyForm);
                  setIsEditing(false);
                }}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
        )}

        {/* Listado */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Tareas{" "}
              <span className="text-muted-foreground font-normal text-sm">
                ({filteredTasks.length} de {tasks.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredTasks.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                {tasks.length === 0
                  ? "No hay tareas registradas."
                  : "Ninguna tarea coincide con los filtros seleccionados."}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Área</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Prioridad</TableHead>
                      <TableHead>Visibilidad</TableHead>
                      <TableHead>Seguimiento</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium text-xs">
                          {getClientLabel(task.client_code)}
                        </TableCell>
                        <TableCell className="max-w-[280px]">
                          <p className="text-sm font-medium truncate">
                            {task.title}
                          </p>
                          {task.micro_summary && (
                            <p className="text-xs text-muted-foreground truncate">
                              {task.micro_summary}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs">
                            {getAreaLabel(task.area)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-xs font-medium border-0",
                              STATUS_COLORS[task.status]
                            )}
                          >
                            {getStatusLabel(task.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-xs font-medium border-0",
                              PRIORITY_COLORS[task.priority]
                            )}
                          >
                            {task.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px] font-normal border-0",
                              VISIBILITY_COLORS[task.visibility]
                            )}
                          >
                            {getVisibilityLabel(task.visibility)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {task.next_followup_date
                            ? new Date(task.next_followup_date).toLocaleDateString("es-ES")
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDuplicate(task)}
                              title="Duplicar tarea"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(task)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(task)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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

      {/* Diálogo de confirmación de borrado */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta tarea?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la
              tarea y su historial asociado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
