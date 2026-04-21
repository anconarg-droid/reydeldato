/**
 * Reintento cuando Transbank dejó el pago en `pagado` pero falló la escritura en `emprendedores`.
 *
 * Uso: `POST /api/admin/pagos/reintentar-activacion` + `x-pago-reintento-secret` en producción.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { activarPlanEmprendedorEnSupabase } from "@/app/api/_lib/activarPlanEmprendedorSupabase";
import {
  isPlanCodigoPago,
  planCodigoToPeriodicidad,
} from "@/lib/planPagoCatalogo";
import { planPagadoVigenteComercial } from "@/lib/tieneFichaCompleta";

export type RetryResultTrazabilidad =
  | "success"
  | "failed"
  | "skipped_no_activation_error"
  | "skipped_already_active";

export type ResultadoReintentoActivacion =
  | {
      ok: true;
      skipped: boolean;
      retry_result: RetryResultTrazabilidad;
    }
  | { ok: false; error: string };

type PagoCompleto = {
  id: string;
  estado: string;
  emprendedor_id: string;
  plan_codigo: string;
  raw_response: unknown;
};

function rawComoRecord(raw: unknown): Record<string, unknown> {
  if (raw != null && typeof raw === "object" && !Array.isArray(raw)) {
    return { ...(raw as Record<string, unknown>) };
  }
  return {};
}

function rawTienePlanActivationError(raw: unknown): boolean {
  if (raw == null || typeof raw !== "object") return false;
  return "plan_activation_error" in raw;
}

async function persistirTrazaReintento(
  supabase: SupabaseClient,
  pagoId: string,
  rawPrevio: unknown,
  trace: {
    retry_attempted_at: string;
    retry_result: RetryResultTrazabilidad;
    retry_error: string | null;
  },
  extra: Record<string, unknown> = {}
): Promise<void> {
  const base = rawComoRecord(rawPrevio);
  await supabase
    .from("pagos_emprendedores")
    .update({
      raw_response: {
        ...base,
        ...trace,
        ...extra,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", pagoId);
}

async function emprendedorYaCoincideConCompra(
  supabase: SupabaseClient,
  emprendedorId: string,
  planCodigo: string
): Promise<boolean> {
  if (!isPlanCodigoPago(planCodigo)) return false;
  const esperada = planCodigoToPeriodicidad(planCodigo);
  const { data: emp, error } = await supabase
    .from("emprendedores")
    .select("plan_activo, plan_expira_at, plan_periodicidad")
    .eq("id", emprendedorId)
    .maybeSingle();
  if (error || !emp) return false;
  const row = emp as {
    plan_activo: boolean | null;
    plan_expira_at: string | null;
    plan_periodicidad: string | null;
  };
  if (String(row.plan_periodicidad ?? "").trim() !== esperada) return false;
  return planPagadoVigenteComercial(
    { planActivo: row.plan_activo, planExpiraAt: row.plan_expira_at },
    new Date()
  );
}

export async function reintentarActivacionPlanDesdePagoPagado(opts: {
  supabase: SupabaseClient;
  pagoId?: string;
  tokenWs?: string;
}): Promise<ResultadoReintentoActivacion> {
  const pagoId = opts.pagoId?.trim();
  const tokenWs = opts.tokenWs?.trim();
  if (!pagoId && !tokenWs) {
    return { ok: false, error: "missing_pagoId_or_tokenWs" };
  }

  let q = opts.supabase
    .from("pagos_emprendedores")
    .select("id, estado, emprendedor_id, plan_codigo, raw_response");
  if (pagoId) q = q.eq("id", pagoId);
  else q = q.eq("token_ws", tokenWs!);

  const { data: rowRaw, error: findErr } = await q.maybeSingle();

  if (findErr || !rowRaw) {
    return { ok: false, error: "pago_not_found" };
  }

  const pago = rowRaw as PagoCompleto;
  const attemptedAt = new Date().toISOString();

  if (pago.estado !== "pagado") {
    return { ok: false, error: "pago_not_pagado" };
  }

  if (!isPlanCodigoPago(pago.plan_codigo)) {
    return { ok: false, error: "invalid_plan_codigo" };
  }

  const empId = String(pago.emprendedor_id);

  if (!rawTienePlanActivationError(pago.raw_response)) {
    await persistirTrazaReintento(opts.supabase, pago.id, pago.raw_response, {
      retry_attempted_at: attemptedAt,
      retry_result: "skipped_no_activation_error",
      retry_error: null,
    });
    return {
      ok: true,
      skipped: true,
      retry_result: "skipped_no_activation_error",
    };
  }

  const yaOk = await emprendedorYaCoincideConCompra(
    opts.supabase,
    empId,
    pago.plan_codigo
  );
  if (yaOk) {
    const base = rawComoRecord(pago.raw_response);
    delete base.plan_activation_error;
    base.plan_stale_error_cleared_at = attemptedAt;
    await persistirTrazaReintento(opts.supabase, pago.id, base, {
      retry_attempted_at: attemptedAt,
      retry_result: "skipped_already_active",
      retry_error: null,
    });
    return {
      ok: true,
      skipped: true,
      retry_result: "skipped_already_active",
    };
  }

  const periodicidad = planCodigoToPeriodicidad(pago.plan_codigo);

  try {
    await activarPlanEmprendedorEnSupabase(opts.supabase, empId, periodicidad);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const base = rawComoRecord(pago.raw_response);
    await opts.supabase
      .from("pagos_emprendedores")
      .update({
        raw_response: {
          ...base,
          retry_attempted_at: attemptedAt,
          retry_result: "failed",
          retry_error: msg,
          plan_activation_error: msg,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", pago.id);
    return { ok: false, error: "activation_failed" };
  }

  const base = rawComoRecord(pago.raw_response);
  delete base.plan_activation_error;
  base.plan_reparado_at = attemptedAt;
  await persistirTrazaReintento(opts.supabase, pago.id, base, {
    retry_attempted_at: attemptedAt,
    retry_result: "success",
    retry_error: null,
  });

  return { ok: true, skipped: false, retry_result: "success" };
}

