// src/context/ClientContext.tsx
import { createContext, useContext, useEffect, useState, useMemo, ReactNode } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "./AuthContext";

export type ErpClient = {
  id: string | number;
  code?: string | null;
  name?: string | null;
  display_name?: string | null;
  label?: string | null;
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
  /** Rol del usuario: "admin" si tiene acceso a múltiples clientes, "client" si solo tiene uno */
  userRole: UserRole;
  /** true si el usuario puede cambiar de cliente (solo admins) */
  canSwitchClient: boolean;
};

const ClientContext = createContext<ClientContextValue | undefined>(undefined);

export function ClientProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();

  const [clients, setClients] = useState<ErpClient[]>([]);
  const [allowedClientCodes, setAllowedClientCodes] = useState<string[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setClients([]);
      setAllowedClientCodes([]);
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
        // 1. Obtener los client_code permitidos para este usuario
        const { data: accessData, error: accessError } = await supabase
          .schema("erp_core")
          .from("user_client_access")
          .select("client_code")
          .eq("user_id", user.id);

        if (accessError) {
          throw new Error(accessError.message);
        }

        if (cancelled) return;

        const codes = (accessData ?? []).map((row: { client_code: string }) => row.client_code);
        setAllowedClientCodes(codes);

        if (codes.length === 0) {
          // Usuario sin acceso a ningún cliente
          setClients([]);
          setSelectedClientId(null);
          setLoading(false);
          return;
        }

        // 2. Obtener los datos de los clientes permitidos
        const { data: clientsData, error: clientsError } = await supabase
          .schema("erp_core")
          .from("clients")
          .select("*")
          .in("code", codes)
          .order("code", { ascending: true });

        if (clientsError) {
          throw new Error(clientsError.message);
        }

        if (cancelled) return;

        const list = (clientsData ?? []) as ErpClient[];
        setClients(list);

        // 3. Autoseleccionar cliente
        // Si solo hay uno (rol cliente), fijarlo automáticamente
        // Si hay varios (rol admin), seleccionar el primero si no hay ninguno seleccionado
        if (list.length === 1) {
          // Usuario cliente: fijar automáticamente, no permitir cambio
          setSelectedClientId(list[0].id);
        } else if (list.length > 1 && selectedClientId == null) {
          // Usuario admin: seleccionar el primero por defecto
          setSelectedClientId(list[0].id);
        }

        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Error desconocido");
        setClients([]);
        setAllowedClientCodes([]);
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
    return clients.find((c) => String(c.id) === String(selectedClientId)) ?? null;
  }, [clients, selectedClientId]);

  // Determinar rol basado en número de clientes permitidos
  const userRole: UserRole = useMemo(() => {
    if (loading || !user) return null;
    if (allowedClientCodes.length > 1) return "admin";
    if (allowedClientCodes.length === 1) return "client";
    return null;
  }, [allowedClientCodes.length, loading, user]);

  const canSwitchClient = userRole === "admin";

  // Wrapper para setSelectedClientId que solo permite cambio si es admin
  const handleSetSelectedClientId = (id: string | number | null) => {
    if (!canSwitchClient) {
      // Usuario cliente: ignorar intentos de cambiar cliente
      return;
    }
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
