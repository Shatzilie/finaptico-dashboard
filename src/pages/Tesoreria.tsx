import { DashboardLayout } from "@/components/layout/DashboardLayout";

const Tesoreria = () => {
  return (
    <DashboardLayout title="Tesorería">
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-muted-foreground">
          Módulo de tesorería preparado para conectar con datos
        </p>
      </div>
    </DashboardLayout>
  );
};

export default Tesoreria;
