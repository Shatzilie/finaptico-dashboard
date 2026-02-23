// src/components/dashboard/PendingInvoicesCard.tsx
// Facturas pendientes de cobro: lectura en 3 segundos + detalle colapsable
import { useEffect, useMemo, useState } from "react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { useClientContext } from "@/context/ClientContext";
import { fetchWidget } from "@/lib/dashboardApi";
import { formatCurrency } from "@/lib/utils";
import { FileText, ChevronDown } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type PendingInvoice = {
  customer_name: string;
  invoice_number: string;
  amount_pending: number | string;
  due_date: string;
  days_to_due: number;
  due_status: "on_time" | "overdue";
  client_code: string;
  instance_code: string;
};

/* ─── Helpers ─── */

function parseAmount(raw: number | string): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const parsed = parseFloat(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatAmount(amount: number): string {
  return formatCurrency(amount, "EUR");
}

function formatDaysLabel(daysToDue: number): string {
  const absDays = Math.abs(daysToDue);
  if (daysToDue === 0) return "hoy";
  if (daysToDue > 0) return `en ${absDays} días`;
  return `hace ${absDays} días`;
}

/* ─── Component ─── */

export function PendingInvoicesCard() {
  const { selectedClient, loading: clientLoading } = useClientContext();
  const [invoices, setInvoices] = useState<PendingInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);

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

  const { totalPending, totalOverdue, overdueCount } = useMemo(() => {
    let pending = 0;
    let overdue = 0;
    let countOverdue = 0;

    for (const inv of invoices) {
      const amount = parseAmount(inv.amount_pending);
      pending += amount;
      if (inv.due_status === "overdue") {
        overdue += amount;
        countOverdue++;
      }
    }

    return { totalPending: pending, totalOverdue: overdue, overdueCount: countOverdue };
  }, [invoices]);

  const hasOverdue = totalOverdue > 0;

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

          {/* ═══ KPIs principales ═══ */}
          <div className="grid grid-cols-2 gap-4">
            {/* Total pendiente */}
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Pendiente de cobro
              </p>
              <p className="text-2xl font-semibold text-foreground tabular-nums mt-1">
                {formatAmount(totalPending)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {invoices.length} {invoices.length === 1 ? "factura" : "facturas"}
              </p>
            </div>

            {/* Vencido sin cobrar */}
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Vencido sin cobrar
              </p>
              <p className={`text-2xl font-semibold tabular-nums mt-1 ${
                hasOverdue ? "text-red-400" : "text-emerald-400"
              }`}>
                {formatAmount(totalOverdue)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {hasOverdue
                  ? `${overdueCount} ${overdueCount === 1 ? "factura vencida" : "facturas vencidas"}`
                  : "Todo al día"
                }
              </p>
            </div>
          </div>

          {/* ═══ Toggle detalle ═══ */}
          <button
            onClick={() => setShowDetail(!showDetail)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full border-t border-border/50 pt-3"
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showDetail ? "rotate-180" : ""}`} />
            <span>{showDetail ? "Ocultar detalle" : "Ver detalle de facturas"}</span>
          </button>

          {/* ═══ Tabla colapsable ═══ */}
          {showDetail && (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-medium px-2 py-2 text-xs whitespace-nowrap">Cliente</TableHead>
                      <TableHead className="font-medium px-2 py-2 text-xs whitespace-nowrap">Factura</TableHead>
                      <TableHead className="font-medium px-2 py-2 text-xs text-right whitespace-nowrap">Importe</TableHead>
                      <TableHead className="font-medium px-2 py-2 text-xs whitespace-nowrap">Vencimiento</TableHead>
                      <TableHead className="font-medium px-2 py-2 text-xs whitespace-nowrap">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice, idx) => {
                      const isOverdue = invoice.due_status === "overdue";
                      return (
                        <TableRow key={`${invoice.invoice_number}-${idx}`} className="h-11">
                          <TableCell className="px-2 py-2 max-w-[120px] truncate text-muted-foreground text-sm" title={invoice.customer_name}>
                            {invoice.customer_name}
                          </TableCell>
                          <TableCell className="px-2 py-2 font-medium whitespace-nowrap text-foreground text-sm">
                            {invoice.invoice_number}
                          </TableCell>
                          <TableCell className="px-2 py-2 text-right whitespace-nowrap font-medium text-foreground tabular-nums text-sm">
                            {formatAmount(parseAmount(invoice.amount_pending))}
                          </TableCell>
                          <TableCell className="px-2 py-2 whitespace-nowrap tabular-nums text-muted-foreground text-sm">
                            {formatDate(invoice.due_date)}
                          </TableCell>
                          <TableCell className="px-2 py-2 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              isOverdue
                                ? "bg-red-500/10 text-red-400"
                                : "bg-emerald-500/10 text-emerald-400"
                            }`}>
                              {isOverdue
                                ? `Vencida ${formatDaysLabel(invoice.days_to_due)}`
                                : `Vence ${formatDaysLabel(invoice.days_to_due)}`
                              }
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Stacked Layout */}
              <div className="md:hidden space-y-3">
                {invoices.map((invoice, idx) => {
                  const isOverdue = invoice.due_status === "overdue";
                  return (
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
                          {formatAmount(parseAmount(invoice.amount_pending))}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground tabular-nums">{formatDate(invoice.due_date)}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            isOverdue
                              ? "bg-red-500/10 text-red-400"
                              : "bg-emerald-500/10 text-emerald-400"
                          }`}>
                            {isOverdue
                              ? `Vencida ${formatDaysLabel(invoice.days_to_due)}`
                              : `Vence ${formatDaysLabel(invoice.days_to_due)}`
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </DashboardCard>
  );
}
