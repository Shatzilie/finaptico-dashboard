// src/components/dashboard/RevenueYTDCard.tsx
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useClientContext } from "../../context/ClientContext";
import { supabase } from "../../lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { Skeleton } from "../ui/skeleton";
import { Alert, AlertDescription } from "../ui/alert";

type FiscalSnapshot = {
  client_code: string;
  is_revenue_ytd: string | number | null;
  currency?: string;
};

function parseNumber(raw: unknown): number {
  if (typeof raw === "number" && isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const parsed = parseFloat(raw);
    if (isFinite(parsed)) return parsed;
  }
  return 0;
}

async function fetchRevenueYTD(clientCode: string): Promise<FiscalSnapshot | null> {
  const { data, error } = await supabase
    .schema("erp_core")
    .from("v_fiscal_current_snapshot")
    .select("client_code, is_revenue_ytd, currency")
    .eq("client_code", clientCode)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as FiscalSnapshot | null;
}

export default function RevenueYTDCard() {
  const {
    selectedClientId,
    selectedClient,
    loading: clientsLoading,
    error: clientsError,
  } = useClientContext();

  const clientCode = selectedClient?.code ?? null;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["revenue-ytd", clientCode],
    queryFn: () => fetchRevenueYTD(clientCode as string),
    enabled: !!clientCode && !clientsLoading && !clientsError,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const revenueFormatted = useMemo(() => {
    if (!data) return null;
    const revenue = parseNumber(data.is_revenue_ytd);
    const currency = data.currency ?? "EUR";
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(revenue);
  }, [data]);

  const currentYear = new Date().getFullYear();

  // 1) Error cargando clientes
  if (clientsError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Facturación año en curso</CardTitle>
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
          <CardTitle>Facturación año en curso</CardTitle>
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

  // 3) Error al cargar datos
  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Facturación año en curso</CardTitle>
          <CardDescription>No se ha podido cargar la facturación.</CardDescription>
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
          <CardTitle>Facturación año en curso</CardTitle>
          <CardDescription>Consultando facturación...</CardDescription>
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
          <CardTitle>Facturación año en curso</CardTitle>
          <CardDescription>Ingresos acumulados desde el 1 de enero</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aún no se han registrado datos de facturación.
          </p>
        </CardContent>
      </Card>
    );
  }

  // 6) Vista normal con datos
  return (
    <Card>
      <CardHeader>
        <CardTitle>Facturación año en curso</CardTitle>
        <CardDescription>Ingresos acumulados desde el 1 de enero</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Ingresos {currentYear}
          </p>
          <p className="text-4xl font-semibold tracking-tight text-foreground dark:text-white tabular-nums">
            {revenueFormatted}
          </p>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/50 pt-4">
          <span className="font-medium">Periodo</span>
          <span className="font-semibold text-foreground tabular-nums">
            1 ene – hoy
          </span>
        </div>

        <p className="text-[10px] text-muted-foreground/60">
          Suma de facturas emitidas en el ejercicio actual.
        </p>
      </CardContent>
    </Card>
  );
}
