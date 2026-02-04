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
  if (daysToDue === 0) return "Hoy";
  if (daysToDue > 0) return `${absDays} días`;
  return `-${absDays} días`;
}

const MAX_VISIBLE_ROWS = 4;

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
          Todas las facturas emitidas figuran como cobradas a la fecha actual.
        </p>
      ) : (
        <div className="space-y-4">
          {/* Status message */}
          <p className="text-sm text-muted-foreground">
            Importes facturados pendientes de cobro según fechas de vencimiento registradas.
          </p>

          {/* Desktop Table - hidden on small screens */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-medium px-2 py-2 text-xs whitespace-nowrap">Cliente</TableHead>
                  <TableHead className="font-medium px-2 py-2 text-xs whitespace-nowrap">Factura</TableHead>
                  <TableHead className="font-medium px-2 py-2 text-xs text-right whitespace-nowrap">Importe</TableHead>
                  <TableHead className="font-medium px-2 py-2 text-xs whitespace-nowrap">Vencimiento</TableHead>
                  <TableHead className="font-medium px-2 py-2 text-xs whitespace-nowrap">Días</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedInvoices.map((invoice, idx) => (
                  <TableRow key={`${invoice.invoice_number}-${idx}`} className="h-11">
                    <TableCell 
                      className="px-2 py-2 max-w-[120px] truncate text-muted-foreground text-sm"
                      title={invoice.customer_name}
                    >
                      {invoice.customer_name}
                    </TableCell>
                    <TableCell className="px-2 py-2 font-medium whitespace-nowrap text-foreground text-sm">
                      {invoice.invoice_number}
                    </TableCell>
                    <TableCell className="px-2 py-2 text-right whitespace-nowrap font-medium text-foreground tabular-nums text-sm">
                      {formatAmount(invoice.amount_pending)}
                    </TableCell>
                    <TableCell className="px-2 py-2 whitespace-nowrap tabular-nums text-muted-foreground text-sm">
                      {formatDate(invoice.due_date)}
                    </TableCell>
                    <TableCell className="px-2 py-2 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted/60 text-muted-foreground">
                        {formatDaysLabel(invoice.days_to_due)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Stacked Layout - visible only on small screens */}
          <div className="md:hidden space-y-3">
            {displayedInvoices.map((invoice, idx) => (
              <div 
                key={`mobile-${invoice.invoice_number}-${idx}`}
                className="border border-border/50 rounded-lg p-3 space-y-2"
              >
                {/* Line 1: Cliente + Factura */}
                <div className="flex items-center justify-between gap-2">
                  <span 
                    className="text-sm text-muted-foreground truncate max-w-[60%]"
                    title={invoice.customer_name}
                  >
                    {invoice.customer_name}
                  </span>
                  <span className="text-sm font-medium text-foreground whitespace-nowrap">
                    {invoice.invoice_number}
                  </span>
                </div>
                {/* Line 2: Importe + Vencimiento + Días */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground tabular-nums">
                    {formatAmount(invoice.amount_pending)}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {formatDate(invoice.due_date)}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted/60 text-muted-foreground">
                      {formatDaysLabel(invoice.days_to_due)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* More indicator + limit note */}
          <div className="space-y-1 pt-1">
            {hasMore && (
              <p className="text-xs text-muted-foreground/60 text-center">
                Mostrando {MAX_VISIBLE_ROWS} de {invoices.length} facturas pendientes.
              </p>
            )}
            <p className="text-[10px] text-muted-foreground/60 text-center">
              La clasificación se basa únicamente en la fecha de vencimiento. No evalúa probabilidad de cobro ni riesgo asociado.
            </p>
          </div>
        </div>
      )}
    </DashboardCard>
  );
}
