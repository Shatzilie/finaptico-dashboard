// src/components/dashboard/TreasuryCard.tsx
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useClientContext } from "../../context/ClientContext";
import { supabase } from "../../lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { Skeleton } from "../ui/skeleton";
import { Alert, AlertDescription } from "../ui/alert";

type TreasurySnapshot = {
  client_code: string;
  snapshot_date: string;
  total_balance: number;
  currency: string;
  snapshot_generated_at: string;
};

async function fetchTreasurySnapshot(clientCode: string): Promise<TreasurySnapshot | null> {
  const { data, error } = await supabase
    .schema("erp_core")
    .from("v_dashboard_treasury_snapshot")
    .select("client_code, snapshot_date, total_balance, currency, snapshot_generated_at")
    .eq("client_code", clientCode)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as TreasurySnapshot | null;
}

export default function TreasuryCard() {
  const { selectedClientId, selectedClient, loading: clientsLoading, error: clientsError } = useClientContext();
  const clientCode = selectedClient?.code ?? null;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["treasury-snapshot", clientCode],
    queryFn: () => fetchTreasurySnapshot(clientCode as string),
    enabled: !!clientCode && !clientsLoading && !clientsError,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const totalFormatted = useMemo(() => {
    if (!data) return null;
    const balance = typeof data.total_balance === "number" ? data.total_balance : parseFloat(String(data.total_balance)) || 0;
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: data.currency || "EUR",
      maximumFractionDigits: 2,
    }).format(balance);
  }, [data]);

  // 1) Error cargando clientes
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
  if (isLoading) {
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

  // 5) Sin datos para ese cliente
  if (!data) {
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
          Saldo total actual del cliente seleccionado.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Saldo bancario total</p>
            <p className="text-3xl font-semibold tracking-tight">{totalFormatted}</p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>Cliente</p>
            <p className="font-medium">
              {selectedClient.label || selectedClient.code || selectedClient.id}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
          <span>Fecha snapshot</span>
          <span className="font-medium">
            {new Date(data.snapshot_date).toLocaleDateString("es-ES")}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
