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
  const { collapsed, isMobile } = useSidebarContext();

  return (
    <div className="min-h-screen bg-background dark:bg-[hsl(222,47%,7%)]">
      <AppSidebar />
      <div className={cn(
        "transition-all duration-300",
        isMobile ? "pl-0" : (collapsed ? "pl-16" : "pl-64")
      )}>
        <Topbar />
        <main className="p-4 md:p-6 lg:p-8">
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
