import { Info } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import TreasuryCard from "@/components/dashboard/TreasuryCard";
import BalanceProjectionCard from "@/components/dashboard/BalanceProjectionCard";
import { NextActionsCard } from "@/components/dashboard/NextActionsCard";
import { TaxCalendarCard } from "@/components/dashboard/TaxCalendarCard";
import { useClientContext } from "@/context/ClientContext";

const Index = () => {
  const { canSwitchClient } = useClientContext();

  return (
    <DashboardLayout title="Dashboard">
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {/* Treasury */}
        <div className="md:col-span-2 xl:col-span-1">
          <TreasuryCard />
        </div>

        {/* Balance Projection */}
        <div>
          <BalanceProjectionCard />
        </div>

        {/* Tax Calendar */}
        <div>
          <TaxCalendarCard />
        </div>

        {/* Next Actions - Solo visible para admin */}
        {canSwitchClient && (
          <div className="md:col-span-2 xl:col-span-3">
            <NextActionsCard />
          </div>
        )}
      </div>

      {/* Texto global de contexto - modo cliente, posición secundaria */}
      {!canSwitchClient && (
        <div className="mt-6 flex items-center gap-1.5 text-[10px] text-muted-foreground/70">
          <Info className="h-3 w-3 shrink-0" />
          <span>Panel orientativo. No sustituye revisiones ni liquidaciones oficiales.</span>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Index;
