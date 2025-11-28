import { ListChecks, Circle, CheckCircle2 } from "lucide-react";
import { DashboardCard } from "./DashboardCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Types for Supabase integration
export interface Action {
  id: string;
  title: string;
  description?: string;
  due_date: string;
  priority: "high" | "medium" | "low";
  completed: boolean;
}

interface NextActionsCardProps {
  data?: Action[] | null;
  isLoading?: boolean;
  onToggleComplete?: (id: string) => void;
}

const priorityColors = {
  high: "text-destructive",
  medium: "text-warning",
  low: "text-muted-foreground",
};

export function NextActionsCard({ 
  data, 
  isLoading, 
  onToggleComplete 
}: NextActionsCardProps) {
  return (
    <DashboardCard
      title="Próximas Acciones"
      icon={ListChecks}
      action={
        <Button variant="ghost" size="sm" className="text-primary">
          Ver todas
        </Button>
      }
    >
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="h-5 w-5 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-1">
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <div className="space-y-2">
          {data.map((action) => (
            <div
              key={action.id}
              className={cn(
                "flex items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50",
                action.completed && "opacity-60"
              )}
            >
              <button
                onClick={() => onToggleComplete?.(action.id)}
                className="mt-0.5 shrink-0"
              >
                {action.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <Circle className={cn("h-5 w-5", priorityColors[action.priority])} />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm font-medium text-foreground",
                  action.completed && "line-through"
                )}>
                  {action.title}
                </p>
                {action.description && (
                  <p className="text-xs text-muted-foreground truncate">
                    {action.description}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(action.due_date).toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "short",
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No hay acciones pendientes
          </p>
        </div>
      )}
    </DashboardCard>
  );
}
