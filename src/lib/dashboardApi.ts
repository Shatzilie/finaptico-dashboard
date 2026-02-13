// src/lib/dashboardApi.ts
// Helper to call the dashboard Edge Function instead of direct erp_core queries.
// All dashboard data flows through this single endpoint.

import { supabase } from "./supabaseClient";

export type WidgetName =
  | "treasury_snapshot"
  | "treasury_client_totals"
  | "treasury_weekly_client_totals"
  | "treasury_biweekly_client_totals"
  | "treasury_monthly_client_totals"
  | "revenue_12m"
  | "client_overview"
  | "fiscal_snapshot"
  | "fiscal_irpf_split"
  | "sales_invoices_pending"
  | "tax_payments_settled"
  | "my_clients";

/**
 * Fetch data from the dashboard Edge Function.
 * Handles auth automatically via the Supabase session.
 *
 * @param widget  - The widget identifier registered in the Edge Function
 * @param clientCode - Optional: filter to a single client_code. If omitted, returns all allowed.
 * @returns The rows returned by the widget query
 */
export async function fetchWidget<T = Record<string, unknown>>(
  widget: WidgetName,
  clientCode?: string | null
): Promise<T[]> {
  const body: { widget: string; client_code?: string } = { widget };
  if (clientCode) {
    body.client_code = clientCode;
  }

  const { data, error } = await supabase.functions.invoke("dashboard", {
    body,
  });

  if (error) {
    throw new Error(error.message || "Error calling dashboard function");
  }

  // The Edge Function returns { data: rows[] } or { error: string }
  if (data?.error) {
    throw new Error(data.error);
  }

  return (data?.data ?? []) as T[];
}
