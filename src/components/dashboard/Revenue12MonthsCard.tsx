// src/components/dashboard/Revenue12MonthsCard.tsx
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useClientContext } from "../../context/ClientContext";
import { supabase } from "../../lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { Skeleton } from "../ui/skeleton";
import { Alert, AlertDescription } from "../ui/alert";

type RevenueRow = {
  client_code: string;
  month: string;
  revenue: string | number;
  currency: string;
};

type ChartPoint = {
  label: string;
  value: number;
  date: Date;
};

function parseNumber(raw: unknown): number {
  if (typeof raw === "number" && isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const parsed = parseFloat(raw);
    if (isFinite(parsed)) return parsed;
  }
  return 0;
}

async function fetchRevenue12Months(clientCode: string): Promise<RevenueRow[]> {
  const { data, error } = await supabase
    .schema("erp_core")
    .from("v_dashboard_revenue_12m")
    .select("*")
    .eq("client_code", clientCode)
    .order("month", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as RevenueRow[];
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

  // Procesar datos para el gráfico
  const series: ChartPoint[] = useMemo(() => {
    if (!data || data.length === 0) return [];

    return data.map((row) => {
      const revenue = parseNumber(row.revenue);
      const monthDate = new Date(row.month);
      const label = monthDate.toLocaleDateString("es-ES", {
        month: "short",
        year: "2-digit",
      });

      return { label, value: revenue, date: monthDate };
    });
  }, [data]);

  // Moneda del cliente
  const currency = data?.[0]?.currency ?? "EUR";

  // Suma total de los 12 meses
  const totalRevenue = useMemo(() => {
    return series.reduce((acc, point) => acc + point.value, 0);
  }, [series]);

  // 1) Error cargando clientes
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

  // 2) Aún cargando clientes o sin cliente elegido
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

  // 3) Error al cargar historial
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

  // 4) Loading inicial
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

  // 5) Sin datos
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Facturación últimos 12 meses</CardTitle>
          <CardDescription>Ingresos por facturas emitidas</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No hay facturación registrada en los últimos 12 meses.
          </p>
        </CardContent>
      </Card>
    );
  }

  // 6) Vista normal con gráfico
  return (
    <Card className="font-sans">
      <CardHeader>
        <CardTitle>Facturación últimos 12 meses</CardTitle>
        <CardDescription>Ingresos por facturas emitidas</CardDescription>
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
                tickFormatter={(value: number) =>
                  new Intl.NumberFormat("es-ES", {
                    style: "currency",
                    currency,
                    maximumFractionDigits: 0,
                  }).format(value)
                }
              />
              <Tooltip
                formatter={(value: number) =>
                  new Intl.NumberFormat("es-ES", {
                    style: "currency",
                    currency,
                    maximumFractionDigits: 2,
                  }).format(value)
                }
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
            <p className="font-medium uppercase tracking-wide text-[10px]">Periodo</p>
            <p className="font-semibold text-foreground tabular-nums mt-1">Últimos 12 meses</p>
          </div>
          <div className="text-right">
            <p className="font-medium uppercase tracking-wide text-[10px]">Total acumulado</p>
            <p className="text-xl font-semibold text-foreground dark:text-white tabular-nums mt-1">
              {new Intl.NumberFormat("es-ES", {
                style: "currency",
                currency,
                maximumFractionDigits: 2,
              }).format(totalRevenue)}
            </p>
            {isFetching && <p className="mt-1 text-[11px] text-muted-foreground">Actualizando...</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
