// src/components/dashboard/BalanceProjectionCard.tsx
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAuth } from "../../context/AuthContext";
import { useClientContext } from "../../context/ClientContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { Skeleton } from "../ui/skeleton";
import { Alert, AlertDescription } from "../ui/alert";

type TimeseriesPoint = {
  client_code: string;
  snapshot_date: string; // ISO date
  total_balance: string | number;
  currency: string;
};

const SUPABASE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/treasury-timeseries`;

// Llamada a la Edge Function de serie temporal
async function fetchTreasuryTimeseries(
  accessToken: string,
  clientCode: string | null,
): Promise<TimeseriesPoint[] | null> {
  if (!accessToken) {
    throw new Error("No hay token de sesión");
  }

  const url = new URL(SUPABASE_FUNCTION_URL);

  // Dejamos este parámetro listo; si el backend lo ignora, no pasa nada
  if (clientCode) {
    url.searchParams.set("client_code", clientCode);
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Error ${res.status}: ${text || "Fallo en treasury-timeseries"}`);
  }

  const data = (await res.json()) as TimeseriesPoint[] | null;
  return data;
}

export default function BalanceProjectionCard() {
  const { session } = useAuth();
  const { selectedClientId, selectedClient, loading: clientsLoading, error: clientsError } = useClientContext();

  const accessToken = session?.access_token ?? null;
  const selectedClientCode = selectedClient?.code ?? (selectedClient ? String(selectedClient.id) : null);

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ["treasury-timeseries", selectedClientCode, !!accessToken],
    queryFn: () => fetchTreasuryTimeseries(accessToken as string, selectedClientCode),
    enabled: !!accessToken && !!selectedClientId && !!selectedClientCode && !clientsLoading && !clientsError,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  // Filtrar serie por cliente y ordenarla por fecha
  const seriesForClient = useMemo(() => {
    if (!data || !selectedClientCode) return [];

    return data
      .filter((row) => row.client_code === selectedClientCode)
      .map((row) => {
        const raw = row.total_balance;
        const value = typeof raw === "number" ? raw : parseFloat((raw as string | null) ?? "0") || 0;

        const date = new Date(row.snapshot_date);
        const label = date.toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "2-digit",
        });

        return {
          date,
          label,
          value,
          currency: row.currency || "EUR",
        };
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [data, selectedClientCode]);

  const hasData = seriesForClient.length > 0;
  const currency = seriesForClient[0]?.currency || "EUR";

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

  // 3) Error al cargar la serie temporal
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

  // 4) Loading inicial de la serie
  if (isLoading && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Proyección de Saldo</CardTitle>
          <CardDescription>Consultando la serie de saldo del cliente...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  // 5) Sin datos para ese cliente
  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Proyección de Saldo</CardTitle>
          <CardDescription>Aún no hay suficiente histórico de tesorería para este cliente.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            La gráfica se activará en cuanto haya más de un día de datos registrados.
          </p>
        </CardContent>
      </Card>
    );
  }

  // 6) Vista normal con gráfica
  return (
    <Card>
      <CardHeader>
        <CardTitle>Proyección de Saldo</CardTitle>
        <CardDescription>
          Evolución del saldo bancario del cliente seleccionado según los snapshots diarios registrados.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={seriesForClient}>
              <defs>
                <linearGradient id="projectionArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopOpacity={0.8} />
                  <stop offset="95%" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
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
              />
              <Area type="monotone" dataKey="value" strokeWidth={2} fillOpacity={1} fill="url(#projectionArea)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-baseline justify-between text-xs text-muted-foreground">
          <div>
            <p>Último registro</p>
            <p className="font-medium">
              {seriesForClient[seriesForClient.length - 1].date.toLocaleDateString("es-ES")}
            </p>
          </div>
          <div className="text-right">
            <p>Saldo</p>
            <p className="font-semibold">
              {new Intl.NumberFormat("es-ES", {
                style: "currency",
                currency,
                maximumFractionDigits: 2,
              }).format(seriesForClient[seriesForClient.length - 1].value)}
            </p>
            {isFetching && <p className="mt-1 text-[11px] text-muted-foreground">Actualizando...</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
