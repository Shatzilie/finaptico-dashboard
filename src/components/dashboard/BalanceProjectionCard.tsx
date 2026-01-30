// src/components/dashboard/BalanceProjectionCard.tsx
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useAuth } from "../../context/AuthContext";
import { useClientContext } from "../../context/ClientContext";
import { supabase } from "../../lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { Skeleton } from "../ui/skeleton";
import { Alert, AlertDescription } from "../ui/alert";

type TreasuryRow = {
  client_code: string;
  total_balance: string | number;
  currency: string;
  // Campos de fecha según la vista
  snapshot_date?: string;
  week_start?: string;
  period_start?: string;
  month?: string;
  // Campo opcional para fecha real de último snapshot
  last_snapshot_date?: string;
};

type ViewConfig = {
  viewName: string;
  periodField: keyof TreasuryRow;
  dateField: keyof TreasuryRow;
  isMonthly: boolean;
  limit?: number;
};

type ChartPoint = {
  label: string;
  value: number;
  date: Date;
};

function getTreasuryView(daysRange: number): ViewConfig {
  if (daysRange <= 30) {
    return {
      viewName: "v_treasury_client_totals",
      periodField: "snapshot_date",
      dateField: "snapshot_date",
      isMonthly: false,
    };
  }
  if (daysRange <= 60) {
    return {
      viewName: "v_treasury_weekly_client_totals",
      periodField: "week_start",
      dateField: "last_snapshot_date",
      isMonthly: false,
    };
  }
  if (daysRange <= 180) {
    return {
      viewName: "v_treasury_biweekly_client_totals",
      periodField: "period_start",
      dateField: "last_snapshot_date",
      isMonthly: false,
    };
  }
  return {
    viewName: "v_treasury_monthly_client_totals",
    periodField: "month",
    dateField: "last_snapshot_date",
    isMonthly: true,
    limit: 12,
  };
}

function parseNumber(raw: unknown): number {
  if (typeof raw === "number" && isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const parsed = parseFloat(raw);
    if (isFinite(parsed)) return parsed;
  }
  return 0;
}

async function fetchTreasuryHistory(
  clientCode: string,
  viewConfig: ViewConfig
): Promise<TreasuryRow[]> {
  const { viewName, periodField, limit } = viewConfig;

  let query = supabase
    .schema("erp_core")
    .from(viewName)
    .select("*")
    .eq("client_code", clientCode)
    .order(periodField as string, { ascending: true });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as TreasuryRow[];
}

export default function BalanceProjectionCard() {
  const { session } = useAuth();
  const {
    selectedClientId,
    selectedClient,
    loading: clientsLoading,
    error: clientsError,
    canSwitchClient,
  } = useClientContext();

  const accessToken = session?.access_token ?? null;
  const selectedClientCode = selectedClient?.code ?? (selectedClient ? String(selectedClient.id) : null);

  // TODO: Conectar con selector de rango global cuando esté disponible
  const daysRange = 30; // Valor por defecto: vista diaria

  const viewConfig = useMemo(() => getTreasuryView(daysRange), [daysRange]);

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ["treasury-history", selectedClientCode, viewConfig.viewName],
    queryFn: () => fetchTreasuryHistory(selectedClientCode as string, viewConfig),
    enabled: !!accessToken && !!selectedClientCode && !clientsLoading && !clientsError,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  // Textos adaptativos según modo (sentence case)
  const title = canSwitchClient ? "Proyección de saldo" : "Evolución de tesorería";
  const description = canSwitchClient
    ? "Evolución histórica del saldo del cliente seleccionado"
    : "Histórico para observar tendencias";
  const dateLabel = canSwitchClient ? "Último registro" : "Actualizado";
  const chartFooterText = !canSwitchClient 
    ? "Referencia visual, no es una previsión." 
    : null;

  // Procesar datos para el gráfico
  const series: ChartPoint[] = useMemo(() => {
    if (!data || data.length === 0) return [];

    return data.map((row) => {
      const balance = parseNumber(row.total_balance);
      let label: string;
      if (viewConfig.isMonthly) {
        // MMM/YY desde month
        const monthDate = new Date(row.month as string);
        label = monthDate.toLocaleDateString("es-ES", {
          month: "short",
          year: "2-digit",
        });
      } else {
        // DD/MM desde el campo de periodo correspondiente
        const periodStr = row[viewConfig.periodField] as string;
        const periodDate = new Date(periodStr);
        label = periodDate.toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "2-digit",
        });
      }

      // Fecha para ordenar y mostrar en tooltip
      const dateField = row[viewConfig.dateField] ?? row[viewConfig.periodField];
      const date = new Date(dateField as string);

      return { label, value: balance, date };
    });
  }, [data, viewConfig]);

  // Último punto para mostrar en footer
  const lastPoint: ChartPoint = series.length > 0
    ? series[series.length - 1]
    : { label: "-", value: 0, date: new Date() };

  // Moneda del cliente
  const currency = data?.[0]?.currency ?? "EUR";

  // 1) Error cargando clientes
  if (clientsError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
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
          <CardTitle>{title}</CardTitle>
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
          <CardTitle>{title}</CardTitle>
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
          <CardTitle>{title}</CardTitle>
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
          <CardTitle>{title}</CardTitle>
          <CardDescription>No hay datos históricos disponibles.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aún no hay registros de tesorería.
          </p>
        </CardContent>
      </Card>
    );
  }

  // 6) Vista normal con gráfico
  return (
    <Card className="font-sans">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series}>
              <defs>
                <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
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
                fill="url(#balanceGradient)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Nota bajo el gráfico - solo modo cliente */}
        {chartFooterText && (
          <p className="text-[10px] text-muted-foreground/60">
            {chartFooterText}
          </p>
        )}

        <div className="flex items-baseline justify-between text-xs text-muted-foreground border-t border-border/50 pt-5">
          <div>
            <p className="font-medium uppercase tracking-wide text-[10px]">{dateLabel}</p>
            <p className="font-semibold text-foreground tabular-nums mt-1">{lastPoint.date.toLocaleDateString("es-ES")}</p>
          </div>
          <div className="text-right">
            <p className="font-medium uppercase tracking-wide text-[10px]">Saldo</p>
            <p className="text-xl font-semibold text-foreground dark:text-white tabular-nums mt-1">
              {new Intl.NumberFormat("es-ES", {
                style: "currency",
                currency,
                maximumFractionDigits: 2,
              }).format(lastPoint.value)}
            </p>
            {isFetching && <p className="mt-1 text-[11px] text-muted-foreground">Actualizando...</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
