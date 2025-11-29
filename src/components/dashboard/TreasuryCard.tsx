import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CLIENT_OPTIONS = ["CLIENT_001", "CLIENT_002"] as const;

type TreasuryRow = {
  client_code: string;
  instance_code: string;
  snapshot_date: string;
  total_balance: string;
  currency: string;
};

export function TreasuryCard() {
  const [selectedClient, setSelectedClient] = useState<string>(CLIENT_OPTIONS[0]);
  const [data, setData] = useState<TreasuryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthError, setIsAuthError] = useState(false);

  useEffect(() => {
    async function fetchTreasury() {
      try {
        setIsLoading(true);
        setError(null);
        setIsAuthError(false);

        const { data: responseData, error: invokeError } = await supabase.functions.invoke(
          "treasury-feed",
          {
            body: { client_code: selectedClient },
          }
        );

        if (invokeError) {
          if (invokeError.message?.includes("401") || invokeError.message?.includes("unauthorized")) {
            setIsAuthError(true);
            throw new Error("Sesión no válida o caducada, vuelve a iniciar sesión");
          }
          throw new Error(invokeError.message);
        }

        setData(responseData as TreasuryRow[]);
      } catch (e: any) {
        setError(e.message ?? "Error desconocido al cargar tesorería");
      } finally {
        setIsLoading(false);
      }
    }

    fetchTreasury();
  }, [selectedClient]);

  return (
    <Card className="animate-fade-in">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
            <Wallet className="h-4 w-4 text-primary" />
          </div>
          <CardTitle className="text-base font-semibold text-foreground">Tesorería</CardTitle>
        </div>
        <Select value={selectedClient} onValueChange={setSelectedClient}>
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CLIENT_OPTIONS.map((client) => (
              <SelectItem key={client} value={client} className="text-xs">
                {client}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {/* Loading state */}
        {isLoading && (
          <p className="text-sm text-muted-foreground">Cargando tesorería...</p>
        )}

        {/* Error state - Auth specific */}
        {!isLoading && error && isAuthError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3">
            <p className="text-sm font-medium text-destructive">Sesión no válida</p>
            <p className="text-xs text-destructive/80">{error}</p>
          </div>
        )}

        {/* Error state - General */}
        {!isLoading && error && !isAuthError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3">
            <p className="text-sm font-medium text-destructive">No se ha podido cargar la tesorería</p>
            <p className="text-xs text-destructive/80">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && data.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Todavía no hay datos de tesorería guardados.
          </p>
        )}

        {/* Data table */}
        {!isLoading && !error && data.length > 0 && (
          <div className="overflow-x-auto">
            {data.filter(row => row.client_code === selectedClient).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay datos de tesorería para el cliente seleccionado.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-2 pr-4 text-left font-medium text-muted-foreground">Cliente</th>
                    <th className="py-2 pr-4 text-left font-medium text-muted-foreground">Instancia</th>
                    <th className="py-2 pr-4 text-left font-medium text-muted-foreground">Fecha</th>
                    <th className="py-2 text-right font-medium text-muted-foreground">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {data
                    .filter(row => row.client_code === selectedClient)
                    .map((row, index) => (
                      <tr 
                        key={`${row.client_code}-${row.instance_code}-${index}`}
                        className="border-b border-border/50 last:border-0"
                      >
                        <td className="py-2 pr-4 text-foreground">{row.client_code}</td>
                        <td className="py-2 pr-4 text-foreground">{row.instance_code}</td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {new Date(row.snapshot_date).toLocaleDateString("es-ES")}
                        </td>
                        <td className="py-2 text-right font-semibold text-primary">
                          {new Intl.NumberFormat("es-ES", { 
                            style: "currency", 
                            currency: row.currency 
                          }).format(Number(row.total_balance))}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
