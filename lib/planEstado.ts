/**
 * Estado del plan del emprendimiento: trial | perfil_completo | perfil_basico.
 * No altera el ranking; solo la completitud de la ficha y si la tarjeta es clickeable.
 */

function parseDate(v: string | null | undefined): Date | null {
  if (v == null || String(v).trim() === "") return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

export type PlanEstado = "trial" | "perfil_completo" | "perfil_basico";

/** Fuente de verdad para estado de perfil: solo estos campos. No usar plan, estado ni publicado. */
export type PlanEstadoInput = {
  trialExpiraAt?: string | null;
  planActivo?: boolean | null;
  planExpiraAt?: string | null;
  /** Fallback si la BD aún no tiene trial_expira_at. */
  trialExpira?: string | null;
};

/**
 * Calcula el estado del plan. Regla obligatoria (sin legacy):
 * 1. plan_activo === true y plan_expira_at existe y plan_expira_at > now => perfil_completo
 * 2. Si no, trial_expira_at existe y trial_expira_at > now => trial
 * 3. En cualquier otro caso => perfil_basico
 */
export function getPlanEstado(input: PlanEstadoInput): PlanEstado {
  const now = new Date();
  const trialEnd = parseDate(input.trialExpiraAt ?? input.trialExpira);
  const planEnd = parseDate(input.planExpiraAt);

  const planVigente =
    input.planActivo === true &&
    planEnd != null &&
    planEnd.getTime() > now.getTime();

  const trialVigente = trialEnd != null && trialEnd.getTime() > now.getTime();

  if (planVigente) return "perfil_completo";
  if (trialVigente) return "trial";
  return "perfil_basico";
}
