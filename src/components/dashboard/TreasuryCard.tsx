import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet } from "lucide-react";

type TreasuryRow = {
  client_code: string;
  instance_code: string;
  snapshot_date: string;
  total_balance: number;
  currency: string;
};

const TREASURY_URL = "https://utwhvnafvtardndgkbjn.functions.supabase.co/treasury-feed";

export function TreasuryCard() {
  const [data, setData] = useState<TreasuryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTreasury() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(TREASURY_URL);

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const rows: TreasuryRow[] = await response.json();
        setData(rows);
      } catch (e: any) {
        setError(e.message ?? "Error desconocido al cargar tesorería");
      } finally {
        setIsLoading(false);
      }
    }

    fetchTreasury();
  }, []);

  return (
    <Card className="animate-fade-in">
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
          <Wallet className="h-4 w-4 text-primary" />
        </div>
        <CardTitle className="text-base font-semibold text-foreground">Tesorería</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Loading state */}
        {isLoading && (
          <p className="text-sm text-muted-foreground">Cargando tesorería...</p>
        )}

        {/* Error state */}
        {!isLoading && error && (
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
                {data.map((row, index) => (
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
                      }).format(row.total_balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
