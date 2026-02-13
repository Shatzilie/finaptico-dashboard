import { Info, Wallet, Scale, TrendingUp } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import TreasuryCard from "@/components/dashboard/TreasuryCard";
import BalanceProjectionCard from "@/components/dashboard/BalanceProjectionCard";
import { NextActionsCard } from "@/components/dashboard/NextActionsCard";
import { TaxCalendarCard } from "@/components/dashboard/TaxCalendarCard";
import { TaxPaymentsCard } from "@/components/dashboard/TaxPaymentsCard";
import { PendingInvoicesCard } from "@/components/dashboard/PendingInvoicesCard";
import Revenue12MonthsCard from "@/components/dashboard/Revenue12MonthsCard";
import RevenueYTDCard from "@/components/dashboard/RevenueYTDCard";
import { useClientContext } from "@/context/ClientContext";

const SectionHeader = ({ icon: Icon, title }: { icon: React.ElementType; title: string }) => (
  <div className="flex items-center gap-2.5 mb-5">
    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10">
      <Icon className="h-4 w-4 text-primary" />
    </div>
    <h2 className="text-sm font-semibold text-foreground tracking-tight">{title}</h2>
  </div>
);

const Index = () => {
  const { selectedClientId } = useClientContext();

  // Dashboard completo cuando hay una empresa seleccionada (tanto client como admin)
  const showFullDashboard = !!selectedClientId;

  return (
    <DashboardLayout title="Dashboard">
      {/* ═══════════════════════════════════════════════════════════════════════
          FILA 1: CAJA — Presente + Corto plazo
          Tesorería (estrecho) | Facturas pendientes (ancho) | Evolución (medio)
      ═══════════════════════════════════════════════════════════════════════ */}
      {showFullDashboard && (
        <section className="mb-10">
          <SectionHeader icon={Wallet} title="Situación de caja" />
          
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-12">
            {/* Tesorería hoy - compacto */}
            <div className="lg:col-span-3">
              <TreasuryCard />
            </div>

            {/* Facturas pendientes - protagonista */}
            <div className="lg:col-span-5">
              <PendingInvoicesCard />
            </div>

            {/* Evolución de tesorería - medio */}
            <div className="lg:col-span-4">
              <BalanceProjectionCard />
            </div>
        </div>
      </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          FILA 2: FACTURACIÓN — Histórico 12m + YTD
          Entre Caja y Compromisos fiscales
      ═══════════════════════════════════════════════════════════════════════ */}
      {showFullDashboard && (
        <section className="mb-10">
          <SectionHeader icon={TrendingUp} title="Facturación" />
          
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            {/* Facturación últimos 12 meses - bloque ancho */}
            <div>
              <Revenue12MonthsCard />
            </div>

            {/* Facturación año en curso - bloque estrecho */}
            <div>
              <RevenueYTDCard />
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          FILA 3: COMPROMISOS FISCALES — Estimaciones + Histórico
          Misma altura y peso visual
      ═══════════════════════════════════════════════════════════════════════ */}
      {showFullDashboard && (
        <section className="mb-10">
          <SectionHeader icon={Scale} title="Compromisos fiscales" />
          
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            {/* Situación fiscal estimada */}
            <div>
              <TaxCalendarCard />
            </div>

            {/* Histórico de pagos */}
            <div>
              <TaxPaymentsCard />
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground/70 mt-4 pl-1 leading-relaxed max-w-2xl">
            Las cifras mostradas son estimaciones basadas en la información contable disponible. El cierre fiscal definitivo lo realiza la gestoría y puede incluir ajustes.
          </p>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          ACCIONES PENDIENTES
      ═══════════════════════════════════════════════════════════════════════ */}
      {showFullDashboard && (
        <div className="mt-8">
          <NextActionsCard />
        </div>
      )}

      {/* Disclaimer */}
      {showFullDashboard && (
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
          <Info className="h-3 w-3 shrink-0" />
          <span>Panel orientativo. No sustituye revisiones ni liquidaciones oficiales.</span>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Index;
