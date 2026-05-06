import { computePlanExpiraAt, type PlanPeriodicidad } from "@/lib/planConstants";

function parseFin(v: string | null | undefined): Date | null {
  if (v == null || String(v).trim() === "") return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

function trialComercialVigenteParaCompra(opts: {
  trialExpiraAtActual?: string | null;
  trialExpiraLegacyActual?: string | null;
  now: Date;
}): boolean {
  const finIso = opts.trialExpiraAtActual ?? opts.trialExpiraLegacyActual ?? null;
  const fin = parseFin(finIso);
  return fin != null && fin.getTime() > opts.now.getTime();
}

/** Plan ya en período efectivo pagado (inicio ≤ ahora, fin > ahora). */
function planPagadoEfectivamenteVigenteParaRenovar(opts: {
  planActivoActual: boolean | null;
  planIniciaAtActual: string | null;
  planExpiraAtActual: string | null;
  now: Date;
}): boolean {
  if (opts.planActivoActual !== true) return false;
  const ini = parseFin(opts.planIniciaAtActual);
  if (ini != null && ini.getTime() > opts.now.getTime()) return false;
  const fin = parseFin(opts.planExpiraAtActual);
  if (fin != null && fin.getTime() <= opts.now.getTime()) return false;
  /** Compat BD: puede existir vigencia sin fecha fin consistente — igual permitimos renovar si `plan_activo`. */
  return true;
}

/**
 * Regla de renovación (post-pago Webpay o activación manual):
 * - Si el período pagado ya está **efectivamente vigente** (inicio ≤ ahora),
 *   extiende desde **plan_expira_at** (renovación).
 * - Si el usuario paga con **trial vigente** y el plan no está efectivamente vigente,
 *   el período pagado arranca al **término del trial** (no acorta trial; no toca columnas trial).
 * - Si no hay trial vigente ni plan efectivo, arranca desde **now()**.
 *
 * `plan_inicia_at`: en renovación conserva el inicio original; en alta nueva es el **inicio del período pagado**.
 */
export function calcularUpdatePlanTrasCompra(opts: {
  periodicidad: PlanPeriodicidad;
  planActivoActual: boolean | null;
  planExpiraAtActual: string | null;
  planIniciaAtActual: string | null;
  trialExpiraAtActual?: string | null;
  trialExpiraLegacyActual?: string | null;
  now?: Date;
}): { plan_inicia_at: string; plan_expira_at: string } {
  const now = opts.now ?? new Date();
  const efectivo = planPagadoEfectivamenteVigenteParaRenovar({
    planActivoActual: opts.planActivoActual,
    planIniciaAtActual: opts.planIniciaAtActual,
    planExpiraAtActual: opts.planExpiraAtActual,
    now,
  });

  const trialVigente = trialComercialVigenteParaCompra({
    trialExpiraAtActual: opts.trialExpiraAtActual,
    trialExpiraLegacyActual: opts.trialExpiraLegacyActual,
    now,
  });

  const finActual = parseFin(opts.planExpiraAtActual);
  let anclaInicioPeriodoPagado = now;
  if (efectivo && finActual != null && finActual.getTime() > now.getTime()) {
    anclaInicioPeriodoPagado = finActual;
  } else if (!efectivo && trialVigente) {
    const trialEnd = parseFin(
      opts.trialExpiraAtActual ?? opts.trialExpiraLegacyActual ?? null
    );
    if (trialEnd != null) anclaInicioPeriodoPagado = trialEnd;
  }

  const expira = computePlanExpiraAt(opts.periodicidad, anclaInicioPeriodoPagado);

  const inicioPrev = parseFin(opts.planIniciaAtActual);
  const plan_inicia_at =
    efectivo && inicioPrev != null && inicioPrev.getTime() <= now.getTime()
      ? String(opts.planIniciaAtActual ?? "").trim()
      : anclaInicioPeriodoPagado.toISOString();

  return {
    plan_inicia_at,
    plan_expira_at: expira.toISOString(),
  };
}
