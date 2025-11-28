import { Calendar, AlertCircle } from "lucide-react";
import { DashboardCard } from "./DashboardCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Types for Supabase integration
export interface TaxEvent {
  id: string;
  title: string;
  description?: string;
  due_date: string;
  type: "declaracion" | "pago" | "informativo";
  status: "pendiente" | "completado" | "vencido";
  model?: string;
}

interface TaxCalendarCardProps {
  data?: TaxEvent[] | null;
  isLoading?: boolean;
}

const statusColors = {
  pendiente: "bg-warning/10 text-warning border-warning/20",
  completado: "bg-success/10 text-success border-success/20",
  vencido: "bg-destructive/10 text-destructive border-destructive/20",
};

const typeLabels = {
  declaracion: "Declaración",
  pago: "Pago",
  informativo: "Informativo",
};

export function TaxCalendarCard({ data, isLoading }: TaxCalendarCardProps) {
  const getDaysUntilDue = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <DashboardCard
      title="Calendario Fiscal"
      icon={Calendar}
      action={
        <Button variant="ghost" size="sm" className="text-primary">
          Ver calendario
        </Button>
      }
    >
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-3 w-20 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-6 w-16 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <div className="space-y-3">
          {data.map((event) => {
            const daysUntil = getDaysUntilDue(event.due_date);
            const isUrgent = daysUntil <= 7 && event.status === "pendiente";

            return (
              <div
                key={event.id}
                className={cn(
                  "rounded-lg border border-border p-3",
                  isUrgent && "border-destructive/50 bg-destructive/5"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {isUrgent && (
                        <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
                      )}
                      <p className="text-sm font-medium text-foreground truncate">
                        {event.title}
                      </p>
                    </div>
                    {event.model && (
                      <p className="text-xs text-muted-foreground">
                        Modelo {event.model}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(event.due_date).toLocaleDateString("es-ES", {
                        day: "numeric",
                        month: "long",
                      })}
                      {daysUntil > 0 && event.status === "pendiente" && (
                        <span className="ml-1">
                          ({daysUntil} {daysUntil === 1 ? "día" : "días"})
                        </span>
                      )}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn("shrink-0 text-xs", statusColors[event.status])}
                  >
                    {event.status}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No hay eventos fiscales próximos
          </p>
        </div>
      )}
    </DashboardCard>
  );
}
