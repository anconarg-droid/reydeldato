import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TrackedActionButton from "./TrackedActionButton";
import TrackView from "@/components/TrackView";
import BackLink from "@/components/BackLink";
import SimilaresFichaSection from "@/components/cards/SimilaresFichaSection";
import FichaHero from "@/components/emprendedor/FichaHero";
import FichaDestacados from "@/components/emprendedor/FichaDestacados";
import {
  buildWhatsappUrl,
  buildWhatsappUrlWithPrefill,
  buildInstagramUrl,
  buildWebsiteUrl,
  formatInstagramDisplay,
  formatWebsiteDisplay,
  formatWhatsappDisplay,
  publicWhatsappSecundarioParaFicha,
} from "@/lib/formatPublicLinks";
import { coberturaTexto, normalizeCoberturaTipoDb } from "@/lib/cobertura";
import {
  fichaPublicaEsMejoradaDesdeItem,
} from "@/lib/estadoFicha";
import {
  clampDescripcionCortaFichaDisplay,
  comoAtiendeFlags,
  perfilCompletoIncluyeLineas,
  TEXTO_FICHA_BASICA_AVISO,
  textoResumenListadoEmprendedor,
} from "@/lib/emprendedorFichaUi";
import { displayTitleCaseWords } from "@/lib/displayTextFormat";
import { getBloqueUbicacionFicha } from "@/lib/getContextoUbicacion";
import { getEmprendedorPublicoBySlug } from "@/lib/getEmprendedorPublicoBySlug";
import {
  direccionCallePrincipalDesdeLocales,
  lineaChecklistDireccionLocales,
  sortLocalesFichaPrincipalPrimero,
} from "@/lib/emprendedorLocalesFichaPublica";
import {
  getComunaDirectorioNavegable,
  getRegionSlugForComunaSlug,
} from "@/lib/comunaDirectorioNavegable";
import {
  filtrarSimilaresSinRuido,
  getSimilaresFicha,
} from "@/lib/getSimilaresFicha";
import { emprendedorFichaVisiblePublicamente } from "@/lib/estadoPublicacion";
import { normalizeText } from "@/lib/search/normalizeText";
import { slugify } from "@/lib/slugify";
import {
  formatComunaRegion,
  getPlaceholderSinFotoSub,
  getPlaceholderSinFotoTitulo,
} from "@/lib/productRules";
import {
  buildDescripcionFallback,
  buildSubtituloFicha,
  limpiarTexto,
} from "@/lib/emprendedorProfileCopy";
import {
  DESCRIPCION_CORTA_MAX,
  DESCRIPCION_CORTA_MIN,
  normalizeDescripcionCorta,
} from "@/lib/descripcionProductoForm";
import {
  getCategoriaCompacta,
  getLineaTaxonomiaCard,
} from "@/lib/search/emprendedorSearchCardHelpers";

export const dynamic = "force-dynamic";

function capitalizeFirstLetterForDisplay(input: string): string {
  const t = String(input ?? "");
  if (!t) return t;
  // Capitaliza el primer caracter alfabético (respeta espacios/guiones iniciales).
  const idx = t.search(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/);
  if (idx < 0) return t;
  const ch = t[idx] ?? "";
  const upper = ch.toLocaleUpperCase("es-CL");
  if (upper === ch) return t;
  return t.slice(0, idx) + upper + t.slice(idx + 1);
}

type Emprendedor = {
  id?: string | number | null;
  slug: string;
  nombre: string;
  /** Alias BD / panel (mismo valor que `nombre` en muchas filas). */
  nombre_emprendimiento?: string | null;
  descripcion_corta?: string;
  descripcion_larga?: string;

  categoria_id?: string | number | null;
  categoria_nombre?: string;
  categoria_slug?: string;
  subcategorias_nombres_arr?: string[];
  subcategorias_slugs_arr?: string[];

  comuna_id?: string | number | null;
  comuna_base_id?: string | number | null;
  comuna_nombre?: string;
  comuna_slug?: string;
  region_id?: string | number | null;
  region_nombre?: string;
  region_slug?: string;

  cobertura_tipo?: string;
  cobertura_comunas_arr?: string[];
  cobertura_comunas_slugs_arr?: string[];
  cobertura_regiones_arr?: string[];
  cobertura_regiones_slugs_arr?: string[];
  regiones_cobertura_nombres_arr?: string[];
  regiones_cobertura_slugs_arr?: string[];

  modalidades_atencion_arr?: string[];

  foto_principal_url?: string;
  galeria_urls_arr?: string[];

  whatsapp?: string;
  whatsapp_principal?: string | null;
  /** Segundo número; solo ficha pública, no cards de búsqueda. */
  whatsapp_secundario?: string | null;
  instagram?: string;
  sitio_web?: string;
  email?: string;
  /** Teléfono distinto a WhatsApp, si existe en BD. */
  telefono?: string | null;

  responsable_nombre?: string;
  mostrar_responsable?: boolean;

  direccion?: string;
  /** Solo desde `emprendedor_locales` (calles); sin columna legacy en `emprendedores`. */
  direccion_local?: string;

  estado_publicacion?: string;
  destacado?: boolean;
  updated_at?: string | null;

  web?: string;
  nivel_cobertura?: string;
  comunas_cobertura_nombres_arr?: string[];
  modalidades_atencion?: string[];
  galeria_urls?: string[];
  comuna_base_nombre?: string;
  comuna_base_slug?: string;

  plan?: string;
  trial_expira?: string | null;
  trial_inicia_at?: string | null;
  trial_expira_at?: string | null;
  created_at?: string | null;
  plan_tipo?: string | null;
  plan_periodicidad?: string | null;
  plan_activo?: boolean | null;
  plan_inicia_at?: string | null;
  plan_expira_at?: string | null;

  tipo_actividad?: string | null;
  sector_slug?: string | null;
  tags_slugs?: string[] | null;
  clasificacion_confianza?: number | null;

  subcategoria_principal_nombre?: string;
  subcategoria_principal_slug?: string;
  subcategorias_slugs?: string[];
  categoria_slug_final?: string;
  subcategoria_slug_final?: string;
  keywords_finales?: string[];
  keywords?: string[];
  modalidad_atencion?: string[];
  comunas_cobertura?: string[];

  /** Alias BD (descripción larga / frase corta comercial) */
  descripcion_libre?: string;
  frase_negocio?: string;
  cobertura_label?: string;
  cobertura_tipo_label?: string;

  locales?: {
    nombre_local: string | null;
    direccion: string;
    referencia?: string;
    comuna_nombre: string;
    comuna_slug: string;
    es_principal: boolean;
    lat?: number | null;
    lng?: number | null;
  }[];
};

function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function arr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => (x == null ? "" : String(x).trim())).filter(Boolean);
}

function numCoord(v: unknown): number | undefined {
  if (v == null) return undefined;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = parseFloat(String(v).trim().replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}

function normalizeSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
    "http://localhost:3000"
  );
}

async function getEmprendedor(slug: string): Promise<Emprendedor | null> {
  const item = await getEmprendedorPublicoBySlug(slug);
  return item as Emprendedor | null;
}

/**
 * Listado en `/[comuna]`: navegación estructurada sin mezclar `q`.
 * Prioridad en URL: `subcategoria` > `categoria` > `q` (solo uno a la vez).
 */
function hrefListadoComunaConBusqueda(
  comunaSlug: string,
  opts: { subcategoriaSlug?: string; categoriaSlug?: string; qNorm?: string }
): string {
  const comuna = slugify(s(comunaSlug));
  if (!comuna) return "/";
  const sp = new URLSearchParams();
  const subRaw = s(opts.subcategoriaSlug);
  const subNorm = subRaw ? slugify(subRaw) : "";
  const catRaw = s(opts.categoriaSlug);
  const catNorm = catRaw ? slugify(catRaw) : "";
  const qN = s(opts.qNorm);
  if (subNorm) {
    sp.set("subcategoria", subNorm);
  } else if (catNorm) {
    sp.set("categoria", catNorm);
  } else if (qN) {
    sp.set("q", qN);
  }
  const qs = sp.toString();
  return qs ? `/${encodeURIComponent(comuna)}?${qs}` : `/${encodeURIComponent(comuna)}`;
}

/** Ruta canónica de exploración por comuna (la página decide directorio vs activación). */
function hrefExplorarComuna(args: {
  comunaSlug: string;
  subcategoriaSlug?: string;
  categoriaSlug?: string;
  qNorm?: string;
}): string {
  const comuna = slugify(s(args.comunaSlug));
  if (!comuna) return "/";
  return hrefListadoComunaConBusqueda(comuna, {
    subcategoriaSlug: args.subcategoriaSlug,
    categoriaSlug: args.categoriaSlug,
    qNorm: args.qNorm,
  });
}

/** Slug de URL → etiqueta legible para títulos (subcategoría / categoría en query). */
function prettySlugWordsParaTituloSimilares(raw: string): string {
  const v = slugify(s(raw));
  if (!v) return "";
  return v
    .replace(/[-_]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Término visible del visitante: `q` primero; si no, label desde `subcategoria` o `categoria` en la URL.
 * La taxonomía oficial del ítem no entra aquí (solo filtros / metadata).
 */
function terminoNavegacionVisibleSimilares(
  sp: Record<string, string | string[] | undefined>
): string {
  const q = s(Array.isArray(sp.q) ? sp.q[0] : sp.q).trim();
  if (q) return q;
  const sub = s(Array.isArray(sp.subcategoria) ? sp.subcategoria[0] : sp.subcategoria).trim();
  if (sub) return prettySlugWordsParaTituloSimilares(sub);
  const cat = s(Array.isArray(sp.categoria) ? sp.categoria[0] : sp.categoria).trim();
  if (cat) return prettySlugWordsParaTituloSimilares(cat);
  return "";
}

/** Plural suave para titulares tipo "Otras … en {comuna}" (una palabra; frases se dejan en minúsculas). */
function pluralRubroTituloSimilares(texto: string): string {
  const raw = texto.trim();
  if (!raw) return "";
  const partes = raw.split(/\s+/).filter(Boolean);
  if (partes.length !== 1) return raw.toLowerCase();
  const t = partes[0].toLowerCase();
  if (t.endsWith("s") || t.endsWith("x")) return t;
  if (t.endsWith("ía")) return `${t.slice(0, -2)}ías`;
  if (t.endsWith("í")) return `${t.slice(0, -1)}is`;
  if (/[aeiouáéíóú]$/.test(t)) return `${t}s`;
  return `${t}es`;
}

type SimilarFichaItem = import("@/lib/getSimilaresFicha").SimilarFichaItem;

async function getSimilaresFichaUI(current: Emprendedor): Promise<SimilarFichaItem[]> {
  const subSlugs = arr(
    (current as { subcategorias_slugs_arr?: unknown }).subcategorias_slugs_arr
  );
  const subPrincipalSlug =
    s((current as { subcategoria_principal_slug?: unknown }).subcategoria_principal_slug) ||
    s(subSlugs[0]) ||
    s(arr((current as { subcategorias_slugs?: unknown }).subcategorias_slugs)[0]);

  return await getSimilaresFicha({
    current: {
      id: current.id,
      slug: current.slug,
      comuna_id: current.comuna_id,
      comuna_base_id: current.comuna_base_id,
      region_id: current.region_id,
      categoria_id: current.categoria_id,
      subcategoria_principal_slug: subPrincipalSlug,
    },
    limit: 12,
  });
}

function buildMailUrl(email: string) {
  const value = s(email);
  return value ? `mailto:${value}` : "";
}

function buildPhoneUrl(phone: string) {
  const clean = s(phone).replace(/\D/g, "");
  return clean ? `tel:${clean}` : "";
}

function isInformado(val: unknown): boolean {
  const t = s(val);
  if (!t) return false;
  const low = t.toLowerCase();
  if (low === "no informado") return false;
  if (low === "no informada") return false;
  if (low === "sin descripción") return false;
  if (low === "-") return false;
  return true;
}

type DescCheckCtx = { categoriaNombre: string; comunaNombre: string };
type DescMode = "larga" | "corta";

/** Texto de descripción que no aporta al visitante (plantillas, interno, muy corto). */
function descripcionEsPocoUtilParaPublico(
  text: unknown,
  ctx: DescCheckCtx,
  mode: DescMode
): boolean {
  const t = s(text);
  if (!t) return true;
  if (
    /\b(interno|borrador|pendiente|en_revision|no publicar|uso interno|privado|test|ranking|placeholder|lorem|ipsum)\b/i.test(
      t
    )
  )
    return true;
  if (/\bpruebas?\b/i.test(t)) return true;
  if (/test\s+score/i.test(t)) return true;
  const min = mode === "larga" ? 40 : 22;
  if (t.length < min) return true;
  const low = t.toLowerCase().trim();
  const cat = s(ctx.categoriaNombre).toLowerCase();
  const com = s(ctx.comunaNombre).toLowerCase();
  if (cat && com) {
    const plantilla = `${cat} en ${com}`;
    if (low === plantilla || low === `${plantilla}.`) return true;
  }
  if (/^servicios\s+para\s+hogares/i.test(t) && t.length < 120) return true;
  return false;
}

/**
 * La larga aporta texto claramente distinto a la corta (misma apertura copiada en BD → un solo bloque).
 */
function largaTieneContenidoMasAllaDeCorta(larga: string, cortaNorm: string): boolean {
  const L = s(larga).replace(/\s+/g, " ").trim();
  const c = s(cortaNorm).trim();
  if (!L) return false;
  if (!c) return true;
  if (L === c) return false;
  if (!L.startsWith(c)) return true;
  return L.slice(c.length).trim().length >= 40;
}

function capitalizaOracion(q: string): string {
  const t = s(q);
  if (!t) return "";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function limpiaDondeEtiqueta(raw: string): string {
  let t = s(raw).replace(/\.$/, "").trim();
  t = t.replace(/^atiende\s+en\s+/i, "").trim();
  return t;
}

/**
 * Frase principal autogenerada: servicio (subcategoría o categoría) + comuna base + cobertura.
 * Ej.: "Servicios para el hogar en Padre Hurtado y atención en varias regiones"
 */
function buildFraseAutoFichaCompleta(opts: {
  subcategoriaNombre: string;
  categoriaNombre: string;
  comunaBaseNombre: string;
  coberturaTipo: string;
}): string {
  const servicioRaw = isInformado(opts.subcategoriaNombre)
    ? opts.subcategoriaNombre
    : isInformado(opts.categoriaNombre)
      ? opts.categoriaNombre
      : "Servicio";
  const servicio = capitalizaOracion(servicioRaw);
  const base = s(opts.comunaBaseNombre);
  const tipo = normalizeCoberturaTipoDb(opts.coberturaTipo);

  if (tipo === "nacional") {
    if (base) {
      return `${servicio} en ${base} con cobertura en todo Chile`;
    }
    return `${servicio} con cobertura en todo Chile`;
  }

  let sufijo = "";
  if (tipo === "solo_comuna") sufijo = "";
  else if (tipo === "varias_comunas") sufijo = " y alrededores";
  else if (tipo === "varias_regiones") sufijo = " y atención en varias regiones";

  if (!base) {
    if (tipo === "varias_regiones") {
      return `${servicio} con atención en varias regiones`;
    }
    if (tipo === "varias_comunas") {
      return `${servicio} en la zona y alrededores`;
    }
    return servicio;
  }

  return `${servicio} en ${base}${sufijo}`;
}

/** Texto breve de cobertura para "Atiende en …" en la descripción automática. */
function coberturaFragmentoLectura(opts: {
  coberturaTipo: string;
  coberturaDisplay: string;
  comunaNombre: string;
}): string {
  const tipo = normalizeCoberturaTipoDb(opts.coberturaTipo);
  if (tipo === "nacional") return "todo Chile";
  if (tipo === "solo_comuna") return s(opts.comunaNombre) || "su comuna base";
  if (tipo === "varias_comunas") {
    if (isInformado(opts.coberturaDisplay)) {
      const d = limpiaDondeEtiqueta(opts.coberturaDisplay);
      if (!/^solo en su comuna$/i.test(d)) return d;
    }
    return "varias comunas y alrededores";
  }
  if (tipo === "varias_regiones") return "varias regiones";
  if (isInformado(opts.coberturaDisplay)) return limpiaDondeEtiqueta(opts.coberturaDisplay);
  return "su zona de cobertura";
}

const CIERRE_WHATSAPP_FICHA = "Contáctalo por WhatsApp para coordinar.";
const CIERRE_WHATSAPP_FICHA_LEGACY =
  "Escríbele directamente por WhatsApp para coordinar.";

/**
 * Descripción automática cuando la del usuario no sirve (vacía, corta o interna).
 * El cierre de acción se añade en `buildDescripcionParaUsuario` vía `appendCierreWhatsapp`.
 */
function buildDescripcionAutoFichaCompleta(opts: {
  rubro: string;
  categoriaNombre: string;
  comunaNombre: string;
  coberturaTipo: string;
  coberturaDisplay: string;
}): string {
  const servicioRaw = isInformado(opts.rubro)
    ? opts.rubro
    : isInformado(opts.categoriaNombre)
      ? opts.categoriaNombre
      : "Servicio";
  const servicio = capitalizaOracion(servicioRaw);
  const comuna = s(opts.comunaNombre);
  const cob = coberturaFragmentoLectura({
    coberturaTipo: opts.coberturaTipo,
    coberturaDisplay: opts.coberturaDisplay,
    comunaNombre: opts.comunaNombre,
  });

  const parte1 = comuna
    ? `${servicio} con base en ${comuna}.`
    : `${servicio}.`;
  return `${parte1} Atiende en ${cob}.`;
}

function appendCierreWhatsapp(body: string): string {
  const t = s(body);
  if (!t) return CIERRE_WHATSAPP_FICHA;
  if (t.includes(CIERRE_WHATSAPP_FICHA)) return t;
  if (t.includes(CIERRE_WHATSAPP_FICHA_LEGACY)) return t;
  const base = t.endsWith(".") ? t.slice(0, -1).trim() : t.trim();
  return `${base}. ${CIERRE_WHATSAPP_FICHA}`;
}

/** Fragmento corto para "dónde" (sin repetir "Atiende en"). */
function dondeAtiendeFrase(opts: {
  coberturaTipo: string;
  coberturaDisplay: string;
  comunaNombre: string;
}): string {
  const tipo = normalizeCoberturaTipoDb(opts.coberturaTipo);
  if (tipo === "nacional") return "todo Chile";
  if (isInformado(opts.coberturaDisplay)) {
    const disp = limpiaDondeEtiqueta(opts.coberturaDisplay);
    if (
      tipo === "solo_comuna" &&
      s(opts.comunaNombre) &&
      /^solo en su comuna$/i.test(disp)
    ) {
      return s(opts.comunaNombre);
    }
    return disp;
  }
  if (s(opts.comunaNombre)) return s(opts.comunaNombre);
  if (tipo === "varias_comunas") return "varias comunas de la región";
  if (tipo === "varias_regiones") return "varias regiones";
  return "";
}

/** Frase bajo el nombre (ficha completa): qué hace + dónde atiende. */
function buildFrasePrincipalCompleta(opts: {
  descripcionCorta: string;
  rubro: string;
  categoriaNombre: string;
  coberturaDisplay: string;
  comunaNombre: string;
  coberturaTipo: string;
}): string {
  const ctx: DescCheckCtx = {
    categoriaNombre: opts.categoriaNombre,
    comunaNombre: opts.comunaNombre,
  };
  const queRaw = isInformado(opts.rubro)
    ? opts.rubro
    : isInformado(opts.categoriaNombre)
      ? opts.categoriaNombre
      : "";
  const donde = dondeAtiendeFrase(opts);
  const corta = s(opts.descripcionCorta);
  const tipo = normalizeCoberturaTipoDb(opts.coberturaTipo);

  if (corta && !descripcionEsPocoUtilParaPublico(corta, ctx, "corta")) {
    const base = corta.endsWith(".") ? corta : `${corta}.`;
    if (!donde) return base;
    const menciona =
      donde.length > 2 &&
      corta.toLowerCase().includes(donde.toLowerCase().slice(0, Math.min(8, donde.length)));
    if (menciona) return base;
    const cola =
      tipo === "nacional" ? " Atiende en todo Chile." : ` Atiende en ${donde}.`;
    return `${base}${cola}`.replace(/\.\.+/g, ".").trim();
  }

  const fraseAuto = buildFraseAutoFichaCompleta({
    subcategoriaNombre: opts.rubro,
    categoriaNombre: opts.categoriaNombre,
    comunaBaseNombre: opts.comunaNombre,
    coberturaTipo: opts.coberturaTipo,
  });
  const auto = s(fraseAuto);
  if (auto) {
    return auto.endsWith(".") ? auto : `${auto}.`;
  }

  if (queRaw && donde) {
    return `${capitalizaOracion(queRaw)}. Atiende en ${donde}.`;
  }
  if (queRaw) {
    if (tipo === "nacional")
      return `${capitalizaOracion(queRaw)}. Atiende en todo Chile.`;
    return `${capitalizaOracion(queRaw)}.`;
  }
  if (donde) {
    return `Servicios en la zona. Atiende en ${donde}.`;
  }
  return "Escribe por WhatsApp para coordinar servicios y zona de atención.";
}

function buildDescripcionParaUsuario(opts: {
  descripcionLarga: string;
  descripcionCorta: string;
  rubro: string;
  categoriaNombre: string;
  coberturaDisplay: string;
  comunaNombre: string;
  coberturaTipo: string;
  frasePrincipalCompleta: string;
}): string {
  const ctx: DescCheckCtx = {
    categoriaNombre: opts.categoriaNombre,
    comunaNombre: opts.comunaNombre,
  };
  const larga = s(opts.descripcionLarga);
  let core: string;
  if (larga && !descripcionEsPocoUtilParaPublico(larga, ctx, "larga")) {
    core = larga;
  } else {
    const corta = s(opts.descripcionCorta);
    if (corta && !descripcionEsPocoUtilParaPublico(corta, ctx, "corta")) {
      core = corta;
    } else {
      const out = buildDescripcionAutoFichaCompleta({
        rubro: opts.rubro,
        categoriaNombre: opts.categoriaNombre,
        comunaNombre: opts.comunaNombre,
        coberturaTipo: opts.coberturaTipo,
        coberturaDisplay: opts.coberturaDisplay,
      });
      const fp = opts.frasePrincipalCompleta.replace(/\s+/g, " ").trim();
      const o = out.replace(/\s+/g, " ").trim();
      core =
        o === fp || o.replace(/\.$/, "") === fp.replace(/\.$/, "")
          ? `${out} Pregunta por disponibilidad y valores por el mismo canal.`
          : out;
    }
  }
  return appendCierreWhatsapp(core);
}

function mencionadoEnFrase(frase: string, fragment: string): boolean {
  const f = s(frase).toLowerCase();
  const frag = s(fragment).toLowerCase().replace(/\.$/, "").trim();
  return frag.length >= 4 && f.includes(frag);
}

function prettySubcategoriaPath(list?: string[]) {
  if (!list?.length) return "";
  return s(list[0]);
}

function prettyFromSlug(slug: string): string {
  const base = s(slug).replace(/[-_]+/g, " ").trim();
  if (!base) return "";
  return base.charAt(0).toUpperCase() + base.slice(1);
}

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = await getEmprendedor(slug);

  if (!item || !emprendedorFichaVisiblePublicamente(item.estado_publicacion)) {
    return {
      title: "Ficha no encontrada | Rey del Dato",
      description: "No encontramos la ficha solicitada.",
    };
  }

  const comuna = s(item.comuna_nombre || item.comuna_base_nombre) || "tu comuna";
  const categoria = s(item.categoria_nombre) || "servicios";
  const nombreTituloMeta = displayTitleCaseWords(s(item.nombre));
  const title = `${nombreTituloMeta} en ${comuna} | Rey del Dato`;
  const fallbackMeta = `${nombreTituloMeta}. ${categoria} en ${comuna}. Contacta directo por WhatsApp y revisa su ficha.`;
  const largaMeta = s(item.descripcion_larga || item.descripcion_libre).replace(/\s+/g, " ");
  const description =
    largaMeta.length >= 80
      ? largaMeta.length <= 160
        ? largaMeta
        : `${largaMeta.slice(0, 157).trimEnd()}…`
      : textoResumenListadoEmprendedor({
          descripcionCorta: s(item.descripcion_corta),
          fraseNegocio: s(item.frase_negocio),
          fallbackLine: fallbackMeta,
        }) || fallbackMeta;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: item.foto_principal_url ? [item.foto_principal_url] : [],
    },
  };
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  if (process.env.NODE_ENV === "development" || process.env.LOG_FICHA_DEBUG === "1") {
    // Log temporal para 500s en producción (Vercel logs).
    // No cambia la lógica; solo ayuda a ver qué slug llega.
    console.log("[ficha-page] slug_param", { slug });
  }
  const sp = (await searchParams) ?? {};
  const item = await getEmprendedor(slug);

  if (!item) notFound();
  if (!emprendedorFichaVisiblePublicamente(item.estado_publicacion)) notFound();

  const comunaBuscadaSlug =
    (Array.isArray(sp.comuna) ? sp.comuna[0] : sp.comuna) ||
    (Array.isArray(sp.comunaSlug) ? sp.comunaSlug[0] : sp.comunaSlug) ||
    "";
  const comunaBuscadaNombre =
    (Array.isArray(sp.comunaNombre) ? sp.comunaNombre[0] : sp.comunaNombre) ||
    (Array.isArray(sp.comuna_name) ? sp.comuna_name[0] : sp.comuna_name) ||
    null;

  const comunaNombre = item.comuna_nombre || item.comuna_base_nombre || "";
  const comunaSlug = item.comuna_slug || item.comuna_base_slug || "";

  const comunaCtxSlug = s(comunaBuscadaSlug) ? slugify(s(comunaBuscadaSlug)) : "";
  const baseSlugCrumb = s(item.comuna_base_slug) || s(item.comuna_slug) || "";
  const baseNombreCrumb = s(item.comuna_base_nombre) || s(item.comuna_nombre) || "";

  const [ctxNav, baseNav] = await Promise.all([
    comunaCtxSlug ? getComunaDirectorioNavegable(comunaCtxSlug) : Promise.resolve(null),
    baseSlugCrumb ? getComunaDirectorioNavegable(baseSlugCrumb) : Promise.resolve(null),
  ]);

  let comunaBuscadaRegionSlug = ctxNav?.regionSlug ?? null;
  if (comunaCtxSlug && !comunaBuscadaRegionSlug) {
    comunaBuscadaRegionSlug = await getRegionSlugForComunaSlug(comunaCtxSlug);
  }

  /** Con `?comuna=` se muestra esa comuna en el crumb (experiencia del usuario); si no, la base del negocio. */
  const usarContextoEnBreadcrumb = Boolean(comunaCtxSlug);
  const breadcrumbSlug = usarContextoEnBreadcrumb ? comunaCtxSlug : baseSlugCrumb;
  const breadcrumbNombre =
    usarContextoEnBreadcrumb && s(comunaBuscadaNombre)
      ? s(comunaBuscadaNombre)
      : usarContextoEnBreadcrumb && ctxNav?.nombre
        ? ctxNav.nombre
        : baseNombreCrumb;
  const breadcrumbDirectorioNavegable = usarContextoEnBreadcrumb
    ? ctxNav?.navegable === true
    : baseNav?.navegable === true;
  const coberturaTipo = item.cobertura_tipo || item.nivel_cobertura || "";
  const coberturaComunas =
    item.cobertura_comunas_arr || item.comunas_cobertura_nombres_arr || [];
  const modalidadesRaw =
    item.modalidad_atencion ||
    item.modalidades_atencion_arr ||
    item.modalidades_atencion ||
    [];
  const modalidadesArr: string[] = Array.isArray(modalidadesRaw)
    ? modalidadesRaw.map((x) => String(x).trim()).filter(Boolean)
    : modalidadesRaw != null && String(modalidadesRaw).trim()
      ? [String(modalidadesRaw).trim()]
      : [];
  const galeria = item.galeria_urls_arr || item.galeria_urls || [];
  const galeriaLen = Array.isArray(galeria) ? galeria.length : 0;
  const esFichaCompleta = fichaPublicaEsMejoradaDesdeItem(
    item as unknown as Record<string, unknown>,
    galeriaLen
  );

  const nombreFichaTitulo = displayTitleCaseWords(s(item.nombre));

  const sitioWeb = item.sitio_web || item.web || "";

  const nombreEmprendimientoRaw =
    s((item as { nombre_emprendimiento?: unknown }).nombre_emprendimiento) ||
    s(item.nombre) ||
    "tu negocio";
  const nombreEmprendimiento = displayTitleCaseWords(nombreEmprendimientoRaw);
  const mensajeWhatsapp = `Hola, vi tu negocio "${nombreEmprendimiento}" en Rey del Dato y quería hacer una consulta. ¿Me puedes ayudar?`;
  const whatsappUrl =
    buildWhatsappUrlWithPrefill(item.whatsapp || "", mensajeWhatsapp) ||
    buildWhatsappUrl(item.whatsapp || "");
  const instagramUrl = buildInstagramUrl(item.instagram || "");
  const webUrl = buildWebsiteUrl(sitioWeb);
  const telefonoLlamadas = s(item.telefono);
  const telefonoUrl = telefonoLlamadas ? buildPhoneUrl(telefonoLlamadas) : "";
  const phoneUrlLlamar =
    telefonoUrl || (item.whatsapp ? buildPhoneUrl(item.whatsapp) : "");
  const phoneLabelLlamar = telefonoLlamadas || formatWhatsappDisplay(item.whatsapp || "");
  const whatsappDisplayHero = formatWhatsappDisplay(item.whatsapp || "");
  const whatsappSecundarioFicha = publicWhatsappSecundarioParaFicha(
    s(item.whatsapp_principal || item.whatsapp),
    s(item.whatsapp_secundario),
  );
  const instagramDisplayHero = formatInstagramDisplay(item.instagram || "");
  const webDisplayHero = formatWebsiteDisplay(sitioWeb);
  const emailDisplayHero = "";

  const cobertura = coberturaTexto(coberturaTipo, coberturaComunas);
  const comoAtiende = comoAtiendeFlags(modalidadesArr);
  const tieneLocalFisico = modalidadesArr.some((x) =>
    ["local_fisico", "local", "fisico"].includes(x.toLowerCase()),
  );

  const siteUrl = normalizeSiteUrl();
  const shareUrl = `${siteUrl}/emprendedor/${item.slug}`;

  const subcategorias = arr(item.subcategorias_nombres_arr);
  const subcategoriaSlugs = arr(item.subcategorias_slugs_arr);
  const subcategoriasSlugsFinal = arr(item.subcategorias_slugs).length
    ? arr(item.subcategorias_slugs)
    : subcategoriaSlugs;
  const subcategoriaSlugFinal = s(item.subcategoria_slug_final);
  const subcategoriaSlugPrincipal =
    s(item.subcategoria_principal_slug) ||
    subcategoriaSlugFinal ||
    prettySubcategoriaPath(subcategoriasSlugsFinal);

  const subcategoriaPrincipalTitulo =
    s(item.subcategoria_principal_nombre) ||
    s(subcategorias[0]) ||
    (subcategoriaSlugPrincipal ? prettyFromSlug(subcategoriaSlugPrincipal) : "") ||
    "";

  const etiquetaCategoriaVisible =
    isInformado(item.categoria_nombre)
      ? s(item.categoria_nombre)
      : isInformado(subcategoriaPrincipalTitulo)
        ? subcategoriaPrincipalTitulo
        : "";

  const subcatsForList = (() => {
    const all = subcategorias.length
      ? subcategorias
      : subcategoriasSlugsFinal.map(prettyFromSlug).filter(Boolean);

    const uniq: string[] = [];
    const seen = new Set<string>();

    const push = (x: string) => {
      const k = s(x).toLowerCase();
      if (!k || seen.has(k)) return;
      seen.add(k);
      uniq.push(s(x));
    };

    if (isInformado(subcategoriaPrincipalTitulo)) {
      push(subcategoriaPrincipalTitulo);
    }
    all.forEach(push);
    return uniq.filter((x) => isInformado(x));
  })();

  const comunasCoberturaFinal = arr(item.comunas_cobertura);
  const coberturaDisplay =
    comunasCoberturaFinal.length > 0
      ? comunasCoberturaFinal.join(", ")
      : coberturaComunas.length > 0
      ? coberturaComunas.join(", ")
      : coberturaTipo
      ? cobertura
      : "";

  const categoriaVisible =
    subcategoriaPrincipalTitulo ||
    s(item.categoria_nombre) ||
    "Servicios";

  const comunaVisible = comunaNombre;

  const coberturaVisible =
    s(item.cobertura_label) ||
    s(item.cobertura_tipo_label) ||
    coberturaDisplay ||
    coberturaTipo ||
    "";

  const subtituloVisible = buildSubtituloFicha({
    categoria: categoriaVisible,
    comuna: comunaVisible,
    cobertura: coberturaVisible,
  });

  const ctxDesc: DescCheckCtx = {
    categoriaNombre: s(item.categoria_nombre),
    comunaNombre,
  };

  const descripcionLargaFuenteRaw =
    limpiarTexto(item.descripcion_larga || null) ||
    limpiarTexto(item.descripcion_libre || null);
  const descripcionLargaFuente =
    descripcionLargaFuenteRaw &&
    /\b(ranking|score|rpc|algolia)\b/i.test(descripcionLargaFuenteRaw)
      ? null
      : descripcionLargaFuenteRaw;

  const descripcionLargaUtilBase =
    descripcionLargaFuente &&
    !descripcionEsPocoUtilParaPublico(descripcionLargaFuente, ctxDesc, "larga")
      ? descripcionLargaFuente
      : null;

  /** Corta pública = frase_negocio (canónico) o descripcion_corta; una sola frase 40–120. */
  const textoCortaFuente = s(item.frase_negocio) || s(item.descripcion_corta);
  const textoCortaNorm = normalizeDescripcionCorta(textoCortaFuente);
  const cortaCumpleProducto =
    textoCortaNorm.length >= DESCRIPCION_CORTA_MIN &&
    textoCortaNorm.length <= DESCRIPCION_CORTA_MAX &&
    !descripcionEsPocoUtilParaPublico(textoCortaNorm, ctxDesc, "corta");

  /** Panel “Perfil completo”: solo la corta; sin subtítulo de rubro ni texto largo. */
  const descripcionCortaPanel = cortaCumpleProducto
    ? clampDescripcionCortaFichaDisplay(textoCortaNorm)
    : "";

  /** Bajo galería: solo larga definida y distinta de la corta (evita duplicar el mismo párrafo). */
  const descripcionLargaUtil =
    descripcionLargaUtilBase &&
    (!cortaCumpleProducto ||
      largaTieneContenidoMasAllaDeCorta(descripcionLargaUtilBase, textoCortaNorm))
      ? descripcionLargaUtilBase
      : null;

  const descripcionCuerpoFicha = descripcionLargaUtil
    ? capitalizeFirstLetterForDisplay(descripcionLargaUtil)
    : null;

  /** Subtítulo en ficha básica / JSON-LD: corta válida o línea rubro+comuna. */
  const lineaCortaPublica = clampDescripcionCortaFichaDisplay(
    (cortaCumpleProducto ? textoCortaNorm : "") || subtituloVisible,
  );
  const subtituloHero = lineaCortaPublica;

  const comunaLabelSimilares =
    s(comunaBuscadaNombre) ||
    (ctxNav?.nombre ? s(ctxNav.nombre) : "") ||
    s(breadcrumbNombre) ||
    s(comunaNombre) ||
    "";

  // Auditoría similares (consola): [similares-page] current → …; luego count; en helper → [getSimilaresFicha] event="resumen".
  const logSimilaresPage =
    process.env.NODE_ENV === "development" ||
    process.env.LOG_SIMILARES_FICHA === "1";
  if (logSimilaresPage) {
    console.log("ITEM REAL", item);
    console.log("[similares-page] current", {
      slug: item?.slug,
      categoria_id: item?.categoria_id,
      comuna_id: item?.comuna_id,
      cobertura_tipo: item?.cobertura_tipo,
      region_id: item?.region_id,
      comuna_base_id: item?.comuna_base_id,
    });
  }

  const similaresRaw = await getSimilaresFichaUI(item);
  const similares = filtrarSimilaresSinRuido(similaresRaw).slice(0, 4);

  if (logSimilaresPage) {
    console.log("[similares-page] similares", { count: similares.length });
  }

  const ubicacionUnaLinea = formatComunaRegion({
    comunaNombre: comunaNombre || item.comuna_base_nombre,
    regionNombre: item.region_nombre,
    regionSlug: item.region_slug,
  });
  const fotoPrincipalOk = Boolean(s(item.foto_principal_url));
  const atiendeEnLinea =
    isInformado(coberturaDisplay) && coberturaDisplay.length > 0
      ? `Cobertura en: ${coberturaDisplay}`
      : "";

  const lineaRubro =
    subcatsForList.length > 0
      ? subcatsForList.slice(0, 5).join(" · ")
      : etiquetaCategoriaVisible || categoriaVisible;

  /** Misma línea que `EmprendedorSearchCard` (categoría · subcategoría). */
  const lineaTaxonomiaFichaHero = (() => {
    const tax = {
      categoriaNombre: s(item.categoria_nombre),
      subcategoriasNombres: subcategorias.length ? subcategorias : undefined,
      subcategoriasSlugs: subcategoriasSlugsFinal.length
        ? subcategoriasSlugsFinal
        : undefined,
    };
    const linea = getLineaTaxonomiaCard(tax).trim();
    if (linea) return linea;
    return getCategoriaCompacta(tax).trim();
  })();

  const localesFichaSorted = sortLocalesFichaPrincipalPrimero(
    Array.isArray(item.locales) ? item.locales : []
  );
  const direccionParaLocalFisico =
    direccionCallePrincipalDesdeLocales(localesFichaSorted);
  const lineaChecklistLoc = lineaChecklistDireccionLocales(localesFichaSorted);

  const perfilIncluyeLineas = esFichaCompleta
    ? (() => {
        const base = perfilCompletoIncluyeLineas({
          disponibleEnComuna: Boolean(s(ubicacionUnaLinea)),
          flags: comoAtiende,
          tieneWhatsapp: Boolean(whatsappUrl),
        });
        return lineaChecklistLoc ? [...base, lineaChecklistLoc] : base;
      })()
    : [];

  const emailUrl = "";

  const regionesCoberturaSlugsFicha =
    arr(item.regiones_cobertura_slugs_arr).length > 0
      ? arr(item.regiones_cobertura_slugs_arr)
      : arr(item.cobertura_regiones_slugs_arr);

  const comunasCoberturaSlugsFicha = arr(item.cobertura_comunas_slugs_arr);

  const bloqueUbicacion = getBloqueUbicacionFicha({
    comunaBuscadaSlug,
    comunaBuscadaNombre,
    comunaBuscadaRegionSlug,
    comunaBaseSlug: item.comuna_base_slug || item.comuna_slug || null,
    comunaBaseNombre: item.comuna_base_nombre || item.comuna_nombre || null,
    regionNombre: item.region_nombre || null,
    regionSlug: item.region_slug || null,
    coberturaTipo: item.cobertura_tipo || item.nivel_cobertura || null,
    comunasCobertura: item.cobertura_comunas_arr || item.comunas_cobertura_nombres_arr || null,
    comunasCoberturaSlugs: item.cobertura_comunas_slugs_arr || null,
    regionesCoberturaSlugs: regionesCoberturaSlugsFicha.length
      ? regionesCoberturaSlugsFicha
      : null,
  });

  const panelMuestraBloqueUbicacion = Boolean(
    bloqueUbicacion.lineaPin && bloqueUbicacion.lineaBase,
  );
  const baseNombrePanel =
    s(item.comuna_base_nombre) || s(item.comuna_nombre) || "";
  const partesCoberturaDisplay = coberturaDisplay
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
  const coberturaSoloRepiteBase =
    Boolean(baseNombrePanel) &&
    partesCoberturaDisplay.length === 1 &&
    partesCoberturaDisplay[0] === baseNombrePanel.toLowerCase();

  const atiendeEnLineaFicha =
    bloqueUbicacion.ocultarAtiendeEnLineaGenerica ||
    (panelMuestraBloqueUbicacion && coberturaSoloRepiteBase)
      ? ""
      : atiendeEnLinea;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: nombreFichaTitulo,
    description:
      descripcionLargaUtil ||
      lineaCortaPublica ||
      buildDescripcionFallback({
        categoria: categoriaVisible,
        comuna: comunaVisible,
        cobertura: coberturaVisible,
        whatsapp: item.whatsapp,
      }),
    image: [item.foto_principal_url, ...galeria].filter(Boolean),
    url: shareUrl,
    email: undefined,
    telephone: s(item.whatsapp) || undefined,
    areaServed: comunaNombre || undefined,
    address:
      tieneLocalFisico &&
      (direccionParaLocalFisico ||
        s(localesFichaSorted[0]?.comuna_nombre) ||
        comunaNombre)
        ? {
            "@type": "PostalAddress",
            streetAddress: direccionParaLocalFisico || undefined,
            addressLocality:
              s(localesFichaSorted[0]?.comuna_nombre) || comunaNombre,
            addressRegion: item.region_nombre || undefined,
            addressCountry: "CL",
          }
        : comunaNombre
        ? {
            "@type": "PostalAddress",
            addressLocality: comunaNombre,
            addressRegion: item.region_nombre || undefined,
            addressCountry: "CL",
          }
        : undefined,
    sameAs: [instagramUrl, webUrl].filter(Boolean),
    knowsAbout: subcategorias.length ? subcategorias : undefined,
  };

  const subSlugParaListado = subcategoriaSlugPrincipal
    ? slugify(s(subcategoriaSlugPrincipal))
    : "";
  const categoriaSlugParaListado = slugify(
    s(item.categoria_slug_final) || s(item.categoria_slug) || ""
  );
  const breadcrumbComunaHref = breadcrumbSlug
    ? `/${encodeURIComponent(slugify(breadcrumbSlug))}`
    : null;
  const breadcrumbRubroHref =
    breadcrumbSlug && subSlugParaListado
      ? hrefListadoComunaConBusqueda(breadcrumbSlug, { subcategoriaSlug: subSlugParaListado })
      : breadcrumbSlug && categoriaSlugParaListado
        ? hrefListadoComunaConBusqueda(breadcrumbSlug, {
            categoriaSlug: categoriaSlugParaListado,
          })
        : null;

  const similaresComunaSlug = comunaCtxSlug || baseSlugCrumb;
  /** Solo params de la URL actual (no mezclar con taxonomía del ítem ni `q`+`subcategoria`). */
  const verMasSpSub = s(Array.isArray(sp.subcategoria) ? sp.subcategoria[0] : sp.subcategoria).trim();
  const verMasSpCat = s(Array.isArray(sp.categoria) ? sp.categoria[0] : sp.categoria).trim();
  const verMasSpQ = s(Array.isArray(sp.q) ? sp.q[0] : sp.q).trim();

  const similaresVerMasHref = (() => {
    if (!similaresComunaSlug) {
      const qN = verMasSpQ ? normalizeText(verMasSpQ) : "";
      return qN ? `/resultados?q=${encodeURIComponent(qN)}` : null;
    }
    const com = similaresComunaSlug;
    if (verMasSpSub) {
      return hrefListadoComunaConBusqueda(com, {
        subcategoriaSlug: slugify(verMasSpSub),
      });
    }
    if (verMasSpCat) {
      return hrefListadoComunaConBusqueda(com, {
        categoriaSlug: slugify(verMasSpCat),
      });
    }
    if (verMasSpQ) {
      return hrefListadoComunaConBusqueda(com, {
        qNorm: normalizeText(verMasSpQ),
      });
    }
    return hrefExplorarComuna({ comunaSlug: com });
  })();

  const terminoUsuarioSimilares = terminoNavegacionVisibleSimilares(sp);
  const comunaTituloSimilares = s(comunaLabelSimilares);
  const rubroPluralTitulo = terminoUsuarioSimilares
    ? pluralRubroTituloSimilares(terminoUsuarioSimilares)
    : "";

  const similaresSectionTitle =
    rubroPluralTitulo && comunaTituloSimilares
      ? `Otras ${rubroPluralTitulo} en ${comunaTituloSimilares}`
      : comunaTituloSimilares
        ? `Más negocios parecidos en ${comunaTituloSimilares}`
        : "Más negocios parecidos en tu comuna";

  const similaresVerMasLabel =
    rubroPluralTitulo && comunaTituloSimilares
      ? `Ver más ${rubroPluralTitulo} en ${comunaTituloSimilares}`
      : comunaTituloSimilares
        ? `Ver más en ${comunaTituloSimilares}`
        : "Ver más opciones";

  const similaresSlugs = similares.map((x) => x.slug);
  const comunaBaseIdForDebug = item.comuna_base_id ?? item.comuna_id ?? null;
  if (
    process.env.NODE_ENV === "development" ||
    process.env.DEBUG_SIMILARES_FICHA === "1"
  ) {
    console.log("[SIMILARES_INSTR] page_before_return", {
      slug: item.slug,
      esFichaCompleta,
      comunaBuscadaSlug: s(comunaBuscadaSlug) || null,
      comunaBaseId: comunaBaseIdForDebug,
      similaresLen: similares.length,
      similaresSlugs,
    });
  }

  return (
    <main style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 20px 80px" }}>
      <TrackView slug={item.slug} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div
        style={{
          marginBottom: 8,
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <BackLink
          style={{
            fontWeight: 700,
            fontSize: 14,
            textDecoration: "none",
            color: "#2563eb",
          }}
        >
          ← Volver
        </BackLink>
      </div>

      <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 20 }}>
        <a href="/" style={{ color: "#2563eb", textDecoration: "none" }}>
          Inicio
        </a>
        {breadcrumbSlug && breadcrumbComunaHref ? (
          <>
            {" / "}
            <a
              href={breadcrumbComunaHref}
              style={{ color: "#2563eb", textDecoration: "none" }}
              title={
                breadcrumbDirectorioNavegable
                  ? undefined
                  : "Esta comuna aún se está activando; te llevamos a cómo abrirla."
              }
            >
              {breadcrumbNombre || "Comuna"}
            </a>
          </>
        ) : breadcrumbNombre ? (
          <>
            {" / "}
            <span>{breadcrumbNombre}</span>
          </>
        ) : null}
        {(subcategoriaSlugPrincipal && breadcrumbSlug) || s(item.categoria_nombre) ? (
          <>
            {" / "}
            {breadcrumbRubroHref ? (
              <a href={breadcrumbRubroHref} style={{ color: "#2563eb", textDecoration: "none" }}>
                {subcategorias[0] || item.categoria_nombre}
              </a>
            ) : (
              <span style={{ color: "#64748b" }}>
                {subcategorias[0] || item.categoria_nombre}
              </span>
            )}
          </>
        ) : null}
        {" / "}
        {nombreFichaTitulo}
      </div>

      {!esFichaCompleta ? (
        <>
          <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.12fr)_minmax(300px,400px)] gap-8 mb-10 items-start">
            <div className="flex min-w-0 flex-col gap-3">
              <div
                className="rounded-2xl border border-slate-200 bg-slate-100 overflow-hidden min-h-[320px] xl:min-h-[420px]"
              >
                {fotoPrincipalOk ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s(item.foto_principal_url)}
                    alt=""
                    className="w-full h-full min-h-[320px] xl:min-h-[420px] object-cover"
                  />
                ) : (
                  <div className="h-full min-h-[320px] xl:min-h-[420px] flex flex-col items-center justify-center px-6 text-center bg-slate-100">
                    <p className="text-sm font-extrabold tracking-wide text-slate-600">
                      {getPlaceholderSinFotoTitulo()}
                    </p>
                    <p className="mt-2 text-sm text-slate-500 max-w-sm">
                      {getPlaceholderSinFotoSub()}
                    </p>
                  </div>
                )}
              </div>

              {Array.isArray(galeria) && galeria.length > 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="m-0 mb-3 text-[12px] font-extrabold uppercase tracking-wide text-slate-600">
                    Galería
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {galeria.slice(0, 8).map((u, idx) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={`${idx}-${u.slice(0, 40)}`}
                        src={u}
                        alt=""
                        className="aspect-square w-full rounded-xl object-cover border border-slate-200 bg-slate-100"
                        loading="lazy"
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <aside className="rounded-2xl border border-slate-200 bg-slate-50/80 p-6 xl:p-7">
              {ubicacionUnaLinea ? (
                <p className="text-base font-semibold text-slate-700 mb-3">
                  {ubicacionUnaLinea}
                </p>
              ) : null}
              <div className="inline-flex mb-4 px-3 py-1.5 rounded-lg bg-slate-200/80 border border-slate-300 text-xs font-bold text-slate-700">
                Información básica
              </div>
              <h1 className="text-3xl xl:text-4xl font-black text-slate-900 leading-tight m-0 mb-3">
                {nombreFichaTitulo}
              </h1>
              {isInformado(subtituloHero) ? (
                <p className="text-lg text-slate-600 font-medium m-0 mb-4 leading-snug">
                  {subtituloHero}
                </p>
              ) : null}
              {isInformado(lineaRubro) ? (
                <p className="text-sm font-semibold text-slate-500 m-0 mb-6">
                  {lineaRubro}
                </p>
              ) : null}
              {whatsappUrl ? (
                <TrackedActionButton
                  slug={item.slug}
                  type="whatsapp"
                  href={whatsappUrl}
                  label="Contactar por WhatsApp"
                  bg="#16a34a"
                  emphasis="primary"
                  emprendedorNombre={nombreFichaTitulo}
                />
              ) : null}
            </aside>
          </section>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 mb-10">
            <p className="m-0 text-slate-600 text-base leading-relaxed max-w-2xl">
              {TEXTO_FICHA_BASICA_AVISO}
            </p>
          </div>
        </>
      ) : (
        <>
          <FichaHero
            emprendedorId={s(item.id)}
            comunaSlug={comunaSlug ? s(comunaSlug) : null}
            slug={item.slug}
            fotoPrincipal={item.foto_principal_url || ""}
            galeria={galeria}
            bloqueBajoGaleria={
              descripcionCuerpoFicha ? (
                <div className="rounded-2xl border border-slate-200/90 bg-white p-5 md:p-6 shadow-sm ring-1 ring-slate-100">
                  <h2 className="m-0 mb-3 text-lg font-black text-slate-900 tracking-tight">
                    Descripción
                  </h2>
                  <p className="m-0 max-w-prose text-[15px] md:text-[16px] leading-relaxed text-slate-700">
                    {descripcionCuerpoFicha}
                  </p>
                </div>
              ) : undefined
            }
            bloqueBajoPanel={<FichaDestacados items={perfilIncluyeLineas} />}
            ubicacionLinea={
              bloqueUbicacion.lineaPin ? "" : ubicacionUnaLinea
            }
            bloqueUbicacion={
              bloqueUbicacion.lineaPin && bloqueUbicacion.lineaBase
                ? {
                    lineaPin: bloqueUbicacion.lineaPin,
                    lineaBase: bloqueUbicacion.lineaBase,
                    lineaAtiendeTambien: bloqueUbicacion.lineaAtiendeTambien,
                  }
                : null
            }
            nombre={item.nombre}
            descripcionCortaPanel={descripcionCortaPanel}
            atiendeEnLinea={atiendeEnLineaFicha}
            comoAtiende={comoAtiende}
            whatsappUrl={whatsappUrl}
            whatsappDisplay={whatsappDisplayHero}
            whatsappSecundarioUrl={whatsappSecundarioFicha.url}
            whatsappSecundarioDisplay={whatsappSecundarioFicha.display}
            instagramUrl={instagramUrl}
            instagramDisplay={instagramDisplayHero}
            webUrl={webUrl}
            webDisplay={webDisplayHero}
            phoneUrl={phoneUrlLlamar}
            phoneLabel={phoneLabelLlamar}
            emailUrl={emailUrl}
            emailDisplay={emailDisplayHero}
            mostrarResponsable={Boolean(item.mostrar_responsable)}
            responsableNombre={s(item.responsable_nombre)}
            localesFicha={
              localesFichaSorted.length > 0
                ? localesFichaSorted.map((l) => {
                    const row = l as {
                      lat?: unknown;
                      lng?: unknown;
                      latitude?: unknown;
                      longitude?: unknown;
                    };
                    const lat = numCoord(row.lat ?? row.latitude);
                    const lng = numCoord(row.lng ?? row.longitude);
                    return {
                      nombre_local: l.nombre_local,
                      direccion: s(l.direccion),
                      referencia: s(l.referencia),
                      comuna_nombre: s(l.comuna_nombre),
                      comuna_slug: s((l as { comuna_slug?: unknown }).comuna_slug) || null,
                      es_principal: l.es_principal === true,
                      ...(lat != null && lng != null ? { lat, lng } : {}),
                    };
                  })
                : undefined
            }
            direccionLocal={undefined}
            shareUrl={shareUrl}
            lineaTaxonomia={lineaTaxonomiaFichaHero}
            mostrarEnlacesMapas={tieneLocalFisico}
          />
        </>
      )}

      {similares.length > 0 ? (
        <SimilaresFichaSection
          items={similares}
          fromSlug={item.slug}
          title={similaresSectionTitle}
          verMasHref={similaresVerMasHref}
          verMasLabel={similaresVerMasLabel}
          comunaContextoNombre={comunaLabelSimilares}
        />
      ) : null}
    </main>
  );
}
