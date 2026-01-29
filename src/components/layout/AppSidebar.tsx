import { 
  LayoutDashboard, 
  Wallet, 
  TrendingUp, 
  ListChecks, 
  Calendar,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  FileText,
  X
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import logo from "@/assets/logo.png";
import { cn } from "@/lib/utils";
import { useSidebarContext } from "@/context/SidebarContext";
import { useClientContext } from "@/context/ClientContext";
import { Sheet, SheetContent } from "@/components/ui/sheet";

const mainNavItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, clientVisible: true },
  { title: "Tesorería", url: "/tesoreria", icon: Wallet, clientVisible: false },
  { title: "Proyecciones", url: "/proyecciones", icon: TrendingUp, clientVisible: false },
  { title: "Acciones", url: "/acciones", icon: ListChecks, clientVisible: false },
  { title: "Calendario Fiscal", url: "/calendario", icon: Calendar, clientVisible: false },
  { title: "Tax Filings", url: "/admin/tax-filings", icon: FileText, clientVisible: false },
];

const secondaryNavItems = [
  { title: "Configuración", url: "/configuracion", icon: Settings, clientVisible: false },
  { title: "Ayuda", url: "/ayuda", icon: HelpCircle, clientVisible: true },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { collapsed, setCollapsed, isMobile } = useSidebarContext();
  const { canSwitchClient } = useClientContext();

  const visibleMainItems = canSwitchClient 
    ? mainNavItems 
    : mainNavItems.filter(item => item.clientVisible);
  
  const visibleSecondaryItems = canSwitchClient 
    ? secondaryNavItems 
    : secondaryNavItems.filter(item => item.clientVisible);

  const handleNavClick = () => {
    if (onNavigate) {
      onNavigate();
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        <div className="flex items-center overflow-hidden">
          <img src={logo} alt="Finaptico" className="h-8 w-auto shrink-0" />
        </div>
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="rounded-lg p-1.5 hover:bg-accent transition-colors shrink-0"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        <div className="space-y-1">
          {visibleMainItems.map((item) => (
            <NavLink
              key={item.title}
              to={item.url}
              end={item.url === "/"}
              onClick={handleNavClick}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground",
                !isMobile && collapsed && "justify-center px-2"
              )}
              activeClassName="bg-accent text-primary"
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {(isMobile || !collapsed) && <span>{item.title}</span>}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Secondary Navigation */}
      {visibleSecondaryItems.length > 0 && (
        <div className="border-t border-border px-3 py-4">
          <div className="space-y-1">
            {visibleSecondaryItems.map((item) => (
              <NavLink
                key={item.title}
                to={item.url}
                onClick={handleNavClick}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground",
                  !isMobile && collapsed && "justify-center px-2"
                )}
                activeClassName="bg-accent text-primary"
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {(isMobile || !collapsed) && <span>{item.title}</span>}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function AppSidebar() {
  const { collapsed, mobileOpen, setMobileOpen, isMobile } = useSidebarContext();

  // Mobile: Sheet drawer
  if (isMobile) {
    return (
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0 bg-sidebar">
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Fixed sidebar
  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r border-border bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <SidebarContent />
    </aside>
  );
}
