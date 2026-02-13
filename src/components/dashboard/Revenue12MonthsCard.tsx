// src/components/dashboard/Revenue12MonthsCard.tsx
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useClientContext } from "../../context/ClientContext";
import { fetchWidget } from "../../lib/dashboardApi";
import { formatCurrency } from "../../lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { Skeleton } from "../ui/skeleton";
import { Alert, AlertDescription } from "../ui/alert";

type RevenueRow = {
  client_code: string;
  month: string;
  total_revenue: string | number;
};

type ChartPoint = {
  label: string;
  value: number;
  date: Date;
};

async function fetchRevenue12Months(clientCode: string): Promise<RevenueRow[]> {
  return fetchWidget<RevenueRow>("revenue_12m", clientCode);
}

export default function Revenue12MonthsCard() {
  const {
    selectedClientId,
    selectedClient,
    loading: clientsLoading,
    error: clientsError,
  } = useClientContext();

  const clientCode = selectedClient?.code ?? null;

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ["revenue-12m", clientCode],
    queryFn: () => fetchRevenue12Months(clientCode as string),
    enabled: !!clientCode && !clientsLoading && !clientsError,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const { series, parseError } = useMemo(() => {
    if (!data || data.length === 0) return { series: [] as ChartPoint[], parseError: null };

    const points: ChartPoint[] = [];
    let errorFound: string | null = null;

    for (const row of data) {
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
  }, [data]);

  const totalRevenue = useMemo(() => {
    return series.reduce((acc, p) => acc + (Number.isFinite(p.value) ? p.value : 0), 0);
  }, [series]);

  if (clientsError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Facturación últimos 12 meses</CardTitle>
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

  if (clientsLoading || !selectedClientId || !selectedClient) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Facturación últimos 12 meses</CardTitle>
          <CardDescription>Cargando datos...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Facturación últimos 12 meses</CardTitle>
          <CardDescription>No se ha podido cargar el historial.</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{(error as Error)?.message || "Error al recuperar los datos."}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Facturación últimos 12 meses</CardTitle>
          <CardDescription>Consultando historial...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (parseError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Facturación últimos 12 meses</CardTitle>
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

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Facturación últimos 12 meses</CardTitle>
          <CardDescription>Facturación mensual registrada en contabilidad durante los últimos 12 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No hay facturación registrada en los últimos 12 meses.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="font-sans">
      <CardHeader>
        <CardTitle>Facturación últimos 12 meses</CardTitle>
        <CardDescription>Facturación mensual registrada en contabilidad durante los últimos 12 meses</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
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
                  fontSize: 13
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

        <div className="flex items-baseline justify-between text-xs text-muted-foreground border-t border-border/50 pt-5">
          <div>
            <p className="font-medium uppercase tracking-wide text-[10px]">Periodo mostrado</p>
            <p className="font-semibold text-foreground tabular-nums mt-1">Últimos 12 meses según fecha actual</p>
          </div>
          <div className="text-right">
            <p className="font-medium uppercase tracking-wide text-[10px]">Suma de la facturación registrada</p>
            <p className="text-xl font-semibold text-foreground dark:text-white tabular-nums mt-1">
              {formatCurrency(totalRevenue, "EUR")}
            </p>
            {isFetching && <p className="mt-1 text-[11px] text-muted-foreground">Actualizando...</p>}
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground/60">
          No incluye gastos, ajustes posteriores ni análisis de resultado.
        </p>
      </CardContent>
    </Card>
  );
}
