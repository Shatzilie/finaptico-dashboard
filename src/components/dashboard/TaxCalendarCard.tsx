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
  vat_output_qtd: string | number;
  vat_supported_qtd: string | number;
  vat_net_qtd: string | number;
  is_year_start: string;
  is_revenue_ytd: string | number;
  is_spend_ytd: string | number;
  is_profit_ytd: string | number;
  is_tax_rate: string | number;
  is_estimated_tax_ytd: string | number;
  is_has_revenue_ytd: boolean;
  // IRPF fields from v_fiscal_current_snapshot
  irpf_estimated_total_qtd: string | number | null;
  irpf_estimated_payroll_qtd: string | number | null;
  irpf_estimated_invoices_qtd: string | number | null;
  irpf_estimated_purchases_qtd: string | number | null;
  irpf_quarter_start: string | null;
  irpf_quarter_end: string | null;
  irpf_has_breakdown: boolean | null;
};

// Helper para parsear valores numéricos que pueden venir como string desde Postgres
function parseNumericValue(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(parsed) ? null : parsed;
}

async function fetchFiscalSnapshot(clientCode: string): Promise<FiscalSnapshot | null> {
  // Usamos v_fiscal_current_snapshot que contiene todos los datos fiscales incluyendo IRPF
  const { data, error } = await supabase
    .schema("erp_core")
    .from("v_fiscal_current_snapshot")
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

// Verificar si hay base fiscal suficiente (ingresos YTD > 0, fechas válidas, datos significativos)
function hasSufficientFiscalBasis(data: FiscalSnapshot | null, hasValidVatDate: boolean, hasValidIsDate: boolean): boolean {
  if (!data) return false;
  
  // Si no hay fechas válidas, no hay base fiscal
  if (!hasValidVatDate && !hasValidIsDate) return false;
  
  const revenueYtd = parseNumericValue(data.is_revenue_ytd);
  const vatOutput = parseNumericValue(data.vat_output_qtd);
  const vatSupported = parseNumericValue(data.vat_supported_qtd);
  const vatNet = parseNumericValue(data.vat_net_qtd);
  const isTax = parseNumericValue(data.is_estimated_tax_ytd);
  
  // Verificar si hay ingresos YTD (indicador de actividad fiscal real)
  const hasRevenueYtd = revenueYtd !== null && revenueYtd > 0;
  
  // Verificar si hay al menos algún valor fiscal significativo (no solo 0,00)
  const hasVatActivity = 
    (vatOutput !== null && vatOutput !== 0) ||
    (vatSupported !== null && vatSupported !== 0) ||
    (vatNet !== null && vatNet !== 0);
  
  const hasIsActivity = isTax !== null && isTax !== 0;
  
  // Hay base suficiente si hay ingresos YTD O si hay actividad fiscal real
  return hasRevenueYtd || hasVatActivity || hasIsActivity;
}

export function TaxCalendarCard() {
  const { selectedClient, loading: clientsLoading } = useClientContext();
  const clientCode = selectedClient?.code ?? null;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["fiscal-current-snapshot", clientCode],
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

  // Parsear valores numéricos
  const vatOutput = parseNumericValue(data.vat_output_qtd);
  const vatSupported = parseNumericValue(data.vat_supported_qtd);
  const vatNet = parseNumericValue(data.vat_net_qtd);
  const isTaxRate = parseNumericValue(data.is_tax_rate);
  const isEstimatedTax = parseNumericValue(data.is_estimated_tax_ytd);
  
  // IRPF: usar campos de v_fiscal_current_snapshot
  const irpfPayroll = parseNumericValue(data.irpf_estimated_payroll_qtd);
  const irpfInvoices = parseNumericValue(data.irpf_estimated_invoices_qtd);
  const irpfTotal = parseNumericValue(data.irpf_estimated_total_qtd);

  // Texto de actualización solo si la fecha es válida
  const hasValidGeneratedDate = isValidDate(data.snapshot_generated_at);

  return (
    <DashboardCard title="Situación fiscal estimada" icon={Calendar}>
      <div className="space-y-6">
        {/* IVA Section */}
        {hasValidVatDate && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">
              IVA — estimación trimestre en curso
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-border/50 p-4">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Repercutido</p>
                <p className="text-sm font-semibold text-foreground tabular-nums mt-2">{formatCurrency(vatOutput)}</p>
              </div>
              <div className="rounded-lg border border-border/50 p-4">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Soportado</p>
                <p className="text-sm font-semibold text-foreground tabular-nums mt-2">{formatCurrency(vatSupported)}</p>
              </div>
              <div className="rounded-lg border border-primary/20 bg-primary/5 dark:bg-primary/10 p-4">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Neto</p>
                <p className="text-base font-semibold text-primary tabular-nums mt-2">{formatCurrency(vatNet)}</p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground/60">
              Según facturación y gastos registrados.
            </p>
          </div>
        )}

        {/* IRPF Section - SIEMPRE se muestra, usando campos de v_fiscal_current_snapshot */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">
            IRPF — estimación trimestre en curso
          </p>
          
          {/* Breakdown: Nóminas + Facturas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border/50 p-4">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">IRPF nóminas</p>
              <p className="text-sm font-semibold text-foreground tabular-nums mt-2">
                {irpfPayroll !== null ? formatCurrency(Math.abs(irpfPayroll)) : formatCurrency(0)}
              </p>
            </div>
            <div className="rounded-lg border border-border/50 p-4">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">IRPF facturas</p>
              <p className="text-sm font-semibold text-foreground tabular-nums mt-2">
                {irpfInvoices !== null ? formatCurrency(Math.abs(irpfInvoices)) : formatCurrency(0)}
              </p>
            </div>
          </div>
          
          {/* Total IRPF */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 dark:bg-primary/10 p-4">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Total IRPF</p>
            <p className="text-base font-semibold text-primary tabular-nums mt-2">
              {irpfTotal !== null ? formatCurrency(Math.abs(irpfTotal)) : formatCurrency(0)}
            </p>
          </div>
          
          <p className="text-[10px] text-muted-foreground/60">
            Parte del saldo actual está comprometido para cubrir IRPF. Aunque esté en cuenta, no es dinero disponible.
          </p>
        </div>

        {/* IS Section */}
        {hasValidIsDate && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">
              Impuesto sobre sociedades — estimación anual
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border/50 p-4">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Tipo</p>
                <p className="text-sm font-semibold text-foreground tabular-nums mt-2">{formatPercent(isTaxRate)}</p>
              </div>
              <div className="rounded-lg border border-primary/20 bg-primary/5 dark:bg-primary/10 p-4">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">IS estimado</p>
                <p className="text-base font-semibold text-primary tabular-nums mt-2">{formatCurrency(isEstimatedTax)}</p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground/60">
              Resultado acumulado, sujeto a variaciones.
            </p>
          </div>
        )}

        {/* Footer */}
        {hasValidGeneratedDate && (
          <p className="text-[10px] text-muted-foreground text-right pt-4 border-t border-border/50">
            <span className="font-medium">Actualizado:</span> <span className="text-foreground tabular-nums">{new Date(data.snapshot_generated_at).toLocaleDateString("es-ES")}</span>
          </p>
        )}
      </div>
    </DashboardCard>
  );
}
