// src/components/layout/Topbar.tsx
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useClientContext, getClientDisplayName } from '../../context/ClientContext';
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

export default function Topbar() {
  const { user, logout } = useAuth();
  const { selectedClient, canSwitchClient, loading: clientsLoading } = useClientContext();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const email = user?.email ?? 'Sin sesión';
  const initials = email.slice(0, 2).toUpperCase();
  
  // Nombre de empresa visible (nunca código interno)
  const companyName = getClientDisplayName(selectedClient);

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4">
      {/* Izquierda: selector global de cliente (solo para admins) + búsqueda */}
      <div className="flex flex-1 items-center gap-3">
        {/* ClientSelector se auto-oculta si el usuario no es admin */}
        <ClientSelector />
        {canSwitchClient && (
          <Input
            placeholder="Buscar..."
            className="max-w-sm"
          />
        )}
      </div>

      {/* Derecha: empresa + info de usuario + logout */}
      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 px-2"
            >
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-sm font-medium text-foreground">
                  {companyName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {email}
                </span>
              </div>
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
