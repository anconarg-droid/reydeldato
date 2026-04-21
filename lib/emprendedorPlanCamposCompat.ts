import { isValidPeriodicidad, PLAN_TIPO } from "@/lib/planConstants";

function s(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

/**
 * Periodicidad canónica (`mensual` | `semestral` | `anual`) sin depender de
 * `plan_periodicidad` en BD: usa esa columna si viene en `row`, si no deriva de `plan`.
 */
export function planPeriodicidadDesdeEmprendedorRow(
  row: Record<string, unknown>
): string | null {
  const explicit = s(row.plan_periodicidad).toLowerCase();
  if (explicit && isValidPeriodicidad(explicit)) return explicit;

  const fromPlan = s(row.plan).toLowerCase();
  if (!fromPlan) return null;
  if (fromPlan === "basico") return "mensual";
  if (isValidPeriodicidad(fromPlan)) return fromPlan;
  return null;
}

/**
 * `plan_tipo` en BD o derivado cuando hay plan pagado vigente (flags + fechas).
 */
export function planTipoComercialDesdeEmprendedorRow(
  row: Record<string, unknown>
): string | null {
  const fromDb = s(row.plan_tipo);
  if (fromDb) return fromDb;

  const planActivo = row.plan_activo === true;
  const planExpiraAt = s(row.plan_expira_at);
  if (planActivo && planExpiraAt) return PLAN_TIPO;
  return null;
}
