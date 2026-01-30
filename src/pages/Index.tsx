import { Info, Wallet, Scale, History } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import TreasuryCard from "@/components/dashboard/TreasuryCard";
import BalanceProjectionCard from "@/components/dashboard/BalanceProjectionCard";
import { NextActionsCard } from "@/components/dashboard/NextActionsCard";
import { TaxCalendarCard } from "@/components/dashboard/TaxCalendarCard";
import { TaxPaymentsCard } from "@/components/dashboard/TaxPaymentsCard";
import { PendingInvoicesCard } from "@/components/dashboard/PendingInvoicesCard";
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
  const { canSwitchClient } = useClientContext();

  return (
    <DashboardLayout title="Dashboard">
      {/* ═══════════════════════════════════════════════════════════════════════
          BLOQUE 1: CAJA — Presente + Futuro inmediato + Movimiento
      ═══════════════════════════════════════════════════════════════════════ */}
      {!canSwitchClient && (
        <section className="mb-12">
          <SectionHeader icon={Wallet} title="Situación de caja" />
          
          <div className="grid gap-6 lg:gap-8 md:grid-cols-2 xl:grid-cols-3">
            {/* Tesorería hoy */}
            <div className="md:col-span-1">
              <TreasuryCard />
            </div>

            {/* Entradas previstas (Facturas pendientes) */}
            <div className="md:col-span-1">
              <PendingInvoicesCard />
            </div>

            {/* Evolución de tesorería */}
            <div className="md:col-span-2 xl:col-span-1">
              <BalanceProjectionCard />
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          BLOQUE 2: COMPROMISOS FISCALES — Qué parte del dinero está comprometida
      ═══════════════════════════════════════════════════════════════════════ */}
      {!canSwitchClient && (
        <section className="mb-12">
          <SectionHeader icon={Scale} title="Compromisos fiscales" />
          
          <div className="max-w-2xl">
            <TaxCalendarCard />
            <p className="text-xs text-muted-foreground/70 mt-4 pl-1 leading-relaxed">
              Las cifras mostradas son estimaciones basadas en la información contable disponible en cada momento. El cierre fiscal definitivo lo realiza la gestoría y puede incluir ajustes.
            </p>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          BLOQUE 3: HISTÓRICO — Liquidaciones ya completadas
      ═══════════════════════════════════════════════════════════════════════ */}
      {!canSwitchClient && (
        <section className="mb-8">
          <SectionHeader icon={History} title="Histórico de liquidaciones" />
          
          <div className="max-w-3xl">
            <TaxPaymentsCard />
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          ADMIN: Next Actions
      ═══════════════════════════════════════════════════════════════════════ */}
      {canSwitchClient && (
        <div className="grid gap-8 lg:gap-10 md:grid-cols-2 xl:grid-cols-3">
          <div className="md:col-span-2 xl:col-span-1">
            <TreasuryCard />
          </div>
          <div>
            <BalanceProjectionCard />
          </div>
          <div>
            <TaxCalendarCard />
          </div>
        </div>
      )}

      {canSwitchClient && (
        <div className="mt-8">
          <NextActionsCard />
        </div>
      )}

      {/* Texto global de contexto - modo cliente, posición secundaria */}
      {!canSwitchClient && (
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
          <Info className="h-3 w-3 shrink-0" />
          <span>Panel orientativo. No sustituye revisiones ni liquidaciones oficiales.</span>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Index;
