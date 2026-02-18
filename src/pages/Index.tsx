import { Info, Wallet, Scale, TrendingUp, ClipboardList } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import TreasuryCard from "@/components/dashboard/TreasuryCard";
import BalanceProjectionCard from "@/components/dashboard/BalanceProjectionCard";
import { ControlTasksCard } from "@/components/dashboard/ControlTasksCard";
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

  const showFullDashboard = !!selectedClientId;

  return (
    <DashboardLayout title="Dashboard">
      {/* ═══════════════════════════════════════════════════════════════════════
          SECCIÓN 1: PANEL DE GESTIONES (Kanban)
      ═══════════════════════════════════════════════════════════════════════ */}
      {showFullDashboard && (
        <section className="mb-10">
          <SectionHeader icon={ClipboardList} title="Panel de gestiones" />
          <ControlTasksCard />
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SECCIÓN 2: SITUACIÓN DE CAJA
          Tesorería (estrecho) | Facturas pendientes (ancho) | Evolución (medio)
      ═══════════════════════════════════════════════════════════════════════ */}
      {showFullDashboard && (
        <section className="mb-10">
          <SectionHeader icon={Wallet} title="Situación de caja" />
          
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-12">
            <div className="lg:col-span-3">
              <TreasuryCard />
            </div>

            <div className="lg:col-span-5">
              <PendingInvoicesCard />
            </div>

            <div className="lg:col-span-4">
              <BalanceProjectionCard />
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SECCIÓN 3: FACTURACIÓN — Histórico 12m + YTD
      ═══════════════════════════════════════════════════════════════════════ */}
      {showFullDashboard && (
        <section className="mb-10">
          <SectionHeader icon={TrendingUp} title="Facturación" />
          
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            <div>
              <Revenue12MonthsCard />
            </div>

            <div>
              <RevenueYTDCard />
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SECCIÓN 4: COMPROMISOS FISCALES
      ═══════════════════════════════════════════════════════════════════════ */}
      {showFullDashboard && (
        <section className="mb-10">
          <SectionHeader icon={Scale} title="Compromisos fiscales" />
          
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            <div>
              <TaxCalendarCard />
            </div>

            <div>
              <TaxPaymentsCard />
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          DISCLAIMER ÚNICO
      ═══════════════════════════════════════════════════════════════════════ */}
      {showFullDashboard && (
        <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground/60 mt-4 max-w-3xl leading-relaxed">
          <Info className="h-3 w-3 shrink-0 mt-0.5" />
          <span>
            Panel de control operativo. Finaptico supervisa y concilia tu información contable
            para asegurar la concordancia con la gestoría oficial. Las cifras fiscales son
            estimaciones basadas en la contabilidad registrada. La presentación y cierre legal
            de los modelos fiscales corresponde a la gestoría externa conforme a la normativa vigente.
          </span>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Index;
