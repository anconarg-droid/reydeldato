import { createSupabaseServerPublicClient } from "@/lib/supabase/server";
import { fetchGaleriaImagenesUrlsPublicas } from "@/lib/emprendedorGaleriaPivot";
import { pareceUuidEmprendedor } from "@/lib/emprendedorLookupParam";
import {
  planPeriodicidadDesdeEmprendedorRow,
  planTipoComercialDesdeEmprendedorRow,
} from "@/lib/emprendedorPlanCamposCompat";
import { direccionCallePrincipalDesdeLocales } from "@/lib/emprendedorLocalesFichaPublica";

function arr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => (x == null ? "" : String(x).trim()))
    .filter(Boolean);
}

function s(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

/** Slug en URL: trim + un solo decode si venía con % (Next suele decodificar, pero evita rarezas). */
function normalizeSlugParam(raw: string): string {
  let t = s(raw);
  if (!t) return "";
  try {
    const once = decodeURIComponent(t);
    if (once && once !== t) t = s(once);
  } catch {
    /* mantener t */
  }
  return t;
}

/** Solo caracteres típicos de slug (evita `%`/`_` en ILIKE). */
function slugPareceSeguroParaIlike(t: string): boolean {
  return /^[a-zA-Z0-9._-]+$/.test(t);
}

function b(v: unknown): boolean {
  return v === true;
}

/** Select mínimo (diagnóstico + ids para similares). Debe coincidir con lo pedido en ficha-debug. */
const EMPRENDEDOR_PUBLICO_SELECT_MIN = `
  id,
  slug,
  nombre_emprendimiento,
  estado_publicacion,
  comuna_id,
  categoria_id,
  cobertura_tipo
`;

export async function getEmprendedorPublicoBySlug(slug: string) {
  // Público: solo anon + vista pública (sin service_role).
  const supabase = createSupabaseServerPublicClient();
  const cleanSlug = normalizeSlugParam(slug);
  if (!cleanSlug) return null;

  const fichaDebug =
    process.env.NODE_ENV === "development" ||
    process.env.LOG_FICHA_DEBUG === "1";

  // 1a) Fila mínima: por `slug` o por `id` (UUID en URL, p. ej. panel → ficha).
  const minQuery = () =>
    supabase
      .from("vw_emprendedores_publico")
      .select(EMPRENDEDOR_PUBLICO_SELECT_MIN)
      .eq("estado_publicacion", "publicado");

  let dataMin: Record<string, unknown> | null = null;
  let errorMin: { message?: string } | null = null;

  if (pareceUuidEmprendedor(cleanSlug)) {
    const r = await minQuery().eq("id", cleanSlug).maybeSingle();
    dataMin = (r.data as Record<string, unknown> | null) ?? null;
    errorMin = r.error;
  } else {
    const rEq = await minQuery().eq("slug", cleanSlug).maybeSingle();
    if (!rEq.error && rEq.data) {
      dataMin = rEq.data as Record<string, unknown>;
      errorMin = rEq.error;
    } else if (slugPareceSeguroParaIlike(cleanSlug)) {
      const rIl = await minQuery().ilike("slug", cleanSlug).maybeSingle();
      dataMin = (rIl.data as Record<string, unknown> | null) ?? null;
      errorMin = rIl.error;
    } else {
      dataMin = (rEq.data as Record<string, unknown> | null) ?? null;
      errorMin = rEq.error;
    }
  }

  if (fichaDebug) {
    console.log("[ficha-debug] slug", slug);
    console.log("[ficha-debug] data", dataMin);
    console.log("[ficha-debug] error", errorMin);
  }

  if (errorMin || !dataMin) return null;

  const idMin = (dataMin as Record<string, unknown>).id ?? null;
  if (idMin == null) return null;

  // 1b) Ficha pública completa desde vista (evita exponer columnas sensibles).
  const { data, error } = await supabase
    .from("vw_emprendedores_publico")
    .select("*")
    .eq("id", idMin)
    .eq("estado_publicacion", "publicado")
    .maybeSingle();

  const row = (error || !data ? dataMin : data) as Record<string, unknown>;
  const id = row.id ?? null;

  const comunaRefId = row.comuna_id ?? row.comuna_base_id;

  let comunaNombre = "";
  let comunaSlug = "";
  let regionId: number | null = null;
  let regionNombre = "";
  let regionSlug = "";

  if (comunaRefId != null) {
    const { data: comunaRow } = await supabase
      .from("comunas")
      .select("id, nombre, slug, region_id")
      .eq("id", comunaRefId)
      .maybeSingle();

    if (comunaRow) {
      comunaNombre = s((comunaRow as any).nombre);
      comunaSlug = s((comunaRow as any).slug);
      regionId = Number((comunaRow as any).region_id ?? null);

      if (regionId) {
        const { data: regionRow } = await supabase
          .from("regiones")
          .select("id, nombre, slug")
          .eq("id", regionId)
          .maybeSingle();

        if (regionRow) {
          regionNombre = s((regionRow as any).nombre);
          regionSlug = s((regionRow as any).slug);
        }
      }
    }
  }

  // 3) Categoría
  let categoriaNombre = "";
  let categoriaSlug = "";

  if (row.categoria_id != null) {
    const { data: categoriaRow } = await supabase
      .from("categorias")
      .select("id, nombre, slug")
      .eq("id", row.categoria_id)
      .maybeSingle();

    if (categoriaRow) {
      categoriaNombre = s((categoriaRow as any).nombre);
      categoriaSlug = s((categoriaRow as any).slug);
    }
  }

  const subcategoriasNombresArr = arr(row.subcategorias_nombres_arr);
  const subcategoriasSlugsArr = arr(row.subcategorias_slugs);
  // Fuente de verdad: subcategoria_slug_final. No usar arrays para definir "principal".
  const principalSubSlug = s(row.subcategoria_slug_final);
  let principalSubNombre = "";
  if (principalSubSlug) {
    const { data: subRow } = await supabase
      .from("subcategorias")
      .select("nombre")
      .eq("slug", principalSubSlug)
      .limit(1)
      .maybeSingle();
    principalSubNombre = s((subRow as { nombre?: unknown } | null)?.nombre);
  }

  const modalidadesAtencionArr = arr(row.modalidades_atencion_arr);
  const idStr = id != null ? s(id) : "";
  const galeriaUrlsArr = idStr
    ? await fetchGaleriaImagenesUrlsPublicas(supabase, idStr)
    : [];

  const coberturaComunasArr = arr(row.comunas_cobertura_nombres_arr);
  const coberturaComunasSlugsArr = arr(row.comunas_cobertura_slugs_arr);

  const coberturaRegionesArr = arr(row.regiones_cobertura_nombres_arr);
  const coberturaRegionesSlugsArr = arr(row.regiones_cobertura_slugs_arr);

  const localesFicha = Array.isArray(row.locales) ? (row.locales as any[]) : [];
  const direccionPublica = direccionCallePrincipalDesdeLocales(localesFicha);

  return {
    id: row.id ?? null,
    slug: s(row.slug),
    nombre: s(row.nombre_emprendimiento),
    /** Nombre tal cual en BD (para respetar mayúsculas/tildes en copys). */
    nombre_emprendimiento: s(row.nombre_emprendimiento),

    descripcion_corta: s(row.descripcion_corta || row.frase_negocio),
    descripcion_larga: s(row.descripcion_larga || row.descripcion_libre),
    frase_negocio: s(row.frase_negocio),

    categoria_id: row.categoria_id ?? null,
    categoria_nombre: categoriaNombre,
    categoria_slug: categoriaSlug,
    categoria_slug_final: s(row.categoria_slug_final),

    subcategorias_nombres_arr: subcategoriasNombresArr,
    subcategorias_slugs_arr: subcategoriasSlugsArr,

    subcategoria_principal_nombre: principalSubNombre,
    subcategoria_principal_slug: principalSubSlug,
    subcategorias_slugs: arr(row.subcategorias_slugs).length
      ? arr(row.subcategorias_slugs)
      : subcategoriasSlugsArr,
    subcategoria_slug_final: s(row.subcategoria_slug_final),

    comuna_id: row.comuna_id ?? row.comuna_base_id ?? null,
    comuna_base_id: row.comuna_id ?? row.comuna_base_id ?? null,
    comuna_nombre: comunaNombre,
    comuna_slug: comunaSlug,

    region_id: regionId,
    region_nombre: regionNombre,
    region_slug: regionSlug,

    cobertura_tipo: s(row.cobertura_tipo),
    cobertura_comunas_arr: coberturaComunasArr,
    cobertura_comunas_slugs_arr: coberturaComunasSlugsArr,
    comunas_cobertura: coberturaComunasArr,

    cobertura_regiones_arr: coberturaRegionesArr,
    cobertura_regiones_slugs_arr: coberturaRegionesSlugsArr,
    regiones_cobertura_nombres_arr: coberturaRegionesArr,
    regiones_cobertura_slugs_arr: coberturaRegionesSlugsArr,

    modalidad_atencion: modalidadesAtencionArr,
    modalidades_atencion_arr: modalidadesAtencionArr,
    modalidades_atencion: modalidadesAtencionArr,

    whatsapp: s(row.whatsapp_principal),
    whatsapp_secundario: s(row.whatsapp_secundario),
    instagram: s(row.instagram),
    sitio_web: s(row.sitio_web),
    /** Vista pública: solo viene si `mostrar_responsable_publico` en BD. */
    responsable_nombre: s(row.nombre_responsable),
    mostrar_responsable: Boolean(s(row.nombre_responsable)),
    direccion: direccionPublica,
    /** Alias / columna alternativa en algunas BDs o APIs; misma cadena resuelta que `direccion`. */
    direccion_local: direccionPublica,

    foto_principal_url: s(row.foto_principal_url),
    galeria_urls_arr: galeriaUrlsArr,

    estado_publicacion: s(row.estado_publicacion),
    destacado: b(row.destacado),
    updated_at: row.updated_at ?? null,

    plan: s(row.plan),
    trial_expira: row.trial_expira ?? row.trial_expira_at ?? null,
    created_at: row.created_at ?? null,
    trial_inicia_at: row.trial_inicia_at ?? null,
    trial_expira_at: row.trial_expira_at ?? row.trial_expira ?? null,
    plan_tipo: planTipoComercialDesdeEmprendedorRow(row),
    plan_periodicidad: planPeriodicidadDesdeEmprendedorRow(row),
    plan_activo: row.plan_activo === true,
    plan_inicia_at: row.plan_inicia_at ?? null,
    plan_expira_at: row.plan_expira_at ?? null,

    tipo_actividad: (row.tipo_actividad as string) ?? null,
    sector_slug: s(row.sector_slug) || null,
    tags_slugs: arr(row.tags_slugs).length ? arr(row.tags_slugs) : null,
    clasificacion_confianza:
      row.clasificacion_confianza != null
        ? Number(row.clasificacion_confianza)
        : null,

    keywords: arr(row.keywords).length ? arr(row.keywords) : arr(row.palabras_clave),
    keywords_finales: arr(row.keywords_finales),

    // aliases temporales
    web: s(row.sitio_web),
    nivel_cobertura: s(row.cobertura_tipo),
    comunas_cobertura_nombres_arr: coberturaComunasArr,
    galeria_urls: galeriaUrlsArr,
    comuna_base_nombre: comunaNombre,
    comuna_base_slug: comunaSlug,

    locales: localesFicha,
  };
}

