// app/api/publicar/borrador/[id]/route.ts
import { syncEmprendedorToAlgolia } from "@/lib/algoliaSyncEmprendedor";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isPersistibleFotoUrl } from "@/lib/isPersistibleFotoUrl";
import { extractBorradorPatchFromBody } from "@/lib/publicarValidation";

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

/** PostgREST suele mostrar `keywords_usuario` como "keywords usuario" en el mensaje. */
function isMissingKeywordsUsuarioColumn(err: {
  message?: string;
  code?: string;
}): boolean {
  const m = String(err.message ?? "").toLowerCase();
  return (
    err.code === "PGRST204" ||
    (m.includes("schema cache") &&
      m.includes("keywords") &&
      m.includes("usuario"))
  );
}

function normalizePostulacionEstado(v: unknown): string {
  return String(v ?? "").trim().toLowerCase();
}

/** Campos que “Mejorar ficha” puede tocar cuando la postulación ya está aprobada. */
const MEJORAR_FICHA_POSTULACION_KEYS = new Set([
  "mostrar_responsable_publico",
  "galeria_urls",
  "nombre_emprendimiento",
  "email",
  "whatsapp_principal",
  "frase_negocio",
  "foto_principal_url",
  "instagram",
  "sitio_web",
  "descripcion_libre",
  "direccion",
  "direccion_referencia",
  "nombre_responsable",
  "modalidades_atencion",
]);

const MODAL_ATENCION_DB = ["local_fisico", "presencial_terreno", "online"] as const;

function modalidadPostBodyToDb(m: string): string {
  const x = String(m).trim().toLowerCase();
  if (x === "local_fisico" || x === "local") return "local_fisico";
  if (
    x === "domicilio" ||
    x === "presencial" ||
    x === "presencial_terreno"
  ) {
    return "presencial_terreno";
  }
  if (x === "online") return "online";
  return x;
}

type AdminSupabase = ReturnType<typeof getSupabaseAdmin>;

/**
 * Tras guardar en `postulaciones_emprendedores` (estado aprobada), refleja en la ficha pública.
 */
async function mirrorMejorarFichaPatchToEmprendedor(
  supabase: AdminSupabase,
  emprendedorId: string,
  patch: Record<string, unknown>
): Promise<void> {
  const eid = String(emprendedorId ?? "").trim();
  if (!eid) return;

  const emp: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  const scalarKeys = [
    "nombre_emprendimiento",
    "email",
    "whatsapp_principal",
    "frase_negocio",
    "descripcion_libre",
    "instagram",
    "sitio_web",
    "direccion",
    "direccion_referencia",
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

    const { error: delErr } = await supabase
      .from("emprendedor_modalidades")
      .delete()
      .eq("emprendedor_id", eid);
    if (delErr) {
      console.error("[PATCH borrador] mirror modalidades delete:", delErr.message);
    } else {
      const modalidadesUnique = [
        ...new Set(
          rawMods
            .map(modalidadPostBodyToDb)
            .filter((m) => (MODAL_ATENCION_DB as readonly string[]).includes(m))
        ),
      ];
      if (modalidadesUnique.length) {
        const { error: insErr } = await supabase.from("emprendedor_modalidades").insert(
          modalidadesUnique.map((modalidad) => ({
            emprendedor_id: eid,
            modalidad,
          }))
        );
        if (insErr) {
          console.error("[PATCH borrador] mirror modalidades insert:", insErr.message);
        }
      }
    }
  }

  if (Object.prototype.hasOwnProperty.call(patch, "galeria_urls")) {
    const raw = Array.isArray(patch.galeria_urls) ? patch.galeria_urls : [];
    const urls = raw
      .map((x) => String(x).trim())
      .filter((u) => isPersistibleFotoUrl(u))
      .slice(0, 8);

    const { error: delGalErr } = await supabase
      .from("emprendedor_galeria")
      .delete()
      .eq("emprendedor_id", eid);
    if (delGalErr) {
      console.error("[PATCH borrador] mirror galeria delete:", delGalErr.message);
    } else if (urls.length) {
      const { error: insGalErr } = await supabase.from("emprendedor_galeria").insert(
        urls.map((imagen_url) => ({
          emprendedor_id: eid,
          imagen_url,
        }))
      );
      if (insGalErr) {
        console.error("[PATCH borrador] mirror galeria insert:", insGalErr.message);
      }
    }
  }

  void syncEmprendedorToAlgolia(eid);
}

const PATCH_ARRAY_KEYS = new Set([
  "galeria_urls",
  "comunas_cobertura",
  "regiones_cobertura",
  "modalidades",
  "modalidades_atencion",
  "subcategorias_ids",
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
    if (key === "mostrar_responsable_publico") {
      if (typeof value === "boolean") out[key] = value;
      continue;
    }
    if (PATCH_ARRAY_KEYS.has(key) && Array.isArray(value)) {
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
      supabase = getSupabaseAdmin();
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

    /** `*` evita 500 en entornos sin migraciones recientes (columnas nuevas en el listado rompen PostgREST). */
    const { data: row, error: fetchError } = await supabase
      .from("postulaciones_emprendedores")
      .select("*")
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

    let comuna_base_slug: string | null = null;
    if (row.comuna_base_id != null) {
      const { data: comuna } = await supabase
        .from("comunas")
        .select("slug")
        .eq("id", row.comuna_base_id)
        .maybeSingle();
      comuna_base_slug =
        comuna && typeof (comuna as { slug?: unknown }).slug === "string"
          ? (comuna as { slug: string }).slug
          : null;
    }

    return json(
      {
        ok: true,
        id: row.id,
        estado: row.estado,
        direccion: row.direccion ?? null,
        direccion_referencia: row.direccion_referencia ?? null,
        modalidades_atencion: row.modalidades_atencion ?? null,
        nombre_emprendimiento: row.nombre_emprendimiento ?? null,
        email: row.email ?? null,
        whatsapp_principal: row.whatsapp_principal ?? null,
        frase_negocio: row.frase_negocio ?? null,
        keywords_usuario: row.keywords_usuario ?? null,
        comuna_base_id: row.comuna_base_id ?? null,
        comuna_base_slug,
        cobertura_tipo: row.cobertura_tipo ?? null,
        comunas_cobertura: row.comunas_cobertura ?? [],
        regiones_cobertura: row.regiones_cobertura ?? [],
        foto_principal_url: row.foto_principal_url ?? null,
        galeria_urls: row.galeria_urls ?? null,
        instagram: row.instagram ?? null,
        sitio_web: row.sitio_web ?? null,
        descripcion_libre: row.descripcion_libre ?? null,
        categoria_id: row.categoria_id ?? null,
        subcategorias_ids: row.subcategorias_ids ?? null,
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
      supabase = getSupabaseAdmin();
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

    const { data: existing, error: fetchError } = await supabase
      .from("postulaciones_emprendedores")
      .select(
        "id, estado, cobertura_tipo, comuna_base_id, comunas_cobertura, regiones_cobertura, emprendedor_id"
      )
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      console.error(
        "[PATCH borrador] select error:",
        fetchError.code,
        fetchError.message,
        "id=",
        id
      );
      return json(
        {
          ok: false,
          message: "No se pudo leer la postulación.",
          error: fetchError.message,
          code: fetchError.code ?? null,
        },
        500
      );
    }

    if (!existing) {
      console.warn("[PATCH borrador] sin fila para id:", id);
      return json(
        {
          ok: false,
          message: "Postulación no encontrada",
          error: "Postulación no encontrada",
        },
        404
      );
    }

    const estadoN = normalizePostulacionEstado(existing.estado);
    const puedeEditarBorrador =
      estadoN === "borrador" || estadoN === "pendiente_revision";
    const puedeMejorarAprobada = estadoN === "aprobada";

    if (!puedeEditarBorrador && !puedeMejorarAprobada) {
      return json(
        {
          ok: false,
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
            message:
              "La postulación está aprobada pero no está enlazada a una ficha pública. Contactá soporte.",
            error: "Sin emprendedor vinculado",
          },
          400
        );
      }
    }

    let patch = sanitizePostulacionPatch(extractBorradorPatchFromBody(body));

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
              "Cobertura inválida: varias_comunas requiere comuna_base_id válida.",
            error:
              "Cobertura inválida: varias_comunas requiere comuna_base_id válida.",
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
              "Cobertura inválida: varias_comunas requiere al menos 2 comunas (incluida la base).",
            error:
              "Cobertura inválida: varias_comunas requiere al menos 2 comunas (incluida la base).",
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
      const normalizedRegions = baseRegionSlug ? [baseRegionSlug] : [];

      if (normalizedRegions.length === 0) {
        return json(
          {
            ok: false,
            message:
              "Cobertura inválida: varias_regiones requiere al menos una región.",
            error:
              "Cobertura inválida: varias_regiones requiere al menos una región.",
          },
          400
        );
      }

      patch = {
        ...patch,
        cobertura_tipo: "varias_regiones",
        comunas_cobertura: [],
        regiones_cobertura: dedupe(normalizedRegions),
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

    if (
      updateError &&
      Object.prototype.hasOwnProperty.call(activePatch, "keywords_usuario") &&
      isMissingKeywordsUsuarioColumn(updateError)
    ) {
      console.warn(
        "[PATCH borrador] BD sin columna keywords_usuario; reintento sin ese campo. Ejecutá supabase/migrations/20260330010100_postulaciones_keywords_usuario.sql"
      );
      const { keywords_usuario: _kw, ...patchSinKw } = activePatch;
      activePatch = patchSinKw;
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
        "[PATCH borrador] Supabase update error:",
        updateError.code,
        updateError.message,
        updateError.details,
        updateError.hint
      );
      return json(
        {
          ok: false,
          message: updateError.message || "No se pudo actualizar la postulación",
          error: updateError.message || "No se pudo actualizar la postulación",
          details: updateError.details ?? null,
          code: updateError.code ?? null,
          hint: updateError.hint ?? null,
        },
        500
      );
    }

    if (!data || data.id == null) {
      console.error("[PATCH borrador] update sin fila retornada, id:", id);
      return json(
        {
          ok: false,
          message: "No se pudo actualizar la postulación (sin resultado).",
          error: "No se pudo actualizar la postulación (sin resultado).",
        },
        500
      );
    }

    if (puedeMejorarAprobada) {
      const eid = String(
        (existing as Record<string, unknown>).emprendedor_id ?? ""
      ).trim();
      if (eid) {
        await mirrorMejorarFichaPatchToEmprendedor(supabase, eid, activePatch);
      }
    }

    return json(
      {
        ok: true,
        postulacion_id: data.id,
        estado: data.estado,
        message: "Postulación actualizada correctamente.",
      },
      200
    );
  } catch (error) {
    console.error("[PATCH borrador] excepción no capturada:", id, error);
    return json(
      {
        ok: false,
        message: "Error inesperado en PATCH borrador",
        error: "Error inesperado en PATCH borrador",
        detail: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}
