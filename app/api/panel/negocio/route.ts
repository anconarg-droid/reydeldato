import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { syncEmprendedorToAlgoliaWithSupabase } from "@/lib/algoliaSyncEmprendedor";
import { learnFromManualClassification } from "@/lib/learnFromManualClassification";
import { getPanelReviewerId } from "@/lib/getPanelReviewerId";
import { isPersistibleFotoUrl } from "@/lib/isPersistibleFotoUrl";
import { calcularCompletitudEmprendedor } from "@/lib/calcularCompletitudEmprendedor";
import { calcularTipoFicha } from "@/lib/calcularTipoFicha";
import { calcularChecklistFicha } from "@/lib/calcularChecklistFicha";
import { getPlanEstado } from "@/lib/planEstado";
import { subtituloEstadoComercialPanel } from "@/lib/panelComercialCopy";
import { tieneFichaCompleta } from "@/lib/tieneFichaCompleta";
import { getEstadoComercialEmprendedor } from "@/lib/getEstadoComercialEmprendedor";
import { validateCategoriaSubcategorias } from "@/lib/validateCategoriaSubcategorias";
import { columnaYValorBusquedaEmprendedor } from "@/lib/emprendedorLookupParam";
import { normalizeCoberturaTipoDb } from "@/lib/cobertura";
import {
  normalizeDescripcionCorta,
  normalizeDescripcionLarga,
  primeraValidacionDescripcion,
  validateDescripcionCortaPublicacion,
  validateDescripcionLarga,
} from "@/lib/descripcionProductoForm";
import {
  modalidadAtencionInputToDb,
  modalidadesAtencionInputsToDbUnique,
} from "@/lib/modalidadesAtencion";
import {
  planPeriodicidadDesdeEmprendedorRow,
  planTipoComercialDesdeEmprendedorRow,
} from "@/lib/emprendedorPlanCamposCompat";
import {
  validateOptionalInstagram,
  validateOptionalWebsite,
} from "@/lib/contactoPublicoValidation";
import { validateRequiredPublicEmail } from "@/lib/validateEmail";
import { normalizeAndValidateChileWhatsappStrict } from "@/utils/phone";
import {
  parseLocalesPatchInput,
  principalComunaBaseIdFromLocales,
  replaceEmprendedorLocales,
  resolveLocalesComunaIds,
  validateLocalesRules,
} from "@/lib/emprendedorLocalesDb";
import { ESTADO_PUBLICACION } from "@/lib/estadoPublicacion";
import { assertPostulacionLocalFisicoUbicacion } from "@/lib/postulacionLocalFisicoUbicacion";
import { requiereDireccionSiModalidadLocalFisico } from "@/lib/requiereDireccionLocalFisico";
import { POSTULACIONES_MODERACION_SELECT } from "@/lib/loadPostulacionesModeracion";
import { comunaIdsFromSlugs } from "@/lib/comunasCoberturaIds";
import { resolvePanelNegocioFromAccessToken } from "@/lib/panelNegocioAccessToken";
import {
  normalizeKeywordsUsuarioListFromMixed,
  readKeywordsUsuarioFromPostulacionRow,
} from "@/lib/keywordsUsuarioPostulacion";

const MSG_FICHA_ENVIADA_REVISION =
  "Tu emprendimiento está en revisión. Te avisaremos cuando esté publicado.";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function arr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => s(x)).filter(Boolean);
}

function dedupeStrings(list: string[]): string[] {
  return [...new Set(list.map((x) => s(x)).filter(Boolean))];
}

function buildGaleriaSlotsFromUrls(urls: string[]): string[] {
  const cleaned = dedupeStrings(urls).slice(0, 8);
  return Array.from({ length: 8 }, (_, i) => cleaned[i] ?? "");
}

type EdicionPublicadaPostulacionRow = {
  id: string;
  estado: string;
  tipo_postulacion?: string | null;
  emprendedor_id?: string | null;
  updated_at?: string | null;
  // campos editables (subset)
  nombre_emprendimiento?: string | null;
  nombre_responsable?: string | null;
  mostrar_responsable_publico?: boolean | null;
  email?: string | null;
  whatsapp_principal?: string | null;
  whatsapp_secundario?: string | null;
  frase_negocio?: string | null;
  descripcion_libre?: string | null;
  instagram?: string | null;
  sitio_web?: string | null;
  foto_principal_url?: string | null;
  galeria_urls?: string[] | null;
  comuna_base_id?: string | number | null;
  cobertura_tipo?: string | null;
  comunas_cobertura?: string[] | null;
  regiones_cobertura?: string[] | null;
  modalidades_atencion?: string[] | null;
  locales?: unknown;
  keywords_usuario?: string[] | null;
};

async function loadActiveEdicionPublicadoPostulacion(
  emprendedorId: string
): Promise<EdicionPublicadaPostulacionRow | null> {
  const eid = s(emprendedorId);
  if (!eid) return null;
  /**
   * Con varias filas activas, `.maybeSingle()` devuelve error y `data` null → el upsert creaba
   * INSERT en cada guardado (duplicados en moderación). `.limit(1)` sin maybeSingle devuelve array.
   */
  const { data, error } = await supabase
    .from("postulaciones_emprendedores")
    .select(POSTULACIONES_MODERACION_SELECT)
    .eq("emprendedor_id", eid)
    .eq("tipo_postulacion", "edicion_publicado")
    .in("estado", ["borrador", "pendiente_revision"])
    .order("updated_at", { ascending: false })
    .limit(1);
  if (error) return null;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return null;
  return row as unknown as EdicionPublicadaPostulacionRow;
}

async function upsertEdicionPublicadoPostulacion(
  emprendedorId: string,
  patch: Record<string, unknown>
): Promise<{ ok: true; postulacion_id: string } | { ok: false; message: string }> {
  const eid = s(emprendedorId);
  if (!eid) return { ok: false, message: "emprendedor_id inválido" };

  const existing = await loadActiveEdicionPublicadoPostulacion(eid);
  const nowIso = new Date().toISOString();

  const base: Record<string, unknown> = {
    ...patch,
    tipo_postulacion: "edicion_publicado",
    emprendedor_id: eid,
    estado: "pendiente_revision",
    updated_at: nowIso,
  };

  if (existing?.id) {
    const { data, error } = await supabase
      .from("postulaciones_emprendedores")
      .update(base)
      .eq("id", existing.id)
      .select("id")
      .maybeSingle();
    if (error || !data?.id) return { ok: false, message: error?.message || "No se pudo guardar la postulación" };
    return { ok: true, postulacion_id: String((data as any).id) };
  }

  const { data, error } = await supabase
    .from("postulaciones_emprendedores")
    .insert(base)
    .select("id")
    .maybeSingle();
  if (error || !data?.id) return { ok: false, message: error?.message || "No se pudo crear la postulación" };
  return { ok: true, postulacion_id: String((data as any).id) };
}

/** Misma semántica que el payload GET desde `emprendedores.cobertura_tipo`. */
function panelCoberturaTipoLabelFromDbRaw(rawIn: string): "solo_comuna" | "varias_comunas" | "regional" | "nacional" {
  const coberturaRaw = s(rawIn).toLowerCase();
  if (
    coberturaRaw === "comuna" ||
    coberturaRaw === "solo_mi_comuna" ||
    coberturaRaw === "solo_comuna"
  ) {
    return "solo_comuna";
  }
  if (coberturaRaw === "varias_comunas") {
    return "varias_comunas";
  }
  if (coberturaRaw === "regional" || coberturaRaw === "varias_regiones") {
    return "regional";
  }
  if (coberturaRaw === "nacional") {
    return "nacional";
  }
  return "solo_comuna";
}

/**
 * Mezcla la postulación `edicion_publicado` sobre el payload de `emprendedores`.
 * Sin esto, el GET seguía mostrando cobertura/keywords **publicados** aunque el PUT hubiera
 * guardado los cambios en `postulaciones_emprendedores`.
 */
async function mergePanelPayloadWithPostulacion(
  payload: Record<string, unknown>,
  post: EdicionPublicadaPostulacionRow
): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = { ...payload };

  const assignIf = (key: string, val: unknown) => {
    if (val === undefined) return;
    if (val === null) return;
    if (typeof val === "string" && !val.trim()) return;
    out[key] = val;
  };

  assignIf("nombre", post.nombre_emprendimiento ?? undefined);
  assignIf("nombre_emprendimiento", post.nombre_emprendimiento ?? undefined);
  assignIf("responsable", post.nombre_responsable ?? undefined);
  if (post.mostrar_responsable_publico != null) {
    out.mostrarResponsable = post.mostrar_responsable_publico === true;
  }

  assignIf("email", post.email ?? undefined);
  assignIf("whatsapp", post.whatsapp_principal ?? undefined);
  assignIf("whatsappSecundario", post.whatsapp_secundario ?? undefined);
  assignIf("instagram", post.instagram ?? undefined);
  assignIf("web", post.sitio_web ?? undefined);
  assignIf("sitio_web", post.sitio_web ?? undefined);

  assignIf("descripcionCorta", post.frase_negocio ?? undefined);
  assignIf("frase_negocio", post.frase_negocio ?? undefined);
  assignIf("descripcionLarga", post.descripcion_libre ?? undefined);

  assignIf("fotoPrincipalUrl", post.foto_principal_url ?? undefined);
  assignIf("foto_principal_url", post.foto_principal_url ?? undefined);
  /**
   * Fusionar galería desde la postulación solo si hay **al menos una URL no vacía**.
   * `[]` o solo strings vacíos conservan `galeriaUrls` del emprendedor (tabla `emprendedor_galeria` / payload).
   */
  if (postGaleriaUrlsNonEmpty(post)) {
    out.galeriaUrls = buildGaleriaSlotsFromUrls(post.galeria_urls as string[]);
  }

  if (Array.isArray(post.modalidades_atencion)) {
    out.modalidadesAtencion = post.modalidades_atencion;
  }

  {
    const postAny = post as Record<string, unknown>;
    const kws = readKeywordsUsuarioFromPostulacionRow(postAny);
    out.keywords_usuario = kws;
    /** Forma unificada para el cliente (misma lectura que emprendedores vía `readKeywordsUsuarioPreferJson`). */
    out.keywords_usuario_json = kws.length > 0 ? kws : null;
  }

  {
    const parsedLocales = parseLocalesPatchInput(post.locales);
    if (parsedLocales !== null) {
      out.localesFisicos = parsedLocales.map((l) => ({
        comunaSlug: l.comuna_slug,
        direccion: l.direccion,
        referencia: l.referencia ?? "",
        esPrincipal: l.es_principal,
      }));
    }
  }

  const baseIdRaw = post.comuna_base_id;
  const baseIdStr =
    baseIdRaw != null && String(baseIdRaw).trim() !== ""
      ? String(baseIdRaw).trim()
      : "";
  if (baseIdStr) {
    try {
      const { data: cRow } = await supabase
        .from("comunas")
        .select("slug, nombre")
        .eq("id", baseIdStr)
        .maybeSingle();
      if (cRow && typeof cRow === "object") {
        const slug = s((cRow as { slug?: unknown }).slug);
        const nombre = s((cRow as { nombre?: unknown }).nombre);
        if (slug) out.comunaBaseSlug = slug;
        if (nombre) out.comunaBaseNombre = nombre;
      }
    } catch {
      /* no bloquear merge */
    }
  }

  const cobDb = normalizeCoberturaTipoDb(post.cobertura_tipo as string | null | undefined);
  if (cobDb) {
    out.coberturaTipo = panelCoberturaTipoLabelFromDbRaw(cobDb);
    const allCom = Array.isArray(post.comunas_cobertura)
      ? post.comunas_cobertura.map((x) => s(x)).filter(Boolean)
      : [];
    const baseSlug = s(out.comunaBaseSlug as string);
    if (cobDb === "varias_comunas") {
      out.comunasCoberturaSlugs = baseSlug
        ? allCom.filter((x) => x !== baseSlug)
        : allCom;
    } else {
      out.comunasCoberturaSlugs = [];
    }
    out.regionesCoberturaSlugs = Array.isArray(post.regiones_cobertura)
      ? post.regiones_cobertura.map((x) => s(x)).filter(Boolean)
      : [];
  }

  out.postulacionActiva = {
    id: post.id,
    estado: post.estado,
    tipo: post.tipo_postulacion ?? "edicion_publicado",
    updated_at: post.updated_at ?? null,
  };

  return out;
}

/** Clave estable para deduplicar ids (uuid/text) en pivotes; evita colisiones por casing. */
function pivotIdKey(v: unknown): string {
  return s(v).toLowerCase();
}

type PivotComunaRow = { comunaId: string; slug: string };

/**
 * Filas de cobertura desde `emprendedor_comunas_cobertura` con slug canónico por `comuna_id`.
 * Si el embed PostgREST no trae `comunas`, hace batch lookup por id (evita confundir id con slug).
 */
async function comunasCoberturaDesdeEmprendedorPivot(
  emprendedorId: string
): Promise<PivotComunaRow[]> {
  const { data, error } = await supabase
    .from("emprendedor_comunas_cobertura")
    .select("comuna_id, comunas(slug)")
    .eq("emprendedor_id", emprendedorId);

  if (error) {
    logPanelNegocioGet("comunas_pivot_error", { message: error.message });
    return [];
  }
  if (!Array.isArray(data) || data.length === 0) return [];

  const byId = new Map<string, string>();
  const needLookup: string[] = [];

  for (const raw of data) {
    const r = raw as Record<string, unknown>;
    const cid = s(r.comuna_id);
    if (!cid) continue;
    const emb = r.comunas;
    const slug =
      emb && typeof emb === "object" && !Array.isArray(emb)
        ? s((emb as { slug?: unknown }).slug)
        : "";
    if (slug) byId.set(cid, slug);
    else needLookup.push(cid);
  }

  const uniqueMissing = dedupeStrings(needLookup);
  if (uniqueMissing.length > 0) {
    const { data: rows, error: err2 } = await supabase
      .from("comunas")
      .select("id, slug")
      .in("id", uniqueMissing as never[]);
    if (err2) {
      logPanelNegocioGet("comunas_pivot_lookup_error", { message: err2.message });
    } else if (Array.isArray(rows)) {
      for (const cr of rows) {
        const id = s((cr as { id?: unknown }).id);
        const slug = s((cr as { slug?: unknown }).slug);
        if (id && slug) byId.set(id, slug);
      }
    }
  }

  return [...byId.entries()].map(([comunaId, slug]) => ({ comunaId, slug }));
}

function partitionPivotCoberturaEnExtrasYTodas(
  rows: PivotComunaRow[],
  baseComunaId: string | null,
  baseComunaSlug: string
): { extrasSlugs: string[]; allSlugsOrdered: string[] } {
  const baseIdNorm = baseComunaId ? s(baseComunaId) : "";
  const baseSlugNorm = s(baseComunaSlug);

  const orderSlug: string[] = [];
  const seenSlug = new Set<string>();
  for (const { slug } of rows) {
    if (!slug) continue;
    if (seenSlug.has(slug)) continue;
    seenSlug.add(slug);
    orderSlug.push(slug);
  }

  const extras: string[] = [];
  const extrasSeen = new Set<string>();
  for (const { comunaId, slug } of rows) {
    if (!slug) continue;
    const isBase =
      (baseIdNorm && s(comunaId) === baseIdNorm) ||
      (baseSlugNorm && slug === baseSlugNorm);
    if (isBase) continue;
    if (extrasSeen.has(slug)) continue;
    extrasSeen.add(slug);
    extras.push(slug);
  }

  return { extrasSlugs: extras, allSlugsOrdered: orderSlug };
}

/** Fallback si el pivote está vacío: tokens pueden ser slug o id numérico como string. */
async function comunasCoberturaExtrasDesdeTokensLegacy(
  tokens: string[],
  baseComunaSlug: string
): Promise<string[]> {
  const deduped = dedupeStrings(tokens);
  if (deduped.length === 0) return [];

  const numericIds = deduped.filter((t) => /^\d+$/.test(t));

  const idToSlug = new Map<string, string>();
  if (numericIds.length) {
    const { data: rows, error } = await supabase
      .from("comunas")
      .select("id, slug")
      .in("id", numericIds as never[]);
    if (error) {
      logPanelNegocioGet("legacy_cobertura_lookup_error", { message: error.message });
    } else if (Array.isArray(rows)) {
      for (const cr of rows) {
        const id = s((cr as { id?: unknown }).id);
        const slug = s((cr as { slug?: unknown }).slug);
        if (id && slug) idToSlug.set(id, slug);
      }
    }
  }

  const baseNorm = s(baseComunaSlug);
  const out: string[] = [];
  const seen = new Set<string>();

  for (const t of deduped) {
    const slug = /^\d+$/.test(t) ? idToSlug.get(t) ?? "" : t;
    if (!slug) continue;
    if (baseNorm && slug === baseNorm) continue;
    if (seen.has(slug)) continue;
    seen.add(slug);
    out.push(slug);
  }

  return out;
}

/**
 * Panel → enum canónico `emprendedores.cobertura_tipo` (Postgres), no alias tipo solo_mi_comuna.
 */
function panelCoberturaToDb(tipo: string): string {
  return normalizeCoberturaTipoDb(tipo) || "solo_comuna";
}

/** Valores en `emprendedor_modalidades.modalidad` → claves de NegocioForm. */
function modalidadesToPanelForm(rawList: string[]): string[] {
  const out = new Set<string>();
  for (const raw of rawList) {
    const db = modalidadAtencionInputToDb(s(raw));
    if (db === "local_fisico") out.add("local_fisico");
    else if (db === "delivery") out.add("delivery");
    else if (db === "domicilio") out.add("domicilio");
    else if (db === "online") out.add("online");
    else if (db === "presencial_terreno") out.add("presencial_terreno");
  }
  return [...out];
}

function comunaRefFromRow(row: Record<string, unknown>): unknown {
  /** Escritura: solo `comuna_id`. Lectura: fallback por migraciones antiguas. */
  return row.comuna_id ?? row.comuna_base_id ?? null;
}

function numComunaFromRow(row: Record<string, unknown>): number | null {
  const ref = comunaRefFromRow(row);
  if (ref == null) return null;
  const n = Number(ref);
  return Number.isFinite(n) ? n : null;
}

/** GET siempre responde 200 con `ok: true` y `item`/`completitud` nullables (sin 500 por datos). */
function panelNegocioGetJson(body: Record<string, unknown>) {
  return NextResponse.json(
    {
      ok: true,
      item: body.item ?? null,
      completitud: body.completitud ?? null,
      ...(body.tipoFicha !== undefined ? { tipoFicha: body.tipoFicha } : {}),
      ...(body.checklistFaltantes !== undefined
        ? { checklistFaltantes: body.checklistFaltantes }
        : {}),
      ...(body.comercial !== undefined ? { comercial: body.comercial } : {}),
      ...(body.meta !== undefined ? { meta: body.meta } : {}),
    },
    { status: 200 }
  );
}

function logPanelNegocioGet(
  phase: string,
  payload: Record<string, unknown>
): void {
  try {
    console.error(`[panel/negocio GET] ${phase}`, JSON.stringify(payload));
  } catch {
    console.error(`[panel/negocio GET] ${phase}`, payload);
  }
}

/** Logs extra galería / resolución de token: `PANEL_NEGOCIO_GALERIA_DEBUG=1` en el entorno del servidor. */
function logPanelGaleriaDiag(payload: Record<string, unknown>): void {
  if (s(process.env.PANEL_NEGOCIO_GALERIA_DEBUG) !== "1") return;
  logPanelNegocioGet("galeria_diag", payload);
}

function postGaleriaUrlsNonEmpty(post: EdicionPublicadaPostulacionRow | null): boolean {
  if (!post || !Array.isArray(post.galeria_urls)) return false;
  return post.galeria_urls.some((u) => s(u).length > 0);
}

/** Ficha aún no creada en `emprendedores`: panel solo con datos de postulación (token válido). */
async function panelNegocioGetDesdePostulacionSolo(
  postRow: Record<string, unknown>
): Promise<NextResponse> {
  let comunaSlug = "";
  let comunaBaseNombre = "";
  const comunaRef = postRow.comuna_base_id ?? postRow.comuna_id;
  if (comunaRef != null) {
    try {
      const { data: comuna, error: errC } = await supabase
        .from("comunas")
        .select("slug, nombre")
        .eq("id", comunaRef)
        .maybeSingle();
      if (!errC && comuna && typeof comuna === "object") {
        const c = comuna as { slug?: unknown; nombre?: unknown };
        if (typeof c.slug === "string") comunaSlug = s(c.slug);
        if (typeof c.nombre === "string") comunaBaseNombre = s(c.nombre);
      }
    } catch {
      /* vacío: panel sin comuna */
    }
  }

  let categoriaSlug = "";
  let categoriaNombre = "";
  if (postRow.categoria_id != null) {
    try {
      const { data: categoria, error: errCat } = await supabase
        .from("categorias")
        .select("slug, nombre")
        .eq("id", postRow.categoria_id)
        .maybeSingle();
      if (!errCat && categoria && typeof categoria === "object") {
        const c = categoria as { slug?: unknown; nombre?: unknown };
        if (typeof c.slug === "string") categoriaSlug = s(c.slug);
        if (typeof c.nombre === "string") categoriaNombre = s(c.nombre);
      }
    } catch {
      /* */
    }
  }

  const coberturaRaw = s(postRow.cobertura_tipo).toLowerCase();
  const modalidadesAtencion = modalidadesToPanelForm(
    Array.isArray(postRow.modalidades_atencion)
      ? (postRow.modalidades_atencion as unknown[]).map((x) => s(x))
      : []
  );

  const galUrls = Array.isArray(postRow.galeria_urls)
    ? (postRow.galeria_urls as unknown[]).map((x) => s(x)).filter(Boolean)
    : [];
  const galeriaSlots = buildGaleriaSlotsFromUrls(galUrls);
  const galeriaExtraCount = galeriaSlots.filter(Boolean).length;

  const comunasLegacy = arr(postRow.comunas_cobertura);
  let comunasCoberturaExtrasSlugs: string[] = [];
  let comunasCoberturaParaCard: string[] = [];
  try {
    if (comunasLegacy.length > 0 && comunaSlug) {
      comunasCoberturaExtrasSlugs = await comunasCoberturaExtrasDesdeTokensLegacy(
        comunasLegacy,
        comunaSlug
      );
      comunasCoberturaParaCard = dedupeStrings([
        ...(comunaSlug ? [comunaSlug] : []),
        ...comunasCoberturaExtrasSlugs,
      ]);
    }
  } catch {
    /* */
  }

  const regionesCoberturaSlugs = arr(postRow.regiones_cobertura);
  const nombreEmp = s(postRow.nombre_emprendimiento);
  const frase = s(postRow.frase_negocio);
  const fotoUrl = s(postRow.foto_principal_url);
  const ig = s(postRow.instagram);
  const webRow = s(postRow.sitio_web);

  const comercial = {
    estado: "basico" as const,
    fechaExpiracion: null as string | null,
    diasRestantes: null as number | null,
    esPerfilCompletoComercial: false,
    planEstado: "perfil_basico" as const,
    subtitulo: "Tu postulación está en revisión.",
    trialIniciaAt: null as string | null,
    trialExpiraAt: null as string | null,
    planIniciaAt: null as string | null,
    planExpiraAt: null as string | null,
    planTipo: null as string | null,
    planPeriodicidad: null as string | null,
    sugiereRenovarPlan: false,
  };

  const payload: Record<string, unknown> = {
    id: "",
    slug: "",
    nombre: nombreEmp,
    nombre_emprendimiento: nombreEmp,
    comunaBaseNombre,
    categoriaNombre: categoriaNombre || undefined,
    responsable: s(postRow.nombre_responsable),
    mostrarResponsable: postRow.mostrar_responsable_publico === true,
    categoriaSlug,
    subcategoriasSlugs: [] as string[],
    comunaBaseSlug: comunaSlug,
    coberturaTipo: ((): "solo_comuna" | "varias_comunas" | "regional" | "nacional" => {
      if (
        coberturaRaw === "comuna" ||
        coberturaRaw === "solo_mi_comuna" ||
        coberturaRaw === "solo_comuna"
      ) {
        return "solo_comuna";
      }
      if (coberturaRaw === "varias_comunas") return "varias_comunas";
      if (coberturaRaw === "regional" || coberturaRaw === "varias_regiones") {
        return "regional";
      }
      if (coberturaRaw === "nacional") return "nacional";
      return "solo_comuna";
    })(),
    comunasCoberturaSlugs:
      coberturaRaw === "varias_comunas" ? comunasCoberturaExtrasSlugs : [],
    regionesCoberturaSlugs,
    modalidadesAtencion: modalidadesAtencion as unknown[],
    descripcionCorta: frase,
    descripcionLarga: s(postRow.descripcion_libre),
    frase_negocio: frase,
    whatsapp: s(postRow.whatsapp_principal),
    whatsappSecundario: s(postRow.whatsapp_secundario),
    instagram: ig,
    web: webRow,
    sitio_web: webRow,
    email: s(postRow.email),
    fotoPrincipalUrl: fotoUrl,
    foto_principal_url: fotoUrl,
    galeriaUrls: galeriaSlots,
    localesFisicos: [] as Array<{
      comunaSlug: string;
      direccion: string;
      referencia: string;
      esPrincipal: boolean;
    }>,
    estado_publicacion: ESTADO_PUBLICACION.en_revision,
    panel_origen_postulacion: true,
    panel_estado_resumen: "En revisión",
    panel_descripcion_resumen: [frase, s(postRow.descripcion_libre)]
      .filter(Boolean)
      .join("\n\n"),
  };

  let completitud: ReturnType<typeof calcularCompletitudEmprendedor> | null = null;
  try {
    completitud = calcularCompletitudEmprendedor({
      nombreEmprendimiento: postRow.nombre_emprendimiento,
      whatsappPrincipal: postRow.whatsapp_principal,
      whatsappSecundario: postRow.whatsapp_secundario,
      fotoPrincipalUrl: postRow.foto_principal_url,
      fraseNegocio: postRow.frase_negocio,
      comunaId: comunaRef,
      categoriaId: postRow.categoria_id,
      coberturaTipo: postRow.cobertura_tipo,
      comunasCobertura: comunasCoberturaParaCard,
      regionesCoberturaCount: regionesCoberturaSlugs.length,
      modalidadesCount: modalidadesAtencion.length,
      instagram: postRow.instagram,
      sitioWeb: postRow.sitio_web,
      descripcionLibre: postRow.descripcion_libre,
      galeriaExtraCount,
    });
  } catch {
    completitud = null;
  }

  return panelNegocioGetJson({
    item: payload,
    completitud,
    tipoFicha: "basica" as const,
    comercial,
    meta: { reason: "postulacion_sin_emprendedor" },
  });
}

// GET /api/panel/negocio?id=... | ?slug=... | ?access_token=...
// Acepta `id` o `slug`; si `slug` parece UUID, busca por `id`.
// Con `access_token` (≥8 chars) se resuelve **antes** que `id`/`slug`: si el token es de un emprendedor
// publicado, el `id` de la query se reemplaza por el del token (evita fila equivocada al tener ambos).
// Si el token es solo postulación (sin ficha), responde desde esa fila y termina aquí.
// `select('*')` evita 42703 por columnas ausentes en BD. Errores → 200 + item/completitud null.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  let idTrim = s(url.searchParams.get("id"));
  const idFromQueryInitial = idTrim;
  const slugTrim = s(url.searchParams.get("slug"));
  const accessTokenParam = s(url.searchParams.get("access_token"));

  try {
    logPanelNegocioGet("input", {
      id: idTrim || null,
      slug: slugTrim || null,
      access_token_len: accessTokenParam.length,
    });

    if (accessTokenParam.length >= 8) {
      const resolved = await resolvePanelNegocioFromAccessToken(
        supabase,
        accessTokenParam
      );
      if (resolved?.mode === "postulacion_solo") {
        logPanelGaleriaDiag({
          branch: "postulacion_solo",
          id_from_query: idFromQueryInitial || null,
          slug_from_query: slugTrim || null,
          postulacion_id: s((resolved.post as { id?: unknown }).id),
          estado: resolved.post.estado ?? null,
        });
        logPanelNegocioGet("postulacion_solo", {
          estado: resolved.post.estado ?? null,
        });
        return await panelNegocioGetDesdePostulacionSolo(resolved.post);
      }
      if (resolved?.mode === "emprendedor_id" && s(resolved.emprendedorId)) {
        logPanelGaleriaDiag({
          branch: "access_token_overrides_id",
          id_from_query: idFromQueryInitial || null,
          id_from_token: s(resolved.emprendedorId),
        });
        idTrim = s(resolved.emprendedorId);
      }
    }

    const busqueda = columnaYValorBusquedaEmprendedor(idTrim, slugTrim);
    if (!busqueda) {
      logPanelNegocioGet("abort", { reason: "missing_id_or_slug" });
      return panelNegocioGetJson({
        item: null,
        completitud: null,
        meta: { reason: "missing_id_or_slug" },
      });
    }

    logPanelNegocioGet("query", {
      columna: busqueda.columna,
      valor: busqueda.valor,
      select: "emprendedores *",
    });

    const {
      data,
      error: errMain,
    } = await supabase
      .from("emprendedores")
      .select("*")
      .eq(busqueda.columna, busqueda.valor)
      .maybeSingle();

    if (errMain) {
      logPanelNegocioGet("supabase_error", {
        message: errMain.message,
        code: (errMain as { code?: string }).code,
        details: (errMain as { details?: string }).details,
        hint: (errMain as { hint?: string }).hint,
      });
      return panelNegocioGetJson({
        item: null,
        completitud: null,
        meta: {
          reason: "db_error",
          message: errMain.message,
        },
      });
    }

    logPanelNegocioGet("row_raw", {
      found: Boolean(data),
      keys: data && typeof data === "object" ? Object.keys(data).slice(0, 40) : [],
    });

    if (!data || typeof data !== "object") {
      return panelNegocioGetJson({
        item: null,
        completitud: null,
        meta: { reason: "not_found" },
      });
    }

    const row = data as Record<string, unknown>;

    let comunaSlug = "";
    let comunaBaseNombre = "";
    const comunaRef = comunaRefFromRow(row);
    if (comunaRef != null) {
      try {
        const { data: comuna, error: errC } = await supabase
          .from("comunas")
          .select("slug, nombre")
          .eq("id", comunaRef)
          .maybeSingle();
        if (errC) {
          logPanelNegocioGet("comunas_error", { message: errC.message });
        } else if (comuna && typeof comuna === "object") {
          const c = comuna as { slug?: unknown; nombre?: unknown };
          if (typeof c.slug === "string") comunaSlug = s(c.slug);
          if (typeof c.nombre === "string") comunaBaseNombre = s(c.nombre);
        }
      } catch (e) {
        logPanelNegocioGet("comunas_exception", {
          message: e instanceof Error ? e.message : String(e),
          stack: e instanceof Error ? e.stack : undefined,
        });
      }
    }

    let categoriaSlug = "";
    let categoriaNombre = "";
    if (row.categoria_id != null) {
      try {
        const { data: categoria, error: errCat } = await supabase
          .from("categorias")
          .select("slug, nombre")
          .eq("id", row.categoria_id)
          .maybeSingle();
        if (errCat) {
          logPanelNegocioGet("categorias_error", { message: errCat.message });
        } else if (categoria && typeof categoria === "object") {
          const c = categoria as { slug?: unknown; nombre?: unknown };
          if (typeof c.slug === "string") categoriaSlug = s(c.slug);
          if (typeof c.nombre === "string") categoriaNombre = s(c.nombre);
        }
      } catch (e) {
        logPanelNegocioGet("categorias_exception", {
          message: e instanceof Error ? e.message : String(e),
          stack: e instanceof Error ? e.stack : undefined,
        });
      }
    }

    const coberturaRaw = s(row.cobertura_tipo).toLowerCase();
    const emprendedorId = s(row.id);
    const estadoPubGet = s(row.estado_publicacion).toLowerCase();
    let activeEdicionPostulacionForPanel: EdicionPublicadaPostulacionRow | null =
      null;
    if (emprendedorId && estadoPubGet === "publicado") {
      try {
        activeEdicionPostulacionForPanel =
          await loadActiveEdicionPublicadoPostulacion(emprendedorId);
        logPanelGaleriaDiag({
          phase: "active_postulacion_loaded",
          emprendedor_id: emprendedorId,
          postulacion_id: activeEdicionPostulacionForPanel?.id ?? null,
          estado: activeEdicionPostulacionForPanel?.estado ?? null,
          tipo_postulacion:
            activeEdicionPostulacionForPanel?.tipo_postulacion ?? null,
          updated_at: activeEdicionPostulacionForPanel?.updated_at ?? null,
          galeria_urls: activeEdicionPostulacionForPanel?.galeria_urls ?? null,
          foto_principal_url:
            activeEdicionPostulacionForPanel?.foto_principal_url ?? null,
        });
      } catch {
        activeEdicionPostulacionForPanel = null;
      }
    }

    let modalidadesAtencion: string[] = [];
    if (emprendedorId) {
      try {
        const { data: modRows, error: errM } = await supabase
          .from("emprendedor_modalidades")
          .select("modalidad")
          .eq("emprendedor_id", emprendedorId);
        if (errM) {
          logPanelNegocioGet("modalidades_error", { message: errM.message });
        } else if (Array.isArray(modRows)) {
          modalidadesAtencion = modalidadesToPanelForm(
            modRows.map((r) => s((r as { modalidad?: unknown }).modalidad))
          );
        }
      } catch (e) {
        logPanelNegocioGet("modalidades_exception", {
          message: e instanceof Error ? e.message : String(e),
          stack: e instanceof Error ? e.stack : undefined,
        });
      }
    }

    let galeriaExtraCount = 0;
    /** Filas con URL no vacía en `emprendedor_galeria` (para diagnóstico / merge). */
    let empGaleriaDbUrlCount = 0;
    const galeriaSlots = Array.from({ length: 8 }, () => "");
    let subcategoriasSlugs: string[] = [];
    if (emprendedorId) {
      try {
        const usePostGaleriaSlots =
          !!activeEdicionPostulacionForPanel &&
          postGaleriaUrlsNonEmpty(activeEdicionPostulacionForPanel);

        if (usePostGaleriaSlots && activeEdicionPostulacionForPanel) {
          const galUrls = Array.isArray(
            activeEdicionPostulacionForPanel.galeria_urls
          )
            ? activeEdicionPostulacionForPanel.galeria_urls
            : [];
          const slotArr = buildGaleriaSlotsFromUrls(galUrls);
          galeriaExtraCount = slotArr.filter(Boolean).length;
          for (let i = 0; i < 8; i++) {
            galeriaSlots[i] = slotArr[i] ?? "";
          }
          if (s(process.env.PANEL_NEGOCIO_GALERIA_DEBUG) === "1") {
            const { data: galRowsDbg } = await supabase
              .from("emprendedor_galeria")
              .select("imagen_url")
              .eq("emprendedor_id", emprendedorId);
            if (Array.isArray(galRowsDbg)) {
              empGaleriaDbUrlCount = galRowsDbg.filter((r) =>
                s((r as { imagen_url?: unknown }).imagen_url)
              ).length;
            }
          }
        } else {
          const { data: galRows, error: errG } = await supabase
            .from("emprendedor_galeria")
            .select("imagen_url")
            .eq("emprendedor_id", emprendedorId);
          if (errG) {
            logPanelNegocioGet("galeria_error", { message: errG.message });
          } else if (Array.isArray(galRows)) {
            const urls = galRows
              .map((r) => s((r as { imagen_url?: unknown }).imagen_url))
              .filter(Boolean);
            empGaleriaDbUrlCount = urls.length;
            galeriaExtraCount = urls.length;
            for (let i = 0; i < 8 && i < urls.length; i++) {
              galeriaSlots[i] = urls[i] ?? "";
            }
          }
        }

        logPanelGaleriaDiag({
          phase: "galeria_slots_before_merge",
          emprendedor_id: emprendedorId,
          use_post_galeria_slots: usePostGaleriaSlots,
          emp_galeria_db_url_count: empGaleriaDbUrlCount,
          galeriaSlots_preview: galeriaSlots.filter(Boolean).slice(0, 3),
        });
      } catch (e) {
        logPanelNegocioGet("galeria_exception", {
          message: e instanceof Error ? e.message : String(e),
          stack: e instanceof Error ? e.stack : undefined,
        });
      }

      try {
        const { data: subRelRows, error: errS } = await supabase
          .from("emprendedor_subcategorias")
          .select("subcategorias(slug)")
          .eq("emprendedor_id", emprendedorId);
        if (errS) {
          logPanelNegocioGet("subcategorias_error", { message: errS.message });
        } else if (Array.isArray(subRelRows)) {
          subcategoriasSlugs = dedupeStrings(
            subRelRows.map((r) =>
              s(
                (r as { subcategorias?: { slug?: unknown } }).subcategorias?.slug
              )
            )
          );
        }
      } catch (e) {
        logPanelNegocioGet("subcategorias_exception", {
          message: e instanceof Error ? e.message : String(e),
          stack: e instanceof Error ? e.stack : undefined,
        });
      }
    }

    let comunasCoberturaExtrasSlugs: string[] = [];
    let comunasCoberturaParaCompletitud: string[] = arr(row.comunas_cobertura);

    if (emprendedorId) {
      try {
        const pivotRows = await comunasCoberturaDesdeEmprendedorPivot(emprendedorId);
        if (pivotRows.length > 0) {
          const baseIdStr = comunaRef != null ? s(comunaRef) : "";
          const { extrasSlugs, allSlugsOrdered } =
            partitionPivotCoberturaEnExtrasYTodas(
              pivotRows,
              baseIdStr || null,
              comunaSlug
            );
          comunasCoberturaExtrasSlugs = extrasSlugs;
          comunasCoberturaParaCompletitud = allSlugsOrdered;
        } else {
          const leg = arr(row.comunas_cobertura);
          if (leg.length > 0) {
            comunasCoberturaExtrasSlugs =
              await comunasCoberturaExtrasDesdeTokensLegacy(leg, comunaSlug);
            comunasCoberturaParaCompletitud = dedupeStrings([
              ...(comunaSlug ? [comunaSlug] : []),
              ...comunasCoberturaExtrasSlugs,
            ]);
          }
        }
      } catch (e) {
        logPanelNegocioGet("comunas_pivot_exception", {
          message: e instanceof Error ? e.message : String(e),
        });
      }
    }

    const regionesCoberturaSlugs = arr(row.regiones_cobertura);
    const comunaIdForCalc = comunaRefFromRow(row);

    let completitud: ReturnType<typeof calcularCompletitudEmprendedor> | null =
      null;
    try {
      completitud = calcularCompletitudEmprendedor({
        nombreEmprendimiento: row.nombre_emprendimiento,
        whatsappPrincipal: row.whatsapp_principal,
        whatsappSecundario: row.whatsapp_secundario,
        fotoPrincipalUrl: row.foto_principal_url,
        fraseNegocio: row.frase_negocio,
        comunaId: comunaIdForCalc,
        categoriaId: row.categoria_id,
        coberturaTipo: row.cobertura_tipo,
        comunasCobertura: comunasCoberturaParaCompletitud,
        regionesCoberturaCount: regionesCoberturaSlugs.length,
        modalidadesCount: modalidadesAtencion.length,
        instagram: row.instagram,
        sitioWeb: row.sitio_web,
        descripcionLibre: row.descripcion_libre,
        galeriaExtraCount,
      });
    } catch (e) {
      logPanelNegocioGet("completitud_exception", {
        message: e instanceof Error ? e.message : String(e),
        stack: e instanceof Error ? e.stack : undefined,
      });
      completitud = null;
    }

    const comunaIdNum = numComunaFromRow(row);

    let tipoFicha: "basica" | "completa" = "basica";
    try {
      tipoFicha = calcularTipoFicha({
        nombre_emprendimiento: s(row.nombre_emprendimiento) || null,
        whatsapp_principal: s(row.whatsapp_principal) || null,
        frase_negocio: s(row.frase_negocio) || null,
        comuna_id: comunaIdNum,
        cobertura_tipo: s(row.cobertura_tipo) || null,
        descripcion_libre: s(row.descripcion_libre) || null,
        foto_principal_url: s(row.foto_principal_url) || null,
        galeria_count: galeriaExtraCount,
        instagram: s(row.instagram) || null,
        sitio_web: s(row.sitio_web) || null,
        plan_activo: row.plan_activo === true ? true : null,
        plan_expira_at: s(row.plan_expira_at) || null,
        trial_expira_at: s(row.trial_expira_at) || null,
      });
    } catch (e) {
      logPanelNegocioGet("tipoFicha_exception", {
        message: e instanceof Error ? e.message : String(e),
        stack: e instanceof Error ? e.stack : undefined,
      });
      tipoFicha = "basica";
    }

    let checklistFaltantes: ReturnType<typeof calcularChecklistFicha> | null =
      null;
    try {
      checklistFaltantes = calcularChecklistFicha({
        descripcion_libre: s(row.descripcion_libre) || null,
        frase_negocio: s(row.frase_negocio) || null,
        whatsapp_principal: s(row.whatsapp_principal) || null,
        foto_principal_url: s(row.foto_principal_url) || null,
        galeria_count: galeriaExtraCount,
        instagram: s(row.instagram) || null,
        sitio_web: s(row.sitio_web) || null,
        plan_activo: row.plan_activo === true ? true : null,
        plan_expira_at: s(row.plan_expira_at) || null,
        trial_expira_at: s(row.trial_expira_at) || null,
      });
    } catch (e) {
      logPanelNegocioGet("checklist_exception", {
        message: e instanceof Error ? e.message : String(e),
        stack: e instanceof Error ? e.stack : undefined,
      });
      checklistFaltantes = null;
    }

    let comercial: Record<string, unknown>;
    try {
      const comercialInput = {
        planActivo: row.plan_activo === true ? true : null,
        planExpiraAt: s(row.plan_expira_at) || null,
        trialExpiraAt: s(row.trial_expira_at) || null,
      };
      const planEstado = getPlanEstado(comercialInput);
      const esPerfilCompletoComercial = tieneFichaCompleta(comercialInput);
      const planExpiraAt = s(row.plan_expira_at) || null;
      const ev = getEstadoComercialEmprendedor(comercialInput);
      const sugiereRenovarPlan =
        ev.estado === "plan_por_vencer" ||
        (ev.estado === "vencido_reciente" && Boolean(planExpiraAt));

      // Bloque “Plan” en panel: el cliente arma la UI solo con `buildPlanUi(comercial)`
      // (lib/panelEstadoPlanUi.ts) usando estas fechas + `estado` / `diasRestantes`.
      comercial = {
        estado: ev.estado,
        fechaExpiracion: ev.fechaExpiracion,
        diasRestantes: ev.diasRestantes,
        esPerfilCompletoComercial,
        planEstado,
        subtitulo: subtituloEstadoComercialPanel({
          planEstado,
          trialExpiraAt: s(row.trial_expira_at) || null,
          planExpiraAt,
        }),
        trialIniciaAt: s(row.trial_inicia_at) || null,
        trialExpiraAt: s(row.trial_expira_at) || null,
        planIniciaAt: s(row.plan_inicia_at) || null,
        planExpiraAt,
        planTipo: planTipoComercialDesdeEmprendedorRow(row),
        planPeriodicidad: planPeriodicidadDesdeEmprendedorRow(row),
        sugiereRenovarPlan,
      };
    } catch (e) {
      logPanelNegocioGet("comercial_exception", {
        message: e instanceof Error ? e.message : String(e),
        stack: e instanceof Error ? e.stack : undefined,
      });
      comercial = {
        estado: "basico",
        fechaExpiracion: null,
        diasRestantes: null,
        esPerfilCompletoComercial: false,
        planEstado: "perfil_basico" as const,
        subtitulo: "",
        trialIniciaAt: null,
        trialExpiraAt: null,
        planIniciaAt: null,
        planExpiraAt: null,
        planTipo: null,
        planPeriodicidad: null,
        sugiereRenovarPlan: false,
      };
    }

    const nombreEmp = s(row.nombre_emprendimiento);
    const frase = s(row.frase_negocio);
    const fotoUrl = s(row.foto_principal_url);
    const ig = s(row.instagram);
    const webRow = s(row.sitio_web);

    const empIdForLocales = s(row.id);
    let localesFisicos: Array<{
      comunaSlug: string;
      direccion: string;
      referencia: string;
      esPrincipal: boolean;
    }> = [];
    if (empIdForLocales) {
      try {
        // PostgREST puede requerir especificar FK en el embed (depende del schema cache).
        // Intentamos embed explícito y, si falla, resolvemos comuna_slug por batch lookup.
        const { data: localesRows, error: locErr } = await supabase
          .from("emprendedor_locales")
          .select(
            "direccion, referencia, es_principal, comuna_id, comunas!emprendedor_locales_comuna_fkey(slug)"
          )
          .eq("emprendedor_id", empIdForLocales)
          .order("es_principal", { ascending: false });

        if (locErr) {
          logPanelNegocioGet("locales_error", { message: locErr.message });

          const { data: rows2, error: locErr2 } = await supabase
            .from("emprendedor_locales")
            .select("direccion, referencia, es_principal, comuna_id")
            .eq("emprendedor_id", empIdForLocales)
            .order("es_principal", { ascending: false });

          if (locErr2) {
            logPanelNegocioGet("locales_error_fallback", { message: locErr2.message });
          } else if (Array.isArray(rows2)) {
            const comunaIds = [...new Set(rows2.map((r) => s((r as any).comuna_id)).filter(Boolean))];
            const comunaSlugById = new Map<string, string>();
            if (comunaIds.length > 0) {
              const { data: comRows, error: comErr } = await supabase
                .from("comunas")
                .select("id,slug")
                .in("id", comunaIds as any[]);
              if (comErr) {
                logPanelNegocioGet("locales_comunas_lookup_error", { message: comErr.message });
              } else if (Array.isArray(comRows)) {
                for (const cr of comRows) {
                  const id = s((cr as any).id);
                  const slug = s((cr as any).slug);
                  if (id && slug) comunaSlugById.set(id, slug);
                }
              }
            }
            localesFisicos = rows2.map((r: Record<string, unknown>) => {
              const comunaId = s((r as any).comuna_id);
              return {
                comunaSlug: comunaSlugById.get(comunaId) ?? "",
                direccion: s(r.direccion),
                referencia: r.referencia != null ? s(r.referencia) : "",
                esPrincipal: (r as any).es_principal === true,
              };
            });
          }
        } else if (Array.isArray(localesRows)) {
          localesFisicos = localesRows.map((r: Record<string, unknown>) => {
            const comunas = (r as any).comunas as { slug?: unknown } | null | undefined;
            return {
              comunaSlug: s(comunas?.slug),
              direccion: s(r.direccion),
              referencia: r.referencia != null ? s(r.referencia) : "",
              esPrincipal: (r as any).es_principal === true,
            };
          });
        }
      } catch (e) {
        logPanelNegocioGet("locales_exception", {
          message: e instanceof Error ? e.message : String(e),
        });
      }
    }

    const payload = {
      id: s(row.id),
      slug: s(row.slug),
      nombre: nombreEmp,
      nombre_emprendimiento: nombreEmp,
      comunaBaseNombre,
      categoriaNombre: categoriaNombre || undefined,
      responsable: s(row.nombre_responsable),
      mostrarResponsable: row.mostrar_responsable_publico === true,

      categoriaSlug,
      subcategoriasSlugs,

      comunaBaseSlug: comunaSlug,
      coberturaTipo: ((): "solo_comuna" | "varias_comunas" | "regional" | "nacional" => {
        if (
          coberturaRaw === "comuna" ||
          coberturaRaw === "solo_mi_comuna" ||
          coberturaRaw === "solo_comuna"
        ) {
          return "solo_comuna";
        }
        if (coberturaRaw === "varias_comunas") {
          return "varias_comunas";
        }
        if (
          coberturaRaw === "regional" ||
          coberturaRaw === "varias_regiones"
        ) {
          return "regional";
        }
        if (coberturaRaw === "nacional") {
          return "nacional";
        }
        return "solo_comuna";
      })(),
      comunasCoberturaSlugs:
        coberturaRaw === "varias_comunas"
          ? comunasCoberturaExtrasSlugs
          : [],
      regionesCoberturaSlugs,

      modalidadesAtencion: modalidadesAtencion as any[],

      descripcionCorta: frase,
      descripcionLarga: s(row.descripcion_libre),
      frase_negocio: frase,

      whatsapp: s(row.whatsapp_principal),
      whatsappSecundario: s(row.whatsapp_secundario),
      instagram: ig,
      web: webRow,
      sitio_web: webRow,
      email: s(row.email),

      fotoPrincipalUrl: fotoUrl,
      foto_principal_url: fotoUrl,
      galeriaUrls: galeriaSlots,

      localesFisicos,

      estado_publicacion: s(row.estado_publicacion),

      keywords_usuario_json: row.keywords_usuario_json ?? null,
      keywords_usuario: row.keywords_usuario ?? null,
      palabras_clave: row.palabras_clave ?? null,
    };

    // Si la ficha ya está publicada y existe una postulación activa de edición,
    // el panel debe previsualizar esos cambios sin tocar la capa pública.
    let payloadFinal: Record<string, unknown> = payload;
    try {
      if (activeEdicionPostulacionForPanel) {
        payloadFinal = await mergePanelPayloadWithPostulacion(
          payload as any,
          activeEdicionPostulacionForPanel
        );
      }
    } catch {
      // no bloquear carga de panel
    }

    logPanelGaleriaDiag({
      phase: "after_merge",
      id_from_query: idFromQueryInitial || null,
      id_used_emprendedor: s(row.id),
      access_token_len: accessTokenParam.length,
      /** Solo diagnóstico local; no exponer el token completo en logs. */
      access_token_suffix:
        accessTokenParam.length >= 8
          ? accessTokenParam.slice(-6)
          : null,
      postulacion_id: activeEdicionPostulacionForPanel?.id ?? null,
      estado: activeEdicionPostulacionForPanel?.estado ?? null,
      tipo_postulacion:
        activeEdicionPostulacionForPanel?.tipo_postulacion ?? null,
      updated_at: activeEdicionPostulacionForPanel?.updated_at ?? null,
      post_galeria_urls: activeEdicionPostulacionForPanel?.galeria_urls ?? null,
      post_foto_principal_url:
        activeEdicionPostulacionForPanel?.foto_principal_url ?? null,
      emp_galeria_db_url_count: empGaleriaDbUrlCount,
      galeriaUrls_final: (payloadFinal as { galeriaUrls?: unknown }).galeriaUrls,
    });

    return panelNegocioGetJson({
      item: payloadFinal,
      completitud,
      tipoFicha,
      checklistFaltantes: checklistFaltantes ?? undefined,
      comercial,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[panel/negocio GET] FATAL", {
      message,
      stack,
      id: idTrim || null,
      slug: slugTrim || null,
    });
    return panelNegocioGetJson({
      item: null,
      completitud: null,
      meta: {
        reason: "unexpected_error",
        message,
      },
    });
  }
}

// PUT /api/panel/negocio?id=...
// Tras un guardado válido fuerza estado_publicacion = en_revision y actualiza updated_at.
export async function PUT(req: NextRequest) {
  try {
    const reviewedBy = await getPanelReviewerId(req);
    const url = new URL(req.url);
    const id = s(url.searchParams.get("id"));

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "missing_id", message: "Falta id de emprendedor" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const bodyObj = body as Record<string, unknown>;
    const keywordsPayloadExplicit =
      Object.prototype.hasOwnProperty.call(bodyObj, "keywords_usuario") ||
      Object.prototype.hasOwnProperty.call(bodyObj, "keywordsUsuario");
    const keywords_usuario_list = keywordsPayloadExplicit
      ? normalizeKeywordsUsuarioListFromMixed(
          Object.prototype.hasOwnProperty.call(bodyObj, "keywords_usuario")
            ? bodyObj.keywords_usuario
            : bodyObj.keywordsUsuario
        )
      : null;

    // Si el emprendimiento YA está publicado, toda edición debe ir a postulación (edicion_publicado).
    const { data: empStateRow, error: empStateErr } = await supabase
      .from("emprendedores")
      .select("id, estado_publicacion")
      .eq("id", id)
      .maybeSingle();
    if (empStateErr) {
      return NextResponse.json(
        { ok: false, error: empStateErr.message, message: empStateErr.message },
        { status: 500 }
      );
    }
    const empEstado = s((empStateRow as any)?.estado_publicacion).toLowerCase();
    const activeEditPost = await loadActiveEdicionPublicadoPostulacion(id);

    const nombre = s(body?.nombre);
    const responsable_nombre = s(body?.responsable_nombre);
    const mostrar_responsable = !!body?.mostrar_responsable;

    const categoria_slug = s(body?.categoria_slug);
    const subcategorias_slugs = arr(body?.subcategorias_slugs);

    const taxDbg = s(process.env.PANEL_TAXONOMIA_DEBUG) === "1";
    const taxDbgId = s(process.env.PANEL_TAXONOMIA_DEBUG_EMPRENDEDOR_ID);
    const taxDbgMatch = taxDbg && (!taxDbgId || taxDbgId === id);
    if (taxDbgMatch) {
      // eslint-disable-next-line no-console
      console.log("[panel-taxonomia-debug] payload", {
        emprendedor_id: id,
        categoria_slug,
        subcategorias_slugs,
      });
    }

    const comuna_base_slug = s(body?.comuna_base_slug);
    const cobertura_tipo = s(body?.cobertura_tipo);
    const comunas_cobertura_slugs = arr(body?.comunas_cobertura_slugs);
    const regiones_cobertura_slugs = arr(body?.regiones_cobertura_slugs);

    const modalidades_atencion = arr(body?.modalidades_atencion);

    const descripcion_corta_raw = s(body?.descripcion_corta);
    const descripcion_larga_raw = s(body?.descripcion_larga);
    const descripcion_corta = normalizeDescripcionCorta(descripcion_corta_raw);
    const descripcion_larga = normalizeDescripcionLarga(descripcion_larga_raw);

    const errDesc = [
      ...validateDescripcionCortaPublicacion(descripcion_corta),
      ...validateDescripcionLarga(descripcion_larga),
    ];
    const msgDesc = primeraValidacionDescripcion(errDesc);
    if (msgDesc) {
      return NextResponse.json(
        { ok: false, error: msgDesc, message: msgDesc, errors: errDesc },
        { status: 400 }
      );
    }

    const whatsapp = s(body?.whatsapp);
    const whatsapp_secundario_raw =
      s(body?.whatsapp_secundario) || s(body?.whatsappSecundario);
    const instagram = s(body?.instagram);
    const web = s(body?.web);
    const email = s(body?.email);

    const foto_principal_url_raw = body?.foto_principal_url;
    const foto_principal_url = s(foto_principal_url_raw);
    const galeria_urls = arr(body?.galeria_urls).slice(0, 8);

    const localesInput = Object.prototype.hasOwnProperty.call(body, "locales")
      ? body.locales
      : undefined;

    if (!nombre) {
      return NextResponse.json(
        { ok: false, error: "Nombre obligatorio" },
        { status: 400 }
      );
    }

    if (!comuna_base_slug) {
      return NextResponse.json(
        { ok: false, error: "Falta comuna_base_slug" },
        { status: 400 }
      );
    }

    if (!whatsapp.trim()) {
      return NextResponse.json(
        {
          ok: false,
          error: "whatsapp_obligatorio",
          message: "El WhatsApp es obligatorio.",
        },
        { status: 400 }
      );
    }
    const priWa = normalizeAndValidateChileWhatsappStrict(whatsapp);
    if (!priWa.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "whatsapp_invalido",
          message:
            "WhatsApp principal no válido. Usá 912345678, 56912345678 o +56912345678 (celular chileno, sin dígitos de más).",
        },
        { status: 400 }
      );
    }
    const whatsapp_principal_db = priWa.normalized;

    let whatsapp_secundario_db: string | null = null;
    if (whatsapp_secundario_raw) {
      const secVal = normalizeAndValidateChileWhatsappStrict(whatsapp_secundario_raw);
      if (!secVal.ok) {
        return NextResponse.json(
          {
            ok: false,
            error: "whatsapp_secundario_invalido",
            message:
              "El WhatsApp secundario no es válido (usa un número chileno, ej. +56912345678).",
          },
          { status: 400 }
        );
      }
      if (secVal.normalized === whatsapp_principal_db) {
        return NextResponse.json(
          {
            ok: false,
            error: "whatsapp_secundario_duplicado",
            message: "El WhatsApp secundario no puede ser igual al principal.",
          },
          { status: 400 }
        );
      }
      whatsapp_secundario_db = secVal.normalized;
    }

    const igVal = validateOptionalInstagram(instagram);
    if (!igVal.ok) {
      return NextResponse.json(
        { ok: false, error: "instagram_invalido", message: igVal.message },
        { status: 400 }
      );
    }
    const webVal = validateOptionalWebsite(web);
    if (!webVal.ok) {
      return NextResponse.json(
        { ok: false, error: "web_invalida", message: webVal.message },
        { status: 400 }
      );
    }

    const emailVal = validateRequiredPublicEmail(email);
    if (!emailVal.ok) {
      return NextResponse.json(
        { ok: false, error: "email_invalido", message: emailVal.message },
        { status: 400 }
      );
    }

    const { data: comuna, error: comunaError } = await supabase
      .from("comunas")
      .select("id, slug, region_id")
      .eq("slug", comuna_base_slug)
      .maybeSingle();

    if (comunaError || !comuna) {
      return NextResponse.json(
        { ok: false, error: "Comuna base no encontrada" },
        { status: 400 }
      );
    }

    const comunaRow = comuna as { id: string; slug: string; region_id?: unknown };
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

    const dbCobertura = panelCoberturaToDb(cobertura_tipo);

    let comunasSlugsJson: string[] = [];
    let regionesSlugsJson: string[] = [];

    if (
      dbCobertura === "solo_comuna" ||
      dbCobertura === "solo_mi_comuna" ||
      dbCobertura === "comuna"
    ) {
      comunasSlugsJson = comuna_base_slug ? [comuna_base_slug] : [];
      regionesSlugsJson = [];
    } else if (dbCobertura === "varias_comunas") {
      comunasSlugsJson = dedupeStrings([comuna_base_slug, ...comunas_cobertura_slugs]);
      regionesSlugsJson = [];
    } else if (dbCobertura === "varias_regiones" || dbCobertura === "regional") {
      comunasSlugsJson = [];
      regionesSlugsJson =
        regiones_cobertura_slugs.length > 0
          ? dedupeStrings(regiones_cobertura_slugs)
          : baseRegionSlug
            ? [baseRegionSlug]
            : [];
    } else if (dbCobertura === "nacional") {
      comunasSlugsJson = [];
      regionesSlugsJson = [];
    }

    const comunasCoberturaIds = await comunaIdsFromSlugs(supabase, comunasSlugsJson);

    // --- MODO POSTULACIÓN (negocio publicado / o ya tiene edición activa) ---
    // Guard hard: si hay una postulación activa de edición, jamás tocar tablas publicadas desde panel.
    if (empEstado === "publicado" || Boolean(activeEditPost)) {
      // Normalizar modalidades a formato DB (consistente con aprobación admin)
      const modsUnique = modalidadesAtencionInputsToDbUnique(dedupeStrings(modalidades_atencion));

      // Locales: guardarlos como json en la postulación (si el body los trae)
      let localesJson: unknown = undefined;
      if (localesInput !== undefined) {
        const parsed = parseLocalesPatchInput(localesInput);
        if (parsed === null) {
          return NextResponse.json(
            { ok: false, error: "locales_invalido", message: "Formato de locales inválido." },
            { status: 400 }
          );
        }
        // validación en modo postulación: misma regla que panel (requiere coherencia interna)
        const errL = validateLocalesRules(parsed, { allowEmpty: true, requireNonEmpty: false });
        if (errL) {
          return NextResponse.json(
            { ok: false, error: "locales_invalido", message: errL },
            { status: 400 }
          );
        }
        localesJson = parsed;
      }

      const postPatch: Record<string, unknown> = {
        nombre_emprendimiento: nombre,
        nombre_responsable: responsable_nombre || null,
        mostrar_responsable_publico: mostrar_responsable === true,
        email: emailVal.normalized,
        whatsapp_principal: whatsapp_principal_db,
        whatsapp_secundario: whatsapp_secundario_db,
        frase_negocio: descripcion_corta || null,
        descripcion_libre: descripcion_larga || null,
        instagram: igVal.normalized ? igVal.normalized : null,
        sitio_web: webVal.normalized ? webVal.normalized : null,
        comuna_base_id: comunaRow.id,
        cobertura_tipo: dbCobertura,
        comunas_cobertura: comunasSlugsJson,
        regiones_cobertura: regionesSlugsJson,
        modalidades_atencion: modsUnique,
      };

      if (Object.prototype.hasOwnProperty.call(bodyObj, "galeria_urls")) {
        postPatch.galeria_urls = galeria_urls;
      }

      if (keywordsPayloadExplicit) {
        /** `postulaciones_emprendedores` solo expone `keywords_usuario` (text[]), no `keywords_usuario_json`. */
        postPatch.keywords_usuario = keywords_usuario_list ?? [];
      }

      if (localesJson !== undefined) postPatch.locales = localesJson;

      if (foto_principal_url_raw !== undefined) {
        if (foto_principal_url === "") {
          postPatch.foto_principal_url = null;
        } else if (isPersistibleFotoUrl(foto_principal_url)) {
          postPatch.foto_principal_url = foto_principal_url;
        }
      }

      const postRow = activeEditPost as Record<string, unknown> | null;
      const direccionEff = Object.prototype.hasOwnProperty.call(body, "direccion")
        ? (body as Record<string, unknown>).direccion
        : postRow?.direccion;
      const refEff = Object.prototype.hasOwnProperty.call(
        body,
        "direccion_referencia"
      )
        ? (body as Record<string, unknown>).direccion_referencia
        : postRow?.direccion_referencia;
      const localesEff =
        localesJson !== undefined ? localesJson : postRow?.locales;

      const locPre = await assertPostulacionLocalFisicoUbicacion({
        supabase,
        emprendedorId: id,
        modalidadesDb: modsUnique,
        direccion: direccionEff,
        direccion_referencia: refEff,
        locales: localesEff,
      });
      if (!locPre.ok) {
        return NextResponse.json(
          {
            ok: false,
            error: "local_fisico_sin_ubicacion",
            message: locPre.message,
          },
          { status: 400 }
        );
      }

      const up = await upsertEdicionPublicadoPostulacion(id, postPatch);
      if (!up.ok) {
        return NextResponse.json(
          { ok: false, error: up.message, message: up.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        postulacion_id: up.postulacion_id,
        estado: "pendiente_revision",
        message:
          "Tus cambios fueron guardados como edición pendiente. La ficha pública se actualizará cuando sean aprobados.",
      });
    }

    let categoria: { id: string; slug: string } | null = null;
    let subcats: Array<{ id: string; slug: string; categoria_id: string }> = [];

    if (categoria_slug) {
      const { data: catData, error: categoriaError } = await supabase
        .from("categorias")
        .select("id,slug")
        .eq("slug", categoria_slug)
        .maybeSingle();

      if (categoriaError || !catData) {
        return NextResponse.json(
          { ok: false, error: "Categoría no encontrada" },
          { status: 400 }
        );
      }

      categoria = catData;
    }

    if (subcategorias_slugs.length) {
      const { data, error: subcatsError } = await supabase
        .from("subcategorias")
        .select("id,slug,categoria_id")
        .in("slug", subcategorias_slugs);

      if (subcatsError) {
        return NextResponse.json(
          { ok: false, error: subcatsError.message },
          { status: 400 }
        );
      }

      if (!data || data.length !== subcategorias_slugs.length) {
        return NextResponse.json(
          { ok: false, error: "Una o más subcategorías no existen" },
          { status: 400 }
        );
      }

      subcats = data;

      const uniqueCategoriaIds = [
        ...new Set(subcats.map((sc) => sc.categoria_id)),
      ];
      if (uniqueCategoriaIds.length > 1) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Las subcategorías indicadas pertenecen a más de una categoría. Elige subcategorías de un solo rubro.",
          },
          { status: 400 }
        );
      }

      const effectiveCategoriaId =
        categoria?.id ?? uniqueCategoriaIds[0] ?? null;

      const tax = await validateCategoriaSubcategorias(
        supabase,
        effectiveCategoriaId,
        subcats.map((sc) => sc.id)
      );
      if (!tax.ok) {
        return NextResponse.json(
          { ok: false, error: tax.error },
          { status: 400 }
        );
      }
    }

    const emprendedorUpdate: Record<string, unknown> = {
      nombre_emprendimiento: nombre,
      nombre_responsable: responsable_nombre,
      mostrar_responsable_publico: mostrar_responsable,
      categoria_id: categoria
        ? categoria.id
        : subcats.length > 0
          ? subcats[0].categoria_id
          : null,
      comuna_id: comunaRow.id,
      cobertura_tipo: dbCobertura,
      comunas_cobertura: comunasSlugsJson,
      comunas_cobertura_ids: comunasCoberturaIds,
      regiones_cobertura: regionesSlugsJson,
      frase_negocio: descripcion_corta || null,
      descripcion_libre: descripcion_larga || null,
      whatsapp_principal: whatsapp_principal_db,
      whatsapp_secundario: whatsapp_secundario_db,
      instagram: igVal.normalized ? igVal.normalized : null,
      sitio_web: webVal.normalized ? webVal.normalized : null,
      email: emailVal.normalized,
    };

    if (keywordsPayloadExplicit) {
      emprendedorUpdate.keywords_usuario = keywords_usuario_list ?? [];
      emprendedorUpdate.keywords_usuario_json =
        keywords_usuario_list && keywords_usuario_list.length
          ? keywords_usuario_list
          : null;
    }

    if (foto_principal_url_raw !== undefined) {
      if (foto_principal_url === "") {
        emprendedorUpdate.foto_principal_url = null;
      } else if (isPersistibleFotoUrl(foto_principal_url)) {
        emprendedorUpdate.foto_principal_url = foto_principal_url;
      }
    }

    const { error: updateError } = await supabase
      .from("emprendedores")
      .update(emprendedorUpdate)
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        { ok: false, error: updateError.message },
        { status: 500 }
      );
    }

    const { error: delComunasErr } = await supabase
      .from("emprendedor_comunas_cobertura")
      .delete()
      .eq("emprendedor_id", id);
    if (delComunasErr) {
      return NextResponse.json(
        { ok: false, error: delComunasErr.message },
        { status: 500 }
      );
    }
    /** Pivote: en varias comunas solo comunas adicionales (la base vive en `emprendedores.comuna_id`). */
    const slugsForComunasPivot =
      dbCobertura === "varias_comunas"
        ? dedupeStrings(comunas_cobertura_slugs)
        : comunasSlugsJson;

    if (slugsForComunasPivot.length) {
      const { data: comunaRows } = await supabase
        .from("comunas")
        .select("id, slug")
        .in("slug", dedupeStrings(slugsForComunasPivot));
      const comunaInsRaw = (comunaRows ?? [])
        .map((r) => ({
          emprendedor_id: id,
          comuna_id: s((r as { id?: unknown }).id),
        }))
        .filter((row) => row.comuna_id);
      const comunaByKey = new Map<
        string,
        { emprendedor_id: string; comuna_id: string }
      >();
      for (const row of comunaInsRaw) {
        comunaByKey.set(pivotIdKey(row.comuna_id), row);
      }
      let comunaIns = [...comunaByKey.values()];
      if (dbCobertura === "varias_comunas") {
        const baseKey = pivotIdKey(comunaRow.id);
        comunaIns = comunaIns.filter(
          (row) => pivotIdKey(row.comuna_id) !== baseKey
        );
      }
      if (comunaIns.length) {
        const { error: insComunasErr } = await supabase
          .from("emprendedor_comunas_cobertura")
          .upsert(comunaIns, {
            onConflict: "emprendedor_id,comuna_id",
            ignoreDuplicates: true,
          });
        if (insComunasErr) {
          return NextResponse.json(
            { ok: false, error: insComunasErr.message },
            { status: 500 }
          );
        }
      }
    }

    const { error: delRegErr } = await supabase
      .from("emprendedor_regiones_cobertura")
      .delete()
      .eq("emprendedor_id", id);
    if (delRegErr) {
      return NextResponse.json(
        { ok: false, error: delRegErr.message },
        { status: 500 }
      );
    }
    if (regionesSlugsJson.length) {
      const { data: regionRows } = await supabase
        .from("regiones")
        .select("id, slug")
        .in("slug", dedupeStrings(regionesSlugsJson));
      const regionInsRaw = (regionRows ?? [])
        .map((r) => ({
          emprendedor_id: id,
          region_id: s((r as { id?: unknown }).id),
        }))
        .filter((row) => row.region_id);
      const regionByKey = new Map<
        string,
        { emprendedor_id: string; region_id: string }
      >();
      for (const row of regionInsRaw) {
        regionByKey.set(pivotIdKey(row.region_id), row);
      }
      const regionIns = [...regionByKey.values()];
      if (regionIns.length) {
        const { error: insRegErr } = await supabase
          .from("emprendedor_regiones_cobertura")
          .upsert(regionIns, {
            onConflict: "emprendedor_id,region_id",
            ignoreDuplicates: true,
          });
        if (insRegErr) {
          return NextResponse.json(
            { ok: false, error: insRegErr.message },
            { status: 500 }
          );
        }
      }
    }

    const { error: delModErr } = await supabase
      .from("emprendedor_modalidades")
      .delete()
      .eq("emprendedor_id", id);
    if (delModErr) {
      return NextResponse.json(
        { ok: false, error: delModErr.message },
        { status: 500 }
      );
    }
    const rawMods = dedupeStrings(modalidades_atencion);
    const invalidMods = rawMods.filter((m) => {
      const t = s(m);
      if (!t) return false;
      return modalidadAtencionInputToDb(t) === null;
    });
    if (invalidMods.length) {
      return NextResponse.json(
        {
          ok: false,
          error: "modalidad_invalida",
          message: `Modalidad inválida: ${invalidMods.join(", ")}`,
        },
        { status: 400 }
      );
    }
    const modalidadesUnique = modalidadesAtencionInputsToDbUnique(rawMods);
    if (modalidadesUnique.length) {
      const modByKey = new Map<
        string,
        { emprendedor_id: string; modalidad: string }
      >();
      for (const m of modalidadesUnique) {
        modByKey.set(pivotIdKey(m), {
          emprendedor_id: id,
          modalidad: m,
        });
      }
      const modIns = [...modByKey.values()];
      const { error: insModErr } = await supabase
        .from("emprendedor_modalidades")
        .upsert(modIns, {
          onConflict: "emprendedor_id,modalidad",
          ignoreDuplicates: true,
        });
      if (insModErr) {
        return NextResponse.json(
          { ok: false, error: insModErr.message },
          { status: 500 }
        );
      }
    }

    const hasLocalFisico = modalidadesUnique.includes("local_fisico");

    const { data: empComercialRow } = await supabase
      .from("emprendedores")
      .select("plan_activo, plan_expira_at, trial_expira_at, trial_expira")
      .eq("id", id)
      .maybeSingle();
    const comercialLoc = (empComercialRow ?? {}) as Record<string, unknown>;
    const exigeDirLocalFisico = requiereDireccionSiModalidadLocalFisico({
      planActivo: comercialLoc.plan_activo === true,
      planExpiraAt: s(comercialLoc.plan_expira_at) || null,
      trialExpiraAt: s(comercialLoc.trial_expira_at) || null,
      trialExpira: s(comercialLoc.trial_expira) || null,
    });

    async function clearEmprendedorLocalesOr500(): Promise<NextResponse | null> {
      const rep = await replaceEmprendedorLocales(supabase, id, []);
      if (!rep.ok) {
        return NextResponse.json(
          { ok: false, error: rep.message },
          { status: 500 }
        );
      }
      return null;
    }

    if (!Object.prototype.hasOwnProperty.call(body, "locales")) {
      if (!hasLocalFisico) {
        const locErrResp = await clearEmprendedorLocalesOr500();
        if (locErrResp) return locErrResp;
      }
    } else {
      const parsedL = parseLocalesPatchInput(body.locales);
      if (parsedL === null) {
        return NextResponse.json(
          {
            ok: false,
            error: "locales_invalido",
            message: "Formato de locales inválido.",
          },
          { status: 400 }
        );
      }
      if (!hasLocalFisico) {
        const locErrResp = await clearEmprendedorLocalesOr500();
        if (locErrResp) return locErrResp;
      } else {
        const errL = validateLocalesRules(parsedL, {
          allowEmpty: !exigeDirLocalFisico,
          requireNonEmpty: exigeDirLocalFisico,
        });
        if (errL) {
          return NextResponse.json(
            { ok: false, error: "locales_invalido", message: errL },
            { status: 400 }
          );
        }
        const resolved = await resolveLocalesComunaIds(supabase, parsedL);
        if (!resolved.ok) {
          return NextResponse.json(
            {
              ok: false,
              error: "locales_invalido",
              message: resolved.message,
            },
            { status: 400 }
          );
        }
        const rep = await replaceEmprendedorLocales(supabase, id, resolved.rows);
        if (!rep.ok) {
          return NextResponse.json(
            { ok: false, error: rep.message },
            { status: 500 }
          );
        }
        const baseId = await principalComunaBaseIdFromLocales(supabase, parsedL);
        const locEmp: Record<string, unknown> = {};
        if (baseId != null) {
          locEmp.comuna_id = baseId;
        }
        if (Object.keys(locEmp).length > 0) {
          const { error: locEmpErr } = await supabase
            .from("emprendedores")
            .update(locEmp)
            .eq("id", id);
          if (locEmpErr) {
            return NextResponse.json(
              { ok: false, error: locEmpErr.message },
              { status: 500 }
            );
          }
        }
      }
    }

    const { error: delGalErr } = await supabase
      .from("emprendedor_galeria")
      .delete()
      .eq("emprendedor_id", id);
    if (delGalErr) {
      return NextResponse.json(
        { ok: false, error: delGalErr.message },
        { status: 500 }
      );
    }
    if (galeria_urls.length) {
      const galIns = galeria_urls.map((url) => ({
        emprendedor_id: id,
        imagen_url: url,
      }));
      const { error: insGalErr } = await supabase
        .from("emprendedor_galeria")
        .insert(galIns);
      if (insGalErr) {
        return NextResponse.json(
          { ok: false, error: insGalErr.message },
          { status: 500 }
        );
      }
    }

    const { error: deleteRelError } = await supabase
      .from("emprendedor_subcategorias")
      .delete()
      .eq("emprendedor_id", id);

    if (deleteRelError) {
      return NextResponse.json(
        { ok: false, error: deleteRelError.message },
        { status: 500 }
      );
    }

    if (subcats.length) {
      const subcatsDedup = [
        ...new Map(
          subcats.map((sc) => [pivotIdKey(sc.id), sc] as const)
        ).values(),
      ];
      const rows = subcatsDedup.map((sc) => ({
        emprendedor_id: id,
        subcategoria_id: sc.id,
      }));

      const { error: insertRelError } = await supabase
        .from("emprendedor_subcategorias")
        .upsert(rows, {
          onConflict: "emprendedor_id,subcategoria_id",
          ignoreDuplicates: true,
        });

      if (insertRelError) {
        return NextResponse.json(
          { ok: false, error: insertRelError.message },
          { status: 500 }
        );
      }

      await learnFromManualClassification(supabase, id, subcatsDedup[0].id, {
        reviewedBy,
      }).catch(() => {});
    }

    if (taxDbgMatch) {
      const { data: piv, error: pivErr } = await supabase
        .from("emprendedor_subcategorias")
        .select("subcategoria_id")
        .eq("emprendedor_id", id)
        .order("subcategoria_id", { ascending: true });
      // eslint-disable-next-line no-console
      console.log("[panel-taxonomia-debug] pivot_after", {
        emprendedor_id: id,
        error: pivErr ? s(pivErr.message) : null,
        subcategoria_ids: (piv ?? []).map((r: { subcategoria_id?: unknown }) =>
          s(r.subcategoria_id)
        ),
      });
    }

    const nowIso = new Date().toISOString();
    const { error: estadoErr } = await supabase
      .from("emprendedores")
      .update({
        estado_publicacion: ESTADO_PUBLICACION.en_revision,
        updated_at: nowIso,
      })
      .eq("id", id);

    if (estadoErr) {
      return NextResponse.json(
        { ok: false, error: estadoErr.message },
        { status: 500 }
      );
    }

    syncEmprendedorToAlgoliaWithSupabase(supabase, String(id)).catch(() => {});

    return NextResponse.json({
      ok: true,
      estado: ESTADO_PUBLICACION.en_revision,
      message: MSG_FICHA_ENVIADA_REVISION,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: "unexpected_error",
        message: err instanceof Error ? err.message : "Error inesperado",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH parcial: solo `foto_principal_url` y/o `galeria_urls`.
 * No exige el resto del formulario (a diferencia del PUT completo).
 */
export async function PATCH(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = s(url.searchParams.get("id"));
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "missing_id", message: "Falta id de emprendedor" },
        { status: 400 }
      );
    }

    const body = (await req.json()) as Record<string, unknown>;
    const patchFoto = Object.prototype.hasOwnProperty.call(
      body,
      "foto_principal_url"
    );
    const patchGal = Object.prototype.hasOwnProperty.call(body, "galeria_urls");
    if (!patchFoto && !patchGal) {
      return NextResponse.json(
        {
          ok: false,
          error: "empty_patch",
          message: "Nada que actualizar",
        },
        { status: 400 }
      );
    }

    const { data: exists, error: exErr } = await supabase
      .from("emprendedores")
      .select("id, estado_publicacion")
      .eq("id", id)
      .maybeSingle();

    if (exErr) {
      return NextResponse.json(
        { ok: false, error: exErr.message, message: exErr.message },
        { status: 500 }
      );
    }
    if (!exists) {
      return NextResponse.json(
        {
          ok: false,
          error: "not_found",
          message: "Emprendedor no encontrado",
        },
        { status: 404 }
      );
    }

    const empEstado = s((exists as any).estado_publicacion).toLowerCase();
    const activeEditPost = await loadActiveEdicionPublicadoPostulacion(id);

    // Si ya está publicado, el patch de media debe ir a postulación de edición (no tocar publicado).
    // Guard hard: si hay una postulación activa de edición, jamás tocar tablas publicadas desde panel.
    if (empEstado === "publicado" || Boolean(activeEditPost)) {
      const postPatch: Record<string, unknown> = {};
      if (patchFoto) {
        const foto = s(body.foto_principal_url);
        if (foto === "") {
          postPatch.foto_principal_url = null;
        } else if (isPersistibleFotoUrl(foto)) {
          postPatch.foto_principal_url = foto;
        } else {
          return NextResponse.json(
            {
              ok: false,
              error: "foto_invalida",
              message: "La URL de la foto no es válida para guardar",
            },
            { status: 400 }
          );
        }
      }
      if (patchGal) {
        const rawList = Array.isArray(body.galeria_urls) ? body.galeria_urls : [];
        const urls = dedupeStrings(arr(rawList).filter((u) => isPersistibleFotoUrl(u))).slice(0, 8);
        postPatch.galeria_urls = urls;
      }
      const up = await upsertEdicionPublicadoPostulacion(id, postPatch);
      if (!up.ok) {
        return NextResponse.json(
          { ok: false, error: up.message, message: up.message },
          { status: 500 }
        );
      }
      return NextResponse.json({
        ok: true,
        postulacion_id: up.postulacion_id,
        estado: "pendiente_revision",
        message:
          "Tus cambios fueron guardados como edición pendiente. La ficha pública se actualizará cuando sean aprobados.",
      });
    }

    const emprendedorUpdate: Record<string, unknown> = {};
    if (patchFoto) {
      const foto = s(body.foto_principal_url);
      if (foto === "") {
        emprendedorUpdate.foto_principal_url = null;
      } else if (isPersistibleFotoUrl(foto)) {
        emprendedorUpdate.foto_principal_url = foto;
      } else {
        return NextResponse.json(
          {
            ok: false,
            error: "foto_invalida",
            message: "La URL de la foto no es válida para guardar",
          },
          { status: 400 }
        );
      }
    }

    if (Object.keys(emprendedorUpdate).length > 0) {
      const { error: upErr } = await supabase
        .from("emprendedores")
        .update(emprendedorUpdate)
        .eq("id", id);
      if (upErr) {
        return NextResponse.json(
          { ok: false, error: upErr.message, message: upErr.message },
          { status: 500 }
        );
      }
    }

    if (patchGal) {
      const rawList = Array.isArray(body.galeria_urls) ? body.galeria_urls : [];
      const urls = dedupeStrings(
        arr(rawList).filter((u) => isPersistibleFotoUrl(u))
      ).slice(0, 8);

      const { error: delGalErr } = await supabase
        .from("emprendedor_galeria")
        .delete()
        .eq("emprendedor_id", id);
      if (delGalErr) {
        return NextResponse.json(
          {
            ok: false,
            error: delGalErr.message,
            message: delGalErr.message,
          },
          { status: 500 }
        );
      }
      if (urls.length) {
        const galIns = urls.map((imagen_url) => ({
          emprendedor_id: id,
          imagen_url,
        }));
        const { error: insGalErr } = await supabase
          .from("emprendedor_galeria")
          .insert(galIns);
        if (insGalErr) {
          return NextResponse.json(
            {
              ok: false,
              error: insGalErr.message,
              message: insGalErr.message,
            },
            { status: 500 }
          );
        }
      }
    }

    const nowPatch = new Date().toISOString();
    const { error: estadoPatchErr } = await supabase
      .from("emprendedores")
      .update({
        estado_publicacion: ESTADO_PUBLICACION.en_revision,
        updated_at: nowPatch,
      })
      .eq("id", id);

    if (estadoPatchErr) {
      return NextResponse.json(
        { ok: false, error: estadoPatchErr.message, message: estadoPatchErr.message },
        { status: 500 }
      );
    }

    syncEmprendedorToAlgoliaWithSupabase(supabase, String(id)).catch(() => {});

    return NextResponse.json({
      ok: true,
      estado: ESTADO_PUBLICACION.en_revision,
      message: MSG_FICHA_ENVIADA_REVISION,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: "unexpected_error",
        message: err instanceof Error ? err.message : "Error inesperado",
      },
      { status: 500 }
    );
  }
}
