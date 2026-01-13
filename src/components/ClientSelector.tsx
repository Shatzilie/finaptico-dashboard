// src/components/ClientSelector.tsx
import { useClientContext, getClientDisplayName } from '../context/ClientContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

/**
 * Selector de cliente - Solo visible para usuarios admin (con múltiples clientes).
 * Usuarios cliente nunca ven este componente.
 */
export default function ClientSelector() {
  const {
    clients,
    selectedClientId,
    setSelectedClientId,
    loading,
    error,
    canSwitchClient,
  } = useClientContext();

  // No renderizar si el usuario no puede cambiar de cliente (rol = client)
  if (!canSwitchClient) {
    return null;
  }

  // No renderizar si hay 1 o menos clientes
  if (!loading && !error && clients.length <= 1) {
    return null;
  }

  const handleChange = (value: string) => {
    if (!value) {
      setSelectedClientId(null);
      return;
    }
    setSelectedClientId(value);
  };

  const disabled = loading || !!error || clients.length === 0;

  let placeholder = 'Selecciona empresa';
  if (loading) placeholder = 'Cargando...';
  else if (error) placeholder = 'Error al cargar';

  return (
    <div className="min-w-[220px]">
      <Select
        value={selectedClientId ? String(selectedClientId) : ''}
        onValueChange={handleChange}
        disabled={disabled}
      >
        <SelectTrigger className="h-9 w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {clients.map((client) => (
            <SelectItem key={client.id} value={String(client.id)}>
              {getClientDisplayName(client)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
