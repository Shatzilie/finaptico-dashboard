// src/components/dashboard/TreasuryCard.tsx
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useClientContext, getClientDisplayName } from "../../context/ClientContext";
import { fetchWidget } from "../../lib/dashboardApi";
import { formatCurrency } from "../../lib/utils";
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
  const rows = await fetchWidget<TreasurySnapshot>("treasury_snapshot", clientCode);
  return rows.length > 0 ? rows[0] : null;
}

export default function TreasuryCard() {
  const { selectedClientId, selectedClient, loading: clientsLoading, error: clientsError, canSwitchClient } = useClientContext();
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
    return formatCurrency(balance, data.currency || "EUR");
  }, [data]);

  const title = canSwitchClient ? "Tesorería" : "Tesorería hoy";
  const description = canSwitchClient
    ? "Saldo total del cliente seleccionado"
    : "Saldo en cuentas según información disponible";
  const amountLabel = "Saldo bancario registrado en contabilidad a la fecha indicada";
  const dateLabel = canSwitchClient ? "Fecha snapshot" : "Corresponde a movimientos contabilizados hasta";

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

  if (clientsLoading || !selectedClientId || !selectedClient) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>Cargando datos...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>No se ha podido cargar la tesorería.</CardDescription>
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
          <CardTitle>{title}</CardTitle>
          <CardDescription>Consultando el saldo bancario...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>No hay datos de tesorería disponibles.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aún no se han registrado datos de tesorería.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{amountLabel}</p>
            <p className="text-4xl font-semibold tracking-tight text-foreground dark:text-white tabular-nums">{totalFormatted}</p>
          </div>
          {canSwitchClient && (
            <div className="text-right text-xs text-muted-foreground">
              <p>Empresa</p>
              <p className="font-medium text-foreground">
                {getClientDisplayName(selectedClient)}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/50 pt-4">
          <span className="font-medium">{dateLabel}</span>
          <span className="font-semibold text-foreground tabular-nums">
            {new Date(data.snapshot_date).toLocaleDateString("es-ES")}
          </span>
        </div>

        {!canSwitchClient && (
          <p className="text-[10px] text-muted-foreground/60">
            No incluye previsiones, compromisos futuros ni validación bancaria en tiempo real.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
