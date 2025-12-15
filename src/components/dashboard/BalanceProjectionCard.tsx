// src/components/dashboard/BalanceProjectionCard.tsx
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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
  last_snapshot_date?: string;
};

type ViewConfig = {
  viewName: string;
  periodField: "snapshot_date" | "week_start" | "period_start" | "month";
  dateField: "snapshot_date" | "last_snapshot_date"; // Campo real para la fecha del chart
  isMonthly: boolean;
  limit?: number;
};

/**
 * Selecciona la vista y campos según el rango de días.
 * - ≤30 días: diaria (v_treasury_client_totals)
 * - 31–60 días: semanal (v_treasury_weekly_client_totals)
 * - 61–180 días: quincenal (v_treasury_biweekly_client_totals)
 * - >180 días: mensual (v_treasury_monthly_client_totals), límite 12 puntos
 */
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
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const n = parseFloat(raw);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

async function fetchTreasuryHistory(
  clientCode: string,
  viewConfig: ViewConfig
): Promise<TreasuryRow[]> {
  const { viewName, periodField, dateField, limit } = viewConfig;

  // Construir los campos a seleccionar
  const selectFields =
    dateField === "snapshot_date"
      ? `${periodField}, total_balance, currency, client_code`
      : `${periodField}, last_snapshot_date, total_balance, currency, client_code`;

  // Ordenar por el campo de fecha real
  const orderField = dateField;

  let query = supabase
    .schema("erp_core")
    .from(viewName)
    .select(selectFields)
    .eq("client_code", clientCode)
    .order(orderField, { ascending: true });

  if (limit) {
    // Para mensual, tomamos los últimos N registros
    query = supabase
      .schema("erp_core")
      .from(viewName)
      .select(selectFields)
      .eq("client_code", clientCode)
      .order(orderField, { ascending: false })
      .limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  let rows = (data ?? []) as unknown as TreasuryRow[];

  // Si hay límite, revertimos para orden cronológico
  if (limit && rows.length > 0) {
    rows = rows.reverse();
  }

  return rows;
}

export default function BalanceProjectionCard() {
  const { session } = useAuth();
  const { selectedClientId, selectedClient, loading: clientsLoading, error: clientsError } = useClientContext();

  const accessToken = session?.access_token ?? null;
  const selectedClientCode = selectedClient?.code ?? (selectedClient ? String(selectedClient.id) : null);

  // TODO: Conectar con selector de rango global cuando esté disponible
  const daysRange = 30; // Valor por defecto: vista diaria

  const viewConfig = useMemo(() => getTreasuryView(daysRange), [daysRange]);

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ["treasury-history", selectedClientCode, viewConfig.viewName],
    queryFn: () => fetchTreasuryHistory(selectedClientCode as string, viewConfig),
    enabled: !!accessToken && !!selectedClientId && !!selectedClientCode && !clientsLoading && !clientsError,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  // Construir un punto por cada fila
  const series = useMemo(() => {
    if (!data || !data.length) return [];

    return data.map((row) => {
      const value = parseNumber(row.total_balance);

      // Fecha real para posición en el chart
      const dateStr =
        viewConfig.dateField === "snapshot_date"
          ? row.snapshot_date
          : row.last_snapshot_date;
      const date = new Date(dateStr as string);

      // Label desde el campo de periodo
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

      return {
        date,
        label,
        value,
        currency: row.currency || "EUR",
      };
    });
  }, [data, viewConfig]);

  const hasData = series.length > 0;
  const currency = series[0]?.currency || "EUR";
  const lastPoint = hasData ? series[series.length - 1] : null;

  // 1) Error cargando clientes
  if (clientsError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Proyección de Saldo</CardTitle>
          <CardDescription>No se ha podido cargar la lista de clientes.</CardDescription>
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
          <CardTitle>Proyección de Saldo</CardTitle>
          <CardDescription>Cargando datos del cliente seleccionado...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  // 3) Error al cargar la serie
  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Proyección de Saldo</CardTitle>
          <CardDescription>No se ha podido cargar la proyección de saldo de este cliente.</CardDescription>
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
  if (isLoading && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Proyección de Saldo</CardTitle>
          <CardDescription>Consultando la evolución histórica del saldo...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  // 5) Sin datos para ese cliente
  if (!hasData || !lastPoint) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Proyección de Saldo</CardTitle>
          <CardDescription>Aún no hay histórico suficiente de tesorería para este cliente.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            La gráfica se activará en cuanto haya snapshots de tesorería registrados para este cliente.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="font-sans">
      <CardHeader>
        <CardTitle className="text-[#111827] font-semibold">Proyección de Saldo</CardTitle>
        <CardDescription className="text-[#4B5563]">
          Evolución histórica del saldo bancario del cliente seleccionado.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series}>
              <defs>
                <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6C5CE7" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6C5CE7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} tick={{ fill: "#6B7280", fontSize: 12 }} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fill: "#6B7280", fontSize: 12 }}
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
                contentStyle={{ color: "#111827", fontSize: 13 }}
                labelStyle={{ color: "#4B5563" }}
              />
              <Area type="monotone" dataKey="value" stroke="#6C5CE7" strokeWidth={2} fillOpacity={1} fill="url(#balanceGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-baseline justify-between text-xs text-[#6B7280]">
          <div>
            <p>Último registro</p>
            <p className="font-medium text-[#111827]">{lastPoint.date.toLocaleDateString("es-ES")}</p>
          </div>
          <div className="text-right">
            <p>Saldo</p>
            <p className="font-semibold text-[#111827]">
              {new Intl.NumberFormat("es-ES", {
                style: "currency",
                currency,
                maximumFractionDigits: 2,
              }).format(lastPoint.value)}
            </p>
            {isFetching && <p className="mt-1 text-[11px] text-[#6B7280]">Actualizando...</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
