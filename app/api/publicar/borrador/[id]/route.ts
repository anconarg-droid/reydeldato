// app/api/publicar/borrador/[id]/route.ts
import { syncEmprendedorToAlgoliaWithSupabase } from "@/lib/algoliaSyncEmprendedor";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isPersistibleFotoUrl } from "@/lib/isPersistibleFotoUrl";
import { extractBorradorPatchFromBody } from "@/lib/publicarValidation";
import {
  normalizeDescripcionCorta,
  normalizeDescripcionLarga,
  primeraValidacionDescripcion,
  validateDescripcionCortaBorradorSiPresente,
  validateDescripcionCortaPublicacion,
  validateDescripcionLarga,
} from "@/lib/descripcionProductoForm";
import { modalidadesAtencionInputsToDbUnique } from "@/lib/modalidadesAtencion";
import { modalidadAtencionInputToDb } from "@/lib/modalidadesAtencion";
import {
  parseLocalesPatchInput,
  principalComunaBaseIdFromLocales,
  replaceEmprendedorLocales,
  resolveLocalesComunaIds,
  localesFromPostulacionRowForGet,
  validateLocalesRules,
  type LocalPersistRow,
} from "@/lib/emprendedorLocalesDb";
import { normalizePostulacionContactoPatch } from "@/lib/contactoPublicoValidation";
import { ESTADO_PUBLICACION } from "@/lib/estadoPublicacion";
import {
  assertPostulacionLocalFisicoUbicacion,
  modalidadesDbDesdePatchYOExistente,
  pickPostulacionCampoEfectivo,
} from "@/lib/postulacionLocalFisicoUbicacion";
import { POSTULACIONES_BORRADOR_GET_SELECT } from "@/lib/loadPostulacionesModeracion";

/**
 * Next 15+ puede enviar `params` como Promise; normalizamos para leer `id` siempre bien.
 */
type RouteParams = { id: string };

async function resolveParams(
  params: Promise<RouteParams> | RouteParams
): Promise<RouteParams> {
  return params instanceof Promise ? await params : params;
}

function json(
  body: Record<string, unknown>,
  status: number
): Response {
  return Response.json(body, { status });
}

function normalizePostulacionEstado(v: unknown): string {
  return String(v ?? "").trim().toLowerCase();
}

/** Cliente opcional (`modo_guardado` | `modo`): relaja validación solo en flujo mejorar—no persistente en BD. */
function parseModoGuardadoServidor(body: Record<string, unknown>): "publicar" | "mejorar" | null {
  const raw = body.modo_guardado ?? body.modo;
  const s = String(raw ?? "").trim().toLowerCase();
  if (
    s === "mejorar" ||
    s === "mejorar_ficha" ||
    s === "mejorar-ficha" ||
    s === "upgrade"
  ) {
    return "mejorar";
  }
  if (
    s === "publicar" ||
    s === "publicar_borrador" ||
    s === "borrador"
  ) {
    return "publicar";
  }
  return null;
}

/** Campos que “Mejorar ficha” puede tocar cuando la postulación ya está aprobada. */
const MEJORAR_FICHA_POSTULACION_KEYS = new Set([
  "mostrar_responsable_publico",
  "galeria_urls",
  "nombre_emprendimiento",
  "email",
  "whatsapp_principal",
  "whatsapp_secundario",
  "frase_negocio",
  "foto_principal_url",
  "instagram",
  "sitio_web",
  "descripcion_libre",
  "nombre_responsable",
  "modalidades_atencion",
  /** Palabras clave del postulante (`text[]`). */
  "keywords_usuario",
  /** JSON de locales (comuna_slug, direccion, …) para “Mejorar ficha” / borrador. */
  "locales",
  /** Al quitar local físico hay que poder persistir null en la postulación (antes filtrado). */
  "direccion",
  "direccion_referencia",
]);

/**
 * Solo si el cliente envía alguno de estos campos en el PATCH aplicamos
 * {@link assertPostulacionLocalFisicoUbicacion}. Así un guardado solo de galería,
 * foto principal, contacto o texto no falla cuando el local físico está
 * marcado pero la dirección/locales siguen incompletos.
 */
const PATCH_KEYS_REQUIEREN_ASSERT_LOCAL_FISICO = new Set([
  "modalidades_atencion",
  "direccion",
  "direccion_referencia",
  "locales",
]);

type AdminSupabase = ReturnType<typeof getSupabaseAdmin>;

/**
 * Tras guardar en `postulaciones_emprendedores` (estado aprobada), refleja en la ficha pública
 * campos escalares/modalidades/locales. La galería publicada solo se sincroniza al aprobar la postulación.
 * Si falla la sincronización de `emprendedor_locales`, devuelve error (no solo log).
 */
async function mirrorMejorarFichaPatchToEmprendedor(
  supabase: AdminSupabase,
  emprendedorId: string,
  patch: Record<string, unknown>
): Promise<{ ok: true } | { ok: false; message: string }> {
  const eid = String(emprendedorId ?? "").trim();
  if (!eid) return { ok: true };

  const emp: Record<string, unknown> = {
    estado_publicacion: ESTADO_PUBLICACION.en_revision,
    updated_at: new Date().toISOString(),
  };

  const scalarKeys = [
    "nombre_emprendimiento",
    "email",
    "whatsapp_principal",
    "whatsapp_secundario",
    "frase_negocio",
    "descripcion_libre",
    "instagram",
    "sitio_web",
    "nombre_responsable",
  ] as const;

  for (const k of scalarKeys) {
    if (!Object.prototype.hasOwnProperty.call(patch, k)) continue;
    emp[k] = patch[k];
  }

  if (Object.prototype.hasOwnProperty.call(patch, "mostrar_responsable_publico")) {
    emp.mostrar_responsable_publico = patch.mostrar_responsable_publico === true;
  }

  if (Object.prototype.hasOwnProperty.call(patch, "foto_principal_url")) {
    const url = String(patch.foto_principal_url ?? "").trim();
    if (!url) {
      emp.foto_principal_url = null;
    } else if (isPersistibleFotoUrl(url)) {
      emp.foto_principal_url = url;
    }
  }

  if (Object.prototype.hasOwnProperty.call(patch, "nombre_emprendimiento")) {
    const n = String(patch.nombre_emprendimiento ?? "").trim();
    if (n) emp.nombre = n;
  }

  if (Object.prototype.hasOwnProperty.call(patch, "whatsapp_principal")) {
    const w = String(patch.whatsapp_principal ?? "").trim();
    if (w) emp.whatsapp = w;
  }

  if (Object.prototype.hasOwnProperty.call(patch, "whatsapp_secundario")) {
    const raw = patch.whatsapp_secundario;
    if (raw === null || raw === undefined) {
      emp.whatsapp_secundario = null;
    } else {
      const w = String(raw).trim();
      emp.whatsapp_secundario = w ? w : null;
    }
  }

  const empDataKeys = Object.keys(emp).filter((k) => k !== "updated_at");
  if (empDataKeys.length > 0) {
    const { error } = await supabase.from("emprendedores").update(emp).eq("id", eid);
    if (error) {
      console.error("[PATCH borrador] mirror emprendedor:", error.message);
    }
  }

  if (Object.prototype.hasOwnProperty.call(patch, "modalidades_atencion")) {
    const raw = Array.isArray(patch.modalidades_atencion)
      ? patch.modalidades_atencion
      : [];
    const rawMods = raw.map((x) => String(x).trim()).filter(Boolean);
    const modalidadesUnique = modalidadesAtencionInputsToDbUnique(rawMods);

    const { error: delErr } = await supabase
      .from("emprendedor_modalidades")
      .delete()
      .eq("emprendedor_id", eid);
    if (delErr) {
      console.error("[PATCH borrador] mirror modalidades delete:", delErr.message);
    } else if (modalidadesUnique.length) {
      const modByKey = new Map<
        string,
        { emprendedor_id: string; modalidad: string }
      >();
      for (const modalidad of modalidadesUnique) {
        modByKey.set(String(modalidad).toLowerCase(), {
          emprendedor_id: eid,
          modalidad,
        });
      }
      const modRows = [...modByKey.values()];
      const { error: insErr } = await supabase.from("emprendedor_modalidades").upsert(
        modRows,
        {
          onConflict: "emprendedor_id,modalidad",
          ignoreDuplicates: true,
        }
      );
      if (insErr) {
        console.error("[PATCH borrador] mirror modalidades upsert:", insErr.message);
      }
    }

    if (!modalidadesUnique.includes("local_fisico")) {
      const locClear = await replaceEmprendedorLocales(supabase, eid, []);
      if (!locClear.ok) {
        return { ok: false, message: locClear.message };
      }
      const { error: clrDirErr } = await supabase
        .from("emprendedores")
        .update({ direccion: null, direccion_referencia: null })
        .eq("id", eid);
      if (clrDirErr) {
        console.error("[PATCH borrador] mirror limpiar dirección sin local:", clrDirErr.message);
      }
    }
  }

  // Locales físicos: se vacían arriba cuando el patch de modalidades no incluye `local_fisico`.

  void syncEmprendedorToAlgoliaWithSupabase(supabase, eid);
  return { ok: true };
}

const PATCH_ARRAY_KEYS = new Set([
  "galeria_urls",
  "comunas_cobertura",
  "regiones_cobertura",
  "modalidades",
  "modalidades_atencion",
  "subcategorias_ids",
  /** text[] en postulaciones; `[]` limpia keywords guardadas */
  "keywords_usuario",
]);

/** Si el body no envía cobertura/comuna base, no revalidamos ni reescribimos cobertura (evita 400 en PATCH parciales, p. ej. “Mejorar ficha”). */
const COBERTURA_BODY_KEYS = new Set([
  "cobertura_tipo",
  "comunas_cobertura",
  "regiones_cobertura",
  "comuna_base_id",
]);

/** No enviar null ni strings vacíos: no pisar columnas con “vacío” salvo casos explícitos. */
function sanitizePostulacionPatch(
  patch: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(patch)) {
    /** No existe en `postulaciones_emprendedores`; ignorar si el cliente lo envía. */
    if (key === "keywords_usuario_json") continue;
    if (key === "locales" && Array.isArray(value)) {
      out[key] = value;
      continue;
    }
    if (key === "whatsapp_secundario") {
      if (value === null) {
        out[key] = null;
        continue;
      }
      if (typeof value === "string") {
        const t = value.trim();
        out[key] = t === "" ? null : t;
        continue;
      }
      continue;
    }
    if (key === "direccion" || key === "direccion_referencia") {
      if (value === null) {
        out[key] = null;
        continue;
      }
      if (typeof value === "string") {
        const t = value.trim();
        if (t === "") continue;
        out[key] = t;
        continue;
      }
      continue;
    }
    if (key === "mostrar_responsable_publico") {
      if (typeof value === "boolean") out[key] = value;
      continue;
    }
    if (PATCH_ARRAY_KEYS.has(key) && Array.isArray(value)) {
      /**
       * `modalidades_atencion: []` rompe validación en BD / negocio; no enviar array vacío.
       * `galeria_urls: []` sí se envía para vaciar galería.
       */
      if (key === "modalidades_atencion" && value.length === 0) {
        continue;
      }
      out[key] = value;
      continue;
    }
    if (value === null || value === undefined) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (typeof value === "number" && Number.isNaN(value)) continue;
    out[key] = value;
  }

  return out;
}

async function safeReadBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const raw = await request.json();
    return raw != null && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/** Lectura mínima para validar envío a revisión (p. ej. dirección con modalidad local). */
export async function GET(
  _req: Request,
  context: { params: Promise<RouteParams> | RouteParams }
) {
  let id = "";
  try {
    const params = await resolveParams(context.params);
    const { id: rawId } = params ?? { id: "" };
    id =
      rawId != null && String(rawId).trim() !== ""
        ? decodeURIComponent(String(rawId).trim())
        : "";

    if (!id) {
      return json(
        {
          ok: false,
          message: "Falta el id de la postulación.",
          error: "Falta el id de la postulación.",
        },
        400
      );
    }

    let supabase: ReturnType<typeof getSupabaseAdmin>;
    try {
      supabase = getSupabaseAdmin({
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      });
    } catch (e) {
      console.error("[GET borrador] Supabase no configurado:", e);
      return json(
        {
          ok: false,
          message: "Servicio temporalmente no disponible (configuración).",
          error: "Servicio temporalmente no disponible (configuración).",
        },
        503
      );
    }

    const { data: rowById, error: fetchError } = await supabase
      .from("postulaciones_emprendedores")
      .select(POSTULACIONES_BORRADOR_GET_SELECT)
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      console.error("[GET borrador] select error:", fetchError.message, "id=", id);
      const devDetail =
        process.env.NODE_ENV === "development" ? fetchError.message : undefined;
      return json(
        {
          ok: false,
          message: devDetail
            ? `No se pudo leer la postulación. ${devDetail}`
            : "No se pudo leer la postulación.",
          error: fetchError.message,
          code: fetchError.code ?? null,
        },
        500
      );
    }

    let row = rowById;

    /** `id` en la URL puede ser el UUID del emprendedor (p. ej. «Editar datos básicos» desde mejorar-ficha). */
    if (!row) {
      const { data: byEmpRows, error: byEmpErr } = await supabase
        .from("postulaciones_emprendedores")
        .select(POSTULACIONES_BORRADOR_GET_SELECT)
        .eq("emprendedor_id", id)
        .order("updated_at", { ascending: false })
        .limit(1);
      if (byEmpErr) {
        console.error(
          "[GET borrador] select by emprendedor_id:",
          byEmpErr.message,
          "id=",
          id
        );
        const devDetail =
          process.env.NODE_ENV === "development" ? byEmpErr.message : undefined;
        return json(
          {
            ok: false,
            message: devDetail
              ? `No se pudo leer la postulación. ${devDetail}`
              : "No se pudo leer la postulación.",
            error: byEmpErr.message,
            code: byEmpErr.code ?? null,
          },
          500
        );
      }
      row = byEmpRows?.[0] ?? null;
    }

    if (!row) {
      return json(
        {
          ok: false,
          message: "Postulación no encontrada",
          error: "Postulación no encontrada",
        },
        404
      );
    }

    const rowRec = row as unknown as Record<string, unknown>;

    let comuna_base_slug: string | null = null;
    if (rowRec.comuna_base_id != null) {
      const { data: comuna } = await supabase
        .from("comunas")
        .select("slug")
        .eq("id", rowRec.comuna_base_id)
        .maybeSingle();
      comuna_base_slug =
        comuna && typeof (comuna as { slug?: unknown }).slug === "string"
          ? (comuna as { slug: string }).slug
          : null;
    }

    const storedLocalesParsed = parseLocalesPatchInput(rowRec.locales);
    const localesResp =
      storedLocalesParsed && storedLocalesParsed.length > 0
        ? storedLocalesParsed
        : localesFromPostulacionRowForGet(
            {
              direccion: rowRec.direccion,
              direccion_referencia: rowRec.direccion_referencia,
            },
            comuna_base_slug ?? ""
          );

    let emprendedor_slug: string | null = null;
    const empLinkRaw = rowRec.emprendedor_id;
    const empLinkId =
      empLinkRaw != null && String(empLinkRaw).trim() !== ""
        ? String(empLinkRaw).trim()
        : "";
    if (empLinkId) {
      const { data: empSlugRow } = await supabase
        .from("emprendedores")
        .select("slug")
        .eq("id", empLinkId)
        .maybeSingle();
      const sl =
        empSlugRow &&
        typeof (empSlugRow as { slug?: unknown }).slug === "string"
          ? String((empSlugRow as { slug: string }).slug).trim()
          : "";
      emprendedor_slug = sl || null;
    }

    return json(
      {
        ok: true,
        id: rowRec.id,
        estado: rowRec.estado,
        emprendedor_id: empLinkId || null,
        emprendedor_slug,
        direccion: rowRec.direccion ?? null,
        direccion_referencia: rowRec.direccion_referencia ?? null,
        locales: localesResp,
        modalidades_atencion: rowRec.modalidades_atencion ?? null,
        nombre_emprendimiento: rowRec.nombre_emprendimiento ?? null,
        nombre_responsable: rowRec.nombre_responsable ?? null,
        mostrar_responsable_publico: rowRec.mostrar_responsable_publico ?? null,
        email: rowRec.email ?? null,
        whatsapp_principal: rowRec.whatsapp_principal ?? null,
        whatsapp_secundario: rowRec.whatsapp_secundario ?? null,
        frase_negocio: rowRec.frase_negocio ?? null,
        comuna_base_id: rowRec.comuna_base_id ?? null,
        comuna_base_slug,
        cobertura_tipo: rowRec.cobertura_tipo ?? null,
        comunas_cobertura: rowRec.comunas_cobertura ?? [],
        regiones_cobertura: rowRec.regiones_cobertura ?? [],
        foto_principal_url: rowRec.foto_principal_url ?? null,
        galeria_urls: rowRec.galeria_urls ?? null,
        instagram: rowRec.instagram ?? null,
        sitio_web: rowRec.sitio_web ?? null,
        descripcion_libre: rowRec.descripcion_libre ?? null,
        categoria_id: rowRec.categoria_id ?? null,
        subcategorias_ids: rowRec.subcategorias_ids ?? null,
        keywords_usuario: rowRec.keywords_usuario ?? null,
      },
      200
    );
  } catch (error) {
    console.error("[GET borrador] excepción:", id, error);
    return json(
      {
        ok: false,
        message: "Error inesperado en GET borrador",
        error: "Error inesperado en GET borrador",
        detail: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}

/**
 * PATCH parcial del borrador/postulación en **`postulaciones_emprendedores`** (no escribe en `emprendedores`).
 * Firma compatible con App Router: segundo argumento `{ params }`.
 */
export async function PATCH(
  req: Request,
  context: { params: Promise<RouteParams> | RouteParams }
) {
  let id = "";

  try {
    let params: RouteParams;
    try {
      params = await resolveParams(context.params);
    } catch (e) {
      console.error("[PATCH borrador] params await error:", e);
      return json(
        {
          ok: false,
          message: "Solicitud inválida (parámetros).",
          error: "Solicitud inválida (parámetros).",
        },
        400
      );
    }

    const { id: rawId } = params ?? { id: "" };
    id =
      rawId != null && String(rawId).trim() !== ""
        ? decodeURIComponent(String(rawId).trim())
        : "";

    console.log("PATCH borrador handler hit", id || "(empty)");

    if (!id) {
      return json(
        {
          ok: false,
          message: "Falta el id de la postulación.",
          error: "Falta el id de la postulación.",
        },
        400
      );
    }

    const body = await safeReadBody(req);
    console.log("[PATCH borrador] tabla: postulaciones_emprendedores id=", id);
    if (process.env.DEBUG_BORRADOR_PATCH === "1") {
      try {
        console.log("[PATCH borrador] body recibido (JSON):", JSON.stringify(body));
      } catch {
        console.log("[PATCH borrador] body keys:", Object.keys(body));
      }
    }

    let supabase: ReturnType<typeof getSupabaseAdmin>;
    try {
      supabase = getSupabaseAdmin({
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      });
    } catch (e) {
      console.error("[PATCH borrador] Supabase no configurado:", e);
      return json(
        {
          ok: false,
          message: "Servicio temporalmente no disponible (configuración).",
          error: "Servicio temporalmente no disponible (configuración).",
          details: e instanceof Error ? e.message : String(e),
        },
        503
      );
    }

    const PATCH_EXISTING_SELECT =
      "id, estado, cobertura_tipo, comuna_base_id, comunas_cobertura, regiones_cobertura, emprendedor_id, frase_negocio, descripcion_libre, modalidades_atencion, direccion, direccion_referencia, locales, whatsapp_principal, whatsapp_secundario, instagram, sitio_web";

    const { data: existingByPk, error: fetchError } = await supabase
      .from("postulaciones_emprendedores")
      .select(PATCH_EXISTING_SELECT)
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      console.error(
        "[PATCH borrador] select error (JSON):",
        JSON.stringify(
          {
            id,
            code: fetchError.code ?? null,
            message: fetchError.message ?? null,
          },
          null,
          2
        )
      );
      return json(
        {
          ok: false,
          phase: "db_read",
          message: "Error al guardar. Intenta nuevamente.",
          error: "Error al guardar. Intenta nuevamente.",
          supabase: {
            code: fetchError.code ?? null,
            message: fetchError.message ?? null,
          },
        },
        500
      );
    }

    let existing = existingByPk;

    /** Mismo criterio que GET: el cliente puede enviar el UUID del emprendedor en lugar del id de postulación. */
    if (!existing) {
      const { data: byEmpRows, error: byEmpErr } = await supabase
        .from("postulaciones_emprendedores")
        .select(PATCH_EXISTING_SELECT)
        .eq("emprendedor_id", id)
        .order("updated_at", { ascending: false })
        .limit(1);
      if (byEmpErr) {
        console.error(
          "[PATCH borrador] select by emprendedor_id:",
          byEmpErr.message,
          "id=",
          id
        );
        return json(
          {
            ok: false,
            phase: "db_read",
            message: "Error al guardar. Intenta nuevamente.",
            error: "Error al guardar. Intenta nuevamente.",
            supabase: {
              code: byEmpErr.code ?? null,
              message: byEmpErr.message ?? null,
            },
          },
          500
        );
      }
      const row = byEmpRows?.[0] ?? null;
      if (row) {
        existing = row;
        const rid = String((row as Record<string, unknown>).id ?? "").trim();
        if (rid) id = rid;
      }
    }

    if (!existing) {
      console.warn("[PATCH borrador] sin fila para id:", id);
      return json(
        {
          ok: false,
          phase: "not_found",
          message: "Postulación no encontrada.",
          error: "Postulación no encontrada.",
        },
        404
      );
    }

    const estadoN = normalizePostulacionEstado(existing.estado);
    const puedeEditarBorrador =
      estadoN === "borrador" || estadoN === "pendiente_revision";
    const puedeMejorarAprobada = estadoN === "aprobada";
    const modoGuardadoCliente = parseModoGuardadoServidor(body);

    if (!puedeEditarBorrador && !puedeMejorarAprobada) {
      return json(
        {
          ok: false,
          phase: "forbidden_state",
          message:
            "Esta postulación ya no admite edición desde este formulario. Si tu ficha ya está publicada, usá el panel o la opción de mejorar ficha desde tu cuenta.",
          error: `Estado de postulación: ${estadoN || "desconocido"}`,
        },
        400
      );
    }

    if (puedeMejorarAprobada) {
      const eid = String(
        (existing as Record<string, unknown>).emprendedor_id ?? ""
      ).trim();
      if (!eid) {
        return json(
          {
            ok: false,
            phase: "invalid_link",
            message:
              "La postulación está aprobada pero no está enlazada a una ficha pública. Contactá soporte.",
            error: "Sin emprendedor vinculado",
          },
          400
        );
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, "locales")) {
      const rawLocalesBody = body.locales;
      if (!Array.isArray(rawLocalesBody)) {
        return json(
          {
            ok: false,
            phase: "validation",
            message: "El campo locales debe ser un arreglo.",
            error: "El campo locales debe ser un arreglo.",
          },
          400
        );
      }
      if (
        rawLocalesBody.length > 0 &&
        parseLocalesPatchInput(rawLocalesBody) === null
      ) {
        return json(
          {
            ok: false,
            phase: "validation",
            message:
              "Formato de locales inválido: cada local requiere comuna_slug y dirección.",
            error:
              "Formato de locales inválido: cada local requiere comuna_slug y dirección.",
          },
          400
        );
      }
    }

    const extractedRaw = extractBorradorPatchFromBody(body);

    if (
      (puedeEditarBorrador || puedeMejorarAprobada) &&
      Object.prototype.hasOwnProperty.call(extractedRaw, "modalidades_atencion")
    ) {
      const rawMods = extractedRaw.modalidades_atencion;
      const arrM = Array.isArray(rawMods) ? rawMods.map((x) => String(x)) : [];
      const arrNorm = arrM.map((x) => String(x ?? "").trim().toLowerCase()).filter(Boolean);
      const explicitLocalFisico = arrNorm.includes("local_fisico");

      /**
       * Compat legacy: algunos clientes antiguos enviaban "local"/"fisico".
       * Regla: SOLO persistir `local_fisico` si viene explícito como "local_fisico".
       * "presencial" se mapea a `presencial_terreno` (nunca a local_fisico).
       */
      const arrForDb = explicitLocalFisico
        ? arrM
        : arrM.filter((x) => {
            const t = String(x ?? "").trim().toLowerCase();
            return t !== "local" && t !== "fisico";
          });
      const uniqueM = modalidadesAtencionInputsToDbUnique(arrForDb);
      // Persistir siempre en formato DB para evitar que "local" vuelva a convertirse en local_fisico más adelante.
      extractedRaw.modalidades_atencion = uniqueM;

      if (process.env.REVISION_LOCAL_DEBUG === "1") {
        // eslint-disable-next-line no-console
        console.log("[revision-local-debug][borrador_patch]", {
          modalidades_atencion_raw: arrM,
          mapping_raw_a_db: arrM.map((raw) => ({ raw, db: modalidadAtencionInputToDb(raw) })),
          explicitLocalFisico,
          modalidades_db_persistidas: uniqueM,
        });
      }
      const hasLocalFisico = uniqueM.includes("local_fisico");
      if (!hasLocalFisico) {
        extractedRaw.direccion = null;
        extractedRaw.direccion_referencia = null;
      }
    }

    let patch = sanitizePostulacionPatch(extractedRaw);

    if (puedeMejorarAprobada) {
      patch = Object.fromEntries(
        Object.entries(patch).filter(([k]) =>
          MEJORAR_FICHA_POSTULACION_KEYS.has(k)
        )
      ) as Record<string, unknown>;
    }

    const touchedCobertura =
      puedeEditarBorrador &&
      Object.keys(body).some((k) => COBERTURA_BODY_KEYS.has(k));

    /**
     * Normalización robusta de cobertura (solo si el cliente envía datos de cobertura):
     * - limpia arrays según `cobertura_tipo`
     * - deduplica
     * - garantiza base en `varias_comunas`
     * - mantiene coherencia geográfica de `varias_comunas` (misma región que base)
     */
    if (!touchedCobertura && process.env.DEBUG_BORRADOR_PATCH === "1") {
      console.log(
        "[PATCH borrador] sin campos de cobertura en body; se omite normalización de cobertura"
      );
    }

    if (touchedCobertura) {
    const effectiveCoberturaTipoRaw = String(
      patch.cobertura_tipo ?? existing?.cobertura_tipo ?? ""
    )
      .trim()
      .toLowerCase();
    const effectiveCoberturaTipo =
      effectiveCoberturaTipoRaw === "solo_comuna"
        ? "solo_mi_comuna"
        : effectiveCoberturaTipoRaw;

    const effectiveBaseIdRaw =
      patch.comuna_base_id ?? existing?.comuna_base_id ?? null;
    const effectiveBaseId =
      typeof effectiveBaseIdRaw === "number"
        ? effectiveBaseIdRaw
        : Number.isFinite(Number(effectiveBaseIdRaw))
          ? Number(effectiveBaseIdRaw)
          : null;

    const toStringArray = (v: unknown): string[] =>
      Array.isArray(v)
        ? v
            .filter((x) => typeof x === "string")
            .map((x) => String(x).trim())
            .filter(Boolean)
        : [];

    const dedupe = (arr: string[]): string[] => {
      const seen = new Set<string>();
      const out: string[] = [];
      for (const item of arr) {
        if (!seen.has(item)) {
          seen.add(item);
          out.push(item);
        }
      }
      return out;
    };

    const currentComunas = dedupe(
      toStringArray(patch.comunas_cobertura ?? existing?.comunas_cobertura ?? [])
    );
    const currentRegiones = dedupe(
      toStringArray(patch.regiones_cobertura ?? existing?.regiones_cobertura ?? [])
    );

    let baseSlug = "";
    let baseRegionId = "";
    let baseRegionSlug = "";

    if (effectiveBaseId) {
      const { data: baseComunaRow } = await supabase
        .from("comunas")
        .select("slug, region_id")
        .eq("id", effectiveBaseId)
        .maybeSingle();

      baseSlug = String(baseComunaRow?.slug ?? "").trim();
      baseRegionId = String(baseComunaRow?.region_id ?? "").trim();

      if (baseRegionId) {
        const { data: baseRegionRow } = await supabase
          .from("regiones")
          .select("slug")
          .eq("id", baseRegionId)
          .maybeSingle();
        baseRegionSlug = String(baseRegionRow?.slug ?? "").trim();
      }
    }

    if (effectiveCoberturaTipo === "varias_comunas") {
      if (!baseSlug) {
        return json(
          {
            ok: false,
            message:
              "Selecciona primero tu comuna de origen para usar varias comunas cercanas.",
            error:
              "Selecciona primero tu comuna de origen para usar varias comunas cercanas.",
          },
          400
        );
      }

      // Filtrar extras por misma región que base (coherencia geográfica)
      let filteredExtras = currentComunas.filter((slug) => slug !== baseSlug);
      if (baseRegionId && filteredExtras.length > 0) {
        const { data: comunasRows } = await supabase
          .from("comunas")
          .select("slug, region_id")
          .in("slug", filteredExtras);

        const validByRegion = new Set(
          (comunasRows ?? [])
            .filter((r) => String(r.region_id ?? "") === baseRegionId)
            .map((r) => String(r.slug ?? "").trim())
        );
        filteredExtras = filteredExtras.filter((slug) => validByRegion.has(slug));
      }

      const MAX_COMUNAS_VARIAS = 8;
      const capped = [baseSlug, ...dedupe(filteredExtras)].slice(0, MAX_COMUNAS_VARIAS);
      if (capped.length < 2) {
        return json(
          {
            ok: false,
            message:
              "Debes seleccionar al menos otra comuna además de la base.",
            error:
              "Debes seleccionar al menos otra comuna además de la base.",
          },
          400
        );
      }

      patch = {
        ...patch,
        cobertura_tipo: "varias_comunas",
        comunas_cobertura: capped,
        regiones_cobertura: [],
      };
    } else if (effectiveCoberturaTipo === "solo_mi_comuna") {
      if (!baseSlug) {
        return json(
          {
            ok: false,
            message:
              "Cobertura inválida: solo_mi_comuna requiere comuna_base_id válida.",
            error:
              "Cobertura inválida: solo_mi_comuna requiere comuna_base_id válida.",
          },
          400
        );
      }

      patch = {
        ...patch,
        cobertura_tipo: "solo_mi_comuna",
        comunas_cobertura: [baseSlug],
        regiones_cobertura: [],
      };
    } else if (effectiveCoberturaTipo === "varias_regiones") {
      let fromPatch = dedupe(toStringArray(patch.regiones_cobertura ?? []));
      if (fromPatch.length === 0) {
        fromPatch = dedupe(
          toStringArray(existing?.regiones_cobertura ?? [])
        );
      }
      const candidateSlugs =
        fromPatch.length > 0
          ? fromPatch
          : baseRegionSlug
            ? [baseRegionSlug]
            : [];

      if (candidateSlugs.length === 0) {
        return json(
          {
            ok: false,
            message:
              "Selecciona al menos una región para este tipo de cobertura.",
            error:
              "Selecciona al menos una región para este tipo de cobertura.",
          },
          400
        );
      }

      const { data: regionRows } = await supabase
        .from("regiones")
        .select("slug")
        .in("slug", candidateSlugs);

      const validSet = new Set(
        (regionRows ?? [])
          .map((r) => String(r.slug ?? "").trim())
          .filter(Boolean)
      );
      const normalizedRegions = dedupe(
        candidateSlugs.filter((s) => validSet.has(s))
      );

      if (normalizedRegions.length === 0) {
        return json(
          {
            ok: false,
            message:
              "Una o más regiones no son válidas. Elige regiones de la lista.",
            error:
              "Una o más regiones no son válidas. Elige regiones de la lista.",
          },
          400
        );
      }

      patch = {
        ...patch,
        cobertura_tipo: "varias_regiones",
        comunas_cobertura: [],
        regiones_cobertura: normalizedRegions,
      };
    } else if (effectiveCoberturaTipo === "nacional") {
      patch = {
        ...patch,
        cobertura_tipo: "nacional",
        comunas_cobertura: [],
        regiones_cobertura: [],
      };
    }
    }

    if (
      "foto_principal_url" in patch &&
      !isPersistibleFotoUrl(String(patch.foto_principal_url))
    ) {
      const { foto_principal_url: _drop, ...rest } = patch;
      patch = rest;
    }

    const rawFp = body.foto_principal_url;
    if (typeof rawFp === "string" && isPersistibleFotoUrl(rawFp)) {
      const trimmed = rawFp.trim();
      patch = { ...patch, foto_principal_url: trimmed };
      console.log("[PATCH borrador] Saving foto_principal_url:", trimmed);
    }

    const existingRow = existing as Record<string, unknown>;

    function mergeDescripcionCortaIntoFrase(p: Record<string, unknown>) {
      const dc = p.descripcion_corta;
      const fn = p.frase_negocio;
      if (
        typeof dc === "string" &&
        (fn === undefined || String(fn).trim() === "")
      ) {
        p.frase_negocio = dc;
      }
      if (Object.prototype.hasOwnProperty.call(p, "descripcion_corta")) {
        delete p.descripcion_corta;
      }
    }

    mergeDescripcionCortaIntoFrase(patch);

    const contactPatchKeys = new Set([
      "whatsapp_principal",
      "whatsapp_secundario",
      "instagram",
      "sitio_web",
      "email",
    ]);
    if (Object.keys(patch).some((k) => contactPatchKeys.has(k))) {
      const contactNorm = normalizePostulacionContactoPatch(patch, existingRow);
      if (!contactNorm.ok) {
        return json(
          {
            ok: false,
            phase: "validation",
            message: contactNorm.message,
            error: contactNorm.message,
          },
          400
        );
      }
      patch = contactNorm.patch;
    }

    const erroresDesc: string[] = [];

    if (Object.prototype.hasOwnProperty.call(patch, "descripcion_libre")) {
      const n = normalizeDescripcionLarga(String(patch.descripcion_libre ?? ""));
      patch.descripcion_libre = n;
      erroresDesc.push(...validateDescripcionLarga(n));
    }

    const enviaRevision =
      Object.prototype.hasOwnProperty.call(patch, "estado") &&
      normalizePostulacionEstado(patch.estado) === "pendiente_revision";

    const descrSuavePorMejorarFicha =
      puedeMejorarAprobada || modoGuardadoCliente === "mejorar";

    if (descrSuavePorMejorarFicha) {
      if (Object.prototype.hasOwnProperty.call(patch, "frase_negocio")) {
        const n = normalizeDescripcionCorta(String(patch.frase_negocio ?? ""));
        patch.frase_negocio = n;
        erroresDesc.push(...validateDescripcionCortaBorradorSiPresente(n));
      }
    } else if (enviaRevision) {
      const rawFrase = Object.prototype.hasOwnProperty.call(patch, "frase_negocio")
        ? String(patch.frase_negocio ?? "")
        : String(existingRow.frase_negocio ?? "");
      const n = normalizeDescripcionCorta(rawFrase);
      patch.frase_negocio = n;
      erroresDesc.push(...validateDescripcionCortaPublicacion(n));
    } else {
      if (Object.prototype.hasOwnProperty.call(patch, "frase_negocio")) {
        const n = normalizeDescripcionCorta(String(patch.frase_negocio ?? ""));
        patch.frase_negocio = n;
        if (n) {
          erroresDesc.push(...validateDescripcionCortaBorradorSiPresente(n));
        }
      }
    }

    const msgDesc = primeraValidacionDescripcion(erroresDesc);
    if (msgDesc) {
      console.warn(
        "[PATCH borrador] validación descripción (JSON):",
        JSON.stringify({ id, msgDesc, erroresDesc }, null, 2)
      );
      return json(
        {
          ok: false,
          phase: "validation",
          message: msgDesc,
          error: msgDesc,
          errors: erroresDesc,
        },
        400
      );
    }

    if (puedeEditarBorrador || puedeMejorarAprobada) {
      const patchRequiereAssertLocal = Object.keys(patch).some((k) =>
        PATCH_KEYS_REQUIEREN_ASSERT_LOCAL_FISICO.has(k)
      );
      if (patchRequiereAssertLocal) {
        const effModsDb = modalidadesDbDesdePatchYOExistente(patch, existingRow);

        const rawBodyLocales = Object.prototype.hasOwnProperty.call(body, "locales")
          ? body.locales
          : undefined;
        const parsedBodyLocales = parseLocalesPatchInput(rawBodyLocales);

        let mergedLocales: unknown;
        if (parsedBodyLocales !== null && parsedBodyLocales.length > 0) {
          mergedLocales = rawBodyLocales;
        } else if (
          Object.prototype.hasOwnProperty.call(body, "locales") &&
          Array.isArray(rawBodyLocales) &&
          rawBodyLocales.length === 0
        ) {
          mergedLocales = [];
        } else {
          mergedLocales = existingRow.locales;
          const parsedExisting = parseLocalesPatchInput(mergedLocales);
          if (parsedExisting === null || parsedExisting.length === 0) {
            const baseIdRaw = existingRow.comuna_base_id;
            let baseSlug = "";
            if (baseIdRaw != null && String(baseIdRaw).trim() !== "") {
              const { data: crow } = await supabase
                .from("comunas")
                .select("slug")
                .eq("id", baseIdRaw)
                .maybeSingle();
              baseSlug = String(crow?.slug ?? "").trim();
            }
            const synthetic = localesFromPostulacionRowForGet(
              {
                direccion: existingRow.direccion,
                direccion_referencia: existingRow.direccion_referencia,
              },
              baseSlug
            );
            if (synthetic.length > 0) {
              mergedLocales = synthetic;
            }
          }
        }

        const locAssert = await assertPostulacionLocalFisicoUbicacion({
          supabase,
          emprendedorId: String((existing as Record<string, unknown>).emprendedor_id ?? "").trim() ||
            null,
          modalidadesDb: effModsDb,
          direccion: pickPostulacionCampoEfectivo(patch, existingRow, "direccion"),
          direccion_referencia: pickPostulacionCampoEfectivo(
            patch,
            existingRow,
            "direccion_referencia"
          ),
          locales: mergedLocales,
        });
        if (!locAssert.ok) {
          return json(
            {
              ok: false,
              phase: "validation",
              message: locAssert.message,
              error: locAssert.message,
            },
            400
          );
        }
      }
    }

    if (process.env.DEBUG_BORRADOR_PATCH === "1") {
      try {
        console.log(
          "[PATCH borrador] patch final hacia Supabase (JSON):",
          JSON.stringify(patch)
        );
      } catch {
        console.log("[PATCH borrador] patch final keys:", Object.keys(patch));
      }
    }

    // UPDATE solo en postulaciones_emprendedores (no en emprendedores).
    const updatedAt = new Date().toISOString();
    let activePatch: Record<string, unknown> = { ...patch };

    const activeDataKeys = Object.keys(activePatch).filter(
      (k) => activePatch[k] !== undefined
    );
    if (activeDataKeys.length === 0) {
      console.log("[PATCH borrador] patch vacío tras validar; noop, id=", id);
      return json(
        {
          ok: true,
          phase: "noop",
          message: "Sin cambios para guardar.",
          postulacion_id: id,
          estado: existing.estado,
        },
        200
      );
    }

    if (process.env.NODE_ENV === "development" || process.env.DEBUG_BORRADOR_PATCH === "1") {
      console.log(
        "[PATCH borrador] aplicando update (JSON):",
        JSON.stringify(
          {
            id,
            estado: estadoN,
            puedeMejorarAprobada,
            keys: activeDataKeys,
          },
          null,
          2
        )
      );
    }

    const runPostulacionUpdate = (p: Record<string, unknown>) =>
      supabase
        .from("postulaciones_emprendedores")
        .update({
          ...p,
          updated_at: updatedAt,
        })
        .eq("id", id)
        .select("id, estado, foto_principal_url")
        .maybeSingle();

    let { data, error: updateError } = await runPostulacionUpdate(activePatch);

    if (
      updateError &&
      Object.prototype.hasOwnProperty.call(activePatch, "direccion_referencia") &&
      (updateError.code === "PGRST204" ||
        String(updateError.message).includes("direccion_referencia"))
    ) {
      console.warn(
        "[PATCH borrador] BD sin columna direccion_referencia; reintento sin ese campo. Aplicá supabase/migrations/20260322120000_direccion_referencia.sql"
      );
      const { direccion_referencia: _omit, ...patchSinRef } = activePatch;
      activePatch = patchSinRef;
      ({ data, error: updateError } = await runPostulacionUpdate(activePatch));
    }

    if (process.env.NODE_ENV === "development") {
      console.log(
        "[PATCH borrador] UPDATE error:",
        updateError?.message ?? null,
        "data id:",
        data?.id ?? null
      );
    }

    if (updateError) {
      console.error(
        "[PATCH borrador] Supabase update error (JSON):",
        JSON.stringify(
          {
            id,
            patchKeys: Object.keys(activePatch),
            code: updateError.code ?? null,
            message: updateError.message ?? null,
            details: updateError.details ?? null,
            hint: updateError.hint ?? null,
          },
          null,
          2
        )
      );
      return json(
        {
          ok: false,
          phase: "supabase",
          message: "Error al guardar. Intenta nuevamente.",
          error: "Error al guardar. Intenta nuevamente.",
          supabase: {
            code: updateError.code ?? null,
            message: updateError.message ?? null,
            details: updateError.details ?? null,
            hint: updateError.hint ?? null,
          },
        },
        500
      );
    }

    if (!data || data.id == null) {
      console.error(
        "[PATCH borrador] update sin fila retornada (JSON):",
        JSON.stringify({ id, patchKeys: Object.keys(activePatch) }, null, 2)
      );
      return json(
        {
          ok: false,
          phase: "db",
          message: "Error al guardar. Intenta nuevamente.",
          error: "Error al guardar. Intenta nuevamente.",
          reason: "update_sin_fila",
        },
        500
      );
    }

    // Regla producto (unificada): una postulación aprobada NO debe escribir directo al publicado.
    // La sincronización al emprendimiento publicado ocurre solo vía aprobación/publicación admin.

    return json(
      {
        ok: true,
        phase: "saved",
        postulacion_id: data.id,
        estado: data.estado,
        message: "Guardado",
      },
      200
    );
  } catch (error) {
    console.error(
      "[PATCH borrador] excepción no capturada (JSON):",
      JSON.stringify(
        {
          id,
          err: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
        null,
        2
      )
    );
    return json(
      {
        ok: false,
        phase: "exception",
        message: "Error al guardar. Intenta nuevamente.",
        error: "Error al guardar. Intenta nuevamente.",
        detail: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}
