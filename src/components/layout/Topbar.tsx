import { useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useClientContext, getClientDisplayName } from '../../context/ClientContext';
import { useSidebarContext } from '../../context/SidebarContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Avatar, AvatarFallback } from '../ui/avatar';
import ClientSelector from '../ClientSelector';
import { ThemeToggle } from '../ThemeToggle';

export default function Topbar() {
  const { user, logout } = useAuth();
  const { selectedClient, canSwitchClient } = useClientContext();
  const { isMobile, setMobileOpen } = useSidebarContext();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const email = user?.email ?? 'Sin sesión';
  const initials = email.slice(0, 2).toUpperCase();
  
  const companyName = getClientDisplayName(selectedClient);

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4 gap-2">
      {/* Left: hamburger (mobile) + client selector + search */}
      <div className="flex flex-1 items-center gap-2 md:gap-3 min-w-0">
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            className="shrink-0"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <ClientSelector />
        {canSwitchClient && !isMobile && (
          <Input
            placeholder="Buscar..."
            className="max-w-sm"
          />
        )}
      </div>

      {/* Right: theme toggle + user info */}
      <div className="flex items-center gap-2 shrink-0">
        <ThemeToggle />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 px-2"
            >
              {!isMobile && (
                <div className="flex flex-col items-end gap-0.5">
                  <span className="text-sm font-medium text-foreground">
                    {companyName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {email}
                  </span>
                </div>
              )}
              <Avatar className="h-8 w-8">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{companyName}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
