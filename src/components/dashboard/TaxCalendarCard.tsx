import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, AlertCircle } from "lucide-react";
import { DashboardCard } from "./DashboardCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useClientContext, getClientDisplayName } from "@/context/ClientContext";
import { supabase } from "@/lib/supabaseClient";

type FiscalSnapshot = {
  client_code: string;
  instance_code: string;
  snapshot_generated_at: string;
  vat_quarter_start: string;
  vat_output_qtd: number;
  vat_supported_qtd: number;
  vat_net_qtd: number;
  is_year_start: string;
  is_revenue_ytd: number;
  is_spend_ytd: number;
  is_profit_ytd: number;
  is_tax_rate: number;
  is_estimated_tax_ytd: number;
  is_has_revenue_ytd: boolean;
};

async function fetchFiscalSnapshot(clientCode: string): Promise<FiscalSnapshot | null> {
  const { data, error } = await supabase
    .schema("erp_core")
    .from("v_dashboard_fiscal_snapshot")
    .select("*")
    .eq("client_code", clientCode)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as FiscalSnapshot | null;
}

function formatCurrency(value: number, currency = "EUR"): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatQuarter(dateStr: string): string {
  const date = new Date(dateStr);
  const quarter = Math.ceil((date.getMonth() + 1) / 3);
  return `Q${quarter} ${date.getFullYear()}`;
}

export function TaxCalendarCard() {
  const { selectedClient, loading: clientsLoading } = useClientContext();
  const clientCode = selectedClient?.code ?? null;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["fiscal-snapshot", clientCode],
    queryFn: () => fetchFiscalSnapshot(clientCode as string),
    enabled: !!clientCode && !clientsLoading,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  // Loading clientes
  if (clientsLoading) {
    return (
      <DashboardCard title="Situación Fiscal" icon={Calendar}>
        <div className="space-y-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </DashboardCard>
    );
  }

  // Sin cliente seleccionado (no debería ocurrir en cliente final)
  if (!clientCode) {
    return (
      <DashboardCard title="Situación Fiscal" icon={Calendar}>
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Cargando datos fiscales...
          </p>
        </div>
      </DashboardCard>
    );
  }

  // Loading datos fiscales
  if (isLoading) {
    return (
      <DashboardCard title="Situación Fiscal" icon={Calendar}>
        <div className="space-y-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </DashboardCard>
    );
  }

  // Error
  if (isError) {
    return (
      <DashboardCard title="Situación Fiscal" icon={Calendar}>
        <div className="py-6 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-destructive mb-2" />
          <p className="text-sm font-medium text-foreground">Error al cargar datos fiscales</p>
          <p className="text-xs text-muted-foreground mt-1">{(error as Error)?.message}</p>
        </div>
      </DashboardCard>
    );
  }

  // Sin datos
  if (!data) {
    return (
      <DashboardCard title="Situación Fiscal" icon={Calendar}>
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No hay datos fiscales disponibles.
          </p>
        </div>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard title="Situación Fiscal" icon={Calendar}>
      <div className="space-y-4">
        {/* Periodo labels */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>IVA: {formatQuarter(data.vat_quarter_start)}</span>
          <span>IS: Año {new Date(data.is_year_start).getFullYear()}</span>
        </div>

        {/* IVA Section */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">IVA Trimestral</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-border p-2">
              <p className="text-[10px] text-muted-foreground">Repercutido</p>
              <p className="text-sm font-semibold text-foreground">{formatCurrency(data.vat_output_qtd)}</p>
            </div>
            <div className="rounded-lg border border-border p-2">
              <p className="text-[10px] text-muted-foreground">Soportado</p>
              <p className="text-sm font-semibold text-foreground">{formatCurrency(data.vat_supported_qtd)}</p>
            </div>
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-2">
              <p className="text-[10px] text-muted-foreground">Neto</p>
              <p className="text-sm font-semibold text-primary">{formatCurrency(data.vat_net_qtd)}</p>
            </div>
          </div>
        </div>

        {/* IS Section */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Impuesto Sociedades (YTD)</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-border p-2">
              <p className="text-[10px] text-muted-foreground">Tipo impositivo</p>
              <p className="text-sm font-semibold text-foreground">{formatPercent(data.is_tax_rate)}</p>
            </div>
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-2">
              <p className="text-[10px] text-muted-foreground">IS Estimado</p>
              <p className="text-sm font-semibold text-primary">{formatCurrency(data.is_estimated_tax_ytd)}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-[10px] text-muted-foreground text-right">
          Actualizado: {new Date(data.snapshot_generated_at).toLocaleDateString("es-ES")}
        </p>
      </div>
    </DashboardCard>
  );
}

// Keep default export for backwards compatibility
export default TaxCalendarCard;
