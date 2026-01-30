import { useEffect, useState } from "react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { useClientContext } from "@/context/ClientContext";
import { supabase } from "@/lib/supabaseClient";
import { FileText } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type PendingInvoice = {
  customer_name: string;
  invoice_number: string;
  amount_pending: number;
  due_date: string;
  days_to_due: number;
  due_status: "on_time" | "overdue";
  client_code: string;
  instance_code: string;
};

function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

function formatDaysLabel(daysToDue: number): string {
  const absDays = Math.abs(daysToDue);
  if (daysToDue >= 0) {
    return daysToDue === 0 ? "Hoy" : `${absDays} días`;
  } else {
    return `${absDays} días de retraso`;
  }
}

const MAX_VISIBLE_ROWS = 8;

export function PendingInvoicesCard() {
  const { selectedClient, loading: clientLoading } = useClientContext();
  const [invoices, setInvoices] = useState<PendingInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (clientLoading || !selectedClient?.code) {
      setInvoices([]);
      return;
    }

    const loadInvoices = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: queryError } = await supabase
          .schema("erp_core")
          .from("v_dashboard_sales_invoices_pending")
          .select("*")
          .eq("client_code", selectedClient.code)
          .order("due_date", { ascending: true });

        if (queryError) {
          throw new Error(queryError.message);
        }

        setInvoices(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error loading pending invoices:", err);
        setError("Error al cargar las facturas pendientes.");
        setInvoices([]);
      } finally {
        setLoading(false);
      }
    };

    loadInvoices();
  }, [selectedClient?.code, clientLoading]);

  const hasOverdue = invoices.some((inv) => inv.due_status === "overdue");
  const displayedInvoices = invoices.slice(0, MAX_VISIBLE_ROWS);
  const hasMore = invoices.length > MAX_VISIBLE_ROWS;

  return (
    <DashboardCard title="Facturas pendientes de cobro" icon={FileText}>
      {loading ? (
        <p className="text-muted-foreground text-sm">Cargando...</p>
      ) : error ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : invoices.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Todas las facturas emitidas están cobradas. No hay entradas pendientes en este momento.
        </p>
      ) : (
        <div className="space-y-4">
          {/* Status message */}
          <p className="text-sm text-muted-foreground">
            {hasOverdue
              ? "Hay cobros con vencimiento superado. Conviene tenerlo en cuenta al planificar la tesorería."
              : "Cobros pendientes dentro del plazo acordado."}
          </p>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Factura</TableHead>
                  <TableHead className="text-right">Importe pendiente</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Días</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedInvoices.map((invoice, idx) => (
                  <TableRow key={`${invoice.invoice_number}-${idx}`}>
                    <TableCell className="max-w-[180px] truncate">
                      {invoice.customer_name}
                    </TableCell>
                    <TableCell className="font-medium whitespace-nowrap">
                      {invoice.invoice_number}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {formatAmount(invoice.amount_pending)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(invoice.due_date)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {invoice.due_status === "overdue" ? (
                        <Badge variant="secondary" className="text-xs font-normal">
                          {formatDaysLabel(invoice.days_to_due)}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {formatDaysLabel(invoice.days_to_due)}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* More indicator */}
          {hasMore && (
            <p className="text-xs text-muted-foreground text-center pt-2">
              Mostrando {MAX_VISIBLE_ROWS} de {invoices.length} facturas pendientes.
            </p>
          )}
        </div>
      )}
    </DashboardCard>
  );
}
