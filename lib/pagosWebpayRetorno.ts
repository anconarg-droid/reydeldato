import type { SupabaseClient } from "@supabase/supabase-js";
import { activarPlanEmprendedorEnSupabase } from "@/app/api/_lib/activarPlanEmprendedorSupabase";
import {
  isPlanCodigoPago,
  montoClpPorPlanCodigo,
  planCodigoToPeriodicidad,
} from "@/lib/planPagoCatalogo";
import { getWebpayPlusTransaction } from "@/lib/transbankWebpayConfig";
import {
  amountDesdeCommit,
  authorizationCodeDesdeCommit,
  transactionDateDesdeCommit,
  webpayCommitFueAprobado,
} from "@/lib/webpayCommitResultado";

type PagoRow = {
  id: string;
  emprendedor_id: string;
  plan_codigo: string;
  monto: number;
  estado: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const isDev = process.env.NODE_ENV === "development";

function logRetornoDev(
  phase: string,
  payload: Record<string, unknown>
): void {
  if (!isDev) return;
  console.log("[pagos/retorno]", phase, payload);
}

/**
 * Si en BD el pago quedó `pagado`, el usuario debe ver éxito aunque haya fallado
 * un paso secundario (p. ej. activación de plan) o una condición intermedia.
 */
async function reconciliarOutcomeConPagadoPersistido(
  supabase: SupabaseClient,
  token: string,
  proposed: { outcome: "exito" | "fallo"; emprendedorId: string }
): Promise<{ outcome: "exito" | "fallo"; emprendedorId: string }> {
  if (proposed.outcome === "exito") return proposed;
  if (!token.trim()) return proposed;
  const ultimo = await cargarPagoPorToken(supabase, token);
  if (ultimo?.estado === "pagado") {
    const id = String(ultimo.emprendedor_id ?? "").trim();
    logRetornoDev("reconcile_pagado", {
      proposed_outcome: proposed.outcome,
      resolved: "exito",
      emprendedor_id: id || "(vacío)",
    });
    return { outcome: "exito", emprendedorId: id };
  }
  return proposed;
}

async function cargarPagoPorToken(
  supabase: SupabaseClient,
  token: string
): Promise<PagoRow | null> {
  const { data, error } = await supabase
    .from("pagos_emprendedores")
    .select("id, emprendedor_id, plan_codigo, monto, estado")
    .eq("token_ws", token)
    .maybeSingle();
  if (error || !data) return null;
  return data as PagoRow;
}

/**
 * Monto esperado solo desde catálogo interno + `plan_codigo` de la fila.
 * El commit debe coincidir con ese monto; `pago.monto` debe coincidir (anti-tamper de fila).
 */
function montoTransaccionValido(
  planCodigo: string,
  montoFila: number,
  commit: Record<string, unknown>
): boolean {
  if (!isPlanCodigoPago(planCodigo)) return false;
  const esperado = montoClpPorPlanCodigo(planCodigo);
  if (Number(montoFila) !== esperado) return false;
  const commitAmt = amountDesdeCommit(commit);
  if (commitAmt == null || Math.round(commitAmt) !== esperado) return false;
  return true;
}

/**
 * Un solo proceso pasa de `pendiente` → `procesando`. Otros esperan hasta ver `pagado` o timeout.
 */
async function reclamarPagoOEsperarPagado(
  supabase: SupabaseClient,
  row: PagoRow,
  token: string
): Promise<
  | { kind: "claimed" }
  | { kind: "already_pagado" }
  | { kind: "give_up" }
> {
  const maxAttempts = 25;
  const delayMs = 200;

  for (let i = 0; i < maxAttempts; i++) {
    const { data: claimed, error } = await supabase
      .from("pagos_emprendedores")
      .update({
        estado: "procesando",
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .eq("estado", "pendiente")
      .select("id")
      .maybeSingle();

    if (error) {
      return { kind: "give_up" };
    }
    if (claimed) {
      return { kind: "claimed" };
    }

    const fresh = await cargarPagoPorToken(supabase, token);
    if (!fresh) {
      return { kind: "give_up" };
    }
    if (fresh.estado === "pagado") {
      return { kind: "already_pagado" };
    }

    await sleep(delayMs);
  }

  const last = await cargarPagoPorToken(supabase, token);
  if (last?.estado === "pagado") {
    return { kind: "already_pagado" };
  }
  return { kind: "give_up" };
}

/**
 * Confirma pago en Transbank, activa/renueva plan en `emprendedores` y actualiza `pagos_emprendedores`.
 *
 * **Idempotencia:** mismo `token_ws` con pago ya `pagado` → éxito sin `commit` ni nueva extensión de plan.
 * Concurrencia: `pendiente` → `procesando` atómico; réplicas esperan hasta ver `pagado`.
 */
async function procesarRetornoWebpayPlusCore(opts: {
  supabase: SupabaseClient;
  tokenWs: string;
}): Promise<{ outcome: "exito" | "fallo"; emprendedorId: string }> {
  const token = opts.tokenWs.trim();
  if (!token) {
    return { outcome: "fallo", emprendedorId: "" };
  }

  let row = await cargarPagoPorToken(opts.supabase, token);
  if (!row) {
    return { outcome: "fallo", emprendedorId: "" };
  }

  const empId = String(row.emprendedor_id);

  if (row.estado === "pagado") {
    return { outcome: "exito", emprendedorId: empId };
  }

  if (row.estado === "fallido" || row.estado === "anulado") {
    return { outcome: "fallo", emprendedorId: empId };
  }

  if (row.estado === "procesando") {
    for (let i = 0; i < 40; i++) {
      await sleep(250);
      const r = await cargarPagoPorToken(opts.supabase, token);
      if (!r) {
        return { outcome: "fallo", emprendedorId: empId };
      }
      if (r.estado === "pagado") {
        return { outcome: "exito", emprendedorId: String(r.emprendedor_id) };
      }
      if (r.estado === "fallido" || r.estado === "anulado") {
        return { outcome: "fallo", emprendedorId: String(r.emprendedor_id) };
      }
      if (r.estado === "pendiente") {
        row = r;
        break;
      }
    }
    if (row.estado === "procesando") {
      return { outcome: "fallo", emprendedorId: empId };
    }
  }

  if (row.estado === "pendiente") {
    const claim = await reclamarPagoOEsperarPagado(
      opts.supabase,
      row,
      token
    );
    if (claim.kind === "already_pagado") {
      return { outcome: "exito", emprendedorId: empId };
    }
    if (claim.kind === "give_up") {
      const ultimo = await cargarPagoPorToken(opts.supabase, token);
      if (ultimo?.estado === "pagado") {
        return {
          outcome: "exito",
          emprendedorId: String(ultimo.emprendedor_id),
        };
      }
      return { outcome: "fallo", emprendedorId: empId };
    }
  }

  let commit: Record<string, unknown>;
  try {
    const tx = getWebpayPlusTransaction();
    commit = (await tx.commit(token)) as Record<string, unknown>;
  } catch (e) {
    await opts.supabase
      .from("pagos_emprendedores")
      .update({
        estado: "fallido",
        raw_response: {
          phase: "commit",
          error: e instanceof Error ? e.message : String(e),
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .in("estado", ["pendiente", "procesando"]);
    return { outcome: "fallo", emprendedorId: empId };
  }

  // Éxito Transbank: AUTHORIZED + response_code 0 + amount > 0 (webpayCommitFueAprobado).
  const approved = webpayCommitFueAprobado(commit);
  const montoOk = montoTransaccionValido(row.plan_codigo, row.monto, commit);
  logRetornoDev("post_commit", {
    approved,
    monto_ok: montoOk,
    commit_status: commit.status,
    commit_response_code: commit.response_code,
    row_estado: row.estado,
  });

  if (!approved || !montoOk) {
    await opts.supabase
      .from("pagos_emprendedores")
      .update({
        estado: "fallido",
        raw_response: commit,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .in("estado", ["pendiente", "procesando"]);
    return { outcome: "fallo", emprendedorId: empId };
  }

  if (!isPlanCodigoPago(row.plan_codigo)) {
    await opts.supabase
      .from("pagos_emprendedores")
      .update({
        estado: "fallido",
        raw_response: { ...commit, error: "invalid_plan_codigo" },
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .in("estado", ["pendiente", "procesando"]);
    return { outcome: "fallo", emprendedorId: empId };
  }

  const periodicidad = planCodigoToPeriodicidad(row.plan_codigo);

  try {
    await activarPlanEmprendedorEnSupabase(opts.supabase, empId, periodicidad);
  } catch (e) {
    /**
     * Cobro confirmado en Transbank pero `emprendedores` no se actualizó.
     * Estado: `pagado` + `raw_response.plan_activation_error`.
     * Soporte: `POST /api/admin/pagos/reintentar-activacion` (ver `reintentarActivacionDesdePago.ts`).
     */
    logRetornoDev("plan_activation_error", {
      emprendedor_id: empId,
      error: e instanceof Error ? e.message : String(e),
    });
    await opts.supabase
      .from("pagos_emprendedores")
      .update({
        estado: "pagado",
        authorization_code: authorizationCodeDesdeCommit(commit),
        transaction_date: transactionDateDesdeCommit(commit),
        raw_response: {
          ...commit,
          plan_activation_error: e instanceof Error ? e.message : String(e),
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .in("estado", ["procesando", "pendiente"]);
    // Cobro acreditado en Transbank y en `pagos_emprendedores`; el fallo fue solo al activar plan.
    return { outcome: "exito", emprendedorId: empId };
  }

  await opts.supabase
    .from("pagos_emprendedores")
    .update({
      estado: "pagado",
      authorization_code: authorizationCodeDesdeCommit(commit),
      transaction_date: transactionDateDesdeCommit(commit),
      raw_response: commit,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id)
    .in("estado", ["procesando", "pendiente"]);

  logRetornoDev("update_pagado_ok", {
    pago_id: row.id,
    emprendedor_id: empId,
  });
  return { outcome: "exito", emprendedorId: empId };
}

export async function procesarRetornoWebpayPlus(opts: {
  supabase: SupabaseClient;
  tokenWs: string;
}): Promise<{ outcome: "exito" | "fallo"; emprendedorId: string }> {
  const token = opts.tokenWs.trim();
  const proposed = await procesarRetornoWebpayPlusCore(opts);
  const final = await reconciliarOutcomeConPagadoPersistido(
    opts.supabase,
    token,
    proposed
  );
  if (isDev) {
    const ultimo = token
      ? await cargarPagoPorToken(opts.supabase, token)
      : null;
    logRetornoDev("final", {
      proposed_outcome: proposed.outcome,
      final_outcome: final.outcome,
      emprendedor_id: final.emprendedorId || "(vacío)",
      db_estado: ultimo?.estado ?? null,
    });
  }
  return final;
}
