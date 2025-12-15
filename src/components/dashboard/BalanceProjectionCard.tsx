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

type TreasuryTotalRow = {
  client_code: string;
  instance_code?: string;
  snapshot_date: string;
  total_balance: string | number;
  currency: string;
};

function parseNumber(raw: unknown): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const n = parseFloat(raw);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

async function fetchTreasuryHistory(clientCode: string): Promise<TreasuryTotalRow[]> {
  const { data, error } = await supabase
    .schema("erp_core")
    .from("v_treasury_client_totals")
    .select("snapshot_date, total_balance, currency, client_code")
    .eq("client_code", clientCode)
    .order("snapshot_date", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as TreasuryTotalRow[];
}

export default function BalanceProjectionCard() {
  const { session } = useAuth();
  const { selectedClientId, selectedClient, loading: clientsLoading, error: clientsError } = useClientContext();

  const accessToken = session?.access_token ?? null;
  const selectedClientCode = selectedClient?.code ?? (selectedClient ? String(selectedClient.id) : null);

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ["treasury-history", selectedClientCode],
    queryFn: () => fetchTreasuryHistory(selectedClientCode as string),
    enabled: !!accessToken && !!selectedClientId && !!selectedClientCode && !clientsLoading && !clientsError,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  // Construir un punto por cada fila
  const series = useMemo(() => {
    if (!data || !data.length) return [];

    return data.map((row) => {
      const value = parseNumber(row.total_balance);
      const date = new Date(row.snapshot_date);

      return {
        date,
        label: date.toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "2-digit",
        }),
        value,
        currency: row.currency || "EUR",
      };
    });
  }, [data]);

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
