import { useQuery } from "@tanstack/react-query";
import { Calendar, AlertCircle } from "lucide-react";
import { DashboardCard } from "./DashboardCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useClientContext } from "@/context/ClientContext";
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

function formatCurrency(value: number | null | undefined, currency = "EUR"): string {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return `${(value * 100).toFixed(1)}%`;
}

function isValidDate(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  // Verificar que es una fecha válida y no es 1970 (epoch)
  return !isNaN(date.getTime()) && date.getFullYear() > 1970;
}

function formatQuarter(dateStr: string): string {
  const date = new Date(dateStr);
  const quarter = Math.ceil((date.getMonth() + 1) / 3);
  return `Q${quarter} ${date.getFullYear()}`;
}

// Verificar si hay base fiscal suficiente (ingresos YTD > 0, fechas válidas, datos significativos)
function hasSufficientFiscalBasis(data: FiscalSnapshot | null, hasValidVatDate: boolean, hasValidIsDate: boolean): boolean {
  if (!data) return false;
  
  // Si no hay fechas válidas, no hay base fiscal
  if (!hasValidVatDate && !hasValidIsDate) return false;
  
  // Verificar si hay ingresos YTD (indicador de actividad fiscal real)
  const hasRevenueYtd = data.is_revenue_ytd !== null && data.is_revenue_ytd !== undefined && data.is_revenue_ytd > 0;
  
  // Verificar si hay al menos algún valor fiscal significativo (no solo 0,00)
  const hasVatActivity = 
    (data.vat_output_qtd !== null && data.vat_output_qtd !== undefined && data.vat_output_qtd !== 0) ||
    (data.vat_supported_qtd !== null && data.vat_supported_qtd !== undefined && data.vat_supported_qtd !== 0) ||
    (data.vat_net_qtd !== null && data.vat_net_qtd !== undefined && data.vat_net_qtd !== 0);
  
  const hasIsActivity = 
    (data.is_estimated_tax_ytd !== null && data.is_estimated_tax_ytd !== undefined && data.is_estimated_tax_ytd !== 0);
  
  // Hay base suficiente si hay ingresos YTD O si hay actividad fiscal real
  return hasRevenueYtd || hasVatActivity || hasIsActivity;
}

export function TaxCalendarCard() {
  const { selectedClient, loading: clientsLoading, canSwitchClient } = useClientContext();
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

  // Validación de fechas
  const hasValidVatDate = isValidDate(data?.vat_quarter_start);
  const hasValidIsDate = isValidDate(data?.is_year_start);
  
  // Validación de base fiscal suficiente (modo cliente no debe ver 0,00 € sin actividad real)
  const hasFiscalBasis = hasSufficientFiscalBasis(data, hasValidVatDate, hasValidIsDate);

  // Sin datos o sin base fiscal válida - solo mostrar mensaje
  if (!data || !hasFiscalBasis) {
    return (
      <DashboardCard title="Situación Fiscal" icon={Calendar}>
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Datos fiscales no disponibles todavía
          </p>
        </div>
      </DashboardCard>
    );
  }

  // Texto de actualización solo si la fecha es válida
  const hasValidGeneratedDate = isValidDate(data.snapshot_generated_at);

  return (
    <DashboardCard title="Situación fiscal estimada" icon={Calendar}>
      <div className="space-y-4">
        {/* IVA Section */}
        {hasValidVatDate && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              IVA — estimación trimestre en curso
            </p>
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
            <p className="text-[10px] text-muted-foreground/70">
              Según facturación y gastos registrados.
            </p>
          </div>
        )}

        {/* IS Section */}
        {hasValidIsDate && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Impuesto sobre sociedades — estimación anual
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-border p-2">
                <p className="text-[10px] text-muted-foreground">Tipo</p>
                <p className="text-sm font-semibold text-foreground">{formatPercent(data.is_tax_rate)}</p>
              </div>
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-2">
                <p className="text-[10px] text-muted-foreground">IS estimado</p>
                <p className="text-sm font-semibold text-primary">{formatCurrency(data.is_estimated_tax_ytd)}</p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground/70">
              Resultado acumulado, sujeto a variaciones.
            </p>
          </div>
        )}

        {/* Footer */}
        {hasValidGeneratedDate && (
          <p className="text-[10px] text-muted-foreground text-right pt-1 border-t">
            Actualizado: {new Date(data.snapshot_generated_at).toLocaleDateString("es-ES")}
          </p>
        )}
      </div>
    </DashboardCard>
  );
}
