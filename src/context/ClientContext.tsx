// src/context/ClientContext.tsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  ReactNode,
} from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

export type ErpClient = {
  id: string | number;
  code?: string | null;
  name?: string | null;
  display_name?: string | null;
  [key: string]: any;
};

type ClientContextValue = {
  clients: ErpClient[];
  selectedClientId: string | number | null;
  selectedClient: ErpClient | null;
  loading: boolean;
  error: string | null;
  setSelectedClientId: (id: string | number | null) => void;
};

const ClientContext = createContext<ClientContextValue | undefined>(undefined);

export function ClientProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();

  const [clients, setClients] = useState<ErpClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carga de clientes cuando haya usuario
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setClients([]);
      setSelectedClientId(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    const loadClients = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .schema('erp_core')
        .from('clients')
        .select('*')
        .order('code', { ascending: true });

      if (cancelled) return;

      if (error) {
        setError(error.message);
        setClients([]);
        setSelectedClientId(null);
        setLoading(false);
        return;
      }

      const list = data ?? [];
      setClients(list);

      // Si no hay cliente seleccionado, escoge el primero
      if (list.length > 0 && selectedClientId == null) {
        setSelectedClientId(list[0].id);
      }

      setLoading(false);
    };

    loadClients();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const selectedClient = useMemo(() => {
    if (!selectedClientId) return null;
    return clients.find((c) => String(c.id) === String(selectedClientId)) ?? null;
  }, [clients, selectedClientId]);

  const value: ClientContextValue = {
    clients,
    selectedClientId,
    selectedClient,
    loading,
    error,
    setSelectedClientId,
  };

  return <ClientContext.Provider value={value}>{children}</ClientContext.Provider>;
}

export function useClientContext() {
  const ctx = useContext(ClientContext);
  if (!ctx) {
    throw new Error('useClientContext must be used within a ClientProvider');
  }
  return ctx;
}
