import { normalizeText } from "@/lib/search/normalizeText";

/**
 * Mapea una consulta de búsqueda global (término normalizado) a slugs de
 * `subcategoria_slug_final` permitidos. Si no hay mapeo, devuelve `null` y
 * la búsqueda sigue el camino amplio actual.
 *
 * Slugs alineados con `subcategoria_slug_final` en BD (p. ej. `gasfiteria`, `peluqueria`, …).
 * `yoga` a propósito sin entrada: suele ir en keywords/tags de holísticos con otro slug final.
 */
const QUERY_KEY_TO_SUBS: Record<string, string[]> = {
  peluquero: ["peluqueria", "barberia"],
  peluqueria: ["peluqueria", "barberia"],
  barbero: ["barberia"],
  barberia: ["barberia"],
  reiki: ["terapias_alternativas"],
  tarot: ["terapias_alternativas"],
  gasfiter: ["gasfiteria"],
  gasfiteria: ["gasfiteria"],
  gasfitería: ["gasfiteria"],
  plomero: ["gasfiteria"],
  plomeria: ["gasfiteria"],
  plomería: ["gasfiteria"],
  carniceria: ["carniceria"],
  carnicero: ["carniceria"],
  cecinas: ["carniceria"],
};

export function mapQueryToSubcategorias(query: string): string[] | null {
  const raw = String(query ?? "").trim();
  if (!raw) return null;
  const norm = normalizeText(raw);
  if (!norm) return null;

  const tokens = norm.split(/\s+/).filter(Boolean);
  const candidates = [norm, ...tokens];
  const seen = new Set<string>();
  for (const key of candidates) {
    const slugs = QUERY_KEY_TO_SUBS[key];
    if (!slugs?.length) continue;
    const out: string[] = [];
    for (const s of slugs) {
      const t = String(s ?? "").trim().toLowerCase();
      if (!t || seen.has(t)) continue;
      seen.add(t);
      out.push(t);
    }
    if (out.length) return out;
  }
  return null;
}
