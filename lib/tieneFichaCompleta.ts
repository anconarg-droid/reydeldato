/**
 * Regla única de “ficha completa” en listados, tarjeta y ficha pública.
 * tieneFichaCompleta = trial vigente OR plan pagado vigente.
 *
 * - Plan vigente: plan_activo === true Y plan_expira_at > ahora
 * - Trial vigente: trial_expira_at o trial_expira (fallback) > ahora
 */

function parseDate(v: string | null | undefined): Date | null {
  if (v == null || String(v).trim() === "") return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

export type TieneFichaCompletaInput = {
  planActivo?: boolean | null;
  planExpiraAt?: string | null;
  trialExpiraAt?: string | null;
  trialExpira?: string | null;
};

export function tieneFichaCompleta(input: TieneFichaCompletaInput): boolean {
  const now = Date.now();
  const planEnd = parseDate(input.planExpiraAt);
  const planVigente =
    // Plan activo cuenta como ficha completa; si hay expiración, debe estar vigente.
    input.planActivo === true &&
    (planEnd == null || planEnd.getTime() > now);

  const trialEnd = parseDate(input.trialExpiraAt ?? input.trialExpira);
  const trialVigente = trialEnd != null && trialEnd.getTime() > now;

  return planVigente || trialVigente;
}
