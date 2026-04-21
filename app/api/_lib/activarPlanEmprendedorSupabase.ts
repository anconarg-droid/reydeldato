import type { SupabaseClient } from "@supabase/supabase-js";
import { PLAN_TIPO, type PlanPeriodicidad } from "@/lib/planConstants";
import { calcularUpdatePlanTrasCompra } from "@/lib/planCompraRenovacion";
import { syncEmprendedorToAlgoliaWithSupabase } from "@/lib/algoliaSyncEmprendedor";

/**
 * Aplica compra de plan (alta o renovación) en `emprendedores`.
 *
 * Renovación: si el plan pagado sigue vigente, extiende `plan_expira_at` desde la fecha de término
 * actual; si no, reinicia desde ahora. Ver {@link calcularUpdatePlanTrasCompra}.
 */
export async function activarPlanEmprendedorEnSupabase(
  supabase: SupabaseClient,
  emprendedorId: string,
  periodicidad: PlanPeriodicidad,
  opts?: { syncAlgolia?: boolean }
): Promise<{ plan_expira_at: string; plan_inicia_at: string }> {
  const { data: emp, error: fe } = await supabase
    .from("emprendedores")
    .select("plan_activo, plan_expira_at, plan_inicia_at")
    .eq("id", emprendedorId)
    .maybeSingle();

  if (fe) throw fe;
  if (!emp) throw new Error("emprendedor_not_found");

  const row = emp as {
    plan_activo: boolean | null;
    plan_expira_at: string | null;
    plan_inicia_at: string | null;
  };

  const { plan_inicia_at, plan_expira_at } = calcularUpdatePlanTrasCompra({
    periodicidad,
    planActivoActual: row.plan_activo,
    planExpiraAtActual: row.plan_expira_at,
    planIniciaAtActual: row.plan_inicia_at,
  });

  const { error } = await supabase
    .from("emprendedores")
    .update({
      plan_activo: true,
      plan_tipo: PLAN_TIPO,
      plan_periodicidad: periodicidad,
      plan_inicia_at,
      plan_expira_at,
    })
    .eq("id", emprendedorId);

  if (error) throw error;

  if (opts?.syncAlgolia !== false) {
    try {
      await syncEmprendedorToAlgoliaWithSupabase(supabase, emprendedorId);
    } catch {
      /* no bloquear pago */
    }
  }

  return {
    plan_inicia_at,
    plan_expira_at,
  };
}

