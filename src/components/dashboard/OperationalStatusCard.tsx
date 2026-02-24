// src/components/dashboard/OperationalStatusCard.tsx
// Tarjeta: Estado operativo del mes
// Fase 2 — Capa 1 de la metodología Finaptico
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useClientContext } from "../../context/ClientContext";
import { fetchWidget } from "../../lib/dashboardApi";
import { formatCurrency, formatNumber } from "../../lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { Skeleton } from "../ui/skeleton";
import { Alert, AlertDescription } from "../ui/alert";
import { ChevronDown, TrendingUp, TrendingDown, Minus } from "lucide-react";

/* ─── Types ─── */

type OperationalStatusRow = {
  client_code: string;
  month_start: string;
  month_end: string;
  month_revenue: string | number;
  month_expenses: string | number;
  month_net_result: string | number;
  cash_balance: string | number;
  pending_receivable: string | number;
  pending_payable: string | number;
  tax_estimated: string | number;
  operational_balance: string | number;
  avg_monthly_expense: string | number;
  coverage_months: string | number | null;
  expense_categories: string;
  monthly_history: string;
};

type ExpenseCategory = {
  account_code: string;
  account_name: string;
  amount: number;
};

type MonthlyPoint = {
  month: string;
  revenue: number;
  expenses: number;
};

type ChartPoint = {
  label: string;
  revenue: number;
  expenses: number;
};

/* ─── Helpers ─── */

function parseNum(raw: unknown): number {
  if (typeof raw === "number" && isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const parsed = parseFloat(raw);
    if (isFinite(parsed)) return parsed;
  }
  return 0;
}

function parseJSON<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function formatMonthLabel(monthStr: string): string {
  const d = new Date(monthStr + "-01");
  return d.toLocaleDateString("es-ES", { month: "short", year: "2-digit" });
}

function formatCurrentMonth(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
}

function formatAxisTick(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 10_000) return `${Math.round(value / 1_000)}k`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(Math.round(value));
}

/* ─── Component ─── */

export default function OperationalStatusCard() {
  const {
    selectedClient,
    loading: clientsLoading,
    error: clientsError,
  } = useClientContext();

  const clientCode = selectedClient?.code ?? null;
  const enabled = !!clientCode && !clientsLoading && !clientsError;

  const [showCategories, setShowCategories] = useState(false);

  const {
    data: rawData,
    isLoading,
    isError,
    error: queryError,
    isFetching,
  } = useQuery({
    queryKey: ["operational-status", clientCode],
    queryFn: () => fetchWidget<OperationalStatusRow>("operational_status", clientCode as string),
    enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const row = rawData && rawData.length > 0 ? rawData[0] : null;

  // Parse KPIs
  const kpis = useMemo(() => {
    if (!row) return null;
    return {
      revenue: parseNum(row.month_revenue),
      expenses: parseNum(row.month_expenses),
      netResult: parseNum(row.month_net_result),
      cashBalance: parseNum(row.cash_balance),
      pendingReceivable: parseNum(row.pending_receivable),
      pendingPayable: parseNum(row.pending_payable),
      taxEstimated: parseNum(row.tax_estimated),
      operationalBalance: parseNum(row.operational_balance),
      avgMonthlyExpense: parseNum(row.avg_monthly_expense),
      coverageMonths: row.coverage_months !== null ? parseNum(row.coverage_months) : null,
    };
  }, [row]);

  // Parse expense categories
  const categories = useMemo((): ExpenseCategory[] => {
    if (!row) return [];
    return parseJSON<ExpenseCategory[]>(row.expense_categories, []);
  }, [row]);

  // Compute "Otros" (difference between total expenses and categorized)
  const { categorizedTotal, uncategorizedAmount } = useMemo(() => {
    if (!kpis || categories.length === 0) return { categorizedTotal: 0, uncategorizedAmount: 0 };
    const catTotal = categories.reduce((acc, c) => acc + c.amount, 0);
    const diff = kpis.expenses - catTotal;
    return { categorizedTotal: catTotal, uncategorizedAmount: diff > 0.01 ? diff : 0 };
  }, [kpis, categories]);

  // Parse monthly history for chart
  const chartData = useMemo((): ChartPoint[] => {
    if (!row) return [];
    const points = parseJSON<MonthlyPoint[]>(row.monthly_history, []);
    return points.map((p) => ({
      label: formatMonthLabel(p.month),
      revenue: p.revenue,
      expenses: p.expenses,
    }));
  }, [row]);

  /* ─── Loading / Error states ─── */

  if (clientsError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Estado operativo del mes</CardTitle>
          <CardDescription>No se ha podido cargar la información.</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{clientsError}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (clientsLoading || !clientCode || isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Estado operativo del mes</CardTitle>
          <CardDescription>Cargando datos operativos...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Estado operativo del mes</CardTitle>
          <CardDescription>Error al cargar los datos.</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>
              {(queryError as Error)?.message || "Error al recuperar los datos operativos."}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!kpis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Estado operativo del mes</CardTitle>
          <CardDescription>Resumen de ingresos, gastos y saldo operativo</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aún no hay datos operativos para este periodo.
          </p>
        </CardContent>
      </Card>
    );
  }

  /* ─── Derived values ─── */

  const monthLabel = row ? formatCurrentMonth(row.month_start) : "";
  const isPositiveResult = kpis.netResult >= 0;
  const isPositiveBalance = kpis.operationalBalance >= 0;

  // Coverage color
  const coverageColor = (() => {
    if (kpis.coverageMonths === null) return "text-muted-foreground";
    if (kpis.coverageMonths >= 3) return "text-emerald-400";
    if (kpis.coverageMonths >= 1) return "text-amber-400";
    return "text-red-400";
  })();

  // Net result icon
  const ResultIcon = kpis.netResult > 0 ? TrendingUp : kpis.netResult < 0 ? TrendingDown : Minus;

  /* ─── Render ─── */

  return (
    <Card className="font-sans">
      <CardHeader>
        <CardTitle>Estado operativo del mes</CardTitle>
        <CardDescription className="capitalize">{monthLabel}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* ═══ BLOQUE 1: Ingresos / Gastos / Resultado neto ═══ */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Ingresos del mes
            </p>
            <p className="text-2xl font-semibold tracking-tight text-foreground tabular-nums mt-1">
              {formatCurrency(kpis.revenue, "EUR")}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Gastos del mes
            </p>
            <p className="text-2xl font-semibold tracking-tight text-foreground tabular-nums mt-1">
              {formatCurrency(kpis.expenses, "EUR")}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Resultado neto
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <ResultIcon className={`h-4 w-4 ${isPositiveResult ? "text-emerald-400" : "text-red-400"}`} />
              <p className={`text-2xl font-semibold tracking-tight tabular-nums ${
                isPositiveResult ? "text-emerald-400" : "text-red-400"
              }`}>
                {formatCurrency(kpis.netResult, "EUR")}
              </p>
            </div>
          </div>
        </div>

        {/* ═══ BLOQUE 2: Saldo operativo + Meses de cobertura ═══ */}
        <div className="border-t border-border/50 pt-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Saldo operativo estimado
              </p>
              <p className={`text-2xl font-semibold tracking-tight tabular-nums mt-1 ${
                isPositiveBalance ? "text-foreground" : "text-red-400"
              }`}>
                {formatCurrency(kpis.operationalBalance, "EUR")}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                Caja + cobros pendientes − pagos proveedores − impuestos estimados
              </p>
            </div>
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Meses de cobertura
              </p>
              <p className={`text-2xl font-semibold tracking-tight tabular-nums mt-1 ${coverageColor}`}>
                {kpis.coverageMonths !== null ? formatNumber(kpis.coverageMonths, 1) : "—"}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                {kpis.coverageMonths !== null && kpis.coverageMonths >= 3
                  ? "Cobertura holgada"
                  : kpis.coverageMonths !== null && kpis.coverageMonths >= 1
                  ? "Cobertura ajustada"
                  : kpis.coverageMonths !== null && kpis.coverageMonths < 1
                  ? "Cobertura insuficiente"
                  : "Sin datos suficientes"}
              </p>
            </div>
          </div>

          {/* Desglose del saldo operativo */}
          <div className="mt-4 grid grid-cols-4 gap-3">
            {[
              { label: "Caja", value: kpis.cashBalance, sign: "+" },
              { label: "Cobros pendientes", value: kpis.pendingReceivable, sign: "+" },
              { label: "Pagos proveedores", value: kpis.pendingPayable, sign: "−" },
              { label: "Impuestos estimados", value: kpis.taxEstimated, sign: "−" },
            ].map((item) => (
              <div key={item.label} className="bg-muted/30 rounded-lg px-3 py-2">
                <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide">
                  {item.sign} {item.label}
                </p>
                <p className="text-sm font-medium text-foreground tabular-nums mt-0.5">
                  {formatCurrency(item.value, "EUR")}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ BLOQUE 3: Desglose de gastos por categoría (colapsable) ═══ */}
        {kpis.expenses > 0 && (
          <div className="border-t border-border/50 pt-4">
            <button
              onClick={() => setShowCategories(!showCategories)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showCategories ? "rotate-180" : ""}`} />
              <span>{showCategories ? "Ocultar desglose de gastos" : "Ver desglose de gastos del mes"}</span>
            </button>

            {showCategories && (
              <div className="mt-3 space-y-2">
                {categories.map((cat) => {
                  const pct = kpis.expenses > 0 ? (cat.amount / kpis.expenses) * 100 : 0;
                  return (
                    <div key={cat.account_code} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-foreground truncate" title={cat.account_name}>
                            {cat.account_name}
                          </span>
                          <span className="text-xs text-muted-foreground tabular-nums ml-2 shrink-0">
                            {formatCurrency(cat.amount, "EUR")}
                          </span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary/60 rounded-full transition-all"
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground tabular-nums w-10 text-right shrink-0">
                        {formatNumber(pct, 0)}%
                      </span>
                    </div>
                  );
                })}

                {uncategorizedAmount > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground italic">
                          Otros / sin clasificar
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums ml-2 shrink-0">
                          {formatCurrency(uncategorizedAmount, "EUR")}
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-muted-foreground/30 rounded-full"
                          style={{ width: `${Math.min((uncategorizedAmount / kpis.expenses) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground tabular-nums w-10 text-right shrink-0">
                      {formatNumber((uncategorizedAmount / kpis.expenses) * 100, 0)}%
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══ BLOQUE 4: Gráfico tijeras 12 meses ═══ */}
        {chartData.length > 0 && (
          <div className="border-t border-border/50 pt-5">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Ingresos vs gastos — últimos 12 meses
            </p>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="opRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="opExpensesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                    opacity={0.4}
                  />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={12}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 500 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    width={65}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 500 }}
                    tickFormatter={formatAxisTick}
                  />
                  <Tooltip
                    formatter={(v: number, name: string) => [
                      formatCurrency(v, "EUR"),
                      name === "revenue" ? "Ingresos" : "Gastos",
                    ]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                      fontSize: 13,
                    }}
                    labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                  />
                  <Legend
                    verticalAlign="top"
                    height={30}
                    formatter={(value: string) => (
                      <span className="text-xs text-muted-foreground">
                        {value === "revenue" ? "Ingresos" : "Gastos"}
                      </span>
                    )}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#opRevenueGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#opExpensesGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {isFetching && (
              <p className="mt-2 text-[11px] text-muted-foreground text-right">Actualizando...</p>
            )}
          </div>
        )}

      </CardContent>
    </Card>
  );
}
