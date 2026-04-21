/**
 * **Fuente de verdad** comercial: perfil completo en listados = trial vigente o plan pagado vigente.
 * No mira foto, redes ni texto.
 *
 * - Plan vigente: `plan_activo === true` y, si hay `plan_expira_at`, fecha > ahora
 * - Trial vigente: `trial_expira_at` o `trial_expira` (fallback) > ahora, o `trialActivo === true` (compat API)
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
  /**
   * Compat con llamadas que no traen fechas (p. ej. tests / mocks).
   * En producción preferir siempre `trial_expira_at` en BD.
   */
  trialActivo?: boolean | null;
};

function nowMs(now?: Date): number {
  return (now ?? new Date()).getTime();
}

/** Plan pagado vigente (misma regla que listados). */
export function planPagadoVigenteComercial(
  input: TieneFichaCompletaInput,
  now?: Date
): boolean {
  const t = nowMs(now);
  const planEnd = parseDate(input.planExpiraAt);
  return (
    input.planActivo === true &&
    (planEnd == null || planEnd.getTime() > t)
  );
}

/** Trial comercial vigente (fechas o flag de compat). */
export function trialComercialVigente(
  input: TieneFichaCompletaInput,
  now?: Date
): boolean {
  if (input.trialActivo === true) return true;
  const t = nowMs(now);
  const trialEnd = parseDate(input.trialExpiraAt ?? input.trialExpira);
  return trialEnd != null && trialEnd.getTime() > t;
}

export function tieneFichaCompleta(
  input: TieneFichaCompletaInput,
  now?: Date
): boolean {
  return (
    planPagadoVigenteComercial(input, now) ||
    trialComercialVigente(input, now)
  );
}
