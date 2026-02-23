// src/components/dashboard/PendingInvoicesCard.tsx
// Facturas pendientes de cobro con total pendiente
import { useEffect, useMemo, useState } from "react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { useClientContext } from "@/context/ClientContext";
import { fetchWidget } from "@/lib/dashboardApi";
import { formatCurrency } from "@/lib/utils";
import { FileText } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

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
  return new Date(dateStr).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatAmount(amount: number): string {
  return formatCurrency(amount, "EUR");
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
        const data = await fetchWidget<PendingInvoice>("sales_invoices_pending", selectedClient.code);
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

  const totalPending = useMemo(() => {
    return invoices.reduce((sum, inv) => {
      const amount = typeof inv.amount_pending === "string" ? parseFloat(inv.amount_pending) : inv.amount_pending;
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0);
  }, [invoices]);

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
          No hay facturas pendientes de cobro.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Facturas emitidas que aún no se han cobrado.
            </p>
            <div className="text-right">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Total pendiente</p>
              <p className="text-lg font-semibold text-foreground tabular-nums">
                {formatAmount(totalPending)}
              </p>
            </div>
          </div>

          {/* Desktop Table */}
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
                    <TableCell className="px-2 py-2 max-w-[120px] truncate text-muted-foreground text-sm" title={invoice.customer_name}>
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

          {/* Mobile Stacked Layout */}
          <div className="md:hidden space-y-3">
            {displayedInvoices.map((invoice, idx) => (
              <div key={`mobile-${invoice.invoice_number}-${idx}`} className="border border-border/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground truncate max-w-[60%]" title={invoice.customer_name}>
                    {invoice.customer_name}
                  </span>
                  <span className="text-sm font-medium text-foreground whitespace-nowrap">
                    {invoice.invoice_number}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground tabular-nums">
                    {formatAmount(invoice.amount_pending)}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground tabular-nums">{formatDate(invoice.due_date)}</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted/60 text-muted-foreground">
                      {formatDaysLabel(invoice.days_to_due)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-1 pt-1">
            {hasMore && (
              <p className="text-xs text-muted-foreground/60 text-center">
                Mostrando {MAX_VISIBLE_ROWS} de {invoices.length} facturas pendientes.
              </p>
            )}
          </div>
        </div>
      )}
    </DashboardCard>
  );
}
