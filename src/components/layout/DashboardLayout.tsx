import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import Topbar from "./Topbar";
import { cn } from "@/lib/utils";
import { SidebarProvider, useSidebarContext } from "@/context/SidebarContext";

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
}

function DashboardContent({ children }: DashboardLayoutProps) {
  const { collapsed } = useSidebarContext();

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div className={cn(
        "transition-all duration-300",
        collapsed ? "pl-16" : "pl-64"
      )}>
        <Topbar />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <DashboardContent title={title}>{children}</DashboardContent>
    </SidebarProvider>
  );
}
