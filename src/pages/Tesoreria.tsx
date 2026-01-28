import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { useClientContext } from "@/context/ClientContext";
import { supabase } from "@/lib/supabaseClient";
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
  
  // Determinar trimestre basado en el mes de fin de periodo
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
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: currency || "EUR",
  }).format(amount);
}

const Tesoreria = () => {
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
        const { data, error: fnError } = await supabase.functions.invoke(
          "client-tax-payments-list",
          {
            body: { client_code: selectedClient.code },
          }
        );

        if (fnError) {
          throw new Error(fnError.message);
        }

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

  return (
    <DashboardLayout title="Tesorería">
      <div className="space-y-6">
        {/* Sección: Pagos de impuestos */}
        <DashboardCard title="Pagos de impuestos" icon={Receipt}>
          {loading ? (
            <p className="text-muted-foreground text-sm">Cargando...</p>
          ) : error ? (
            <p className="text-destructive text-sm">{error}</p>
          ) : taxPayments.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No hay pagos de impuestos registrados este año.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Periodo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                  <TableHead>Fecha de pago</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {taxPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">
                      {payment.tax_model_code}
                    </TableCell>
                    <TableCell>
                      {payment.notes || `Impuesto modelo ${payment.tax_model_code}`}
                    </TableCell>
                    <TableCell>{formatPeriod(payment.period_end)}</TableCell>
                    <TableCell>Pagado</TableCell>
                    <TableCell className="text-right">
                      {formatAmount(payment.amount, payment.currency)}
                    </TableCell>
                    <TableCell>{formatDate(payment.settled_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DashboardCard>
      </div>
    </DashboardLayout>
  );
};

export default Tesoreria;
