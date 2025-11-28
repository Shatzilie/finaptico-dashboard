import { DashboardLayout } from "@/components/layout/DashboardLayout";

const Ayuda = () => {
  return (
    <DashboardLayout title="Ayuda">
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-muted-foreground">
          Centro de ayuda preparado
        </p>
      </div>
    </DashboardLayout>
  );
};

export default Ayuda;
