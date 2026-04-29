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
import { galeriaUrlsForEmprendedorPivotSync } from "@/lib/galeriaUrlsEmprendedor";
import { isPersistibleFotoUrl } from "@/lib/isPersistibleFotoUrl";
import { normalizeCoberturaTipoDb } from "@/lib/cobertura";
import {
  modalidadAtencionInputToDb,
  modalidadesAtencionInputsToDbUnique,
} from "@/lib/modalidadesAtencion";
import { syncEmprendedorLocalesDesdePostulacionRow } from "@/app/api/_lib/syncEmprendedorLocalesDesdePostulacionRow";
import { ESTADO_PUBLICACION } from "@/lib/estadoPublicacion";
import {
  adminPublishEmprendedorFicha,
  triggerReindexEmprendedorAlgolia,
} from "@/app/api/_lib/adminPublishEmprendedorFicha";
import {
  clasificacionEquivaleAlPublicado,
  loadClasificacionPublicadaEmprendedor,
} from "@/lib/clasificacionPublicadaEmprendedor";
import {
  POSTULACIONES_APROBAR_COLUMNS,
  postulacionesEmprendedoresSelectWithColumnRetry,
} from "@/lib/loadPostulacionesModeracion";
import { comunaIdsFromSlugs } from "@/lib/comunasCoberturaIds";
import { filtrarKeywordsPorSubcategoria } from "@/lib/keywordsValidation";
import { readKeywordsUsuarioFromPostulacionRow } from "@/lib/keywordsUsuarioPostulacion";
import {
  ensureEmprendedorPanelAccessUrl,
  issueRevisarMagicLinkAfterPublish,
} from "@/lib/revisarMagicLink";
import { notifyEmprendimientoAprobadoEmail } from "@/app/api/_lib/notifyEmprendimientoAprobadoEmail";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type AdminBody = Record<string, unknown>;

function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

/** `REVISION_TAXONOMIA_DEBUG=1` + opcional `REVISION_TAXONOMIA_DEBUG_EMPRENDEDOR_ID=<uuid>` */
function revisionTaxonomiaDebugEnabled(): boolean {
  return s(process.env.REVISION_TAXONOMIA_DEBUG) === "1";
}

function revisionTaxonomiaDebugMatchesEmprendedor(emprendedorId: string): boolean {
  const filter = s(process.env.REVISION_TAXONOMIA_DEBUG_EMPRENDEDOR_ID);
  if (!filter) return true;
  return s(emprendedorId) === filter;
}

/** `REVISION_LOCAL_DEBUG=1` + opcional `REVISION_LOCAL_DEBUG_EMPRENDEDOR_ID=<uuid>` */
function revisionLocalDebugEnabled(): boolean {
  return s(process.env.REVISION_LOCAL_DEBUG) === "1";
}

function revisionLocalDebugMatchesEmprendedor(emprendedorId: string): boolean {
  const filter = s(process.env.REVISION_LOCAL_DEBUG_EMPRENDEDOR_ID);
  if (!filter) return true;
  return s(emprendedorId) === filter;
}

function logRevisionLocalDebug(emprendedorId: string, payload: Record<string, unknown>) {
  if (!revisionLocalDebugEnabled() || !revisionLocalDebugMatchesEmprendedor(emprendedorId)) return;
  // eslint-disable-next-line no-console
  console.log("[revision-local-debug]", { emprendedor_id: emprendedorId, ...payload });
}

function logRevisionLocalDebugAlways(emprendedorId: string, payload: Record<string, unknown>) {
  // eslint-disable-next-line no-console
  console.log("[revision-local-debug]", { emprendedor_id: emprendedorId, ...payload });
}

async function logRevisionTaxonomiaPivot(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  step: string,
  emprendedorId: string
) {
  if (!revisionTaxonomiaDebugEnabled() || !revisionTaxonomiaDebugMatchesEmprendedor(emprendedorId)) {
    return;
  }
  const { data, error } = await supabase
    .from("emprendedor_subcategorias")
    .select("subcategoria_id")
    .eq("emprendedor_id", emprendedorId)
    .order("subcategoria_id", { ascending: true });
  // eslint-disable-next-line no-console
  console.log("[revision-taxonomia-debug]", step, {
    emprendedor_id: emprendedorId,
    error: error ? s(error.message) : null,
    subcategoria_ids: (data ?? []).map((r: { subcategoria_id?: unknown }) => s(r.subcategoria_id)),
  });
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

/** BD legacy: muchas columnas siguen en varchar(100). */
const LEGACY_VARCHAR100 = 100;

function truncLegacyVarchar100(value: unknown): string | null {
  const t = s(value);
  if (!t) return null;
  return t.length <= LEGACY_VARCHAR100 ? t : t.slice(0, LEGACY_VARCHAR100);
}

/**
 * Slug único que cabe en varchar(100): sufijo fijo ~18 chars + base acotada.
 */
function buildEmprendedorSlugForInsert(nombreEmprendimiento: string): string {
  const suffix = `-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const maxBase = Math.max(1, LEGACY_VARCHAR100 - suffix.length);
  const rawBase = slugify(nombreEmprendimiento);
  const base =
    (rawBase ? rawBase.slice(0, maxBase) : "") ||
    slugify("emprendimiento").slice(0, maxBase) ||
    "e";
  return `${base.slice(0, maxBase)}${suffix}`;
}

function mergeKeywordsFinales(opts: {
  finales: string[];
  usuario: string[];
  detectadas: string[];
  max?: number;
}): string[] {
  const max = typeof opts.max === "number" && opts.max > 0 ? opts.max : 40;
  const base = [
    ...opts.finales,
    ...opts.usuario,
    ...opts.detectadas,
  ]
    .map((x) => s(x))
    .filter(Boolean);
  return dedupeStrings(base).slice(0, max);
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
    .eq("activo", true)
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

type ComunaRow = { id: string; slug: string; region_id?: unknown };

function buildCoberturaSlugArrays(
  comunaRow: ComunaRow,
  dbCobertura: string,
  comunasCoberturaSlugs: string[],
  regionesCoberturaSlugs: string[],
  baseRegionSlug: string
): {
  comunasSlugsJson: string[];
  regionesSlugsJson: string[];
  /** Slugs a insertar en `emprendedor_comunas_cobertura` (en varias_comunas sin la base). */
  comunasPivotSlugs: string[];
} {
  const comunaBaseSlug = s(comunaRow.slug);
  let comunasSlugsJson: string[] = [];
  let regionesSlugsJson: string[] = [];
  let comunasPivotSlugs: string[] = [];

  if (
    dbCobertura === "solo_comuna" ||
    dbCobertura === "solo_mi_comuna" ||
    dbCobertura === "comuna"
  ) {
    comunasSlugsJson = comunaBaseSlug ? [comunaBaseSlug] : [];
    comunasPivotSlugs = [...comunasSlugsJson];
    regionesSlugsJson = [];
  } else if (dbCobertura === "varias_comunas") {
    comunasSlugsJson = dedupeStrings([comunaBaseSlug, ...comunasCoberturaSlugs]);
    comunasPivotSlugs = dedupeStrings(comunasCoberturaSlugs);
    regionesSlugsJson = [];
  } else if (dbCobertura === "varias_regiones" || dbCobertura === "regional") {
    comunasSlugsJson = [];
    comunasPivotSlugs = [];
    regionesSlugsJson =
      regionesCoberturaSlugs.length > 0
        ? dedupeStrings(regionesCoberturaSlugs)
        : baseRegionSlug
          ? [baseRegionSlug]
          : [];
  } else if (dbCobertura === "nacional") {
    comunasSlugsJson = [];
    comunasPivotSlugs = [];
    regionesSlugsJson = [];
  }

  return { comunasSlugsJson, regionesSlugsJson, comunasPivotSlugs };
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

/**
 * Evita sync en pivotes con `emprendedor_id` huérfano: el `UPDATE` de `emprendedores` puede no fallar si 0 filas,
 * pero el `INSERT` en `emprendedor_regiones_cobertura` rompe la FK `emprendedor_regiones_cobertura_emprendedor_id_fkey`.
 */
async function verificarEmprendedorAntesDeSyncPivotes(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  emprendedorId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const id = s(emprendedorId);
  if (!id) {
    return { ok: false, message: "emprendedor_id vacío al sincronizar relaciones." };
  }
  const { data, error } = await supabase
    .from("emprendedores")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    return {
      ok: false,
      message: `No se pudo verificar el emprendedor antes de sincronizar: ${s(error.message)}`,
    };
  }
  if (!data || typeof (data as { id?: unknown }).id !== "string") {
    return {
      ok: false,
      message:
        "emprendedor_id no existe en emprendedores; no se pueden sincronizar cobertura/modalidades/galería (revisar vínculo de la postulación).",
    };
  }
  return { ok: true };
}

async function syncEmprendedorRelacionesHijas(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  emprendedorId: string,
  comunasPivotSlugs: string[],
  regionesSlugsJson: string[],
  modalidadesAtencion: string[],
  galeriaUrls: string[],
  subcategoriaIds: string[],
  opts?: { skipSubcategoriasPivot?: boolean }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const verif = await verificarEmprendedorAntesDeSyncPivotes(supabase, emprendedorId);
  if (!verif.ok) {
    return { ok: false, message: verif.message };
  }

  const { error: delComunasErr } = await supabase
    .from("emprendedor_comunas_cobertura")
    .delete()
    .eq("emprendedor_id", emprendedorId);
  if (delComunasErr) return { ok: false, message: delComunasErr.message };

  if (comunasPivotSlugs.length) {
    const { data: comunaRows } = await supabase
      .from("comunas")
      .select("id, slug")
      .in("slug", dedupeStrings(comunasPivotSlugs));
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
    const t = s(m);
    if (!t) return false;
    return modalidadAtencionInputToDb(t) === null;
  });
  if (invalidModalidades.length) {
    return {
      ok: false,
      message: `Modalidad inválida en postulación: ${invalidModalidades.join(", ")}`,
    };
  }
  const modalidadesUnique = modalidadesAtencionInputsToDbUnique(rawModalidades);
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

  if (!opts?.skipSubcategoriasPivot) {
    const { error: delSubErr } = await supabase
      .from("emprendedor_subcategorias")
      .delete()
      .eq("emprendedor_id", emprendedorId);
    if (delSubErr) return { ok: false, message: delSubErr.message };

    if (subcategoriaIds.length) {
      const uniqSubIds = [
        ...new Map(
          subcategoriaIds.map((sid) => [s(sid).toLowerCase(), sid] as const)
        ).values(),
      ];
      const { error: insSubErr } = await supabase.from("emprendedor_subcategorias").upsert(
        uniqSubIds.map((subcategoria_id) => ({
          emprendedor_id: emprendedorId,
          subcategoria_id,
        })),
        {
          onConflict: "emprendedor_id,subcategoria_id",
          ignoreDuplicates: true,
        }
      );
      if (insSubErr) return { ok: false, message: insSubErr.message };
    }
  }

  return { ok: true };
}

async function countEmprendedorLocalesTotal(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  emprendedorId: string
): Promise<number> {
  const eid = s(emprendedorId);
  if (!eid) return 0;
  const { count } = await supabase
    .from("emprendedor_locales")
    .select("*", { count: "exact", head: true })
    .eq("emprendedor_id", eid);
  return typeof count === "number" && Number.isFinite(count) ? count : 0;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as AdminBody;

    const etiquetas_finales = body?.etiquetas_finales ?? null;
    const revisionPublicar = body.revision_publicar === true;

    const supabase = getSupabaseAdmin({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    });

    const { data: postulacion, error: postError } = await postulacionesEmprendedoresSelectWithColumnRetry(
      supabase,
      [...POSTULACIONES_APROBAR_COLUMNS],
      async (selectStr) => {
        return await supabase
          .from("postulaciones_emprendedores")
          .select(selectStr)
          .eq("id", id)
          .single();
      }
    );

    if (postError || !postulacion) {
      const code = String((postError as { code?: unknown })?.code ?? "");
      const msg = String((postError as { message?: unknown })?.message ?? "");
      const looksLikeMissingRow =
        code === "PGRST116" || /JSON object requested/i.test(msg) || /0 rows/i.test(msg);
      if (looksLikeMissingRow) {
        return notFound("Postulación no encontrada");
      }
      if (postError) {
        return serverError(
          "No se pudo cargar la postulación",
          msg,
          metaFromPostgrest(postError as PgErrLike)
        );
      }
      return notFound("Postulación no encontrada");
    }

    const p = postulacion as unknown as Record<string, unknown>;

    if (revisionPublicar) {
      if (!normalizeTaxonomiaUuid(body?.categoria_final)) {
        return badRequest("Debes asignar una categoría antes de publicar.");
      }
      if (
        !Array.isArray(body.subcategorias_ids) ||
        normalizeTaxonomiaUuidList(body.subcategorias_ids).length === 0
      ) {
        return badRequest("Debes indicar al menos una subcategoría antes de publicar.");
      }
    }

    const estadoPost = s(p.estado);
    if (estadoPost === "pendiente_revision") {
      if (revisionPublicar) {
        return badRequest(
          "revision_publicar solo aplica cuando la postulación ya está aprobada (revisión de cambios en ficha publicada)."
        );
      }
    } else if (estadoPost === "aprobada" && revisionPublicar) {
      const tipoRev = s(p.tipo_postulacion);
      if (tipoRev === "edicion_publicado") {
        const eidCheck = s(p.emprendedor_id);
        if (!eidCheck) {
          return badRequest("La postulación no tiene emprendedor relacionado.");
        }
        const { data: empEst, error: empEstErr } = await supabase
          .from("emprendedores")
          .select("estado_publicacion")
          .eq("id", eidCheck)
          .maybeSingle();
        if (empEstErr || !empEst) {
          return badRequest("No se encontró el emprendimiento vinculado.");
        }
        if (s(empEst.estado_publicacion) !== ESTADO_PUBLICACION.en_revision) {
          return badRequest(
            'La ficha no está en estado "en_revision"; no aplica aprobación desde revisión de cambios.'
          );
        }
      } else if (tipoRev !== "nuevo") {
        return badRequest(
          "Solo se puede publicar desde revisión para emprendimientos nuevos aprobados o ediciones de ficha publicada (edicion_publicado)."
        );
      }
      // tipo "nuevo": validación si ya hay emprendedor (publicación final) en el cuerpo del handler
    } else if (estadoPost === "aprobada") {
      return badRequest(
        "Esta postulación ya está aprobada. Para revisar cambios pendientes de una ficha en revisión, abre Admin → Emprendimientos → Revisar cambios."
      );
    } else {
      return badRequest("Solo se pueden aprobar postulaciones en pendiente de revisión.");
    }

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

    const esEdicionPublicado = s(p.tipo_postulacion) === "edicion_publicado";
    const eidEdicionEarly = esEdicionPublicado ? s(p.emprendedor_id) : "";
    let clasificacionSinCambioVsPublicado = false;

    if (esEdicionPublicado && eidEdicionEarly) {
      const publicadoLeido = await loadClasificacionPublicadaEmprendedor(
        supabase,
        eidEdicionEarly
      );
      if (publicadoLeido) {
        if (!categoriaEfectivaUuidFinal) {
          categoriaEfectivaUuidFinal = normalizeTaxonomiaUuid(publicadoLeido.categoria_id);
        }
        if (
          subcategoriasEfectivasIds.length === 0 &&
          publicadoLeido.subcategorias_ids.length > 0
        ) {
          subcategoriasEfectivasIds = normalizeTaxonomiaUuidList(
            publicadoLeido.subcategorias_ids
          );
        }
        clasificacionSinCambioVsPublicado = clasificacionEquivaleAlPublicado(
          publicadoLeido,
          categoriaEfectivaUuidFinal,
          subcategoriasEfectivasIds
        );
      }
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

    if (revisionPublicar && revisionTaxonomiaDebugEnabled()) {
      const dbgEid = s(p.emprendedor_id);
      if (revisionTaxonomiaDebugMatchesEmprendedor(dbgEid)) {
        // eslint-disable-next-line no-console
        console.log("[revision-taxonomia-debug] efectivas_pre_persist", {
          postulacion_id: id,
          emprendedor_id: dbgEid || null,
          tipo_postulacion: p.tipo_postulacion,
          subcategoriasEfectivasIds,
          categoriaEfectivaUuidFinal,
        });
      }
    }

    const finalEtiquetasRaw = etiquetas_finales ?? [];
    const keywordsFinalesFromModeracion = Array.isArray(finalEtiquetasRaw)
      ? finalEtiquetasRaw.map((x) => s(x)).filter(Boolean)
      : [];

    const keywordsUsuario = readKeywordsUsuarioFromPostulacionRow(p as Record<string, unknown>);
    const keywordsDetectadas = dedupeStrings(arr(p.etiquetas_ia));

    const etiquetasSolo = body.etiquetas_finales_solo === true;
    let keywordsFinales = etiquetasSolo
      ? dedupeStrings(keywordsFinalesFromModeracion).slice(0, 40)
      : mergeKeywordsFinales({
          finales: keywordsFinalesFromModeracion,
          usuario: keywordsUsuario,
          detectadas: keywordsDetectadas,
          max: 40,
        });

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
    const { comunasSlugsJson, regionesSlugsJson, comunasPivotSlugs } =
      buildCoberturaSlugArrays(
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

    const keywordsAntesSuavizado = keywordsFinales;
    keywordsFinales = filtrarKeywordsPorSubcategoria(
      subcategoriaSlugFinal ?? "",
      keywordsFinales
    );
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.log("[keywords-finales]", {
        subcategoriaSlugFinal: subcategoriaSlugFinal ?? null,
        antes: keywordsAntesSuavizado,
        despues: keywordsFinales,
      });
    }

    const subcategoriasSlugsArr = await subcategoriaSlugsPorIds(
      supabase,
      subcategoriasEfectivasIds
    );

    const nombreEmprendimientoRaw = s(p.nombre_emprendimiento) || s(p.nombre);
    if (!nombreEmprendimientoRaw) {
      return badRequest("Falta nombre del emprendimiento (nombre_emprendimiento) en la postulación.");
    }
    const nombreEmprendimiento = truncLegacyVarchar100(nombreEmprendimientoRaw)!;

    const whatsappPrincipal = s(p.whatsapp_principal) || s(p.whatsapp);
    const fotoRaw = s(p.foto_principal_url);
    const fotoPrincipal =
      fotoRaw && isPersistibleFotoUrl(fotoRaw) ? fotoRaw : null;
    const galeriaUrls = galeriaUrlsForEmprendedorPivotSync(
      p.galeria_urls,
      p.foto_principal_url == null ? null : String(p.foto_principal_url)
    );
    const modalidadesAtencion = arr(p.modalidades_atencion);
    let modalidadesDbParaPublicar = modalidadesAtencionInputsToDbUnique(
      dedupeStrings(modalidadesAtencion)
    );

    /**
     * Después de “mejorar ficha”, el mirror actualiza `emprendedor_modalidades` pero a veces el JSON
     * de `postulaciones_emprendedores.modalidades_atencion` queda desactualizado y sigue listando
     * `local_fisico`. En publicación desde revisión, el pivot refleja el último guardado → lo usamos.
     */
    const eidPivot = s(p.emprendedor_id);
    if (revisionPublicar && eidPivot) {
      const { data: modPivotRows } = await supabase
        .from("emprendedor_modalidades")
        .select("modalidad")
        .eq("emprendedor_id", eidPivot);
      const desdePivot = modalidadesAtencionInputsToDbUnique(
        (modPivotRows ?? []).map((r) =>
          s((r as { modalidad?: unknown }).modalidad)
        )
      );
      if (
        desdePivot.length > 0 &&
        modalidadesDbParaPublicar.includes("local_fisico") &&
        !desdePivot.includes("local_fisico")
      ) {
        const antesJson = [...modalidadesDbParaPublicar];
        modalidadesDbParaPublicar = desdePivot;
        logRevisionLocalDebugAlways(eidPivot, {
          step: "MODALIDADES_USAR_PIVOT_DESYNC_JSON_TIENE_LOCAL_PIVOT_NO",
          antes_desde_json: antesJson,
          pivot: desdePivot,
        });
      }
    }

    logRevisionLocalDebug(s(p.emprendedor_id), {
      step: "modalidades_pre_publicar",
      modalidades_atencion_borrador: modalidadesAtencion,
      modalidades_db_normalizadas: modalidadesDbParaPublicar,
    });
    logRevisionLocalDebug(s(p.emprendedor_id), {
      step: "normalizacion_modalidades_detalle",
      mapping_raw_a_db: dedupeStrings(modalidadesAtencion).map((raw) => ({
        raw,
        db: modalidadAtencionInputToDb(raw),
      })),
      nota:
        "modalidadAtencionInputToDb normaliza 'local'/'fisico'/'local_fisico' → local_fisico; 'presencial' → presencial_terreno",
    });

    /**
     * “Parche de seguridad” para revisión: si llega `local_fisico` desde borrador pero NO hay locales en BD
     * (y el borrador no trae locales/dirección), asumir que fue un valor legacy ("local"/"fisico") o guardado incorrecto.
     * En ese caso, eliminamos `local_fisico` antes de sincronizar/publish para evitar bloqueo por dirección.
     */
    // AUTO-DROP debe ejecutarse acá (post-normalización, pre-sync, pre-publicación)
    const rawModsDedup = dedupeStrings(modalidadesAtencion);
    const rawNorm = rawModsDedup.map((x) => s(x).toLowerCase()).filter(Boolean);
    /** Solo el string explícito `local_fisico` en el JSON del borrador cuenta como “sí local físico”. */
    const borradorIncluyeLocalFisicoExplicito = rawNorm.includes("local_fisico");
    const hayDireccionEnBorrador = Boolean(
      s(p.direccion) || s(p.direccion_referencia)
    );
    const emprendedorIdParaLocales = s(p.emprendedor_id);
    const hayLocalesEnBD =
      revisionPublicar === true && emprendedorIdParaLocales
        ? (await countEmprendedorLocalesTotal(supabase, emprendedorIdParaLocales)) > 0
        : false;

    const beforeAutoDrop = [...modalidadesDbParaPublicar];
    /**
     * Si el borrador NO guardó explícitamente `local_fisico`, no mantener esa modalidad aunque
     * normalización legacy (“local”/pivot viejo) la haya dejado, ni aunque sigan filas en
     * `emprendedor_locales` o dirección en JSON (caso: usuario apagó local físico en mejorar-ficha).
     */
    if (
      revisionPublicar === true &&
      modalidadesDbParaPublicar.includes("local_fisico") &&
      !borradorIncluyeLocalFisicoExplicito
    ) {
      modalidadesDbParaPublicar = modalidadesDbParaPublicar.filter((m) => m !== "local_fisico");
      logRevisionLocalDebugAlways(emprendedorIdParaLocales || "unknown", {
        step: "AUTO_DROP_EJECUTADO",
        modalidades_antes: beforeAutoDrop,
        modalidades_finales: modalidadesDbParaPublicar,
        borradorIncluyeLocalFisicoExplicito,
        hayLocalesEnBD,
        hayDireccionEnBorrador,
        modalidades_atencion_borrador: rawModsDedup,
      });
    } else {
      logRevisionLocalDebugAlways(emprendedorIdParaLocales || "unknown", {
        step: "AUTO_DROP_NO_APLICA",
        modalidades_antes: beforeAutoDrop,
        modalidades_finales: modalidadesDbParaPublicar,
        borradorIncluyeLocalFisicoExplicito,
        hayLocalesEnBD,
        hayDireccionEnBorrador,
        modalidades_atencion_borrador: rawModsDedup,
      });
    }

    /** Coherente con `supabase/migrations/20260420000000_emprendedores_campos_finales.sql` (text / text[]). */
    const taxonomiaFinalesRow = {
      categoria_slug_final: categoriaSlugFinal,
      subcategoria_slug_final: subcategoriaSlugFinal,
      keywords_finales: keywordsFinales.length ? keywordsFinales : null,
    };

    const comunasCoberturaIds = await comunaIdsFromSlugs(supabase, comunasSlugsJson);

    const emprendedorCore: Record<string, unknown> = {
      nombre_emprendimiento: nombreEmprendimiento,
      nombre_responsable: truncLegacyVarchar100(p.nombre_responsable),
      mostrar_responsable_publico: p.mostrar_responsable_publico === true,
      frase_negocio: truncLegacyVarchar100(p.frase_negocio),
      descripcion_libre: s(p.descripcion_libre) || null,
      email: truncLegacyVarchar100(p.email),
      whatsapp_principal: truncLegacyVarchar100(whatsappPrincipal || null),
      instagram: truncLegacyVarchar100(p.instagram),
      sitio_web: s(p.sitio_web) || s(p.web) || null,
      foto_principal_url: fotoPrincipal,
      categoria_id: categoriaEfectivaUuidFinal,
      keywords_usuario_json: keywordsUsuario.length ? keywordsUsuario : null,
      ...taxonomiaFinalesRow,
      comuna_id: comunaRow.id,
      cobertura_tipo: dbCobertura,
      comunas_cobertura: comunasSlugsJson,
      comunas_cobertura_ids: comunasCoberturaIds,
      regiones_cobertura: regionesSlugsJson,
      estado_publicacion: ESTADO_PUBLICACION.en_revision,
      classification_status: "clasificada_manual",
      updated_at: new Date().toISOString(),
    };

    /**
     * `nombre` y `whatsapp` en tabla siguen usándose en integraciones; se rellenan con los
     * mismos valores canónicos (`nombre_emprendimiento`, `whatsapp_principal`), no desde columnas legacy de postulación.
     */
    emprendedorCore.nombre = nombreEmprendimiento;
    if (whatsappPrincipal) {
      emprendedorCore.whatsapp = truncLegacyVarchar100(whatsappPrincipal);
    }

    const wsRaw = p.whatsapp_secundario;
    if (wsRaw === null || wsRaw === undefined) {
      emprendedorCore.whatsapp_secundario = null;
    } else {
      const ws = s(wsRaw);
      emprendedorCore.whatsapp_secundario = ws ? truncLegacyVarchar100(ws) : null;
    }

    if (clasificacionSinCambioVsPublicado) {
      delete emprendedorCore.categoria_id;
      delete emprendedorCore.classification_status;
      delete emprendedorCore.categoria_slug_final;
      delete emprendedorCore.subcategoria_slug_final;
      emprendedorCore.keywords_finales = taxonomiaFinalesRow.keywords_finales;
    }

    if (p.tipo_postulacion === "nuevo") {
      const eidPublicar = s(p.emprendedor_id);
      if (revisionPublicar && eidPublicar) {
        const { data: empPub, error: empPubErr } = await supabase
          .from("emprendedores")
          .select("estado_publicacion, slug")
          .eq("id", eidPublicar)
          .maybeSingle();
        if (empPubErr || !empPub) {
          return badRequest("No se encontró el emprendimiento vinculado.");
        }
        if (s(empPub.estado_publicacion) !== ESTADO_PUBLICACION.en_revision) {
          return badRequest(
            'La ficha no está en estado "en_revision"; no aplica publicar desde esta pantalla.'
          );
        }

        /**
         * Antes solo se llamaba a `adminPublishEmprendedorFicha` y NO se aplicaba el borrador al emprendedor
         * ni `syncEmprendedorRelacionesHijas`, por lo que `emprendedor_subcategorias` quedaba vacío y el RPC
         * de búsqueda no mostraba rubros en la card.
         */
        await logRevisionTaxonomiaPivot(supabase, "pivot_antes_sync_nuevo_revision", eidPublicar);

        const { error: updateErrNuevoRev } = await updateEmprendedoresWithSchemaRetry(
          supabase,
          eidPublicar,
          emprendedorCore
        );
        if (updateErrNuevoRev) {
          return serverError(
            "No se pudo actualizar el emprendimiento antes de publicar",
            detailsFromPostgrest(updateErrNuevoRev, "emprendedores.update_revision_nuevo"),
            metaFromPostgrest(updateErrNuevoRev)
          );
        }

        const relNuevoRev = await syncEmprendedorRelacionesHijas(
          supabase,
          eidPublicar,
          comunasPivotSlugs,
          regionesSlugsJson,
          modalidadesDbParaPublicar,
          galeriaUrls,
          subcategoriasEfectivasIds
        );
        if (!relNuevoRev.ok) {
          return serverError(
            "No se pudieron sincronizar relaciones (subcategorías, galería, etc.) antes de publicar",
            { step: "syncEmprendedorRelacionesHijas.revision_nuevo", message: relNuevoRev.message },
            { error: relNuevoRev.message, code: "SYNC_RELACIONES_REVISION_NUEVO" }
          );
        }

        await logRevisionTaxonomiaPivot(supabase, "pivot_despues_sync_nuevo_revision", eidPublicar);

        const locNuevoRev = await syncEmprendedorLocalesDesdePostulacionRow(
          supabase,
          eidPublicar,
          p,
          s(comunaRow.slug),
          modalidadesDbParaPublicar
        );
        if (!locNuevoRev.ok) {
          return serverError(
            "Se actualizó el emprendimiento pero falló guardar direcciones en locales físicos",
            {
              step: "syncEmprendedorLocalesDesdePostulacion.revision_nuevo",
              message: locNuevoRev.message,
            },
            { error: locNuevoRev.message, code: "SYNC_LOCALES_REVISION_NUEVO" }
          );
        }

        const { error: closePostNuevoRev } = await supabase
          .from("postulaciones_emprendedores")
          .update({
            estado: "aprobada",
            categoria_final: categoriaEfectivaUuid,
            subcategoria_final: subcategoriaPrincipalUuid,
            etiquetas_finales: keywordsFinales,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);

        if (closePostNuevoRev) {
          return serverError(
            "Se aplicó la ficha pero falló actualizar la postulación",
            detailsFromPostgrest(closePostNuevoRev, "postulaciones_emprendedores.update_revision_nuevo"),
            metaFromPostgrest(closePostNuevoRev)
          );
        }

        logRevisionLocalDebug(eidPublicar, {
          step: "antes_adminPublishEmprendedorFicha",
          modalidades_usadas_validacion: modalidadesDbParaPublicar,
          tieneLocalFisico: modalidadesDbParaPublicar.includes("local_fisico"),
        });
        logRevisionLocalDebugAlways(eidPublicar, {
          step: "PASO_PRE_VALIDACION_ADMINPUBLISH",
          modalidades_db_tras_sync: modalidadesDbParaPublicar,
        });
        const pub = await adminPublishEmprendedorFicha(supabase, eidPublicar, {
          modalidadesDbTrasSync: modalidadesDbParaPublicar,
        });
        if (!pub.ok) {
          logRevisionLocalDebug(eidPublicar, {
            step: "resultado_adminPublishEmprendedorFicha",
            ok: false,
            reason: pub.reason,
            bloqueo: pub.reason === "local_fisico" ? (pub.error || true) : null,
            detail: pub.detail ?? null,
          });
          return Response.json(
            {
              ok: false,
              error: pub.error,
              reason: pub.reason,
              detail: pub.detail ?? null,
            },
            { status: pub.status }
          );
        }
        const reindexAlgolia = await triggerReindexEmprendedorAlgolia(pub.id);
        const slugPub =
          empPub && typeof (empPub as { slug?: unknown }).slug === "string"
            ? s((empPub as { slug: string }).slug)
            : "";
        const magicRevisionNuevo = await issueRevisarMagicLinkAfterPublish(
          supabase,
          eidPublicar,
          s(p.email) || null
        );
        await notifyEmprendimientoAprobadoEmail(supabase, eidPublicar, {
          nombreFallback: pub.nombre,
          panelUrlIfKnown: magicRevisionNuevo.url ?? null,
        });
        return ok({
          ok: true,
          message: "Emprendimiento publicado en el sitio.",
          emprendedor_id: eidPublicar,
          ...(slugPub ? { slug: slugPub } : {}),
          publicacion: { ok: true, estado_publicacion: "publicado" as const },
          reindexAlgolia,
        });
      }

      // Regla producto: todo emprendimiento nuevo publicado entra con trial 90 días.
      const trialStart = new Date();
      const trialEnd = new Date(trialStart.getTime() + 90 * 24 * 60 * 60 * 1000);

      const slug = buildEmprendedorSlugForInsert(nombreEmprendimientoRaw);

      const insertPayload: Record<string, unknown> = {
        ...emprendedorCore,
        slug,
        trial_inicia_at: trialStart.toISOString(),
        trial_expira_at: trialEnd.toISOString(),
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
        comunasPivotSlugs,
        regionesSlugsJson,
        modalidadesDbParaPublicar,
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

      const locSync = await syncEmprendedorLocalesDesdePostulacionRow(
        supabase,
        emprendedorId,
        p,
        s(comunaRow.slug),
        modalidadesDbParaPublicar
      );
      if (!locSync.ok) {
        return serverError(
          "Se creó el emprendimiento pero falló guardar direcciones en locales físicos",
          {
            step: "syncEmprendedorLocalesDesdePostulacion",
            message: locSync.message,
          },
          { error: locSync.message, code: "SYNC_LOCALES_FALLIDA" }
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

      const pubNuevo = await adminPublishEmprendedorFicha(supabase, emprendedorId, {
        modalidadesDbTrasSync: modalidadesDbParaPublicar,
      });
      if (!pubNuevo.ok) {
        return Response.json(
          {
            ok: false,
            error: pubNuevo.error,
            reason: pubNuevo.reason,
            detail: pubNuevo.detail ?? null,
          },
          { status: pubNuevo.status }
        );
      }
      const reindexAlgoliaNuevo = await triggerReindexEmprendedorAlgolia(pubNuevo.id);

      const magicNuevo = await issueRevisarMagicLinkAfterPublish(
        supabase,
        emprendedorId,
        s(p.email) || null
      );
      await notifyEmprendimientoAprobadoEmail(supabase, emprendedorId, {
        nombreFallback: pubNuevo.nombre,
        panelUrlIfKnown: magicNuevo.url ?? null,
      });

      return ok({
        ok: true,
        message:
          "Postulación aprobada; el emprendimiento quedó publicado en el sitio.",
        emprendedor_id: emprendedorId,
        slug,
        taxonomia_publicada: taxonomiaFinalesRow,
        publicacion: { ok: true, estado_publicacion: "publicado" as const },
        reindexAlgolia: reindexAlgoliaNuevo,
      });
    }

    if (p.tipo_postulacion === "edicion_publicado") {
      const emprendedorIdExisting = s(p.emprendedor_id);
      if (!emprendedorIdExisting) {
        return badRequest("La postulación no tiene emprendedor relacionado");
      }

      const verifEmp = await verificarEmprendedorAntesDeSyncPivotes(
        supabase,
        emprendedorIdExisting
      );
      if (!verifEmp.ok) {
        if (verifEmp.message.includes("No se pudo verificar")) {
          return serverError(
            verifEmp.message,
            { step: "verificarEmprendedorAntesDeSyncPivotes" },
            { error: verifEmp.message, code: "EMPRENDEDOR_LOOKUP_FALLIDA" }
          );
        }
        return badRequest(
          "El emprendedor vinculado a esta postulación no existe en la base (dato huérfano). No se puede aprobar hasta corregir el vínculo o rechazar la postulación."
        );
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
        comunasPivotSlugs,
        regionesSlugsJson,
        modalidadesDbParaPublicar,
        galeriaUrls,
        subcategoriasEfectivasIds,
        clasificacionSinCambioVsPublicado
          ? { skipSubcategoriasPivot: true }
          : undefined
      );
      if (!rel.ok) {
        return serverError(
          "Se actualizó el emprendimiento pero falló sincronizar relaciones",
          { step: "syncEmprendedorRelacionesHijas", message: rel.message },
          { error: rel.message, code: "SYNC_RELACIONES_FALLIDA" }
        );
      }

      if (revisionPublicar) {
        await logRevisionTaxonomiaPivot(
          supabase,
          "pivot_despues_sync_edicion_revision",
          emprendedorIdExisting
        );
      }

      const locSyncEd = await syncEmprendedorLocalesDesdePostulacionRow(
        supabase,
        emprendedorIdExisting,
        p,
        s(comunaRow.slug),
        modalidadesDbParaPublicar
      );
      if (!locSyncEd.ok) {
        return serverError(
          "Se actualizó el emprendimiento pero falló guardar direcciones en locales físicos",
          {
            step: "syncEmprendedorLocalesDesdePostulacion",
            message: locSyncEd.message,
          },
          { error: locSyncEd.message, code: "SYNC_LOCALES_FALLIDA" }
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

      const { data: slugRowEdicion } = await supabase
        .from("emprendedores")
        .select("slug")
        .eq("id", emprendedorIdExisting)
        .maybeSingle();
      const slugEdicion =
        slugRowEdicion && typeof (slugRowEdicion as { slug?: unknown }).slug === "string"
          ? s((slugRowEdicion as { slug: string }).slug)
          : "";

      if (revisionPublicar) {
        logRevisionLocalDebug(emprendedorIdExisting, {
          step: "antes_adminPublishEmprendedorFicha",
          modalidades_usadas_validacion: modalidadesDbParaPublicar,
          tieneLocalFisico: modalidadesDbParaPublicar.includes("local_fisico"),
        });
        logRevisionLocalDebugAlways(emprendedorIdExisting, {
          step: "PASO_PRE_VALIDACION_ADMINPUBLISH",
          modalidades_db_tras_sync: modalidadesDbParaPublicar,
        });
      }

      const pubEdicion = await adminPublishEmprendedorFicha(supabase, emprendedorIdExisting, {
        modalidadesDbTrasSync: modalidadesDbParaPublicar,
      });
      if (!pubEdicion.ok) {
        logRevisionLocalDebug(emprendedorIdExisting, {
          step: "resultado_adminPublishEmprendedorFicha",
          ok: false,
          reason: pubEdicion.reason,
          bloqueo: pubEdicion.reason === "local_fisico" ? (pubEdicion.error || true) : null,
          detail: pubEdicion.detail ?? null,
        });
        return Response.json(
          {
            ok: false,
            error: pubEdicion.error,
            reason: pubEdicion.reason,
            detail: pubEdicion.detail ?? null,
          },
          { status: pubEdicion.status }
        );
      }
      const reindexAlgoliaEdicion = await triggerReindexEmprendedorAlgolia(pubEdicion.id);
      logRevisionLocalDebug(emprendedorIdExisting, {
        step: "resultado_adminPublishEmprendedorFicha",
        ok: true,
        publicacion: "publicado",
      });

      let panelUrlEdicion: string | null = null;
      try {
        const ensured = await ensureEmprendedorPanelAccessUrl(
          supabase,
          emprendedorIdExisting
        );
        panelUrlEdicion = ensured.url;
      } catch (e) {
        console.error(
          "[aprobar edicion_publicado] ensureEmprendedorPanelAccessUrl:",
          e instanceof Error ? e.message : String(e)
        );
      }
      await notifyEmprendimientoAprobadoEmail(supabase, emprendedorIdExisting, {
        nombreFallback: pubEdicion.nombre,
        panelUrlIfKnown: panelUrlEdicion,
      });

      return ok({
        ok: true,
        message:
          "Cambios de la postulación aplicados al emprendimiento y ficha publicada en el sitio.",
        emprendedor_id: emprendedorIdExisting,
        ...(slugEdicion ? { slug: slugEdicion } : {}),
        taxonomia_publicada: taxonomiaFinalesRow,
        publicacion: { ok: true, estado_publicacion: "publicado" as const },
        reindexAlgolia: reindexAlgoliaEdicion,
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
