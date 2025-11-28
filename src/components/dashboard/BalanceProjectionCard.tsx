import { TrendingUp } from "lucide-react";
import { DashboardCard } from "./DashboardCard";
import { Button } from "@/components/ui/button";

// Types for Supabase integration
export interface BalanceProjection {
  id: string;
  date: string;
  projected_balance: number;
  confidence: number;
  currency: string;
}

interface BalanceProjectionCardProps {
  data?: BalanceProjection[] | null;
  isLoading?: boolean;
}

export function BalanceProjectionCard({ data, isLoading }: BalanceProjectionCardProps) {
  return (
    <DashboardCard
      title="Proyección de Saldo"
      icon={TrendingUp}
      action={
        <Button variant="ghost" size="sm" className="text-primary">
          Ver más
        </Button>
      }
    >
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <div className="space-y-3">
          {data.map((projection) => (
            <div
              key={projection.id}
              className="flex items-center justify-between rounded-lg border border-border p-3"
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  {new Date(projection.date).toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "short",
                  })}
                </p>
                <p className="text-xs text-muted-foreground">
                  Confianza: {projection.confidence}%
                </p>
              </div>
              <p className="text-sm font-semibold text-foreground">
                {new Intl.NumberFormat("es-ES", {
                  style: "currency",
                  currency: projection.currency,
                }).format(projection.projected_balance)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No hay proyecciones disponibles
          </p>
        </div>
      )}
    </DashboardCard>
  );
}
