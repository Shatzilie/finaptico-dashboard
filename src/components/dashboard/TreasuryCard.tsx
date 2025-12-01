// src/components/dashboard/TreasuryCard.tsx
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useClientContext } from '../../context/ClientContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { Alert, AlertDescription } from '../ui/alert';

type TreasuryAccount = {
  id?: string | number;
  name?: string | null;
  iban?: string | null;
  balance: number;
  currency: string;
};

type TreasuryResponse = {
  total: number;
  currency: string;
  accounts: TreasuryAccount[];
};

const SUPABASE_FUNCTION_URL = 'https://utwhvnafvtardndgkbjn.supabase.co/functions/v1/treasury-feed';

async function fetchTreasury(
  accessToken: string,
  clientId: string | number | null
): Promise<TreasuryResponse | null> {
  if (!accessToken) {
    throw new Error('No hay token de sesión');
  }

  const url = new URL(SUPABASE_FUNCTION_URL);

  if (clientId != null) {
    url.searchParams.set('client_id', String(clientId));
  }

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Error ${res.status}: ${text || 'Fallo en treasury-feed'}`);
  }

  const data = (await res.json()) as TreasuryResponse | null;
  return data;
}

export function TreasuryCard() {
  const { session } = useAuth();
  const {
    selectedClientId,
    selectedClient,
    loading: clientsLoading,
    error: clientsError,
  } = useClientContext();

  const accessToken = session?.access_token ?? null;

  const {
    data,
    isLoading,
    isError,
    error,
    isFetching,
  } = useQuery({
    queryKey: ['treasury', selectedClientId, !!accessToken],
    queryFn: () => fetchTreasury(accessToken as string, selectedClientId),
    enabled: !!accessToken && !!selectedClientId && !clientsLoading && !clientsError,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const totalFormatted = useMemo(() => {
    if (!data) return null;
    const currency = data.currency || 'EUR';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(data.total);
  }, [data]);

  const hasAccounts = data?.accounts && data.accounts.length > 0;

  // 1) Problema cargando clientes
  if (clientsError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tesorería</CardTitle>
          <CardDescription>
            No se ha podido cargar la lista de clientes.
          </CardDescription>
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
          <CardDescription>
            Cargando datos del cliente seleccionado...
          </CardDescription>
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
          <CardDescription>
            No se ha podido cargar la tesorería de este cliente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>
              {(error as Error)?.message || 'Error al recuperar los datos.'}
            </AlertDescription>
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
          <CardDescription>
            Consultando el saldo bancario del cliente...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  // 5) Sin datos
  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tesorería</CardTitle>
          <CardDescription>
            No hay datos de tesorería disponibles para este cliente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aún no se han registrado snapshots de tesorería en la base de datos.
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
          Saldo total actual del cliente seleccionado. Los datos se actualizan
          automáticamente desde Odoo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <p className="text-xs uppercase text-muted-foreground">
              Saldo bancario total
            </p>
            <p className="text-3xl font-semibold tracking-tight">
              {totalFormatted}
            </p>
            {isFetching && (
              <p className="mt-1 text-xs text-muted-foreground">
                Actualizando...
              </p>
            )}
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>Cliente</p>
            <p className="font-medium">
              {selectedClient.display_name ||
                selectedClient.name ||
                selectedClient.code ||
                selectedClient.id}
            </p>
          </div>
        </div>

        {hasAccounts ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Cuentas bancarias incluidas
            </p>
            <ul className="space-y-1 text-sm">
              {data.accounts.map((acc, idx) => (
                <li
                  key={acc.id ?? idx}
                  className="flex items-center justify-between rounded-md border px-2 py-1.5 text-xs"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {acc.name || 'Cuenta bancaria'}
                    </span>
                    {acc.iban && (
                      <span className="text-[11px] text-muted-foreground">
                        {acc.iban}
                      </span>
                    )}
                  </div>
                  <span className="font-mono">
                    {new Intl.NumberFormat('es-ES', {
                      style: 'currency',
                      currency: acc.currency || data.currency || 'EUR',
                      maximumFractionDigits: 0,
                    }).format(acc.balance)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            No se han encontrado cuentas bancarias asociadas a este cliente en el
            último snapshot.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
