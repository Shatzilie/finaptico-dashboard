import { 
  LayoutDashboard, 
  Wallet, 
  TrendingUp, 
  ListChecks, 
  Calendar,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import logo from "@/assets/logo.png";
import { cn } from "@/lib/utils";
import { useSidebarContext } from "@/context/SidebarContext";

const mainNavItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Tesorería", url: "/tesoreria", icon: Wallet },
  { title: "Proyecciones", url: "/proyecciones", icon: TrendingUp },
  { title: "Acciones", url: "/acciones", icon: ListChecks },
  { title: "Calendario Fiscal", url: "/calendario", icon: Calendar },
];

const secondaryNavItems = [
  { title: "Configuración", url: "/configuracion", icon: Settings },
  { title: "Ayuda", url: "/ayuda", icon: HelpCircle },
];

export function AppSidebar() {
  const { collapsed, setCollapsed } = useSidebarContext();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r border-border bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <div className="flex items-center overflow-hidden">
            <img src={logo} alt="Finaptico" className="h-8 w-8 shrink-0" />
          </div>
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
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          <div className="space-y-1">
            {mainNavItems.map((item) => (
              <NavLink
                key={item.title}
                to={item.url}
                end={item.url === "/"}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground",
                  collapsed && "justify-center px-2"
                )}
                activeClassName="bg-accent text-primary"
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.title}</span>}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Secondary Navigation */}
        <div className="border-t border-border px-3 py-4">
          <div className="space-y-1">
            {secondaryNavItems.map((item) => (
              <NavLink
                key={item.title}
                to={item.url}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground",
                  collapsed && "justify-center px-2"
                )}
                activeClassName="bg-accent text-primary"
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.title}</span>}
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
