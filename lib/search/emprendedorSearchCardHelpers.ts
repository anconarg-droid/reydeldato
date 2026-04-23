import { clampDescripcionCortaFichaDisplay } from "@/lib/emprendedorFichaUi";
import { normalizeCoberturaTipoDb } from "@/lib/cobertura";
import { modalidadesDbToCardBadges } from "@/lib/search/cardListingEnrichment";
import { humanizeCoverageSlug } from "@/lib/search/atiendeResumenLabel";
import { buildAtiendeComunasPreviewLine } from "@/lib/search/territorialCardLines";
import type { ModoVistaPanel } from "@/lib/panelModoVista";
import { getRegionShort } from "@/utils/regionShort";

/** Máx. caracteres para descripción en card (~2 líneas). */
const DESCRIPCION_CARD_MAX_CHARS = 120;

export type EmprendedorSearchCardHelperItem = {
  categoriaNombre?: string;
  subcategoriasNombres?: string[];
  subcategoriasSlugs?: string[];
  coberturaTipo?: string;
  comunasCobertura?: string[];
  regionesCobertura?: string[];
  comunaBaseNombre?: string;
  atiendeLine?: string;
  frase?: string;
  descripcionLibre?: string;
  resumenLocalesLinea?: string | null;
  localFisicoComunaNombre?: string | null;
  modalidadesCardBadges?: string[];
  /** Valores crudos BD (`local_fisico`, …) si no hay badges ya resueltos. */
  modalidadesAtencionDb?: string[];
  esFichaCompleta?: boolean;
  modoVista?: ModoVistaPanel;
};

function prettySubNameFromSlug(slug: string): string {
  return String(slug || "")
    .replace(/[-_]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function primarySubcategoriaLabel(
  item: Pick<
    EmprendedorSearchCardHelperItem,
    "subcategoriasNombres" | "subcategoriasSlugs"
  >,
): string {
  const noms = Array.isArray(item.subcategoriasNombres)
    ? item.subcategoriasNombres
    : [];
  const u = String(noms[0] ?? "").trim();
  if (u) return u;
  const slugs = Array.isArray(item.subcategoriasSlugs) ? item.subcategoriasSlugs : [];
  const s0 = String(slugs[0] ?? "").trim();
  return s0 ? prettySubNameFromSlug(s0) : "";
}

/** Evita que una “sub” con listas largas (p. ej. “mecánica, frenos…”) ocupe la línea de rubro. */
const MAX_SUB_TAXONOMIA_CHARS = 42;

function primeraEtiquetaTaxonomia(raw: string): string {
  let t = String(raw ?? "").trim();
  if (!t) return "";
  const antesComa = t.split(/[,;]/)[0]?.trim() ?? "";
  if (antesComa.length > 0 && antesComa.length < t.length) t = antesComa;
  if (t.length > MAX_SUB_TAXONOMIA_CHARS) {
    t = `${t.slice(0, MAX_SUB_TAXONOMIA_CHARS - 1).trimEnd()}…`;
  }
  return t;
}

/**
 * "Categoría · Subcategoría", solo categoría, solo sub, o vacío (el bloque sigue reservando altura en UI).
 */
export function getCategoriaCompacta(
  item: Pick<
    EmprendedorSearchCardHelperItem,
    "categoriaNombre" | "subcategoriasNombres" | "subcategoriasSlugs"
  >,
): string {
  const cat = String(item.categoriaNombre ?? "").trim();
  const sub = primarySubcategoriaLabel(item);
  if (cat && sub) return `${cat} · ${sub}`;
  if (cat) return cat;
  if (sub) return sub;
  return "";
}

/**
 * Línea 1 de la card: solo `categoría · sub` cuando hay categoría.
 * Sin categoría no se muestra sub suelta aquí (va a descripción vía {@link getSubcategoriaDescripcionFallback}).
 */
export function getLineaTaxonomiaCard(
  item: Pick<
    EmprendedorSearchCardHelperItem,
    "categoriaNombre" | "subcategoriasNombres" | "subcategoriasSlugs"
  >,
): string {
  const cat = String(item.categoriaNombre ?? "").trim();
  if (!cat) return "";
  const subRaw = primarySubcategoriaLabel(item);
  const sub = subRaw ? primeraEtiquetaTaxonomia(subRaw) : "";
  if (sub) return `${cat} · ${sub}`;
  return cat;
}

/** Sub taxonomía para rellenar línea 2 si no hay categoría y no hay frase/descripción. */
export function getSubcategoriaDescripcionFallback(
  item: Pick<
    EmprendedorSearchCardHelperItem,
    "categoriaNombre" | "subcategoriasNombres" | "subcategoriasSlugs"
  >,
): string {
  if (String(item.categoriaNombre ?? "").trim()) return "";
  const subRaw = primarySubcategoriaLabel(item);
  return subRaw ? primeraEtiquetaTaxonomia(subRaw) : "";
}

export type CoberturaResumenInput = {
  coberturaTipo?: string;
  comunasCobertura?: string[];
  regionesCobertura?: string[];
  comunaBaseNombre?: string;
  atiendeLine?: string;
};

function dedupeStringsPreserveOrder(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of arr) {
    const t = String(raw ?? "").trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

function regionLabelForCard(slug: string): string {
  const human = humanizeCoverageSlug(slug);
  return getRegionShort(human) || human;
}

/** Siempre `Atiende: …` para lectura uniforme en cards. */
function normalizeFallbackToAtiendeColon(fallback: string, base: string): string {
  const b = String(base ?? "").trim();
  let t = String(fallback ?? "").trim();
  if (!t) {
    if (b) return `Atiende: ${b}`;
    return "Atiende: su comuna";
  }
  if (/^Atiende:\s*/i.test(t)) return t;
  const low = t.toLowerCase();
  if (low.startsWith("atiende en ")) {
    return `Atiende: ${t.slice("atiende en ".length).trim()}`;
  }
  if (low.startsWith("atiende ")) {
    return `Atiende: ${t.slice("atiende ".length).trim()}`;
  }
  return `Atiende: ${t}`;
}

/**
 * Cobertura en cards: siempre prefijo `Atiende:` + lista normalizada.
 */
export function getCoberturaTexto(item: CoberturaResumenInput): string {
  const tipo = normalizeCoberturaTipoDb(item.coberturaTipo);
  const base = String(item.comunaBaseNombre ?? "").trim();
  const fallback = String(item.atiendeLine ?? "").trim();
  const comunas = Array.isArray(item.comunasCobertura)
    ? item.comunasCobertura.map((x) => String(x ?? "").trim()).filter(Boolean)
    : [];

  if (tipo === "solo_comuna") {
    if (base) return `Atiende: ${base}`;
    return normalizeFallbackToAtiendeColon(fallback, base);
  }

  if (tipo === "varias_comunas") {
    if (comunas.length === 0) {
      if (base) return `Atiende: ${base}`;
      return normalizeFallbackToAtiendeColon(fallback, base);
    }
    const preview = buildAtiendeComunasPreviewLine(comunas);
    if (preview) return preview;
    const n = new Set(comunas.map((c) => c.toLowerCase())).size;
    if (n > 0) return n === 1 ? "Atiende: 1 comuna" : `Atiende: ${n} comunas`;
    return normalizeFallbackToAtiendeColon(fallback, base);
  }

  if (tipo === "nacional") {
    return "Atiende: todo Chile";
  }

  if (tipo === "varias_regiones") {
    const regs = dedupeStringsPreserveOrder(
      Array.isArray(item.regionesCobertura) ? item.regionesCobertura : [],
    );
    const labels = regs.map(regionLabelForCard).filter(Boolean);
    if (labels.length === 0) {
      return normalizeFallbackToAtiendeColon(fallback, base);
    }
    if (labels.length === 1) return `Atiende: ${labels[0]}`;
    if (labels.length === 2) return `Atiende: ${labels[0]}, ${labels[1]}`;
    const head = labels.slice(0, 2).join(", ");
    const extra = labels.length - 2;
    return `Atiende: ${head} +${extra}`;
  }

  return normalizeFallbackToAtiendeColon(fallback, base);
}

/** Mismo resultado que {@link getCoberturaTexto} (compat. tests / llamadas antiguas). */
export function getCoberturaResumen(item: CoberturaResumenInput): string {
  return getCoberturaTexto(item);
}

export type DireccionCardInput = {
  /** Trial/plan vigente en listado (misma regla que la card). */
  esPerfilCompletoListado: boolean;
  resumenLocalesLinea?: string | null;
  localFisicoComunaNombre?: string | null;
  tieneModalidadLocalFisico: boolean;
};

const TEXTO_LOCAL_FISICO_BASICO = "Tiene local físico";

/**
 * Dirección/local para el bloque fijo de la card.
 * Completo: línea desde `emprendedor_locales` (principal) o fallback comuna del local.
 * Básico: solo copy genérico si hay modalidad local físico.
 */
export function getDireccionCard(item: DireccionCardInput): string {
  const resumen = String(item.resumenLocalesLinea ?? "").trim();
  const comLocal = String(item.localFisicoComunaNombre ?? "").trim();

  if (item.esPerfilCompletoListado) {
    if (resumen) {
      const lines = resumen
        .split(/\r?\n/)
        .map((x) => String(x ?? "").trim())
        .filter(Boolean);
      if (lines.length === 0) return "";
      return lines.map((ln) => `📍 ${ln}`).join("\n");
    }
    if (comLocal) return `📍 Local en ${comLocal}`;
    return "";
  }

  if (item.tieneModalidadLocalFisico) return TEXTO_LOCAL_FISICO_BASICO;
  return "";
}

export type ModalidadesChipsInput = {
  modalidadesCardBadges?: string[];
  modalidadesAtencionDb?: string[];
};

/** Chips normalizados: Local físico, A domicilio, Delivery, Online (vía reglas BD). */
export function getModalidadesChips(item: ModalidadesChipsInput): string[] {
  let raw: string[] = [];
  if (Array.isArray(item.modalidadesCardBadges) && item.modalidadesCardBadges.length) {
    raw = item.modalidadesCardBadges.map((x) => String(x ?? "").trim()).filter(Boolean);
  } else if (Array.isArray(item.modalidadesAtencionDb) && item.modalidadesAtencionDb.length) {
    raw = modalidadesDbToCardBadges(item.modalidadesAtencionDb);
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of raw) {
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

const MODALIDADES_CARD_MAX_VISIBLE = 3;

/** Hasta `maxVisible` chips; el resto se resume como +N en UI. */
export function takeModalidadesChipsPreview(
  chips: string[],
  maxVisible: number = MODALIDADES_CARD_MAX_VISIBLE,
): { visible: string[]; masCount: number } {
  const list = chips.map((x) => String(x ?? "").trim()).filter(Boolean);
  const visible = list.slice(0, maxVisible);
  const masCount = Math.max(0, list.length - maxVisible);
  return { visible, masCount };
}

/** Trial/plan vigente en card (producto); no incluye publicación ni bloqueo de ficha. */
export function isPerfilCompletoCard(item: {
  esFichaCompleta?: boolean;
  modoVista?: ModoVistaPanel;
}): boolean {
  const vistaBasicaPanel = (item.modoVista ?? "completa") === "basica";
  return item.esFichaCompleta === true && !vistaBasicaPanel;
}

export type ListadoPerfilCompletoUiInput = {
  esFichaCompleta?: boolean;
  modoVista?: ModoVistaPanel;
  estadoPublicacion?: string | null;
  bloquearAccesoFichaPublica?: boolean;
};

/**
 * Listado (búsqueda/categoría): UI “perfil completo” = trial/plan **y** ficha pública navegable.
 * Misma idea que mostrar badge + borde teal + CTA “Ver detalles” (no solo `esFichaCompleta`).
 */
export function listadoPerfilCompletoUi(item: ListadoPerfilCompletoUiInput): boolean {
  if (!isPerfilCompletoCard(item)) return false;
  const pub = String(item.estadoPublicacion ?? "").trim().toLowerCase();
  if (pub !== "publicado") return false;
  if (item.bloquearAccesoFichaPublica === true) return false;
  return true;
}

/**
 * Footer en dos columnas (WhatsApp + hueco Ver detalles): trial/plan y ficha publicada
 * (incluye columna deshabilitada si `bloquearAccesoFichaPublica`).
 */
export function listadoFooterCtasDosColumnas(item: ListadoPerfilCompletoUiInput): boolean {
  if (!isPerfilCompletoCard(item)) return false;
  const pub = String(item.estadoPublicacion ?? "").trim().toLowerCase();
  return pub === "publicado";
}

function normRubroCmp(s: string): string {
  return String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/\s*·\s*/g, " · ");
}

/**
 * Descripción corta (línea 2): solo frase / descripción libre; opcional sub sin categoría al final.
 * No reutiliza texto que ya va en {@link getLineaTaxonomiaCard}.
 */
export function getDescripcionCardCorta(
  item: Pick<EmprendedorSearchCardHelperItem, "frase" | "descripcionLibre">,
  lineaTaxonomia: string,
  subSinCategoriaFallback?: string,
): string {
  const rubN = lineaTaxonomia ? normRubroCmp(lineaTaxonomia) : "";
  const tryLine = (raw: string) => {
    const t = String(raw ?? "").trim().replace(/\s+/g, " ");
    if (!t) return "";
    if (rubN && normRubroCmp(t) === rubN) return "";
    return clampDescripcionCortaFichaDisplay(t, DESCRIPCION_CARD_MAX_CHARS);
  };
  const fromFrase = tryLine(item.frase ?? "");
  if (fromFrase) return fromFrase;
  const fromLibre = tryLine(item.descripcionLibre ?? "");
  if (fromLibre) return fromLibre;
  const fb = String(subSinCategoriaFallback ?? "").trim();
  if (!fb) return "";
  if (rubN && normRubroCmp(fb) === rubN) return "";
  return clampDescripcionCortaFichaDisplay(fb, DESCRIPCION_CARD_MAX_CHARS);
}

export function tieneModalidadLocalFisicoEnChips(chips: string[]): boolean {
  return chips.some((b) => /local\s+f[ií]sico/i.test(String(b)));
}
