import {
  PLAN_TIPO,
  computePlanExpiraAt,
  type PlanPeriodicidad,
} from "@/lib/planConstants";

export type AdminPlanUi = "trial" | "basico" | "premium";

function parseDate(v: unknown): Date | null {
  const t = v == null ? "" : String(v).trim();
  if (!t) return null;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

function adminPlanFromLegacyColumn(row: Record<string, unknown>): AdminPlanUi | null {
  const raw = String(row.plan ?? "").trim().toLowerCase();
  if (raw === "trial" || raw === "basico" || raw === "premium") return raw;
  return null;
}

/**
 * Valor del `<select>` admin (trial / basico / premium).
 * - Si existe columna legacy `plan`, se usa.
 * - Si existen columnas nuevas (`plan_activo`, `plan_expira_at`, `trial_expira_at`, …), se infiere.
 * - Si no hay datos, **basico** (grilla sin columnas de plan en el SELECT).
 */
export function adminPlanUiFromEmpRow(row: Record<string, unknown>): AdminPlanUi {
  const legacy = adminPlanFromLegacyColumn(row);
  if (legacy) return legacy;

  const now = new Date();
  const planExp = parseDate(row.plan_expira_at);
  const trialExp = parseDate(row.trial_expira_at);
  const planActivo = row.plan_activo === true;

  if (planActivo && planExp && planExp > now) {
    const per = String(row.plan_periodicidad ?? "").trim().toLowerCase();
    if (per === "anual" || per === "semestral") return "premium";
    return "basico";
  }
  if (trialExp && trialExp > now) return "trial";
  return "basico";
}

/**
 * Patch para `emprendedores` según el plan elegido en admin (UI legacy de 3 opciones).
 */
export function adminPlanUpdatePatchFromUi(plan: AdminPlanUi): Record<string, unknown> {
  const now = new Date();
  const nowIso = now.toISOString();

  if (plan === "trial") {
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + 90);
    return {
      plan_activo: false,
      plan_tipo: null,
      plan_periodicidad: null,
      plan_inicia_at: null,
      plan_expira_at: null,
      trial_inicia_at: nowIso,
      trial_expira_at: trialEnd.toISOString(),
    };
  }

  const periodicidad: PlanPeriodicidad = plan === "premium" ? "anual" : "mensual";
  const planExpiraAt = computePlanExpiraAt(periodicidad, now);
  return {
    plan_activo: true,
    plan_tipo: PLAN_TIPO,
    plan_periodicidad: periodicidad,
    plan_inicia_at: nowIso,
    plan_expira_at: planExpiraAt.toISOString(),
  };
}

/** Esquema mínimo: columna `plan` texto (trial | basico | premium). */
export function adminPlanUpdatePatchLegacy(plan: AdminPlanUi): Record<string, unknown> {
  return { plan };
}
