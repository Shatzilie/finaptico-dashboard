import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { DashboardCard } from "./DashboardCard";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const CLIENT_CODE = "CLIENT_001";
const TIMESERIES_URL = `https://utwhvnafvtardndgkbjn.functions.supabase.co/treasury-timeseries?client_code=${CLIENT_CODE}`;

interface TimeseriesRow {
  client_code: string;
  instance_code: string;
  snapshot_date: string;
  balance: string;
  currency: string;
}

interface ChartData {
  date: string;
  balance: number;
  formattedDate: string;
  formattedBalance: string;
}

export function BalanceProjectionCard() {
  const [data, setData] = useState<TimeseriesRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTimeseries = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch(TIMESERIES_URL);
        if (!res.ok) {
          throw new Error(`Error ${res.status}: ${res.statusText}`);
        }
        const json: TimeseriesRow[] = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTimeseries();
  }, []);

  const chartData: ChartData[] = data
    .map((row) => ({
      date: row.snapshot_date,
      balance: Number(row.balance),
      formattedDate: new Date(row.snapshot_date).toLocaleDateString("es-ES"),
      formattedBalance: new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: row.currency,
      }).format(Number(row.balance)),
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const latestData = chartData.length > 0 ? chartData[chartData.length - 1] : null;
  const currency = data.length > 0 ? data[0].currency : "EUR";

  return (
    <DashboardCard title="Proyección de Saldo" icon={TrendingUp}>
      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <p className="text-sm text-muted-foreground">Cargando proyección de saldo…</p>
        </div>
      ) : error ? (
        <div className="flex h-48 flex-col items-center justify-center gap-2">
          <p className="text-sm font-medium text-destructive">
            No se ha podido cargar la proyección de saldo
          </p>
          <p className="text-xs text-muted-foreground">{error}</p>
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex h-48 items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Todavía no tengo histórico suficiente para proyectar el saldo.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis
                  dataKey="formattedDate"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(value) =>
                    new Intl.NumberFormat("es-ES", {
                      style: "currency",
                      currency,
                      notation: "compact",
                    }).format(value)
                  }
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={70}
                />
                <Tooltip
                  formatter={(value: number) => [
                    new Intl.NumberFormat("es-ES", {
                      style: "currency",
                      currency,
                    }).format(value),
                    "Saldo",
                  ]}
                  labelFormatter={(label) => `Fecha: ${label}`}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid hsl(var(--border))",
                    backgroundColor: "hsl(var(--background))",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: "hsl(var(--primary))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {latestData && (
            <div className="flex items-center justify-between border-t border-border pt-3">
              <div>
                <p className="text-xs text-muted-foreground">Último registro</p>
                <p className="text-sm font-medium text-foreground">
                  {latestData.formattedDate}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Saldo</p>
                <p className="text-sm font-semibold text-foreground">
                  {latestData.formattedBalance}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardCard>
  );
}
