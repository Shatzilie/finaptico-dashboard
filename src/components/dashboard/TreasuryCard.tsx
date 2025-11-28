import { Wallet, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { DashboardCard } from "./DashboardCard";
import { Button } from "@/components/ui/button";

// Types for Supabase integration
export interface TreasuryData {
  id: string;
  balance: number;
  income: number;
  expenses: number;
  currency: string;
  updated_at: string;
}

interface TreasuryCardProps {
  data?: TreasuryData | null;
  isLoading?: boolean;
}

export function TreasuryCard({ data, isLoading }: TreasuryCardProps) {
  return (
    <DashboardCard
      title="Tesorería"
      icon={Wallet}
      action={
        <Button variant="ghost" size="sm" className="text-primary">
          Ver detalle
        </Button>
      }
    >
      {isLoading ? (
        <div className="space-y-3">
          <div className="h-8 w-32 animate-pulse rounded bg-muted" />
          <div className="flex gap-4">
            <div className="h-6 w-24 animate-pulse rounded bg-muted" />
            <div className="h-6 w-24 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ) : data ? (
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Saldo actual</p>
            <p className="text-3xl font-bold text-foreground">
              {new Intl.NumberFormat("es-ES", {
                style: "currency",
                currency: data.currency,
              }).format(data.balance)}
            </p>
          </div>
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-success/10">
                <ArrowUpRight className="h-3 w-3 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ingresos</p>
                <p className="text-sm font-medium text-success">
                  +{new Intl.NumberFormat("es-ES", {
                    style: "currency",
                    currency: data.currency,
                  }).format(data.income)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-destructive/10">
                <ArrowDownRight className="h-3 w-3 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Gastos</p>
                <p className="text-sm font-medium text-destructive">
                  -{new Intl.NumberFormat("es-ES", {
                    style: "currency",
                    currency: data.currency,
                  }).format(data.expenses)}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Conecta tu cuenta para ver datos de tesorería
          </p>
        </div>
      )}
    </DashboardCard>
  );
}
