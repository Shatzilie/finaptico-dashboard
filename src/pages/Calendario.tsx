import { DashboardLayout } from "@/components/layout/DashboardLayout";

const Calendario = () => {
  return (
    <DashboardLayout title="Calendario Fiscal">
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-muted-foreground">
          Módulo de calendario fiscal preparado para conectar con datos
        </p>
      </div>
    </DashboardLayout>
  );
};

export default Calendario;
