// src/pages/Index.tsx
import { Info, Wallet, Scale, TrendingUp } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import TreasuryCard from "@/components/dashboard/TreasuryCard";
import BalanceProjectionCard from "@/components/dashboard/BalanceProjectionCard";
import { ControlTasksCard } from "@/components/dashboard/ControlTasksCard";
import { TaxCalendarCard } from "@/components/dashboard/TaxCalendarCard";
import { PendingInvoicesCard } from "@/components/dashboard/PendingInvoicesCard";
import RevenueCard from "@/components/dashboard/RevenueCard";
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
          SECCIÓN 3: FACTURACIÓN — Tarjeta unificada (YTD + gráfico 12m)
      ═══════════════════════════════════════════════════════════════════════ */}
      {showFullDashboard && (
        <section className="mb-10">
          <SectionHeader icon={TrendingUp} title="Facturación" />
          <RevenueCard />
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SECCIÓN 4: COMPROMISOS FISCALES — Tarjeta unificada (estimaciones + pagos)
      ═══════════════════════════════════════════════════════════════════════ */}
      {showFullDashboard && (
        <section className="mb-10">
          <SectionHeader icon={Scale} title="Compromisos fiscales" />
          <TaxCalendarCard />
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          DISCLAIMER ÚNICO
      ═══════════════════════════════════════════════════════════════════════ */}
      {showFullDashboard && (
        <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground/60 mt-4 max-w-3xl leading-relaxed">
          <Info className="h-3 w-3 shrink-0 mt-0.5" />
          <span>
            Panel de control operativo. Finaptico supervisa y concilia la información contable
            para asegurar la concordancia con la gestoría oficial. Las cifras fiscales son
            estimaciones basadas en la contabilidad registrada, no representan validación bancaria
            en tiempo real. La presentación y cierre legal de los modelos fiscales corresponde
            a la gestoría externa conforme a la normativa vigente.
          </span>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Index;
