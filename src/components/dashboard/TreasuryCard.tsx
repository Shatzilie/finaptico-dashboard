import React, { useEffect, useState } from "react";

type TreasuryRow = {
  client_code: string;
  instance_code: string;
  snapshot_date: string;
  total_balance: number;
  currency: string;
};

const TREASURY_URL = "https://utwhvnafvtardndgkbjn.functions.supabase.co/treasury-feed";

const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0d2h2bmFmdnRhcmRuZGdrYmpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1MTQ3NDcsImV4cCI6MjA3MzA5MDc0N30.2oV-SA1DS-nM72udb-I_IGYM1vIRxRp66np3N_ZVYbY";

export function TreasuryCard() {
  const [data, setData] = useState<TreasuryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(TREASURY_URL, {
          headers: {
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        });

        if (!res.ok) {
          throw new Error(`Error ${res.status}`);
        }

        const rows: TreasuryRow[] = await res.json();
        setData(rows);
      } catch (e: any) {
        setError(e.message ?? "Error cargando tesorería");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const today = data[0]?.snapshot_date ?? null;

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#111827]">Tesorería</h3>
          {today && <p className="text-xs text-[#6B7280]">Saldo total por empresa · {today}</p>}
        </div>
      </div>

      {loading && <p className="text-xs text-[#6B7280]">Cargando datos de tesorería…</p>}

      {error && !loading && <p className="text-xs text-red-500">No se ha podido cargar la tesorería ({error})</p>}

      {!loading && !error && data.length === 0 && (
        <p className="text-xs text-[#6B7280]">Todavía no hay saldos registrados en el ERP.</p>
      )}

      {!loading && !error && data.length > 0 && (
        <div className="flex flex-col gap-2">
          {data.map((row) => (
            <div
              key={`${row.client_code}-${row.instance_code}`}
              className="flex items-center justify-between rounded-md bg-white/60 px-3 py-2 shadow-sm"
            >
              <div className="flex flex-col">
                <span className="text-xs font-medium text-[#4B5563]">
                  {row.client_code} · {row.instance_code}
                </span>
                <span className="text-[11px] text-[#6B7280]">Saldo consolidado</span>
              </div>
              <div className="text-sm font-semibold text-[#6C5CE7]">
                {row.total_balance.toLocaleString("es-ES", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                {row.currency}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
