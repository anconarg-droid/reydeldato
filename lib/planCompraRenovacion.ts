import { computePlanExpiraAt, type PlanPeriodicidad } from "@/lib/planConstants";
import { planPagadoVigenteComercial } from "@/lib/tieneFichaCompleta";

function parseFin(v: string | null | undefined): Date | null {
  if (v == null || String(v).trim() === "") return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Regla de renovación (post-pago Webpay o activación manual):
 * - Si el plan pagado sigue **vigente** (`plan_activo` + `plan_expira_at` > ahora),
 *   los días del nuevo plan se suman desde **plan_expira_at** (extensión).
 * - Si no hay plan vigente, el período parte desde **now()**.
 *
 * `plan_inicia_at`: en renovación se conserva el inicio original; en alta nueva es `now()`.
 */
export function calcularUpdatePlanTrasCompra(opts: {
  periodicidad: PlanPeriodicidad;
  planActivoActual: boolean | null;
  planExpiraAtActual: string | null;
  planIniciaAtActual: string | null;
  now?: Date;
}): { plan_inicia_at: string; plan_expira_at: string } {
  const now = opts.now ?? new Date();
  const vigente = planPagadoVigenteComercial(
    {
      planActivo: opts.planActivoActual,
      planExpiraAt: opts.planExpiraAtActual,
    },
    now
  );

  const finActual = parseFin(opts.planExpiraAtActual);
  const ancla =
    vigente && finActual != null && finActual.getTime() > now.getTime()
      ? finActual
      : now;

  const expira = computePlanExpiraAt(opts.periodicidad, ancla);

  const inicioPrev = parseFin(opts.planIniciaAtActual);
  const plan_inicia_at =
    vigente && inicioPrev != null
      ? String(opts.planIniciaAtActual ?? "").trim()
      : now.toISOString();

  return {
    plan_inicia_at,
    plan_expira_at: expira.toISOString(),
  };
}
