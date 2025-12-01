// src/components/dashboard/TreasuryCard.tsx
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";
import { useClientContext } from "../../context/ClientContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { Skeleton } from "../ui/skeleton";
import { Alert, AlertDescription } from "../ui/alert";

type TreasuryRow = {
  client_code: string;
  instance_code: string;
  snapshot_date: string;
  total_balance: string | number;
  currency: string;
};

const SUPABASE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/treasury-feed`;

// Llamada a la Edge Function: devuelve un array de filas
async function fetchTreasury(accessToken: string, clientCode: string | null): Promise<TreasuryRow[] | null> {
  if (!accessToken) {
    throw new Error("No hay token de sesión");
  }

  const url = new URL(SUPABASE_FUNCTION_URL);

  // Dejamos el parámetro por si en un futuro el backend lo usa
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
    throw new Error(`Error ${res.status}: ${text || "Fallo en treasury-feed"}`);
  }

  const data = (await res.json()) as TreasuryRow[] | null;
  return data;
}

export default function TreasuryCard() {
  const { session } = useAuth();
  const { selectedClientId, selectedClient, loading: clientsLoading, error: clientsError } = useClientContext();

  const accessToken = session?.access_token ?? null;
  const selectedClientCode = selectedClient?.code ?? (selectedClient ? String(selectedClient.id) : null);

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ["treasury", selectedClientCode, !!accessToken],
    queryFn: () => fetchTreasury(accessToken as string, selectedClientCode),
    enabled: !!accessToken && !!selectedClientId && !!selectedClientCode && !clientsLoading && !clientsError,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  // Filtramos solo las filas del cliente seleccionado
  const rowsForClient: TreasuryRow[] = useMemo(() => {
    if (!data || !selectedClientCode) return [];
    return data.filter((row) => row.client_code === selectedClientCode);
  }, [data, selectedClientCode]);

  // Calculamos total sumando total_balance (viene como string)
  const totalForClient = useMemo(() => {
    if (!rowsForClient.length) return 0;
    return rowsForClient.reduce((sum, row) => {
      const raw = row.total_balance;
      const num = typeof raw === "number" ? raw : parseFloat((raw as string | null) ?? "0") || 0;
      return sum + num;
    }, 0);
  }, [rowsForClient]);

  const currency = rowsForClient[0]?.currency || "EUR";

  const totalFormatted = useMemo(() => {
    const n = Number.isFinite(totalForClient) ? totalForClient : 0;
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(n);
  }, [totalForClient, currency]);

  const hasRows = rowsForClient.length > 0;

  // 1) Problema cargando clientes
  if (clientsError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tesorería</CardTitle>
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
          <CardTitle>Tesorería</CardTitle>
          <CardDescription>Cargando datos del cliente seleccionado...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  // 3) Error al cargar tesorería
  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tesorería</CardTitle>
          <CardDescription>No se ha podido cargar la tesorería de este cliente.</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{(error as Error)?.message || "Error al recuperar los datos."}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // 4) Loading inicial de tesorería
  if (isLoading && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tesorería</CardTitle>
          <CardDescription>Consultando el saldo bancario del cliente...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  // 5) Sin filas para ese cliente
  if (!hasRows) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tesorería</CardTitle>
          <CardDescription>No hay datos de tesorería disponibles para este cliente.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aún no se han registrado snapshots de tesorería para este cliente en la base de datos.
          </p>
        </CardContent>
      </Card>
    );
  }

  // 6) Vista normal con datos
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tesorería</CardTitle>
        <CardDescription>
          Saldo total actual del cliente seleccionado. Los datos se actualizan automáticamente desde Odoo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Saldo bancario total</p>
            <p className="text-3xl font-semibold tracking-tight">{totalFormatted}</p>
            {isFetching && <p className="mt-1 text-xs text-muted-foreground">Actualizando...</p>}
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>Cliente</p>
            <p className="font-medium">
              {selectedClient.display_name || selectedClient.name || selectedClient.code || selectedClient.id}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Instancias incluidas en el último snapshot</p>
          <ul className="space-y-1 text-sm">
            {rowsForClient.map((row, idx) => {
              const num =
                typeof row.total_balance === "number"
                  ? row.total_balance
                  : parseFloat((row.total_balance as string | null) ?? "0") || 0;

              return (
                <li
                  key={`${row.instance_code}-${idx}`}
                  className="flex items-center justify-between rounded-md border px-2 py-1.5 text-xs"
                >
                  <span className="font-medium">{row.instance_code}</span>
                  <span className="font-mono">
                    {new Intl.NumberFormat("es-ES", {
                      style: "currency",
                      currency: row.currency || currency,
                      maximumFractionDigits: 2,
                    }).format(num)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
