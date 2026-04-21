import type { SupabaseClient } from "@supabase/supabase-js";
import { modalidadesAtencionInputsToDbUnique } from "@/lib/modalidadesAtencion";
import {
  isPostgrestUnknownColumnError,
  unknownColumnNameFromDbErrorMessage,
} from "@/lib/postgrestUnknownColumn";
import { requiereDireccionSiModalidadLocalFisico } from "@/lib/requiereDireccionLocalFisico";
import type { TieneFichaCompletaInput } from "@/lib/tieneFichaCompleta";

const LOG_PREFIX = "[adminPublish][local_fisico]";

function s(v: unknown): string {
  return String(v ?? "").trim();
}

/**
 * Misma clave lógica que Postgres: acepta UUID con guiones o 32 hex sin guiones (case-insensitive).
 * Evita `.eq('emprendedor_id', id)` devolviendo 0 filas cuando el cliente manda un formato distinto al almacenado.
 */
export function normalizarUuidEmprendedorId(raw: string): string {
  const x = s(raw).toLowerCase();
  if (/^[0-9a-f]{32}$/i.test(x)) {
    return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
  }
  return x;
}

/** `comunas.id` puede ser uuid, int, bigint; PostgREST suele devolver number o string. */
export function comunaIdTieneValor(raw: unknown): boolean {
  if (raw == null || raw === "") return false;
  if (typeof raw === "string") return s(raw) !== "";
  if (typeof raw === "number") return Number.isFinite(raw);
  if (typeof raw === "bigint") return true;
  if (typeof raw === "object" && raw !== null && "id" in raw) {
    return comunaIdTieneValor((raw as { id: unknown }).id);
  }
  return false;
}

/** Texto de ubicación del local: calle en `direccion` o, si viene vacío, `referencia`. */
function textoDireccionLocalFila(row: {
  direccion?: unknown;
  referencia?: unknown;
}): string {
  return s(row.direccion) || s(row.referencia);
}

function motivosRechazoLocalFisicoFila(row: {
  comuna_id?: unknown;
  direccion?: unknown;
  referencia?: unknown;
}): { sinTextoDireccionOReferencia: boolean; sinComunaId: boolean } {
  return {
    sinTextoDireccionOReferencia: !textoDireccionLocalFila(row),
    sinComunaId: !comunaIdTieneValor(row.comuna_id),
  };
}

/** Fila mínima de `emprendedor_locales` para considerar “dirección real”. */
export function esLocalFisicoFilaValida(row: {
  comuna_id?: unknown;
  direccion?: unknown;
  referencia?: unknown;
}): boolean {
  if (!textoDireccionLocalFila(row)) return false;
  return comunaIdTieneValor(row.comuna_id);
}

/** Misma regla que publicación admin: comuna + texto en dirección o referencia. */
export async function countLocalesFisicosValidosEmprendedor(
  supabase: SupabaseClient,
  emprendedorId: string
): Promise<number> {
  const idNorm = normalizarUuidEmprendedorId(s(emprendedorId));
  if (!idNorm) return 0;
  const { data, error } = await supabase
    .from("emprendedor_locales")
    .select("comuna_id, direccion, referencia")
    .eq("emprendedor_id", idNorm);
  if (error || !Array.isArray(data)) return 0;
  return data.reduce(
    (acc, raw) =>
      acc + (esLocalFisicoFilaValida(raw as Record<string, unknown>) ? 1 : 0),
    0
  );
}

export type LocalFisicoPublicacionDiag =
  | {
      ok: true;
      skipped?: boolean;
      fuente?:
        | "emprendedor_locales"
        | "emprendedores_legacy"
        | "plan_no_exige"
        | "sin_modalidad";
      localesValidos?: number;
      debug?: {
        tieneLocalFisico: boolean;
        decisionModalidadFuente: "modalidades_db_tras_sync" | "emprendedor_modalidades";
      };
    }
  | {
      ok: false;
      error: string;
      reason: "local_fisico";
      debug: {
        tieneLocalFisico: boolean;
        decisionModalidadFuente: "modalidades_db_tras_sync" | "emprendedor_modalidades";
      };
    };

async function emprendedorTieneModalidadLocalFisico(
  supabase: SupabaseClient,
  emprendedorId: string
): Promise<boolean> {
  const eid = normalizarUuidEmprendedorId(s(emprendedorId));
  const { data, error } = await supabase
    .from("emprendedor_modalidades")
    .select("modalidad")
    .eq("emprendedor_id", eid);

  if (error) {
    console.warn(LOG_PREFIX, "lectura emprendedor_modalidades:", error.message);
    return false;
  }
  if (!Array.isArray(data) || data.length === 0) {
    return false;
  }
  const raw = data.map((x) => String((x as { modalidad?: unknown }).modalidad ?? ""));
  const unique = modalidadesAtencionInputsToDbUnique(raw);
  return unique.includes("local_fisico");
}

/**
 * Equivale a `SELECT * FROM emprendedor_locales WHERE emprendedor_id = $id` (PostgREST: select *).
 * Loguea filas crudas y el resultado de `esLocalFisicoFilaValida` por fila.
 */
async function contarLocalesFisicosValidosConDebug(
  supabase: SupabaseClient,
  emprendedorId: string
): Promise<number> {
  const idNorm = normalizarUuidEmprendedorId(s(emprendedorId));
  console.log(
    LOG_PREFIX,
    "[debug] query explícita (PostgREST): emprendedor_locales.select('*').eq('emprendedor_id',",
    JSON.stringify(idNorm),
    ") [raw filter:",
    JSON.stringify(emprendedorId),
    "]"
  );

  const { data, error } = await supabase
    .from("emprendedor_locales")
    .select("*")
    .eq("emprendedor_id", idNorm);

  if (error) {
    console.warn(LOG_PREFIX, "[debug] emprendedor_locales error:", error.message, {
      code: (error as { code?: string }).code,
      details: (error as { details?: string }).details,
    });
    return 0;
  }

  const rows = Array.isArray(data) ? data : [];
  console.log(LOG_PREFIX, "[debug] emprendedor_locales filas devueltas:", rows.length);

  if (rows.length === 0) {
    const { count, error: cErr } = await supabase
      .from("emprendedor_locales")
      .select("*", { count: "exact", head: true })
      .eq("emprendedor_id", idNorm);
    console.log(LOG_PREFIX, "[debug] count exact (misma eq) head:true:", {
      count,
      countError: cErr?.message,
    });
  }

  let valid = 0;
  rows.forEach((raw, index) => {
    const row = raw as Record<string, unknown>;
    const ok = esLocalFisicoFilaValida(row);
    if (ok) valid += 1;
    const motivos = motivosRechazoLocalFisicoFila(row);
    console.log(LOG_PREFIX, "[debug] fila local", index, {
      id: row.id,
      emprendedor_id: row.emprendedor_id,
      comuna_id: row.comuna_id,
      direccion: row.direccion,
      referencia: row.referencia,
      esLocalFisicoFilaValida: ok,
      motivosRechazo: ok ? null : motivos,
    });
  });

  return valid;
}

function emptyLocalFisicoOk(): LocalFisicoPublicacionDiag {
  return {
    ok: true,
    skipped: true,
    fuente: "sin_modalidad",
    debug: {
      tieneLocalFisico: false,
      decisionModalidadFuente: "emprendedor_modalidades",
    },
  };
}

/**
 * Valida “local físico” para publicación admin.
 * - Determina si el negocio tiene modalidad local físico (desde DB o desde payload post-sync).
 * - Si lo tiene y el plan exige dirección: valida al menos 1 local con comuna + dirección/referencia.
 */
export async function validarLocalFisicoDireccionAntesDePublicarAdmin(opts: {
  supabase: SupabaseClient;
  emprendedorId: string;
  comercialInput: TieneFichaCompletaInput;
  modalidadesDbTrasSync?: string[];
}): Promise<LocalFisicoPublicacionDiag> {
  const eid = normalizarUuidEmprendedorId(s(opts.emprendedorId));
  if (!eid) return { ok: false, error: "missing_emprendedor_id", reason: "local_fisico", debug: { tieneLocalFisico: false, decisionModalidadFuente: "emprendedor_modalidades" } };

  const decisionModalidadFuente: "modalidades_db_tras_sync" | "emprendedor_modalidades" =
    Array.isArray(opts.modalidadesDbTrasSync) && opts.modalidadesDbTrasSync.length > 0
      ? "modalidades_db_tras_sync"
      : "emprendedor_modalidades";

  const modalidadesDb = Array.isArray(opts.modalidadesDbTrasSync)
    ? opts.modalidadesDbTrasSync
    : [];

  const tieneLocalFisico =
    decisionModalidadFuente === "modalidades_db_tras_sync"
      ? modalidadesDb.includes("local_fisico")
      : await emprendedorTieneModalidadLocalFisico(opts.supabase, eid);

  if (!tieneLocalFisico) {
    return emptyLocalFisicoOk();
  }

  // Si el plan no exige dirección para local físico, no bloquear.
  if (!requiereDireccionSiModalidadLocalFisico(opts.comercialInput, new Date())) {
    return {
      ok: true,
      skipped: true,
      fuente: "plan_no_exige",
      debug: { tieneLocalFisico: true, decisionModalidadFuente },
    };
  }

  const localesValidos =
    s(process.env.LOCAL_FISICO_DEBUG) === "1"
      ? await contarLocalesFisicosValidosConDebug(opts.supabase, eid)
      : await countLocalesFisicosValidosEmprendedor(opts.supabase, eid);

  if (localesValidos >= 1) {
    return {
      ok: true,
      fuente: "emprendedor_locales",
      localesValidos,
      debug: { tieneLocalFisico: true, decisionModalidadFuente },
    };
  }

  return {
    ok: false,
    error: "Debe agregar al menos un local con comuna y dirección/referencia para publicar.",
    reason: "local_fisico",
    debug: { tieneLocalFisico: true, decisionModalidadFuente },
  };
}

/**
 * Compat legacy: en algunos entornos antiguos existía dirección en `emprendedores` (no en pivote).
 * Esta función intenta leer esas columnas si existen; si no, devuelve null y la validación sigue por pivote.
 */
export async function legacyDireccionEnEmprendedores(
  supabase: SupabaseClient,
  emprendedorId: string
): Promise<{ ok: true; direccion: string } | { ok: false; error: string } | null> {
  const eid = normalizarUuidEmprendedorId(s(emprendedorId));
  if (!eid) return null;

  const cols = ["direccion", "direccion_local", "direccion_texto", "referencia"] as const;
  for (const c of cols) {
    const { data, error } = await supabase.from("emprendedores").select(c).eq("id", eid).maybeSingle();
    if (error) {
      const col = unknownColumnNameFromDbErrorMessage(String((error as { message?: string }).message ?? ""));
      if (isPostgrestUnknownColumnError(error) && col) continue;
      return { ok: false, error: (error as { message?: string }).message ?? "error" };
    }
    const v = data ? s((data as Record<string, unknown>)[c]) : "";
    if (v) return { ok: true, direccion: v };
  }
  return null;
}

/** Plan/trial mínimo para {@link requiereDireccionSiModalidadLocalFisico} (p. ej. antes de reactivar publicación). */
export async function fetchComercialInputParaValidarLocalFisico(
  supabase: SupabaseClient,
  emprendedorId: string
): Promise<TieneFichaCompletaInput> {
  const id = normalizarUuidEmprendedorId(s(emprendedorId));
  if (!id) return {};
  const { data, error } = await supabase
    .from("emprendedores")
    .select("plan_activo, plan_expira_at, trial_expira_at, trial_expira")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.warn(LOG_PREFIX, "fetchComercialInputParaValidarLocalFisico:", error.message);
    return {};
  }
  if (!data || typeof data !== "object") return {};
  const row = data as Record<string, unknown>;
  return {
    planActivo: row.plan_activo === true ? true : null,
    planExpiraAt: s(row.plan_expira_at) || null,
    trialExpiraAt: s(row.trial_expira_at) || null,
    trialExpira: s(row.trial_expira) || null,
  };
}

