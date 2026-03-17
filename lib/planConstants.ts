/**
 * Constantes y tipos para el sistema de planes.
 * Un solo producto: "Perfil completo", con 3 modalidades de pago.
 * Los planes NO alteran el ranking del buscador; solo la completitud de la ficha.
 */

/** Único tipo de plan (producto). */
export const PLAN_TIPO = "perfil_completo" as const;
export type PlanTipo = typeof PLAN_TIPO;

/** Periodicidades de pago. */
export const PLAN_PERIODICIDADES = ["mensual", "semestral", "anual"] as const;
export type PlanPeriodicidad = (typeof PLAN_PERIODICIDADES)[number];

/** Días por periodicidad (para calcular plan_expira_at al activar). */
export const DIAS_POR_PERIODICIDAD: Record<PlanPeriodicidad, number> = {
  mensual: 30,
  semestral: 180,
  anual: 365,
};

export function isValidPeriodicidad(v: string): v is PlanPeriodicidad {
  return PLAN_PERIODICIDADES.includes(v as PlanPeriodicidad);
}

/** Etiqueta para UI. */
export const PLAN_PERIODICIDAD_LABELS: Record<PlanPeriodicidad, string> = {
  mensual: "Mensual",
  semestral: "Semestral",
  anual: "Anual",
};

/**
 * Calcula la fecha de expiración del plan a partir de una fecha de inicio.
 * Para usar al activar suscripción (pasarela de pago).
 */
export function computePlanExpiraAt(
  periodicidad: PlanPeriodicidad,
  fromDate: Date = new Date()
): Date {
  const days = DIAS_POR_PERIODICIDAD[periodicidad];
  const d = new Date(fromDate);
  d.setDate(d.getDate() + days);
  return d;
}
