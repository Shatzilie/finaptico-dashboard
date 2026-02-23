// src/components/dashboard/RevenueCard.tsx
// Tarjeta unificada: Facturación YTD + gráfico últimos 12 meses
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useClientContext } from "../../context/ClientContext";
import { fetchWidget } from "../../lib/dashboardApi";
import { formatCurrency } from "../../lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { Skeleton } from "../ui/skeleton";
import { Alert, AlertDescription } from "../ui/alert";

/* ─── Types ─── */

type RevenueRow = {
  client_code: string;
  month: string;
  total_revenue: string | number;
};

type ClientOverview = {
  client_code: string;
  sales_ytd: string | number | null;
};

type ChartPoint = {
  label: string;
  value: number;
  date: Date;
};

/* ─── Helpers ─── */

function parseNumber(raw: unknown): number {
  if (typeof raw === "number" && isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const parsed = parseFloat(raw);
    if (isFinite(parsed)) return parsed;
  }
  return 0;
}

async function fetchRevenue12Months(clientCode: string): Promise<RevenueRow[]> {
  return fetchWidget<RevenueRow>("revenue_12m", clientCode);
}

async function fetchRevenueYTD(clientCode: string): Promise<ClientOverview | null> {
  const rows = await fetchWidget<ClientOverview>("client_overview", clientCode);
  return rows.length > 0 ? rows[0] : null;
}

/* ─── Component ─── */

export default function RevenueCard() {
  const {
    selectedClientId,
    selectedClient,
    loading: clientsLoading,
    error: clientsError,
  } = useClientContext();

  const clientCode = selectedClient?.code ?? null;
  const enabled = !!clientCode && !clientsLoading && !clientsError;

  // Revenue 12 months
  const {
    data: data12m,
    isLoading: loading12m,
    isError: error12m,
    error: err12m,
    isFetching: fetching12m,
  } = useQuery({
    queryKey: ["revenue-12m", clientCode],
    queryFn: () => fetchRevenue12Months(clientCode as string),
    enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  // Revenue YTD
  const {
    data: dataYtd,
    isLoading: loadingYtd,
    isError: errorYtd,
    error: errYtd,
  } = useQuery({
    queryKey: ["revenue-ytd", clientCode],
    queryFn: () => fetchRevenueYTD(clientCode as string),
    enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  // Parse chart series
  const { series, parseError } = useMemo(() => {
    if (!data12m || data12m.length === 0) return { series: [] as ChartPoint[], parseError: null };

    const points: ChartPoint[] = [];
    let errorFound: string | null = null;

    for (const row of data12m) {
      const value = Number(row.total_revenue);
      if (!Number.isFinite(value)) {
        errorFound = `Error de parseo: "${row.total_revenue}" no es un número válido`;
        break;
      }
      const monthDate = new Date(row.month);
      const label = monthDate.toLocaleDateString("es-ES", {
        month: "short",
        year: "2-digit",
      });
      points.push({ label, value, date: monthDate });
    }

    return { series: errorFound ? [] : points, parseError: errorFound };
  }, [data12m]);

  // Total 12m
  const total12m = useMemo(() => {
    return series.reduce((acc, p) => acc + (Number.isFinite(p.value) ? p.value : 0), 0);
  }, [series]);

  // YTD amount
  const revenueYtd = useMemo(() => {
    if (!dataYtd) return 0;
    return parseNumber(dataYtd.sales_ytd);
  }, [dataYtd]);

  const isLoading = clientsLoading || !selectedClientId || !selectedClient || loading12m || loadingYtd;
  const isError = error12m || errorYtd;

  /* ─── Error states ─── */

  if (clientsError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Facturación</CardTitle>
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Facturación</CardTitle>
          <CardDescription>Cargando datos de facturación...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Facturación</CardTitle>
          <CardDescription>No se ha podido cargar la facturación.</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>
              {(err12m as Error)?.message || (errYtd as Error)?.message || "Error al recuperar los datos."}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (parseError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Facturación</CardTitle>
          <CardDescription>Error al procesar datos</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{parseError}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const hasChartData = data12m && data12m.length > 0 && series.length > 0;
  const hasYtdData = dataYtd !== null && dataYtd !== undefined;

  if (!hasChartData && !hasYtdData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Facturación</CardTitle>
          <CardDescription>Ingresos facturados en el año y últimos 12 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aún no se han registrado datos de facturación.
          </p>
        </CardContent>
      </Card>
    );
  }

  /* ─── Render ─── */

  return (
    <Card className="font-sans">
      <CardHeader>
        <CardTitle>Facturación</CardTitle>
        <CardDescription>Ingresos facturados en el año y últimos 12 meses</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* ═══ KPIs: YTD + 12m ═══ */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Facturado este año
            </p>
            <p className="text-2xl font-semibold tracking-tight text-foreground dark:text-white tabular-nums mt-1">
              {formatCurrency(revenueYtd, "EUR")}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">1 ene – hoy</p>
          </div>
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Total últimos 12 meses
            </p>
            <p className="text-2xl font-semibold tracking-tight text-foreground dark:text-white tabular-nums mt-1">
              {formatCurrency(total12m, "EUR")}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Periodo móvil</p>
          </div>
        </div>

        {/* ═══ Chart: 12 months ═══ */}
        {hasChartData && (
          <div className="border-t border-border/50 pt-5">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Facturación mensual — últimos 12 meses
            </p>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
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
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 500 }}
                    tickFormatter={(value: number) => formatCurrency(value, "EUR")}
                  />
                  <Tooltip
                    formatter={(v) => formatCurrency(Number(v), "EUR")}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                      fontSize: 13,
                    }}
                    labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#revenueGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {fetching12m && (
              <p className="mt-2 text-[11px] text-muted-foreground text-right">Actualizando...</p>
            )}
          </div>
        )}

      </CardContent>
    </Card>
  );
}
