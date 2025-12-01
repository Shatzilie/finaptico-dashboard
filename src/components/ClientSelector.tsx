// src/components/ClientSelector.tsx
import { useClientContext } from '../context/ClientContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

export default function ClientSelector() {
  const {
    clients,
    selectedClientId,
    setSelectedClientId,
    loading,
    error,
  } = useClientContext();

  const handleChange = (value: string) => {
    if (!value) {
      setSelectedClientId(null);
      return;
    }
    setSelectedClientId(value);
  };

  const disabled = loading || !!error || clients.length === 0;

  let placeholder = 'Selecciona cliente';
  if (loading) placeholder = 'Cargando clientes…';
  else if (error) placeholder = 'Error al cargar';
  else if (!loading && clients.length === 0) placeholder = 'Sin clientes';

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
          {clients.map((client) => {
            const label =
              client.display_name ||
              client.name ||
              client.code ||
              `Cliente ${client.id}`;
            return (
              <SelectItem key={client.id} value={String(client.id)}>
                {label}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
