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
      {/* Texto global de contexto - solo modo cliente */}
      {!canSwitchClient && (
        <p className="text-xs text-muted-foreground mb-4">
          Panel de seguimiento orientativo para anticipar decisiones. No sustituye revisiones ni liquidaciones oficiales.
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {/* Treasury - Full width on mobile, 2 cols on larger screens */}
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
    </DashboardLayout>
  );
};

export default Index;
