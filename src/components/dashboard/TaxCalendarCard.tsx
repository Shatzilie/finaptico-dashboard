import { useQuery } from "@tanstack/react-query";
import { Calendar, AlertCircle } from "lucide-react";
import { DashboardCard } from "./DashboardCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useClientContext } from "@/context/ClientContext";
import { fetchWidget } from "@/lib/dashboardApi";
import { formatCurrency, formatNumber } from "@/lib/utils";

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
  irpf_estimated_total_qtd: string | number | null;
  irpf_estimated_payroll_qtd: string | number | null;
  irpf_estimated_invoices_qtd: string | number | null;
  irpf_estimated_purchases_qtd: string | number | null;
  irpf_quarter_start: string | null;
  irpf_quarter_end: string | null;
  irpf_has_breakdown: boolean | null;
};

type IrpfSplit = {
  client_code: string;
  irpf_payroll_qtd_due: string | number | null;
  irpf_suppliers_qtd_due: string | number | null;
  irpf_total_qtd_due: string | number | null;
};

function parseNumericValue(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(parsed) ? null : parsed;
}

async function fetchFiscalSnapshot(clientCode: string): Promise<FiscalSnapshot | null> {
  const rows = await fetchWidget<FiscalSnapshot>("fiscal_snapshot", clientCode);
  return rows.length > 0 ? rows[0] : null;
}

async function fetchIrpfSplit(clientCode: string): Promise<IrpfSplit | null> {
  const rows = await fetchWidget<IrpfSplit>("fiscal_irpf_split", clientCode);
  return rows.length > 0 ? rows[0] : null;
}

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return `${formatNumber(value * 100, 1)}%`;
}

function isValidDate(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime()) && date.getFullYear() > 1970;
}

function hasSufficientFiscalBasis(data: FiscalSnapshot | null, hasValidVatDate: boolean, hasValidIsDate: boolean): boolean {
  if (!data) return false;
  if (!hasValidVatDate && !hasValidIsDate) return false;

  const revenueYtd = parseNumericValue(data.is_revenue_ytd);
  const vatOutput = parseNumericValue(data.vat_output_qtd);
  const vatSupported = parseNumericValue(data.vat_supported_qtd);
  const vatNet = parseNumericValue(data.vat_net_qtd);
  const isTax = parseNumericValue(data.is_estimated_tax_ytd);

  const hasRevenueYtd = revenueYtd !== null && revenueYtd > 0;
  const hasVatActivity =
    (vatOutput !== null && vatOutput !== 0) ||
    (vatSupported !== null && vatSupported !== 0) ||
    (vatNet !== null && vatNet !== 0);
  const hasIsActivity = isTax !== null && isTax !== 0;

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

  const { data: irpfSplitData } = useQuery({
    queryKey: ["irpf-split", clientCode],
    queryFn: () => fetchIrpfSplit(clientCode as string),
    enabled: !!clientCode && !clientsLoading,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  if (clientsLoading) {
    return (
      <DashboardCard title="Situación Fiscal" icon={Calendar}>
        <div className="space-y-3"><Skeleton className="h-6 w-32" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" /></div>
      </DashboardCard>
    );
  }

  if (!clientCode) {
    return (
      <DashboardCard title="Situación Fiscal" icon={Calendar}>
        <div className="py-8 text-center"><p className="text-sm text-muted-foreground">Cargando datos fiscales...</p></div>
      </DashboardCard>
    );
  }

  if (isLoading) {
    return (
      <DashboardCard title="Situación Fiscal" icon={Calendar}>
        <div className="space-y-3"><Skeleton className="h-6 w-32" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" /></div>
      </DashboardCard>
    );
  }

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

  const hasValidVatDate = isValidDate(data?.vat_quarter_start);
  const hasValidIsDate = isValidDate(data?.is_year_start);
  const hasFiscalBasis = hasSufficientFiscalBasis(data, hasValidVatDate, hasValidIsDate);

  if (!data || !hasFiscalBasis) {
    return (
      <DashboardCard title="Situación Fiscal" icon={Calendar}>
        <div className="py-8 text-center"><p className="text-sm text-muted-foreground">Datos fiscales no disponibles todavía</p></div>
      </DashboardCard>
    );
  }

  const vatOutput = parseNumericValue(data.vat_output_qtd);
  const vatSupported = parseNumericValue(data.vat_supported_qtd);
  const vatNet = parseNumericValue(data.vat_net_qtd);
  const isTaxRate = parseNumericValue(data.is_tax_rate);
  const isEstimatedTax = parseNumericValue(data.is_estimated_tax_ytd);

  const irpfPayroll = Math.abs(parseNumericValue(data.irpf_estimated_payroll_qtd) ?? 0);
  const irpfSuppliers = Math.abs(parseNumericValue(irpfSplitData?.irpf_suppliers_qtd_due) ?? 0);
  const irpfTotal = irpfPayroll + irpfSuppliers;

  const hasValidGeneratedDate = isValidDate(data.snapshot_generated_at);

  return (
    <DashboardCard title="Situación fiscal estimada" icon={Calendar}>
      <p className="text-xs text-muted-foreground mb-4">Referencia según información contable registrada</p>
      <div className="space-y-6">
        {hasValidVatDate && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">IVA — estimación trimestre en curso</p>
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
            <p className="text-[10px] text-muted-foreground/60">Importes derivados de la facturación y gastos registrados en contabilidad.</p>
          </div>
        )}

        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">IRPF — estimación trimestre en curso</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border/50 p-4">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">IRPF nóminas</p>
              <p className="text-sm font-semibold text-foreground tabular-nums mt-2">{formatCurrency(irpfPayroll)}</p>
            </div>
            <div className="rounded-lg border border-border/50 p-4">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">IRPF facturas</p>
              <p className="text-sm font-semibold text-foreground tabular-nums mt-2">{formatCurrency(irpfSuppliers)}</p>
            </div>
          </div>
          <div className="rounded-lg border border-primary/20 bg-primary/5 dark:bg-primary/10 p-4">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Total IRPF</p>
            <p className="text-base font-semibold text-primary tabular-nums mt-2">{formatCurrency(irpfTotal)}</p>
          </div>
          <p className="text-[10px] text-muted-foreground/60">La información refleja el estado actual de los datos contabilizados.</p>
        </div>

        {hasValidIsDate && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Impuesto sobre sociedades — estimación anual</p>
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
            <p className="text-[10px] text-muted-foreground/60">Importes derivados de la facturación y gastos registrados en contabilidad.</p>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground/60 border-t border-border/50 pt-4">
          Puede variar por ajustes, regularizaciones o cambios posteriores en contabilidad. No equivale a una liquidación oficial ni a una presentación ante la administración.
        </p>

        {hasValidGeneratedDate && (
          <p className="text-[10px] text-muted-foreground text-right pt-4 border-t border-border/50">
            <span className="font-medium">Actualizado:</span> <span className="text-foreground tabular-nums">{new Date(data.snapshot_generated_at).toLocaleDateString("es-ES")}</span>
          </p>
        )}
      </div>
    </DashboardCard>
  );
}
