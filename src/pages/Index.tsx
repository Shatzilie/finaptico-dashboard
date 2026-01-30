import { Info } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import TreasuryCard from "@/components/dashboard/TreasuryCard";
import BalanceProjectionCard from "@/components/dashboard/BalanceProjectionCard";
import { NextActionsCard } from "@/components/dashboard/NextActionsCard";
import { TaxCalendarCard } from "@/components/dashboard/TaxCalendarCard";
import { TaxPaymentsCard } from "@/components/dashboard/TaxPaymentsCard";
import { PendingInvoicesCard } from "@/components/dashboard/PendingInvoicesCard";
import { useClientContext } from "@/context/ClientContext";

const Index = () => {
  const { canSwitchClient } = useClientContext();

  return (
    <DashboardLayout title="Dashboard">
      <div className="grid gap-8 lg:gap-10 md:grid-cols-2 xl:grid-cols-3">
        {/* Treasury */}
        <div className="md:col-span-2 xl:col-span-1">
          <TreasuryCard />
        </div>

        {/* Balance Projection */}
        <div>
          <BalanceProjectionCard />
        </div>

        {/* Tax Calendar */}
        <div className="space-y-4">
          <TaxCalendarCard />
          {/* Disclaimer fiscal - solo vista cliente */}
          {!canSwitchClient && (
            <p className="text-xs text-muted-foreground/70 pl-1 leading-relaxed">
              Las cifras mostradas son estimaciones basadas en la información contable disponible en cada momento. El cierre fiscal definitivo lo realiza la gestoría y puede incluir ajustes.
            </p>
          )}
        </div>
      </div>

      {/* Pending Invoices - Solo visible para clientes */}
      {!canSwitchClient && (
        <div className="mt-10">
          <PendingInvoicesCard />
        </div>
      )}

      {/* Tax Payments - Solo visible para clientes */}
      {!canSwitchClient && (
        <div className="mt-10">
          <TaxPaymentsCard />
        </div>
      )}

      {/* Next Actions - Solo visible para admin */}
      {canSwitchClient && (
        <div className="mt-8">
          <NextActionsCard />
        </div>
      )}

      {/* Texto global de contexto - modo cliente, posición secundaria */}
      {!canSwitchClient && (
        <div className="mt-8 flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
          <Info className="h-3 w-3 shrink-0" />
          <span>Panel orientativo. No sustituye revisiones ni liquidaciones oficiales.</span>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Index;
