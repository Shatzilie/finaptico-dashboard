import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formatea un número como moneda en formato es-ES (miles con ., decimales con ,)
 */
export function formatCurrency(value: number | null | undefined, currency = "EUR"): string {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    useGrouping: true,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Formatea un número sin símbolo de moneda en formato es-ES
 */
export function formatNumber(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("es-ES", {
    useGrouping: true,
    maximumFractionDigits: decimals,
  }).format(value);
}
