// src/components/dashboard/TaxCalendarCard.tsx
// Tarjeta fiscal unificada: estimaciones + pagos realizados
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, AlertCircle, CheckCircle2 } from "lucide-react";
import { DashboardCard } from "./DashboardCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useClientContext } from "@/context/ClientContext";
import { fetchWidget } from "@/lib/dashboardApi";
import { formatCurrency, formatNumber } from "@/lib/utils";

/* ─── Types ─── */

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
  entity_type: string | null;
  m130_revenue_ytd: string | number | null;
  m130_expenses_ytd: string | number | null;
  m130_profit_ytd: string | number | null;
  m130_gross_tax_ytd: string | number | null;
  m130_prior_payments_ytd: string | number | null;
  m130_withholdings_ytd: string | number | null;
  m130_estimated_payment: string | number | null;
};

type TaxPayment = {
  id: string;
  tax_model_code: string;
  period_start: string;
  period_end: string;
  status: string;
  result: string;
  amount: number;
  currency: string;
  settled_at: string;
  notes: string | null;
};

/* ─── Helpers ─── */

function parseNumericValue(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(parsed) ? null : parsed;
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
  return (revenueYtd !== null && revenueYtd > 0) ||
    (vatOutput !== null && vatOutput !== 0) ||
    (vatSupported !== null && vatSupported !== 0) ||
    (vatNet !== null && vatNet !== 0) ||
    (isTax !== null && isTax !== 0);
}

function getQuarterLabel(dateStr: string | null | undefined): string {
  if (!dateStr) return "trimestre en curso";
  const d = new Date(dateStr);
  const q = Math.ceil((d.getMonth() + 1) / 3);
  return `Q${q} ${d.getFullYear()}`;
}

function formatPaymentPeriod(periodEnd: string): string {
  const date = new Date(periodEnd);
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  let quarter: string;
  if (month <= 3) quarter = "Q1";
  else if (month <= 6) quarter = "Q2";
  else if (month <= 9) quarter = "Q3";
  else quarter = "Q4";
  return `${quarter} ${year}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function StatusPill({ label, variant }: { label: string; variant: 'pay' | 'refund' | 'neutral' }) {
  const colors = {
    pay: 'bg-primary/10 text-primary',
    refund: 'bg-emerald-500/10 text-emerald-400',
    neutral: 'bg-muted text-muted-foreground',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${colors[variant]}`}>
      {label}
    </span>
  );
}

/* ─── Component ─── */

export function TaxCalendarCard() {
  const { selectedClient, loading: clientsLoading } = useClientContext();
  const clientCode = selectedClient?.code ?? null;

  // Fiscal snapshot
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["fiscal-current-snapshot", clientCode],
    queryFn: () => fetchFiscalSnapshot(clientCode as string),
    enabled: !!clientCode && !clientsLoading,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  // Tax payments
  const [taxPayments, setTaxPayments] = useState<TaxPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  useEffect(() => {
    if (clientsLoading || !clientCode) {
      setTaxPayments([]);
      return;
    }

    const loadPayments = async () => {
      setPaymentsLoading(true);
      try {
        const result = await fetchWidget<TaxPayment>("tax_payments_settled", clientCode);
        setTaxPayments(Array.isArray(result) ? result : []);
      } catch {
        setTaxPayments([]);
      } finally {
        setPaymentsLoading(false);
      }
    };

    loadPayments();
  }, [clientCode, clientsLoading]);

  /* ─── Loading ─── */

  if (clientsLoading || isLoading) {
    return (
      <DashboardCard title="Situación fiscal estimada" icon={Calendar}>
        <div className="space-y-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </DashboardCard>
    );
  }

  if (!clientCode) {
    return (
      <DashboardCard title="Situación fiscal estimada" icon={Calendar}>
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">Cargando datos fiscales...</p>
        </div>
      </DashboardCard>
    );
  }

  if (isError) {
    return (
      <DashboardCard title="Situación fiscal estimada" icon={Calendar}>
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
      <DashboardCard title="Situación fiscal estimada" icon={Calendar}>
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">Datos fiscales no disponibles todavía</p>
        </div>

        {/* Payments even without fiscal data */}
        {taxPayments.length > 0 && (
          <TaxPaymentsSection payments={taxPayments} loading={paymentsLoading} />
        )}
      </DashboardCard>
    );
  }

  const isAutonoma = data.entity_type === 'autonoma';

  const vatOutput = parseNumericValue(data.vat_output_qtd);
  const vatSupported = parseNumericValue(data.vat_supported_qtd);
  const vatNet = parseNumericValue(data.vat_net_qtd);
  const isEstimatedTax = parseNumericValue(data.is_estimated_tax_ytd);
  const isRevenue = parseNumericValue(data.is_revenue_ytd);
  const isSpend = parseNumericValue(data.is_spend_ytd);
  const isProfit = parseNumericValue(data.is_profit_ytd);

  const irpfPayroll = Math.abs(parseNumericValue(data.irpf_estimated_payroll_qtd) ?? 0);
  const irpfInvoices = Math.abs(parseNumericValue(data.irpf_estimated_invoices_qtd) ?? 0);
  const irpfPurchases = Math.abs(parseNumericValue(data.irpf_estimated_purchases_qtd) ?? 0);
  const irpfFacturas = irpfInvoices + irpfPurchases;
  const irpfTotal = irpfPayroll + irpfFacturas;

  const m130Revenue = parseNumericValue(data.m130_revenue_ytd);
  const m130Expenses = parseNumericValue(data.m130_expenses_ytd);
  const m130Profit = parseNumericValue(data.m130_profit_ytd);
  const m130GrossTax = parseNumericValue(data.m130_gross_tax_ytd);
  const m130PriorPayments = parseNumericValue(data.m130_prior_payments_ytd);
  const m130Withholdings = parseNumericValue(data.m130_withholdings_ytd);
  const m130EstimatedPayment = parseNumericValue(data.m130_estimated_payment);

  const quarterLabel = getQuarterLabel(data.vat_quarter_start);
  const hasValidGeneratedDate = isValidDate(data.snapshot_generated_at);

  const vatIsRefund = (vatNet ?? 0) < 0;
  const vatAbsNet = Math.abs(vatNet ?? 0);
  const isProfitable = (isProfit ?? 0) > 0;

  return (
    <DashboardCard title="Situación fiscal estimada" icon={Calendar}>
      <p className="text-xs text-muted-foreground mb-5">
        Estimación de impuestos del trimestre según la contabilidad actual.
      </p>

      <div className="space-y-6">

        {/* ═══ IVA ═══ */}
        {hasValidVatDate && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Resultado IVA del trimestre — {quarterLabel}</p>
              <StatusPill
                label={vatIsRefund ? 'A compensar' : vatAbsNet === 0 ? 'Sin actividad' : 'A ingresar'}
                variant={vatIsRefund ? 'refund' : vatAbsNet === 0 ? 'neutral' : 'pay'}
              />
            </div>

            <div className={`rounded-lg p-4 ${
              vatIsRefund
                ? 'border border-emerald-500/20 bg-emerald-500/5'
                : 'border border-primary/20 bg-primary/5 dark:bg-primary/10'
            }`}>
              <p className="text-xs text-muted-foreground">
                {vatIsRefund
                  ? 'IVA a compensar en trimestres futuros'
                  : 'IVA a ingresar este trimestre'}
              </p>
              <p className={`text-xl font-semibold tabular-nums mt-1 ${
                vatIsRefund ? 'text-emerald-400' : 'text-primary'
              }`}>
                {formatCurrency(vatAbsNet)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border/50 p-3">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">IVA cobrado a clientes</p>
                <p className="text-sm font-semibold text-foreground tabular-nums mt-1">{formatCurrency(vatOutput)}</p>
              </div>
              <div className="rounded-lg border border-border/50 p-3">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">IVA pagado en gastos</p>
                <p className="text-sm font-semibold text-foreground tabular-nums mt-1">{formatCurrency(vatSupported)}</p>
              </div>
            </div>
          </div>
        )}

        {/* ═══ MODELO 130 (autónomas) ═══ */}
        {isAutonoma && m130Revenue !== null && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Pago fraccionado IRPF — Modelo 130 ({quarterLabel})</p>
              <StatusPill label="A ingresar" variant="pay" />
            </div>

            <div className="rounded-lg border border-primary/20 bg-primary/5 dark:bg-primary/10 p-4">
              <p className="text-xs text-muted-foreground">Pago fraccionado estimado este trimestre</p>
              <p className="text-xl font-semibold text-primary tabular-nums mt-1">{formatCurrency(m130EstimatedPayment)}</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-border/50 p-3">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Ingresos acum.</p>
                <p className="text-sm font-semibold text-foreground tabular-nums mt-1">{formatCurrency(m130Revenue)}</p>
              </div>
              <div className="rounded-lg border border-border/50 p-3">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Gastos acum.</p>
                <p className="text-sm font-semibold text-foreground tabular-nums mt-1">{formatCurrency(m130Expenses)}</p>
              </div>
              <div className="rounded-lg border border-border/50 p-3">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Beneficio</p>
                <p className="text-sm font-semibold text-foreground tabular-nums mt-1">{formatCurrency(m130Profit)}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-border/50 p-3">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">20% beneficio</p>
                <p className="text-sm font-semibold text-foreground tabular-nums mt-1">{formatCurrency(m130GrossTax)}</p>
              </div>
              <div className="rounded-lg border border-border/50 p-3">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Retenciones</p>
                <p className="text-sm font-semibold text-foreground tabular-nums mt-1">-{formatCurrency(m130Withholdings)}</p>
              </div>
              <div className="rounded-lg border border-border/50 p-3">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">130 anteriores</p>
                <p className="text-sm font-semibold text-foreground tabular-nums mt-1">-{formatCurrency(m130PriorPayments)}</p>
              </div>
            </div>
          </div>
        )}

        {/* ═══ IRPF para SLs (modelo 111) ═══ */}
        {!isAutonoma && irpfTotal > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Retenciones IRPF — Modelo 111 ({quarterLabel})</p>
              <StatusPill label="A ingresar" variant="pay" />
            </div>

            <div className="rounded-lg border border-primary/20 bg-primary/5 dark:bg-primary/10 p-4">
              <p className="text-xs text-muted-foreground">Retenciones IRPF a ingresar</p>
              <p className="text-xl font-semibold text-primary tabular-nums mt-1">{formatCurrency(irpfTotal)}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border/50 p-3">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">De nóminas</p>
                <p className="text-sm font-semibold text-foreground tabular-nums mt-1">{formatCurrency(irpfPayroll)}</p>
              </div>
              <div className="rounded-lg border border-border/50 p-3">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">De facturas de profesionales</p>
                <p className="text-sm font-semibold text-foreground tabular-nums mt-1">{formatCurrency(irpfFacturas)}</p>
              </div>
            </div>
          </div>
        )}

        {/* ═══ IS (solo SLs) ═══ */}
        {hasValidIsDate && !isAutonoma && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Impuesto de Sociedades — {new Date().getFullYear()}</p>
              <StatusPill
                label={isProfitable ? 'Beneficio' : 'Pérdidas'}
                variant={isProfitable ? 'pay' : 'refund'}
              />
            </div>

            <div className={`rounded-lg p-4 ${
              isProfitable
                ? 'border border-primary/20 bg-primary/5 dark:bg-primary/10'
                : 'border border-emerald-500/20 bg-emerald-500/5'
            }`}>
              <p className="text-xs text-muted-foreground">
                {isProfitable
                  ? 'Impuesto de Sociedades estimado a cierre de ejercicio'
                  : 'La empresa registra pérdidas. No se estima pago de IS este ejercicio'}
              </p>
              <p className={`text-xl font-semibold tabular-nums mt-1 ${
                isProfitable ? 'text-primary' : 'text-emerald-400'
              }`}>
                {isProfitable ? formatCurrency(isEstimatedTax) : formatCurrency(0)}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-border/50 p-3">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Ingresos</p>
                <p className="text-sm font-semibold text-foreground tabular-nums mt-1">{formatCurrency(isRevenue)}</p>
              </div>
              <div className="rounded-lg border border-border/50 p-3">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Gastos</p>
                <p className="text-sm font-semibold text-foreground tabular-nums mt-1">{formatCurrency(isSpend)}</p>
              </div>
              <div className="rounded-lg border border-border/50 p-3">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Resultado</p>
                <p className={`text-sm font-semibold tabular-nums mt-1 ${(isProfit ?? 0) < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {formatCurrency(isProfit)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ═══ PAGOS REALIZADOS ═══ */}
        <TaxPaymentsSection payments={taxPayments} loading={paymentsLoading} />

        {/* ═══ Footer ═══ */}
        {hasValidGeneratedDate && (
          <div className="border-t border-border/50 pt-4">
            <p className="text-[10px] text-muted-foreground text-right">
              Actualizado: <span className="text-foreground tabular-nums">{new Date(data.snapshot_generated_at).toLocaleDateString("es-ES")}</span>
            </p>
          </div>
        )}
      </div>
    </DashboardCard>
  );
}

/* ─── Sub-component: Tax Payments Section ─── */

function TaxPaymentsSection({ payments, loading }: { payments: TaxPayment[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="border-t border-border/50 pt-5 space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (payments.length === 0) return null;

  const MAX_VISIBLE = 4;
  const displayed = payments.slice(0, MAX_VISIBLE);
  const hasMore = payments.length > MAX_VISIBLE;

  return (
    <div className="border-t border-border/50 pt-5 space-y-3">
      <div className="flex items-center gap-1.5">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
        <p className="text-xs font-medium text-muted-foreground">Impuestos ya pagados este año</p>
      </div>

      <div className="space-y-2">
        {displayed.map((payment) => (
          <div
            key={payment.id}
            className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2.5"
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                Mod. {payment.tax_model_code}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {formatPaymentPeriod(payment.period_end)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-foreground tabular-nums">
                {formatCurrency(payment.amount, payment.currency || "EUR")}
              </span>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {formatDate(payment.settled_at)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <p className="text-[10px] text-muted-foreground/60 text-center">
          Mostrando {MAX_VISIBLE} de {payments.length} liquidaciones.
        </p>
      )}
    </div>
  );
}

/* ─── Data fetch ─── */

async function fetchFiscalSnapshot(clientCode: string): Promise<FiscalSnapshot | null> {
  const rows = await fetchWidget<FiscalSnapshot>("fiscal_snapshot", clientCode);
  return rows.length > 0 ? rows[0] : null;
}
