import { useEffect, useState } from "react";
import { ListChecks, Circle, AlertCircle } from "lucide-react";
import { DashboardCard } from "./DashboardCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useClientContext } from "@/context/ClientContext";

interface ActionItem {
  id: string;
  title: string;
  description?: string;
  due_date: string;
  status: string;
  priority: "high" | "medium" | "low";
}

export function NextActionsCard() {
  const { selectedClient, loading: clientsLoading } = useClientContext();
  const [data, setData] = useState<ActionItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clientCode = selectedClient?.code ?? null;

  useEffect(() => {
    // Si no hay cliente seleccionado, no hacer request
    if (!clientCode) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const fetchActions = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data: responseData, error: invokeError } = await supabase.functions.invoke(
          "client-actions-feed",
          {
            body: { client_id: clientCode },
          }
        );

        if (invokeError) {
          throw new Error(invokeError.message);
        }

        setData(responseData as ActionItem[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setIsLoading(false);
      }
    };

    fetchActions();
  }, [clientCode]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Si aún se cargan clientes, mostrar loading
  if (clientsLoading) {
    return (
      <DashboardCard title="Próximas Acciones" icon={ListChecks}>
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
      </DashboardCard>
    );
  }

  // Sin cliente seleccionado
  if (!clientCode) {
    return (
      <DashboardCard title="Próximas Acciones" icon={ListChecks}>
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Selecciona un cliente para ver sus acciones pendientes.
          </p>
        </div>
      </DashboardCard>
    );
  }

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
      ) : error ? (
        <div className="py-6 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-destructive mb-2" />
          <p className="text-sm font-medium text-foreground">No se han podido cargar las acciones</p>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
        </div>
      ) : data && data.length > 0 ? (
        <div className="space-y-2">
          {data.map((action) => (
            <div
              key={action.id}
              className="flex items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
            >
              <div className="mt-0.5 shrink-0">
                <Circle
                  className={cn(
                    "h-5 w-5",
                    action.priority === "high" ? "text-primary" : "text-muted-foreground"
                  )}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {action.title}
                </p>
                {action.description && (
                  <p className="text-xs text-muted-foreground truncate">
                    {action.description}
                  </p>
                )}
                <div className="mt-1 flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">
                    {formatDate(action.due_date)}
                  </p>
                  <span className="text-xs text-muted-foreground">·</span>
                  <p className="text-xs text-muted-foreground capitalize">
                    {action.status}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No hay acciones pendientes.
          </p>
        </div>
      )}
    </DashboardCard>
  );
}
