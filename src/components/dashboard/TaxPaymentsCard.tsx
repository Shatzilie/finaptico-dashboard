import { useEffect, useState } from "react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { useClientContext } from "@/context/ClientContext";
import { fetchWidget } from "@/lib/dashboardApi";
import { formatCurrency } from "@/lib/utils";
import { Receipt } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type TaxPayment = {
  id: string;
  tax_model_code: string;
  period_start: string;
  period_end: string;
  status: string;
  result: string;
  amount: number;
  currency: string;
  settled_at: string;
  notes: string | null;
};

function formatPeriod(periodEnd: string): string {
  const date = new Date(periodEnd);
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  
  let quarter: string;
  if (month <= 3) quarter = "Q1";
  else if (month <= 6) quarter = "Q2";
  else if (month <= 9) quarter = "Q3";
  else quarter = "Q4";
  
  return `${quarter} ${year}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatAmount(amount: number, currency: string): string {
  return formatCurrency(amount, currency || "EUR");
}

const MAX_VISIBLE_ROWS = 4;

export function TaxPaymentsCard() {
  const { selectedClient, loading: clientLoading } = useClientContext();
  const [taxPayments, setTaxPayments] = useState<TaxPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (clientLoading || !selectedClient?.code) {
      setTaxPayments([]);
      return;
    }

    const loadTaxPayments = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchWidget<TaxPayment>(
          "tax_payments_settled",
          selectedClient.code
        );

        setTaxPayments(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error loading tax payments:", err);
        setError("Error al cargar los pagos de impuestos.");
        setTaxPayments([]);
      } finally {
        setLoading(false);
      }
    };

    loadTaxPayments();
  }, [selectedClient?.code, clientLoading]);

  const displayedPayments = taxPayments.slice(0, MAX_VISIBLE_ROWS);
  const hasMore = taxPayments.length > MAX_VISIBLE_ROWS;

  return (
    <DashboardCard title="Pagos de impuestos" icon={Receipt}>
      <p className="text-xs text-muted-foreground mb-3">
        Liquidaciones registradas en el ejercicio actual
      </p>
      {loading ? (
        <p className="text-muted-foreground text-sm">Cargando...</p>
      ) : error ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : taxPayments.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No hay pagos de impuestos registrados este año.
        </p>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Pagos contabilizados correspondientes a obligaciones ya presentadas.
          </p>
          <div className="overflow-x-auto -mx-2">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-medium">Modelo</TableHead>
                  <TableHead className="font-medium">Periodo</TableHead>
                  <TableHead className="text-right font-medium">Importe</TableHead>
                  <TableHead className="font-medium">Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-semibold whitespace-nowrap text-foreground">
                      Modelo {payment.tax_model_code}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">{formatPeriod(payment.period_end)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap font-semibold text-foreground tabular-nums">
                      {formatAmount(payment.amount, payment.currency)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">{formatDate(payment.settled_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="space-y-1 pt-1">
            {hasMore && (
              <p className="text-xs text-muted-foreground/60 text-center">
                Mostrando {MAX_VISIBLE_ROWS} de {taxPayments.length} liquidaciones.
              </p>
            )}
            <p className="text-[10px] text-muted-foreground/60 text-center">
              Se muestran únicamente importes registrados como pagados. No incluye obligaciones pendientes ni importes no registrados.
            </p>
          </div>
        </div>
      )}
    </DashboardCard>
  );
}
