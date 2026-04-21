import type { SupabaseClient } from "@supabase/supabase-js";
import {
  normalizarUuidEmprendedorId,
  validarLocalFisicoDireccionAntesDePublicarAdmin,
} from "@/app/api/_lib/localFisicoPublicacionAdmin";
import { ensureLocalesPivotFromPostulacionActivaIfEmpty } from "@/app/api/_lib/syncEmprendedorLocalesDesdePostulacionRow";
import { getEstadoComercialEmprendedor } from "@/lib/getEstadoComercialEmprendedor";
import { requiereDireccionSiModalidadLocalFisico } from "@/lib/requiereDireccionLocalFisico";
import type { TieneFichaCompletaInput } from "@/lib/tieneFichaCompleta";
import {
  isPostgrestUnknownColumnError,
  unknownColumnNameFromDbErrorMessage,
  type PostgrestErrLike,
} from "@/lib/postgrestUnknownColumn";

function s(v: unknown): string {
  return String(v ?? "").trim();
}

const DIAG = "[adminPublish][diag]";

/**
 * Regla que bloqueó la publicación admin. Nota: `varias_regiones` / `varias_comunas` no se validan
 * en código aquí; solo aparecen si el mensaje del CHECK/trigger de Postgres lo sugiere.
 */
export type AdminPublishFailureReason =
  | "falta_id"
  | "emprendimiento_no_encontrado"
  | "select_emprendedor"
  | "update_finales"
  | "local_fisico"
  | "update_publicado"
  | "varias_regiones"
  | "varias_comunas";

export type AdminPublishEmprendedorResult =
  | { ok: true; id: string; nombre: string }
  | {
      ok: false;
      status: number;
      error: string;
      reason: AdminPublishFailureReason;
      detail?: Record<string, unknown>;
    };

/** Opciones al publicar desde flujo que ya sincronizó modalidades desde borrador. */
export type AdminPublishEmprendedorOptions = {
  modalidadesDbTrasSync?: string[];
};

function logAdminPublishBloqueo(opts: {
  step: string;
  reason: AdminPublishFailureReason;
  emprendedorId: string;
  nombreEmprendimiento?: string;
  errorMessage: string;
  extra?: Record<string, unknown>;
}): void {
  console.warn(DIAG, "publicación admin bloqueada", {
    step: opts.step,
    reason: opts.reason,
    emprendedor_id: opts.emprendedorId,
    nombre_emprendimiento: opts.nombreEmprendimiento ?? null,
    error: opts.errorMessage,
    ...opts.extra,
  });
}

function snapshotFichaAdminPublish(row: Record<string, unknown> | null): Record<string, unknown> {
  if (!row) return {};
  const keys = [
    "id",
    "nombre_emprendimiento",
    "estado_publicacion",
    "categoria_slug_final",
    "subcategoria_slug_final",
    "cobertura_tipo",
    "comunas_cobertura",
    "regiones_cobertura",
    "plan_activo",
    "plan_expira_at",
    "trial_expira_at",
    "trial_expira",
  ] as const;
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(row, k)) out[k] = row[k];
  }
  return out;
}

function inferirReasonDesdeMensajePg(msg: string): AdminPublishFailureReason | undefined {
  const m = String(msg);
  if (/varias_regiones|regiones_cobertura/i.test(m)) return "varias_regiones";
  if (/varias_comunas|comunas_cobertura/i.test(m)) return "varias_comunas";
  // Misma regla que valida en app (localFisicoPublicacionAdmin); si un CHECK/trigger en BD
  // repite el texto o incluye el token, no etiquetar como update_publicado genérico.
  if (/local_fisico/i.test(m) && /direcci[oó]n|address/i.test(m)) return "local_fisico";
  return undefined;
}

const MAX_SCHEMA_STRIP = 32;

/**
 * Columnas opcionales que usamos si PostgREST las expone. Orden de lista no importa:
 * ante `column … does not exist` o PGRST204 se elimina la columna indicada y se reintenta.
 */
const ADMIN_PUBLISH_EMPRENDEDOR_SELECT_COLUMNS = [
  "id",
  "nombre_emprendimiento",
  "estado_publicacion",
  "categoria_id",
  "categoria_slug_final",
  "subcategoria_slug_final",
  "keywords_finales",
  "categoria_slug_detectada",
  "subcategoria_slug_detectada",
  "keywords_usuario_json",
  "keywords_usuario",
  "palabras_clave",
  "productos_detectados",
  "plan_activo",
  "plan_expira_at",
  "trial_expira_at",
  "trial_expira",
  "cobertura_tipo",
  "comunas_cobertura",
  "regiones_cobertura",
] as const;

async function selectEmprendedorRowForAdminPublish(
  supabase: SupabaseClient,
  id: string
): Promise<{ data: Record<string, unknown> | null; error: PostgrestErrLike | null }> {
  let cols = [...ADMIN_PUBLISH_EMPRENDEDOR_SELECT_COLUMNS];
  for (let i = 0; i < MAX_SCHEMA_STRIP; i++) {
    if (cols.length === 0) {
      return {
        data: null,
        error: { message: "select emprendedores: no quedan columnas válidas para el esquema." },
      };
    }
    const { data, error } = await supabase
      .from("emprendedores")
      .select(cols.join(", "))
      .eq("id", id)
      .maybeSingle();

    if (!error) {
      return { data: data as Record<string, unknown> | null, error: null };
    }

    const col = unknownColumnNameFromDbErrorMessage(String(error.message ?? ""));
    if (!isPostgrestUnknownColumnError(error) || !col) {
      return { data: null, error: error as PostgrestErrLike };
    }

    const next = cols.filter((c) => c !== col);
    if (next.length === cols.length) {
      return { data: null, error: error as PostgrestErrLike };
    }
    cols = next;
  }

  return {
    data: null,
    error: { message: "select emprendedores: demasiados reintentos por columnas inexistentes." },
  };
}

async function updateEmprendedoresWithColumnRetry(
  supabase: SupabaseClient,
  id: string,
  payload: Record<string, unknown>,
  opts?: { emptyPayloadOk: boolean }
): Promise<{ error: PostgrestErrLike | null }> {
  const emptyOk = opts?.emptyPayloadOk === true;
  let p: Record<string, unknown> = { ...payload };
  for (let i = 0; i < MAX_SCHEMA_STRIP; i++) {
    if (Object.keys(p).length === 0) {
      return {
        error: emptyOk
          ? null
          : {
              message:
                "update emprendedores: ninguna columna del payload existe en el esquema (p. ej. estado_publicacion).",
            },
      };
    }
    const { error } = await supabase.from("emprendedores").update(p).eq("id", id);
    if (!error) {
      return { error: null };
    }
    const col = unknownColumnNameFromDbErrorMessage(String(error.message ?? ""));
    if (
      !isPostgrestUnknownColumnError(error) ||
      !col ||
      !Object.prototype.hasOwnProperty.call(p, col)
    ) {
      return { error: error as PostgrestErrLike };
    }
    const next = { ...p };
    delete next[col];
    p = next;
  }
  return {
    error: { message: "update emprendedores: demasiados reintentos por columnas inexistentes." },
  };
}

/**
 * Prioridad de fuentes para rellenar `keywords_finales` solo con claves presentes en `row`
 * (es decir, columnas que entraron en el select exitoso).
 *
 * Fuente de verdad temporal: `keywords_usuario_json`. `keywords_usuario` queda como compatibilidad legacy.
 */
function keywordArrayForFinalesFromRow(row: Record<string, unknown>): unknown[] {
  if (Object.prototype.hasOwnProperty.call(row, "keywords_usuario_json")) {
    const rawJson = row.keywords_usuario_json;
    if (Array.isArray(rawJson) && rawJson.length) {
      return rawJson;
    }
    if (typeof rawJson === "string" && rawJson.trim()) {
      try {
        const p = JSON.parse(rawJson) as unknown;
        if (Array.isArray(p) && p.length) return p;
      } catch {
        /* ignorar */
      }
    }
  }

  if (
    Object.prototype.hasOwnProperty.call(row, "keywords_usuario") &&
    Array.isArray(row.keywords_usuario) &&
    row.keywords_usuario.length
  ) {
    return row.keywords_usuario as unknown[];
  }

  if (
    Object.prototype.hasOwnProperty.call(row, "palabras_clave") &&
    Array.isArray(row.palabras_clave) &&
    row.palabras_clave.length
  ) {
    return row.palabras_clave as unknown[];
  }

  if (
    Object.prototype.hasOwnProperty.call(row, "productos_detectados") &&
    Array.isArray(row.productos_detectados) &&
    row.productos_detectados.length
  ) {
    return row.productos_detectados as unknown[];
  }

  return [];
}

/**
 * Única vía “de negocio” para dejar una ficha visible: rellena *_final vacíos y marca publicado.
 */
export async function adminPublishEmprendedorFicha(
  supabase: SupabaseClient,
  id: string,
  publishOpts?: AdminPublishEmprendedorOptions
): Promise<AdminPublishEmprendedorResult> {
  const idTrim = normalizarUuidEmprendedorId(s(id));
  if (!idTrim) {
    logAdminPublishBloqueo({
      step: "validar_id",
      reason: "falta_id",
      emprendedorId: "",
      errorMessage: "Falta el id del emprendimiento.",
      extra: { id_raw: s(id) },
    });
    return {
      ok: false,
      status: 400,
      error: "Falta el id del emprendimiento.",
      reason: "falta_id",
      detail: { id_raw: s(id) },
    };
  }

  const { data: row, error: rowErr } = await selectEmprendedorRowForAdminPublish(
    supabase,
    idTrim
  );

  if (rowErr) {
    const errMsg = String(rowErr.message ?? "Error al leer emprendedor.");
    logAdminPublishBloqueo({
      step: "select_emprendedor",
      reason: "select_emprendedor",
      emprendedorId: idTrim,
      errorMessage: errMsg,
    });
    return {
      ok: false,
      status: 500,
      error: errMsg,
      reason: "select_emprendedor",
      detail: { postgrest: rowErr },
    };
  }

  if (!row || !s(row.id)) {
    logAdminPublishBloqueo({
      step: "cargar_fila",
      reason: "emprendimiento_no_encontrado",
      emprendedorId: idTrim,
      errorMessage: "Emprendimiento no encontrado.",
    });
    return {
      ok: false,
      status: 404,
      error: "Emprendimiento no encontrado.",
      reason: "emprendimiento_no_encontrado",
      detail: { emprendedor_id: idTrim },
    };
  }

  const nombreDiag = Object.prototype.hasOwnProperty.call(row, "nombre_emprendimiento")
    ? s(row.nombre_emprendimiento)
    : "";

  const updatesFinales: Record<string, unknown> = {};
  const categoriaSlugFinalActual = Object.prototype.hasOwnProperty.call(row, "categoria_slug_final")
    ? s(row.categoria_slug_final)
    : "";
  const subcategoriaSlugFinalActual = Object.prototype.hasOwnProperty.call(
    row,
    "subcategoria_slug_final"
  )
    ? s(row.subcategoria_slug_final)
    : "";

  let keywordsFinalesActual: unknown[] = [];
  if (Object.prototype.hasOwnProperty.call(row, "keywords_finales") && Array.isArray(row.keywords_finales)) {
    keywordsFinalesActual = row.keywords_finales as unknown[];
  }

  if (!categoriaSlugFinalActual) {
    const categoriaId = Object.prototype.hasOwnProperty.call(row, "categoria_id")
      ? s(row.categoria_id)
      : "";
    if (categoriaId) {
      const { data: catRow } = await supabase
        .from("categorias")
        .select("slug")
        .eq("id", categoriaId)
        .maybeSingle();
      const slug = s((catRow as Record<string, unknown> | null)?.slug);
      if (slug) updatesFinales.categoria_slug_final = slug;
    } else if (Object.prototype.hasOwnProperty.call(row, "categoria_slug_detectada")) {
      const detected = s(row.categoria_slug_detectada);
      if (detected) updatesFinales.categoria_slug_final = detected;
    }
  }

  if (!subcategoriaSlugFinalActual) {
    let subId = "";
    const { data: pivotRows } = await supabase
      .from("emprendedor_subcategorias")
      .select("subcategoria_id")
      .eq("emprendedor_id", idTrim)
      .order("subcategoria_id", { ascending: true })
      .limit(1);
    if (Array.isArray(pivotRows) && pivotRows.length > 0) {
      subId = s((pivotRows[0] as { subcategoria_id?: unknown })?.subcategoria_id);
    }
    if (subId) {
      const { data: subRow } = await supabase
        .from("subcategorias")
        .select("slug")
        .eq("id", subId)
        .maybeSingle();
      const slug = s((subRow as Record<string, unknown> | null)?.slug);
      if (slug) updatesFinales.subcategoria_slug_final = slug;
    } else if (Object.prototype.hasOwnProperty.call(row, "subcategoria_slug_detectada")) {
      const detected = s(row.subcategoria_slug_detectada);
      if (detected) updatesFinales.subcategoria_slug_final = detected;
    }
  }

  if (!keywordsFinalesActual.length) {
    const kws = keywordArrayForFinalesFromRow(row);
    if (kws.length) updatesFinales.keywords_finales = kws;
  }

  if (Object.keys(updatesFinales).length > 0) {
    const { error: finalsErr } = await updateEmprendedoresWithColumnRetry(
      supabase,
      idTrim,
      updatesFinales,
      { emptyPayloadOk: true }
    );
    if (finalsErr) {
      const errMsg = String(finalsErr.message ?? "");
      logAdminPublishBloqueo({
        step: "update_campos_finales",
        reason: "update_finales",
        emprendedorId: idTrim,
        nombreEmprendimiento: nombreDiag,
        errorMessage: errMsg,
        extra: {
          updates_keys: Object.keys(updatesFinales),
          ficha: snapshotFichaAdminPublish(row),
        },
      });
      return {
        ok: false,
        status: 500,
        error: errMsg,
        reason: "update_finales",
        detail: {
          updates_keys: Object.keys(updatesFinales),
          ficha: snapshotFichaAdminPublish(row),
        },
      };
    }
  }

  const comercialInput: TieneFichaCompletaInput = {
    planActivo:
      Object.prototype.hasOwnProperty.call(row, "plan_activo") &&
      row.plan_activo === true
        ? true
        : null,
    planExpiraAt:
      Object.prototype.hasOwnProperty.call(row, "plan_expira_at") &&
      s(row.plan_expira_at)
        ? s(row.plan_expira_at)
        : null,
    trialExpiraAt:
      Object.prototype.hasOwnProperty.call(row, "trial_expira_at") &&
      s(row.trial_expira_at)
        ? s(row.trial_expira_at)
        : null,
    trialExpira:
      Object.prototype.hasOwnProperty.call(row, "trial_expira") && s(row.trial_expira)
        ? s(row.trial_expira)
        : null,
  };

  const syncLocalesPivot = await ensureLocalesPivotFromPostulacionActivaIfEmpty(
    supabase,
    idTrim
  );
  if (!syncLocalesPivot.ok) {
    const estadoCom = getEstadoComercialEmprendedor(comercialInput);
    const exigeDir = requiereDireccionSiModalidadLocalFisico(comercialInput);
    logAdminPublishBloqueo({
      step: "sync_locales_desde_postulacion_activa",
      reason: "local_fisico",
      emprendedorId: idTrim,
      nombreEmprendimiento: nombreDiag,
      errorMessage: syncLocalesPivot.message,
      extra: {
        validacion: "sincronizar locales desde postulación pendiente antes de validar publicación",
        estado_comercial: estadoCom.estado,
        plan_exige_direccion_si_local_fisico: exigeDir,
        ficha: snapshotFichaAdminPublish(row),
      },
    });
    return {
      ok: false,
      status: 400,
      error: syncLocalesPivot.message,
      reason: "local_fisico",
      detail: {
        estado_comercial: estadoCom.estado,
        plan_exige_direccion_si_local_fisico: exigeDir,
        ficha: snapshotFichaAdminPublish(row),
      },
    };
  }

  const locCheck = await validarLocalFisicoDireccionAntesDePublicarAdmin({
    supabase,
    emprendedorId: idTrim,
    comercialInput,
    ...(publishOpts?.modalidadesDbTrasSync !== undefined
      ? { modalidadesDbTrasSync: publishOpts.modalidadesDbTrasSync }
      : {}),
  });
  if (!locCheck.ok) {
    const estadoCom = getEstadoComercialEmprendedor(comercialInput);
    const exigeDir = requiereDireccionSiModalidadLocalFisico(comercialInput);
    logAdminPublishBloqueo({
      step: "validar_local_fisico_direccion",
      reason: "local_fisico",
      emprendedorId: idTrim,
      nombreEmprendimiento: nombreDiag,
      errorMessage: locCheck.error,
      extra: {
        validacion: "local_fisico (modalidad + plan/trial exigen dirección física)",
        estado_comercial: estadoCom.estado,
        plan_exige_direccion_si_local_fisico: exigeDir,
        comercial_input: comercialInput,
        local_fisico_debug: locCheck.debug ?? null,
        modalidades_db_tras_sync: publishOpts?.modalidadesDbTrasSync ?? null,
        ficha: snapshotFichaAdminPublish(row),
      },
    });
    return {
      ok: false,
      status: 400,
      error: locCheck.error,
      reason: "local_fisico",
      detail: {
        estado_comercial: estadoCom.estado,
        plan_exige_direccion_si_local_fisico: exigeDir,
        comercial_input: comercialInput,
        local_fisico_debug: locCheck.debug ?? null,
        modalidades_db_tras_sync: publishOpts?.modalidadesDbTrasSync ?? null,
        ficha: snapshotFichaAdminPublish(row),
      },
    };
  }

  const now = new Date().toISOString();
  const publishPatch: Record<string, unknown> = {
    estado_publicacion: "publicado",
    updated_at: now,
  };
  const { error: updateError } = await updateEmprendedoresWithColumnRetry(
    supabase,
    idTrim,
    publishPatch
  );

  if (updateError) {
    const errMsg = String(updateError.message ?? "");
    const inferred = inferirReasonDesdeMensajePg(errMsg);
    const reason: AdminPublishFailureReason = inferred ?? "update_publicado";
    logAdminPublishBloqueo({
      step: "update_estado_publicado",
      reason,
      emprendedorId: idTrim,
      nombreEmprendimiento: nombreDiag,
      errorMessage: errMsg,
      extra: {
        validacion: inferred
          ? "posible CHECK/trigger en BD (mensaje sugiere cobertura)"
          : "update estado_publicacion=publicado",
        ficha: snapshotFichaAdminPublish(row),
      },
    });
    return {
      ok: false,
      status: 500,
      error: errMsg,
      reason,
      detail: {
        ficha: snapshotFichaAdminPublish(row),
        postgres_message: errMsg,
      },
    };
  }

  const nombre = Object.prototype.hasOwnProperty.call(row, "nombre_emprendimiento")
    ? s(row.nombre_emprendimiento)
    : "";

  return { ok: true, id: idTrim, nombre };
}

export type TriggerReindexEmprendedorAlgoliaResult =
  | { ok: true; action?: string; objectID?: string; viewUsed?: string }
  | {
      ok: false;
      reason?: string;
      message?: string;
      httpStatus?: number;
    };

/**
 * Dispara el GET de reindex puntual. **No lanza:** la publicación en BD es independiente.
 */
export async function triggerReindexEmprendedorAlgolia(
  id: string
): Promise<TriggerReindexEmprendedorAlgoliaResult> {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const url = `${baseUrl.replace(/\/+$/, "")}/api/reindex/emprendedores/item?id=${encodeURIComponent(id)}`;
  try {
    const reindexRes = await fetch(url);
    const httpStatus = reindexRes.status;
    const rawText = await reindexRes.text();
    let body: Record<string, unknown> = {};
    try {
      body = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : {};
    } catch {
      body = { message: rawText };
    }

    const logicalOk = body.ok === true;
    if (!logicalOk) {
      console.warn("[adminPublish][reindex] BD ya publicada; reindex Algolia no ok:", {
        httpStatus,
        url,
        body,
      });
      return {
        ok: false,
        reason: String(body.reason ?? "reindex_failed"),
        message: String(body.message ?? ""),
        httpStatus,
      };
    }

    return {
      ok: true,
      action: body.action != null ? String(body.action) : undefined,
      objectID: body.objectID != null ? String(body.objectID) : id,
      viewUsed: body.viewUsed != null ? String(body.viewUsed) : undefined,
    };
  } catch (err) {
    console.warn("[adminPublish][reindex] Error de red llamando reindex (BD ya publicada):", err);
    return {
      ok: false,
      reason: "fetch_error",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

