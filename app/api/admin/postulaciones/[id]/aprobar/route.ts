// app/api/admin/postulaciones/[id]/aprobar/route.ts
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ok,
  badRequest,
  notFound,
  serverError,
  type HttpErrorMeta,
} from "@/lib/http";
import {
  normalizeTaxonomiaUuid,
  normalizeTaxonomiaUuidList,
  validateCategoriaSubcategorias,
} from "@/lib/validateCategoriaSubcategorias";
import { slugify } from "@/lib/slugify";
import { isPersistibleFotoUrl } from "@/lib/isPersistibleFotoUrl";
import { syncEmprendedorToAlgolia } from "@/lib/algoliaSyncEmprendedor";
import { normalizeCoberturaTipoDb } from "@/lib/cobertura";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type AdminBody = Record<string, unknown>;

function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

type PgErrLike = {
  message?: unknown;
  code?: unknown;
  details?: unknown;
  hint?: unknown;
};

function metaFromPostgrest(err: PgErrLike): HttpErrorMeta {
  return {
    error: s(err.message),
    code: s(err.code) || undefined,
    hint: s(err.hint) || undefined,
  };
}

function detailsFromPostgrest(err: PgErrLike, step: string) {
  return {
    step,
    supabase: {
      message: s(err.message),
      code: s(err.code) || null,
      details: err.details ?? null,
      hint: s(err.hint) || null,
    },
  };
}

function isPostgrestUnknownColumnError(err: PgErrLike | null): boolean {
  if (!err) return false;
  if (s(err.code) === "PGRST204") return true;
  const m = s(err.message).toLowerCase();
  return (
    m.includes("schema cache") &&
    (m.includes("column") || m.includes("could not find"))
  );
}

/** Ej.: `Could not find the 'classification_status' column of 'emprendedores' in the schema cache` */
function unknownColumnFromPostgrestMessage(message: string): string | null {
  const m = s(message).match(/Could not find the '([^']+)' column/i);
  return m?.[1] ?? null;
}

/**
 * Si el proyecto remoto no tiene migraciones al día, PostgREST devuelve PGRST204 por columna desconocida.
 * Quita de a una las columnas indicadas en el mensaje y reintenta (insert).
 */
async function insertEmprendedoresWithSchemaRetry(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  insertPayload: Record<string, unknown>
): Promise<{
  data: { id?: unknown } | null;
  error: PgErrLike | null;
}> {
  let payload: Record<string, unknown> = { ...insertPayload };
  const maxStrips = 24;

  for (let i = 0; i < maxStrips; i++) {
    const ins = await supabase
      .from("emprendedores")
      .insert(payload)
      .select("id")
      .single();

    if (!ins.error) {
      return { data: ins.data as { id?: unknown } | null, error: null };
    }

    const col = unknownColumnFromPostgrestMessage(s(ins.error.message));
    if (
      !isPostgrestUnknownColumnError(ins.error) ||
      !col ||
      !Object.prototype.hasOwnProperty.call(payload, col)
    ) {
      return { data: null, error: ins.error as PgErrLike };
    }

    const next = { ...payload };
    delete next[col];
    payload = next;
  }

  const last = await supabase
    .from("emprendedores")
    .insert(payload)
    .select("id")
    .single();
  return {
    data: last.data as { id?: unknown } | null,
    error: (last.error as PgErrLike) ?? null,
  };
}

/** Misma lógica que insert para `update` de emprendedores. */
async function updateEmprendedoresWithSchemaRetry(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  emprendedorId: string,
  updatePayload: Record<string, unknown>
): Promise<{ error: PgErrLike | null }> {
  let payload: Record<string, unknown> = { ...updatePayload };
  const maxStrips = 24;

  for (let i = 0; i < maxStrips; i++) {
    const res = await supabase
      .from("emprendedores")
      .update(payload)
      .eq("id", emprendedorId);

    if (!res.error) {
      return { error: null };
    }

    const col = unknownColumnFromPostgrestMessage(s(res.error.message));
    if (
      !isPostgrestUnknownColumnError(res.error) ||
      !col ||
      !Object.prototype.hasOwnProperty.call(payload, col)
    ) {
      return { error: res.error as PgErrLike };
    }

    const next = { ...payload };
    delete next[col];
    payload = next;
  }

  const last = await supabase
    .from("emprendedores")
    .update(payload)
    .eq("id", emprendedorId);
  return { error: (last.error as PgErrLike) ?? null };
}

function arr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => s(x)).filter(Boolean);
}

function dedupeStrings(list: string[]): string[] {
  return [...new Set(list.map((x) => s(x)).filter(Boolean))];
}

async function resolveCategoriaIdBySlug(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  slug: string
): Promise<string | null> {
  const clean = s(slug);
  if (!clean) return null;
  const { data } = await supabase
    .from("categorias")
    .select("id")
    .eq("slug", clean)
    .maybeSingle();
  const id = data && typeof (data as { id?: unknown }).id === "string" ? s((data as any).id) : "";
  return id || null;
}

async function resolveSubcategoriaIdBySlug(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  slug: string
): Promise<string | null> {
  const clean = s(slug);
  if (!clean) return null;
  const { data } = await supabase
    .from("subcategorias")
    .select("id")
    .eq("slug", clean)
    .maybeSingle();
  const id = data && typeof (data as { id?: unknown }).id === "string" ? s((data as any).id) : "";
  return id || null;
}

/**
 * Valores canónicos del enum `cobertura_tipo` en BD (p. ej. solo_comuna, no solo_mi_comuna).
 * Alias de formulario / postulación vía `normalizeCoberturaTipoDb`.
 */
function postulacionCoberturaToDb(tipo: string): string {
  return normalizeCoberturaTipoDb(tipo) || "solo_comuna";
}

/**
 * Valores en `emprendedor_modalidades.modalidad` (enum `modalidad_atencion` en BD típica).
 * UI / postulación usan local_fisico | domicilio | online o sinónimos cortos.
 */
const MODALIDADES_DB_VALIDAS = [
  "local_fisico",
  "presencial_terreno",
  "online",
] as const;

function modalidadPostulacionToDb(m: string): string {
  const x = s(m).toLowerCase();
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

type ComunaRow = { id: string; slug: string; region_id?: unknown };

function buildCoberturaSlugArrays(
  comunaRow: ComunaRow,
  dbCobertura: string,
  comunasCoberturaSlugs: string[],
  regionesCoberturaSlugs: string[],
  baseRegionSlug: string
): { comunasSlugsJson: string[]; regionesSlugsJson: string[] } {
  const comunaBaseSlug = s(comunaRow.slug);
  let comunasSlugsJson: string[] = [];
  let regionesSlugsJson: string[] = [];

  if (
    dbCobertura === "solo_comuna" ||
    dbCobertura === "solo_mi_comuna" ||
    dbCobertura === "comuna"
  ) {
    comunasSlugsJson = comunaBaseSlug ? [comunaBaseSlug] : [];
    regionesSlugsJson = [];
  } else if (dbCobertura === "varias_comunas") {
    comunasSlugsJson = dedupeStrings([comunaBaseSlug, ...comunasCoberturaSlugs]);
    regionesSlugsJson = [];
  } else if (dbCobertura === "varias_regiones" || dbCobertura === "regional") {
    comunasSlugsJson = [];
    regionesSlugsJson =
      regionesCoberturaSlugs.length > 0
        ? dedupeStrings(regionesCoberturaSlugs)
        : baseRegionSlug
          ? [baseRegionSlug]
          : [];
  } else if (dbCobertura === "nacional") {
    comunasSlugsJson = [];
    regionesSlugsJson = [];
  }

  return { comunasSlugsJson, regionesSlugsJson };
}

/**
 * Lista de subcategorías para aprobar:
 * 1) Si el body incluye la clave `subcategorias_ids`, se usa ese valor (puede ser []).
 * 2) Si no, se usan las de la postulación (`subcategorias_ids`).
 * 3) Si sigue vacío, un único id desde `subcategoria_final` (body) o `subcategoria_ia` (postulación).
 */
function subcategoriasEfectivasParaAprobacion(
  body: AdminBody,
  postulacion: Record<string, unknown>
): string[] {
  if (Object.prototype.hasOwnProperty.call(body, "subcategorias_ids")) {
    return normalizeTaxonomiaUuidList(body.subcategorias_ids);
  }
  const fromPost = normalizeTaxonomiaUuidList(postulacion.subcategorias_ids);
  if (fromPost.length > 0) return fromPost;
  const solo =
    normalizeTaxonomiaUuid(body.subcategoria_final) ??
    normalizeTaxonomiaUuid(postulacion.subcategoria_ia);
  return solo ? [solo] : [];
}

async function subcategoriaSlugsPorIds(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  ids: string[]
): Promise<string[]> {
  if (!ids.length) return [];
  const { data } = await supabase.from("subcategorias").select("slug").in("id", ids);
  return (data ?? [])
    .map((r) => s((r as { slug?: unknown }).slug))
    .filter(Boolean);
}

async function resolveSlugFinales(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  categoriaId: string | null,
  subcategoriaPrincipalId: string | null
): Promise<{ categoriaSlugFinal: string | null; subcategoriaSlugFinal: string | null }> {
  let categoriaSlugFinal: string | null = null;
  let subcategoriaSlugFinal: string | null = null;

  if (categoriaId) {
    const { data: cat } = await supabase
      .from("categorias")
      .select("slug")
      .eq("id", categoriaId)
      .maybeSingle();
    categoriaSlugFinal = cat && typeof (cat as { slug?: unknown }).slug === "string"
      ? s((cat as { slug: string }).slug)
      : null;
  }

  if (subcategoriaPrincipalId) {
    const { data: sub } = await supabase
      .from("subcategorias")
      .select("slug")
      .eq("id", subcategoriaPrincipalId)
      .maybeSingle();
    subcategoriaSlugFinal = sub && typeof (sub as { slug?: unknown }).slug === "string"
      ? s((sub as { slug: string }).slug)
      : null;
  }

  return { categoriaSlugFinal, subcategoriaSlugFinal };
}

async function syncEmprendedorRelacionesHijas(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  emprendedorId: string,
  comunasSlugsJson: string[],
  regionesSlugsJson: string[],
  modalidadesAtencion: string[],
  galeriaUrls: string[],
  subcategoriaIds: string[]
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error: delComunasErr } = await supabase
    .from("emprendedor_comunas_cobertura")
    .delete()
    .eq("emprendedor_id", emprendedorId);
  if (delComunasErr) return { ok: false, message: delComunasErr.message };

  if (comunasSlugsJson.length) {
    const { data: comunaRows } = await supabase
      .from("comunas")
      .select("id, slug")
      .in("slug", dedupeStrings(comunasSlugsJson));
    const comunaInsRaw = (comunaRows ?? [])
      .map((r) => ({
        emprendedor_id: emprendedorId,
        comuna_id: s((r as { id?: unknown }).id),
      }))
      .filter((row) => row.comuna_id);
    const comunaIns = [...new Map(comunaInsRaw.map((r) => [r.comuna_id, r])).values()];
    if (comunaIns.length) {
      const { error: insComunasErr } = await supabase
        .from("emprendedor_comunas_cobertura")
        .insert(comunaIns);
      if (insComunasErr) return { ok: false, message: insComunasErr.message };
    }
  }

  const { error: delRegErr } = await supabase
    .from("emprendedor_regiones_cobertura")
    .delete()
    .eq("emprendedor_id", emprendedorId);
  if (delRegErr) return { ok: false, message: delRegErr.message };

  if (regionesSlugsJson.length) {
    const { data: regionRows } = await supabase
      .from("regiones")
      .select("id, slug")
      .in("slug", dedupeStrings(regionesSlugsJson));
    const regionInsRaw = (regionRows ?? [])
      .map((r) => ({
        emprendedor_id: emprendedorId,
        region_id: s((r as { id?: unknown }).id),
      }))
      .filter((row) => row.region_id);
    const regionIns = [...new Map(regionInsRaw.map((r) => [r.region_id, r])).values()];
    if (regionIns.length) {
      const { error: insRegErr } = await supabase
        .from("emprendedor_regiones_cobertura")
        .insert(regionIns);
      if (insRegErr) return { ok: false, message: insRegErr.message };
    }
  }

  const { error: delModErr } = await supabase
    .from("emprendedor_modalidades")
    .delete()
    .eq("emprendedor_id", emprendedorId);
  if (delModErr) return { ok: false, message: delModErr.message };

  const rawModalidades = dedupeStrings(modalidadesAtencion);
  const invalidModalidades = rawModalidades.filter((m) => {
    const db = modalidadPostulacionToDb(m);
    return !(MODALIDADES_DB_VALIDAS as readonly string[]).includes(db);
  });
  if (invalidModalidades.length) {
    return {
      ok: false,
      message: `Modalidad inválida en postulación: ${invalidModalidades.join(", ")}`,
    };
  }
  const modalidadesUnique = [
    ...new Set(
      rawModalidades
        .map(modalidadPostulacionToDb)
        .filter((m) => (MODALIDADES_DB_VALIDAS as readonly string[]).includes(m))
    ),
  ];
  if (modalidadesUnique.length) {
    const { error: insModErr } = await supabase.from("emprendedor_modalidades").insert(
      modalidadesUnique.map((modalidad) => ({
        emprendedor_id: emprendedorId,
        modalidad,
      }))
    );
    if (insModErr) return { ok: false, message: insModErr.message };
  }

  const { error: delGalErr } = await supabase
    .from("emprendedor_galeria")
    .delete()
    .eq("emprendedor_id", emprendedorId);
  if (delGalErr) return { ok: false, message: delGalErr.message };

  const galSlice = galeriaUrls.slice(0, 8);
  if (galSlice.length) {
    const { error: insGalErr } = await supabase.from("emprendedor_galeria").insert(
      galSlice.map((imagen_url) => ({
        emprendedor_id: emprendedorId,
        imagen_url,
      }))
    );
    if (insGalErr) return { ok: false, message: insGalErr.message };
  }

  const { error: delSubErr } = await supabase
    .from("emprendedor_subcategorias")
    .delete()
    .eq("emprendedor_id", emprendedorId);
  if (delSubErr) return { ok: false, message: delSubErr.message };

  if (subcategoriaIds.length) {
    const { error: insSubErr } = await supabase.from("emprendedor_subcategorias").insert(
      subcategoriaIds.map((subcategoria_id) => ({
        emprendedor_id: emprendedorId,
        subcategoria_id,
      }))
    );
    if (insSubErr) return { ok: false, message: insSubErr.message };
  }

  return { ok: true };
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as AdminBody;

    const etiquetas_finales = body?.etiquetas_finales ?? null;

    const supabase = getSupabaseAdmin();

    const { data: postulacion, error: postError } = await supabase
      .from("postulaciones_emprendedores")
      .select("*")
      .eq("id", id)
      .single();

    if (postError || !postulacion) {
      return notFound("Postulación no encontrada");
    }

    if (postulacion.estado !== "pendiente_revision") {
      return badRequest("Solo se pueden aprobar postulaciones pendientes");
    }

    const p = postulacion as Record<string, unknown>;

    /**
     * Categoría efectiva (una sola fuente para validar y persistir):
     * 1. body.categoria_final (override moderación)
     * 2. postulacion.categoria_id (formulario público / borrador)
     * 3. postulacion.categoria_ia (legacy IA)
     */
    const categoriaEfectivaUuid =
      normalizeTaxonomiaUuid(body?.categoria_final) ??
      normalizeTaxonomiaUuid(p.categoria_id) ??
      normalizeTaxonomiaUuid(p.categoria_ia);

    let subcategoriasEfectivasIds = subcategoriasEfectivasParaAprobacion(body, p);

    // Fallback por slugs (cuando no pedimos categoría/subcategoría al usuario)
    let categoriaEfectivaUuidFinal = categoriaEfectivaUuid;
    if (!categoriaEfectivaUuidFinal) {
      const slug =
        s(body?.categoria_slug_final) ||
        s(p.categoria_slug_final) ||
        s(p.categoria_slug_detectada) ||
        s(p.categoria_slug) ||
        "";
      const bySlug = await resolveCategoriaIdBySlug(supabase, slug);
      categoriaEfectivaUuidFinal = normalizeTaxonomiaUuid(bySlug);
    }

    if (subcategoriasEfectivasIds.length === 0) {
      const subSlug =
        s(body?.subcategoria_slug_final) ||
        s(p.subcategoria_slug_final) ||
        s(p.subcategoria_slug_detectada) ||
        s(p.sector_slug) ||
        "";
      const bySlug = await resolveSubcategoriaIdBySlug(supabase, subSlug);
      const id = normalizeTaxonomiaUuid(bySlug);
      if (id) subcategoriasEfectivasIds = [id];
    }

    const taxonomiaCheck = await validateCategoriaSubcategorias(
      supabase,
      categoriaEfectivaUuidFinal,
      subcategoriasEfectivasIds,
      { requireAprobacionCompleta: true }
    );
    if (!taxonomiaCheck.ok) {
      return badRequest(taxonomiaCheck.error);
    }

    const subcategoriaPrincipalUuid =
      subcategoriasEfectivasIds.length > 0 ? subcategoriasEfectivasIds[0] : null;

    const finalEtiquetasRaw = etiquetas_finales ?? p.etiquetas_ia ?? [];
    const keywordsFinales = Array.isArray(finalEtiquetasRaw)
      ? finalEtiquetasRaw.map((x) => s(x)).filter(Boolean)
      : [];

    const keywordsUsuario = arr(p.keywords_usuario);

    const comunaBaseId = p.comuna_base_id;
    if (comunaBaseId == null || String(comunaBaseId).trim() === "") {
      return badRequest("La postulación no tiene comuna_base_id; no se puede aprobar.");
    }

    const { data: comunaData, error: comunaError } = await supabase
      .from("comunas")
      .select("id, slug, region_id")
      .eq("id", comunaBaseId)
      .maybeSingle();

    if (comunaError || !comunaData) {
      return badRequest("Comuna base de la postulación no encontrada.");
    }

    const comunaRow = comunaData as ComunaRow;
    let baseRegionSlug = "";
    if (comunaRow.region_id != null && String(comunaRow.region_id).trim()) {
      const { data: regRow } = await supabase
        .from("regiones")
        .select("slug")
        .eq("id", comunaRow.region_id as never)
        .maybeSingle();
      baseRegionSlug =
        regRow && typeof (regRow as { slug?: unknown }).slug === "string"
          ? s((regRow as { slug: string }).slug)
          : "";
    }

    const dbCobertura = postulacionCoberturaToDb(s(p.cobertura_tipo));
    const { comunasSlugsJson, regionesSlugsJson } = buildCoberturaSlugArrays(
      comunaRow,
      dbCobertura,
      arr(p.comunas_cobertura),
      arr(p.regiones_cobertura),
      baseRegionSlug
    );

    const { categoriaSlugFinal, subcategoriaSlugFinal } = await resolveSlugFinales(
      supabase,
      categoriaEfectivaUuidFinal,
      subcategoriaPrincipalUuid
    );

    const subcategoriasSlugsArr = await subcategoriaSlugsPorIds(
      supabase,
      subcategoriasEfectivasIds
    );

    const nombreEmprendimiento = s(p.nombre_emprendimiento) || s(p.nombre);
    if (!nombreEmprendimiento) {
      return badRequest("Falta nombre del emprendimiento (nombre_emprendimiento) en la postulación.");
    }

    const whatsappPrincipal = s(p.whatsapp_principal) || s(p.whatsapp);
    const fotoRaw = s(p.foto_principal_url);
    const fotoPrincipal =
      fotoRaw && isPersistibleFotoUrl(fotoRaw) ? fotoRaw : null;
    const galeriaUrls = arr(p.galeria_urls).slice(0, 8);
    const modalidadesAtencion = arr(p.modalidades_atencion);

    /** Coherente con `supabase/migrations/20260420000000_emprendedores_campos_finales.sql` (text / text[]). */
    const taxonomiaFinalesRow = {
      categoria_slug_final: categoriaSlugFinal,
      subcategoria_slug_final: subcategoriaSlugFinal,
      keywords_finales: keywordsFinales.length ? keywordsFinales : null,
    };

    const emprendedorCore: Record<string, unknown> = {
      nombre_emprendimiento: nombreEmprendimiento,
      nombre_responsable: s(p.nombre_responsable) || null,
      mostrar_responsable_publico: p.mostrar_responsable_publico === true,
      frase_negocio: s(p.frase_negocio) || null,
      descripcion_libre: s(p.descripcion_libre) || null,
      email: s(p.email) || null,
      whatsapp_principal: whatsappPrincipal || null,
      instagram: s(p.instagram) || null,
      sitio_web: s(p.sitio_web) || s(p.web) || null,
      foto_principal_url: fotoPrincipal,
      direccion: s(p.direccion) || null,
      direccion_referencia: s(p.direccion_referencia) || null,
      categoria_id: categoriaEfectivaUuidFinal,
      subcategoria_principal_id: subcategoriaPrincipalUuid,
      keywords_usuario_json: keywordsUsuario.length ? keywordsUsuario : null,
      ...taxonomiaFinalesRow,
      comuna_id: comunaRow.id,
      comuna_base_id: comunaRow.id,
      cobertura_tipo: dbCobertura,
      comunas_cobertura: comunasSlugsJson,
      regiones_cobertura: regionesSlugsJson,
      subcategorias_slugs: subcategoriasSlugsArr.length ? subcategoriasSlugsArr : null,
      estado_publicacion: "publicado",
      publicado: true,
      classification_status: "clasificada_manual",
      updated_at: new Date().toISOString(),
    };

    /**
     * `nombre` y `whatsapp` siguen apareciendo en vistas legacy (p. ej. vw_emprendedores_algolia_final).
     * Se rellenan con el mismo valor que los campos canónicos, no desde columnas legacy de postulación.
     */
    emprendedorCore.nombre = nombreEmprendimiento;
    if (whatsappPrincipal) {
      emprendedorCore.whatsapp = whatsappPrincipal;
    }

    if (postulacion.tipo_postulacion === "nuevo") {
      const slugBase = slugify(nombreEmprendimiento).slice(0, 50) || "emprendimiento";
      const slug = `${slugBase}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

      const insertPayload: Record<string, unknown> = {
        ...emprendedorCore,
        slug,
      };

      const { data: createdRow, error: createError } =
        await insertEmprendedoresWithSchemaRetry(supabase, insertPayload);

      if (createError) {
        return serverError(
          "No se pudo publicar el emprendimiento",
          detailsFromPostgrest(createError, "emprendedores.insert"),
          metaFromPostgrest(createError)
        );
      }

      const emprendedorId = s(createdRow?.id);
      if (!emprendedorId) {
        return serverError(
          "No se pudo publicar el emprendimiento",
          { step: "emprendedores.insert", reason: "missing_id_after_insert" },
          { error: "Sin id en respuesta tras insertar emprendedor", code: "MISSING_EMPRENDEDOR_ID" }
        );
      }

      const rel = await syncEmprendedorRelacionesHijas(
        supabase,
        emprendedorId,
        comunasSlugsJson,
        regionesSlugsJson,
        modalidadesAtencion,
        galeriaUrls,
        subcategoriasEfectivasIds
      );
      if (!rel.ok) {
        return serverError(
          "Se creó el emprendimiento pero falló sincronizar relaciones (cobertura, modalidades, galería o subcategorías)",
          { step: "syncEmprendedorRelacionesHijas", message: rel.message },
          { error: rel.message, code: "SYNC_RELACIONES_FALLIDA" }
        );
      }

      const { error: updatePostError } = await supabase
        .from("postulaciones_emprendedores")
        .update({
          estado: "aprobada",
          emprendedor_id: emprendedorId,
          categoria_final: categoriaEfectivaUuid,
          subcategoria_final: subcategoriaPrincipalUuid,
          etiquetas_finales: keywordsFinales,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updatePostError) {
        return serverError(
          "Se publicó, pero falló el cierre de la postulación",
          detailsFromPostgrest(updatePostError, "postulaciones_emprendedores.update_cierre"),
          metaFromPostgrest(updatePostError)
        );
      }

      syncEmprendedorToAlgolia(emprendedorId).catch(() => {});

      return ok({
        ok: true,
        message: "Postulación aprobada y emprendimiento publicado.",
        emprendedor_id: emprendedorId,
        taxonomia_publicada: taxonomiaFinalesRow,
      });
    }

    if (postulacion.tipo_postulacion === "edicion_publicado") {
      const emprendedorIdExisting = s(postulacion.emprendedor_id);
      if (!emprendedorIdExisting) {
        return badRequest("La postulación no tiene emprendedor relacionado");
      }

      const { error: updateError } = await updateEmprendedoresWithSchemaRetry(
        supabase,
        emprendedorIdExisting,
        emprendedorCore
      );

      if (updateError) {
        return serverError(
          "No se pudo actualizar el emprendimiento",
          detailsFromPostgrest(updateError, "emprendedores.update"),
          metaFromPostgrest(updateError)
        );
      }

      const rel = await syncEmprendedorRelacionesHijas(
        supabase,
        emprendedorIdExisting,
        comunasSlugsJson,
        regionesSlugsJson,
        modalidadesAtencion,
        galeriaUrls,
        subcategoriasEfectivasIds
      );
      if (!rel.ok) {
        return serverError(
          "Se actualizó el emprendimiento pero falló sincronizar relaciones",
          { step: "syncEmprendedorRelacionesHijas", message: rel.message },
          { error: rel.message, code: "SYNC_RELACIONES_FALLIDA" }
        );
      }

      const { error: closeError } = await supabase
        .from("postulaciones_emprendedores")
        .update({
          estado: "aprobada",
          categoria_final: categoriaEfectivaUuid,
          subcategoria_final: subcategoriaPrincipalUuid,
          etiquetas_finales: keywordsFinales,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (closeError) {
        return serverError(
          "Se actualizó el emprendimiento, pero falló el cierre de la postulación",
          detailsFromPostgrest(closeError, "postulaciones_emprendedores.update_cierre"),
          metaFromPostgrest(closeError)
        );
      }

      syncEmprendedorToAlgolia(emprendedorIdExisting).catch(() => {});

      return ok({
        ok: true,
        message: "Edición aprobada y emprendimiento actualizado.",
        emprendedor_id: emprendedorIdExisting,
        taxonomia_publicada: taxonomiaFinalesRow,
      });
    }

    return badRequest("tipo_postulacion no soportado");
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return serverError(
      "Error inesperado al aprobar la postulación",
      { step: "aprobar.catch", exception: errMsg },
      { error: errMsg, code: "APROBAR_EXCEPCION" }
    );
  }
}
