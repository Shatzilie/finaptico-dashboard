// src/context/ClientContext.tsx
import { createContext, useContext, useEffect, useState, useMemo, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { fetchWidget } from "../lib/dashboardApi";

export type ErpClient = {
  id?: string | number;
  code: string;
  label?: string | null;
  display_name?: string | null;
  name?: string | null;
  [key: string]: any;
};

export type UserRole = "admin" | "client" | null;

/**
 * Devuelve el nombre visible del cliente (nunca el código interno).
 * Prioridad: label > display_name > name > "Mi empresa"
 */
export function getClientDisplayName(client: ErpClient | null): string {
  if (!client) return "Mi empresa";
  return client.label || client.display_name || client.name || "Mi empresa";
}

type ClientContextValue = {
  clients: ErpClient[];
  selectedClientId: string | number | null;
  selectedClient: ErpClient | null;
  loading: boolean;
  error: string | null;
  setSelectedClientId: (id: string | number | null) => void;
  userRole: UserRole;
  canSwitchClient: boolean;
};

const ClientContext = createContext<ClientContextValue | undefined>(undefined);

export function ClientProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();

  const [clients, setClients] = useState<ErpClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

    const loadClientsForUser = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch clients via the dashboard Edge Function (widget: my_clients)
        const data = await fetchWidget<{ code: string; label: string | null }>("my_clients");

        if (cancelled) return;

        if (!data || data.length === 0) {
          setClients([]);
          setSelectedClientId(null);
          setLoading(false);
          return;
        }

        // Map to ErpClient format (use code as id since clients table is in erp_core)
        const list: ErpClient[] = data.map((row) => ({
          id: row.code,
          code: row.code,
          label: row.label,
        }));

        setClients(list);

        // Auto-select: single client = fix, multiple = first if none selected
        if (list.length === 1) {
          setSelectedClientId(list[0].code);
        } else if (list.length > 1 && selectedClientId == null) {
          setSelectedClientId(list[0].code);
        }

        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Error desconocido");
        setClients([]);
        setSelectedClientId(null);
        setLoading(false);
      }
    };

    loadClientsForUser();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const selectedClient = useMemo(() => {
    if (!selectedClientId) return null;
    return clients.find((c) => String(c.id) === String(selectedClientId) || c.code === String(selectedClientId)) ?? null;
  }, [clients, selectedClientId]);

  const userRole: UserRole = useMemo(() => {
    if (loading || !user) return null;
    if (clients.length > 1) return "admin";
    if (clients.length === 1) return "client";
    return null;
  }, [clients.length, loading, user]);

  const canSwitchClient = userRole === "admin";

  const handleSetSelectedClientId = (id: string | number | null) => {
    if (!canSwitchClient) return;
    setSelectedClientId(id);
  };

  const value: ClientContextValue = {
    clients,
    selectedClientId,
    selectedClient,
    loading,
    error,
    setSelectedClientId: handleSetSelectedClientId,
    userRole,
    canSwitchClient,
  };

  return <ClientContext.Provider value={value}>{children}</ClientContext.Provider>;
}

export function useClientContext() {
  const ctx = useContext(ClientContext);
  if (!ctx) {
    throw new Error("useClientContext must be used within a ClientProvider");
  }
  return ctx;
}
