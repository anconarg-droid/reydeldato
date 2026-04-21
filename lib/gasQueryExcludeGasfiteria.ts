import { slugify } from "@/lib/slugify";

function s(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

/** Slugs de rubro plomería / gasfitería a excluir cuando la búsqueda es solo "gas" (venta de gas). */
const GASFITERIA_SUBTAG_SLUGS = new Set(["gasfiteria", "gasfiter"]);

function slugNorm(raw: unknown): string {
  return slugify(s(raw));
}

/**
 * Hit de Algolia: categoría o subcategorías o tags alineados con gasfitería/plomería.
 */
export function algoliaHitIsGasfiteriaRubro(hit: Record<string, unknown>): boolean {
  if (slugNorm(hit.categoria_slug) === "gasfiteria") return true;

  const subs = hit.subcategorias_slugs_arr;
  if (Array.isArray(subs)) {
    for (const x of subs) {
      const u = slugNorm(x);
      if (GASFITERIA_SUBTAG_SLUGS.has(u)) return true;
    }
  }

  const tags = hit.tags_slugs;
  if (Array.isArray(tags)) {
    for (const x of tags) {
      const u = slugNorm(x);
      if (GASFITERIA_SUBTAG_SLUGS.has(u)) return true;
    }
  }

  return false;
}

/**
 * Fila `vw_emprendedores_publico` antes de mapear a `BuscarApiItem`.
 */
export function vwRowIsGasfiteriaRubro(row: Record<string, unknown>): boolean {
  if (slugNorm(row.categoria_slug_final ?? row.categoria_slug) === "gasfiteria") {
    return true;
  }

  if (GASFITERIA_SUBTAG_SLUGS.has(slugNorm(row.subcategoria_slug_final))) {
    return true;
  }

  const subSlugs = row.subcategorias_slugs;
  if (Array.isArray(subSlugs)) {
    for (const x of subSlugs) {
      if (GASFITERIA_SUBTAG_SLUGS.has(slugNorm(x))) return true;
    }
  }

  const tags = row.tags_slugs;
  if (Array.isArray(tags)) {
    for (const x of tags) {
      if (GASFITERIA_SUBTAG_SLUGS.has(slugNorm(x))) return true;
    }
  }

  return false;
}

export function isResolvedQueryExactGas(query: string): boolean {
  return s(query).toLowerCase() === "gas";
}

/** Texto o slug que evoca gasfitería / plomería (para filtrar sugerencias cuando la query es solo "gas"). */
export function mentionsGasfiteria(text: string): boolean {
  const t = s(text);
  if (!t) return false;
  const folded = t
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ");
  if (folded.includes("gasfiter") || folded.includes("gasfiteria")) return true;
  return GASFITERIA_SUBTAG_SLUGS.has(slugify(t));
}

/** Forma mínima de sugerencia de autocomplete (API + cliente). */
export type GasAutocompleteSuggestion =
  | { type: "intent"; label: string; value: string; url: string }
  | { type: "intent_comuna"; label: string; value: string; comuna: string; url: string }
  | { type: "comuna"; label: string; comuna: string; url: string }
  | { type: "sector"; label: string; sector: string; url: string };

export function suggestionMentionsGasfiteria(s: GasAutocompleteSuggestion): boolean {
  switch (s.type) {
    case "intent":
      return (
        mentionsGasfiteria(s.label) ||
        mentionsGasfiteria(s.value) ||
        mentionsGasfiteria(s.url)
      );
    case "intent_comuna":
      return (
        mentionsGasfiteria(s.label) ||
        mentionsGasfiteria(s.value) ||
        mentionsGasfiteria(s.url)
      );
    case "sector":
      return (
        mentionsGasfiteria(s.label) ||
        mentionsGasfiteria(s.sector) ||
        mentionsGasfiteria(s.url)
      );
    case "comuna":
      return (
        mentionsGasfiteria(s.label) ||
        mentionsGasfiteria(s.comuna) ||
        mentionsGasfiteria(s.url)
      );
    default:
      return false;
  }
}
