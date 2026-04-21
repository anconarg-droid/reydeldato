import type { PlanPeriodicidad } from "@/lib/planConstants";
import { PRECIO_PLAN_CLP } from "@/lib/panelPlanesPrecios";

/** Códigos de plan en checkout / BD (basico = 30 días, facturación mensual). */
export type PlanCodigoPago = "basico" | "semestral" | "anual";

export const PLAN_CODIGOS_PAGO: PlanCodigoPago[] = [
  "basico",
  "semestral",
  "anual",
];

const A_PLAN_PERIODICIDAD: Record<PlanCodigoPago, PlanPeriodicidad> = {
  basico: "mensual",
  semestral: "semestral",
  anual: "anual",
};

export function isPlanCodigoPago(v: string): v is PlanCodigoPago {
  return PLAN_CODIGOS_PAGO.includes(v as PlanCodigoPago);
}

/** Monto CLP según catálogo (alineado a panel). */
export function montoClpPorPlanCodigo(codigo: PlanCodigoPago): number {
  return PRECIO_PLAN_CLP[A_PLAN_PERIODICIDAD[codigo]];
}

/** Periodicidad en `emprendedores.plan_periodicidad`. */
export function planCodigoToPeriodicidad(codigo: PlanCodigoPago): PlanPeriodicidad {
  return A_PLAN_PERIODICIDAD[codigo];
}
