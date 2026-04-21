import { formatComunaRegion } from "@/lib/productRules";
import { humanizeCoverageSlug } from "@/lib/search/atiendeResumenLabel";
import { normalizarSlug } from "@/lib/slugify";

function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function normSlug(v: unknown): string {
  return normalizarSlug(s(v));
}

function arr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => s(x)).filter(Boolean);
}

/** Alinea slugs tipo `region-metropolitana` (cobertura) con `metropolitana` (`regiones.slug`). */
function normRegionSlugComparable(v: unknown): string {
  return normSlug(v).replace(/^region-/, "");
}

function regionCoberturaIncluyeRegionComuna(
  regionComunaNorm: string,
  regionesCoberturaNorm: string[],
): boolean {
  if (!regionComunaNorm || !regionesCoberturaNorm.length) return false;
  return regionesCoberturaNorm.some(
    (cov) => normRegionSlugComparable(cov) === regionComunaNorm,
  );
}

/** Bloque bajo el nombre en ficha completa: base explícita + contexto de búsqueda. */
export type BloqueUbicacionFicha = {
  lineaPin: string | null;
  lineaBase: string | null;
  lineaAtiendeTambien: string | null;
  /** Evita duplicar “Cobertura en: …” cuando ya se explicó la comuna buscada. */
  ocultarAtiendeEnLineaGenerica: boolean;
};

function atiendeComunaBuscada(input: {
  comunaBuscadaSlug: string;
  coberturaTipo?: string | null;
  comunasCobertura?: string[] | null;
  comunasCoberturaSlugs?: string[] | null;
  comunaBuscadaRegionSlug?: string | null;
  regionesCoberturaSlugs?: string[] | null;
}): boolean {
  const comunaBuscada = normSlug(input.comunaBuscadaSlug);
  if (!comunaBuscada) return false;

  const tipo = normSlug(input.coberturaTipo);
  const comunasSlugs = arr(input.comunasCoberturaSlugs).map(normSlug).filter(Boolean);
  const comunasLabels = arr(input.comunasCobertura).map(normSlug).filter(Boolean);

  const incluyeComunaPorLista =
    comunasSlugs.includes(comunaBuscada) ||
    comunasLabels.some((x) => x === comunaBuscada || x.includes(comunaBuscada));

  if (tipo === "nacional") return true;
  if (tipo === "varias_comunas" && incluyeComunaPorLista) return true;

  const regionBuscadaComparable = normRegionSlugComparable(
    input.comunaBuscadaRegionSlug || "",
  );
  const regionesCovComparable = arr(input.regionesCoberturaSlugs)
    .map(normRegionSlugComparable)
    .filter(Boolean);
  if (
    (tipo === "varias_regiones" || tipo === "regional") &&
    regionBuscadaComparable &&
    regionCoberturaIncluyeRegionComuna(regionBuscadaComparable, regionesCovComparable)
  ) {
    return true;
  }

  return false;
}

/**
 * Reglas producto:
 * - Siempre que haya comuna base: 📍 base · región, y “Base en {base}”.
 * - Si hay comuna buscada ≠ base y atiende esa comuna: “Atiende en {buscada}” y ocultar línea genérica “Cobertura en: …”.
 */
export function getBloqueUbicacionFicha(input: {
  comunaBuscadaSlug: string;
  comunaBuscadaNombre?: string | null;
  /** Región de la comuna buscada (p. ej. desde `comunas.region_slug`). */
  comunaBuscadaRegionSlug?: string | null;

  comunaBaseSlug?: string | null;
  comunaBaseNombre?: string | null;
  regionNombre?: string | null;
  regionSlug?: string | null;

  coberturaTipo?: string | null;
  comunasCobertura?: string[] | null;
  comunasCoberturaSlugs?: string[] | null;
  regionesCoberturaSlugs?: string[] | null;
}): BloqueUbicacionFicha {
  const baseNombre = s(input.comunaBaseNombre);
  if (!baseNombre) {
    return {
      lineaPin: null,
      lineaBase: null,
      lineaAtiendeTambien: null,
      ocultarAtiendeEnLineaGenerica: false,
    };
  }

  const lineaPin =
    formatComunaRegion({
      comunaNombre: baseNombre,
      regionNombre: input.regionNombre,
      regionSlug: input.regionSlug,
    }) || null;

  const lineaBase = `Base en ${baseNombre}`;

  const buscadaSlug = normSlug(input.comunaBuscadaSlug);
  const baseSlug = normSlug(input.comunaBaseSlug);

  if (!buscadaSlug) {
    return {
      lineaPin,
      lineaBase,
      lineaAtiendeTambien: null,
      ocultarAtiendeEnLineaGenerica: false,
    };
  }

  if (baseSlug && baseSlug === buscadaSlug) {
    return {
      lineaPin,
      lineaBase,
      lineaAtiendeTambien: null,
      ocultarAtiendeEnLineaGenerica: false,
    };
  }

  const nombreBuscada =
    s(input.comunaBuscadaNombre) || humanizeCoverageSlug(buscadaSlug);

  const atiende = atiendeComunaBuscada({
    comunaBuscadaSlug: buscadaSlug,
    coberturaTipo: input.coberturaTipo,
    comunasCobertura: input.comunasCobertura,
    comunasCoberturaSlugs: input.comunasCoberturaSlugs,
    comunaBuscadaRegionSlug: input.comunaBuscadaRegionSlug,
    regionesCoberturaSlugs: input.regionesCoberturaSlugs,
  });

  if (atiende) {
    return {
      lineaPin,
      lineaBase,
      lineaAtiendeTambien: `Atiende en ${nombreBuscada}`,
      ocultarAtiendeEnLineaGenerica: true,
    };
  }

  return {
    lineaPin,
    lineaBase,
    lineaAtiendeTambien: null,
    ocultarAtiendeEnLineaGenerica: false,
  };
}
