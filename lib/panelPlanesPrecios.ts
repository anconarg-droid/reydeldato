/**
 * Precios mostrados en `/panel/planes` (CLP, sin pasarela aún).
 */
import type { PlanPeriodicidad } from "@/lib/planConstants";

export const PRECIO_PLAN_CLP: Record<PlanPeriodicidad, number> = {
  mensual: 5900,
  semestral: 24900,
  anual: 39900,
};

export const PLAN_RECOMENDADO: PlanPeriodicidad = "anual";

/** Orden en grilla: plan básico (1 mes) → 6 meses → anual. */
export const ORDEN_TARJETAS_PLANES: PlanPeriodicidad[] = [
  "mensual",
  "semestral",
  "anual",
];

/** Texto para mensaje WhatsApp al elegir plan. */
export const PLAN_ETIQUETA_WHATSAPP: Record<PlanPeriodicidad, string> = {
  mensual: "Plan básico (1 mes)",
  semestral: "6 meses",
  anual: "Anual",
};

/** Precio como en copy: $5.900 */
export function precioPlanesDisplaySimple(pesos: number): string {
  return `$${pesos.toLocaleString("es-CL")}`;
}

export function formatPrecioClp(pesos: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(pesos);
}
