import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { TreasuryCard } from "@/components/dashboard/TreasuryCard";
import { BalanceProjectionCard } from "@/components/dashboard/BalanceProjectionCard";
import { NextActionsCard } from "@/components/dashboard/NextActionsCard";
import { TaxCalendarCard } from "@/components/dashboard/TaxCalendarCard";

const Index = () => {
  // Data states will be populated when connected to Supabase
  // For now, components show empty states

  return (
    <DashboardLayout title="Dashboard">
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

        {/* Next Actions - Full width */}
        <div className="md:col-span-2 xl:col-span-3">
          <NextActionsCard />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
