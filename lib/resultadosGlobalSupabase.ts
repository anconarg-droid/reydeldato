import { vwPublicRowToBuscarApiItem } from "@/lib/mapVwEmprendedorPublicoToBuscarApiItem";
import type { BuscarApiItem } from "@/lib/mapBuscarItemToEmprendedorCard";
import {
  rotateDeterministicPhotoBuckets,
  SEARCH_ROTATION_WINDOW_MS,
} from "@/lib/search/deterministicRotation";
import { urlTieneFotoListado } from "@/lib/search/sortItemsConFotoPrimero";
import { resolveQueryFromBusquedaSinonimos } from "@/lib/busquedaSinonimosResolve";
import {
  isResolvedQueryExactGas,
} from "@/lib/gasQueryExcludeGasfiteria";
import { normalizeText } from "@/lib/search/normalizeText";
import { createSupabaseServerPublicClient } from "@/lib/supabase/server";
import { recordMatchesRegionSlug } from "@/lib/search/regionTerritoryMatch";
import { mapQueryToSubcategorias } from "@/lib/search/mapQueryToSubcategorias";

/** @deprecated Usar {@link BuscarApiItem}; se mantiene alias por imports antiguos. */
export type GlobalDbItem = BuscarApiItem;

/** Evita que % y _ de la query actúen como comodines en ILIKE. */
function escapeIlikePattern(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/**
 * Techo de filas traídas por la búsqueda de texto antes del filtro regional.
 * Subido desde 400: el orden de la query no prioriza región; con un tope bajo,
 * los primeros N matches podían ser casi todos fuera de la región y el filtro
 * dejaba fuera fichas válidas aun existiendo más abajo en el resultado set.
 */
const GLOBAL_FETCH_CAP_WITH_REGION = 2000;

/** Campos de texto en `vw_emprendedores_publico` para ILIKE (sin cambiar ranking posterior). */
/** Solo columnas `text`; `palabras_clave` / `keywords_finales` son `text[]` (usar `.cs`, no ILIKE). */
const GLOBAL_TEXT_ILIKE_FIELDS = [
  "nombre_emprendimiento",
  "frase_negocio",
  "descripcion_libre",
  "categoria_nombre",
  "subcategoria_slug_final",
] as const;

/** Con intención mapeada: no usar descripción, palabras clave ni categoría para “matchear” texto. */
const STRICT_INTENT_ILIKE_FIELDS = [
  "nombre_emprendimiento",
  "frase_negocio",
  "subcategoria_slug_final",
] as const;

/**
 * Arma la cláusula `or` de PostgREST: ILIKE en cada campo + contención exacta en `keywords_finales`.
 */
function buildGlobalTextOrFilter(normTerm: string): string {
  const p = `%${escapeIlikePattern(normTerm)}%`;
  const ilike = GLOBAL_TEXT_ILIKE_FIELDS.map((f) => `${f}.ilike.${p}`).join(",");
  return `${ilike},keywords_finales.cs.{${normTerm}}`;
}

/**
 * Variantes de un solo paso para tolerar errores de tipeo (p. ej. "psteleria" → insertar vocal → "pasteleria").
 * Acotado para no inflar la query; solo se usa si la búsqueda estricta no devuelve filas.
 */
function typoRelaxationCandidates(norm: string, max = 14): string[] {
  const t = norm.trim();
  if (t.length < 4) return [];
  const out = new Set<string>();
  const vowels = ["a", "e", "i", "o", "u"] as const;
  for (let i = 0; i <= t.length && out.size < max; i++) {
    for (const v of vowels) {
      out.add(t.slice(0, i) + v + t.slice(i));
      if (out.size >= max) break;
    }
  }
  for (let i = 0; i < t.length && out.size < max; i++) {
    out.add(t.slice(0, i) + t.slice(i + 1));
  }
  for (let i = 0; i < t.length - 1 && out.size < max; i++) {
    const ch = [...t];
    [ch[i], ch[i + 1]] = [ch[i + 1], ch[i]];
    out.add(ch.join(""));
  }
  out.delete(t);
  return [...out].slice(0, max);
}

function buildStrictIntentTextOrFilter(normTerm: string): string {
  const p = `%${escapeIlikePattern(normTerm)}%`;
  const ilike = STRICT_INTENT_ILIKE_FIELDS.map((f) => `${f}.ilike.${p}`).join(",");
  return `${ilike},keywords_finales.cs.{${normTerm}}`;
}

async function fetchGlobalTextRowsBroad(
  supabase: ReturnType<typeof createSupabaseServerPublicClient>,
  normTerm: string,
  fetchCap: number
): Promise<Record<string, unknown>[]> {
  const primaryOr = buildGlobalTextOrFilter(normTerm);
  const { data, error } = await supabase
    .from("vw_emprendedores_publico")
    .select("*")
    .eq("estado_publicacion", "publicado")
    .or(primaryOr)
    .limit(fetchCap);
  if (error) {
    console.error("[global-search] fallback amplio:", error.message);
    return [];
  }
  return Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
}

function buildGlobalTextOrFilterFromPatterns(patterns: string[]): string {
  const parts: string[] = [];
  const seenCs = new Set<string>();
  for (const raw of patterns) {
    const term = raw.trim();
    if (!term) continue;
    const p = `%${escapeIlikePattern(term)}%`;
    for (const f of GLOBAL_TEXT_ILIKE_FIELDS) {
      parts.push(`${f}.ilike.${p}`);
    }
    if (!seenCs.has(term)) {
      seenCs.add(term);
      parts.push(`keywords_finales.cs.{${term}}`);
    }
  }
  return parts.join(",");
}

/**
 * Búsqueda global (sin comuna) sobre `vw_emprendedores_publico` — **mismo enriquecimiento**
 * que la home (últimos emprendimientos): locales, modalidades, cobertura con slugs, región RM, etc.
 */
export async function searchEmprendedoresGlobalText(
  q: string,
  limit = 24,
  opts?: { regionSlug?: string | null }
): Promise<{ items: BuscarApiItem[]; error: string | null }> {
  const regionSlug = String(opts?.regionSlug ?? "").trim() || null;

  const supabase = createSupabaseServerPublicClient();

  const inputTerm = String(q ?? "").trim();
  // Regla producto: "gas" exacto NO debe devolver resultados.
  // - NO usar fallback de texto
  // - Retornar lista vacía
  if (isResolvedQueryExactGas(inputTerm)) {
    return { items: [], error: null };
  }

  const resolvedFromSynonyms =
    (await resolveQueryFromBusquedaSinonimos(supabase, inputTerm)) || inputTerm;

  const term = resolvedFromSynonyms
    .trim()
    .replace(/,/g, " ")
    .slice(0, 120);
  /** Misma normalización que el resto del buscador: minúsculas, sin tildes, espacios colapsados. */
  const normTerm = normalizeText(term);
  if (!normTerm) {
    return { items: [], error: null };
  }

  const fetchCap = regionSlug
    ? Math.min(GLOBAL_FETCH_CAP_WITH_REGION, Math.max(limit * 50, 200))
    : limit;

  const intentSlugs = mapQueryToSubcategorias(normTerm);

  let rows: Record<string, unknown>[] = [];

  if (intentSlugs?.length) {
    const strictOr = buildStrictIntentTextOrFilter(normTerm);
    let res = await supabase
      .from("vw_emprendedores_publico")
      .select("*")
      .eq("estado_publicacion", "publicado")
      .in("subcategoria_slug_final", intentSlugs)
      .or(strictOr)
      .limit(fetchCap);
    if (res.error) {
      return { items: [], error: res.error.message };
    }
    rows = Array.isArray(res.data) ? (res.data as Record<string, unknown>[]) : [];
    if (rows.length === 0) {
      res = await supabase
        .from("vw_emprendedores_publico")
        .select("*")
        .eq("estado_publicacion", "publicado")
        .in("subcategoria_slug_final", intentSlugs)
        .limit(fetchCap);
      if (res.error) {
        return { items: [], error: res.error.message };
      }
      rows = Array.isArray(res.data) ? (res.data as Record<string, unknown>[]) : [];
    }
    if (
      rows.length === 0 &&
      normTerm.length >= 4 &&
      !isResolvedQueryExactGas(inputTerm)
    ) {
      const alts = typoRelaxationCandidates(normTerm, 14);
      for (const alt of alts) {
        const altOr = buildStrictIntentTextOrFilter(alt);
        const r2 = await supabase
          .from("vw_emprendedores_publico")
          .select("*")
          .eq("estado_publicacion", "publicado")
          .in("subcategoria_slug_final", intentSlugs)
          .or(altOr)
          .limit(fetchCap);
        if (r2.error) {
          return { items: [], error: r2.error.message };
        }
        const chunk = Array.isArray(r2.data) ? (r2.data as Record<string, unknown>[]) : [];
        if (chunk.length) {
          rows = chunk;
          break;
        }
      }
      if (rows.length === 0) {
        const r3 = await supabase
          .from("vw_emprendedores_publico")
          .select("*")
          .eq("estado_publicacion", "publicado")
          .in("subcategoria_slug_final", intentSlugs)
          .limit(fetchCap);
        if (r3.error) {
          return { items: [], error: r3.error.message };
        }
        rows = Array.isArray(r3.data) ? (r3.data as Record<string, unknown>[]) : [];
      }
    }

    /** Rubro mapeado pero sin fichas con ese `subcategoria_slug_final`: ampliar a texto/keywords. */
    if (rows.length === 0) {
      rows = await fetchGlobalTextRowsBroad(supabase, normTerm, fetchCap);
    }
  } else {
    const tokens = normTerm.split(/\s+/).filter(Boolean);
    const buscaNombrePrimero =
      normTerm.length >= 3 &&
      (tokens.length === 1 ||
        (tokens.length >= 2 &&
          tokens.length <= 5 &&
          tokens.every((t) => t.length >= 2)));
    if (buscaNombrePrimero) {
      const nombrePattern = `%${escapeIlikePattern(normTerm)}%`;
      const nombreRes = await supabase
        .from("vw_emprendedores_publico")
        .select("*")
        .eq("estado_publicacion", "publicado")
        .ilike("nombre_emprendimiento", nombrePattern)
        .limit(fetchCap);
      if (nombreRes.error) {
        return { items: [], error: nombreRes.error.message };
      }
      rows = Array.isArray(nombreRes.data)
        ? (nombreRes.data as Record<string, unknown>[])
        : [];
    }

    if (rows.length === 0) {
      const primaryOr = buildGlobalTextOrFilter(normTerm);

      const { data, error } = await supabase
        .from("vw_emprendedores_publico")
        .select("*")
        .eq("estado_publicacion", "publicado")
        .or(primaryOr)
        .limit(fetchCap);

      if (error) {
        return { items: [], error: error.message };
      }

      rows = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
    }

    if (
      rows.length === 0 &&
      normTerm.length >= 4 &&
      !isResolvedQueryExactGas(inputTerm)
    ) {
      const alts = typoRelaxationCandidates(normTerm, 14);
      if (alts.length) {
        const fallbackOr = buildGlobalTextOrFilterFromPatterns(alts);
        const res = await supabase
          .from("vw_emprendedores_publico")
          .select("*")
          .eq("estado_publicacion", "publicado")
          .or(fallbackOr)
          .limit(fetchCap);
        if (res.error) {
          return { items: [], error: res.error.message };
        }
        rows = Array.isArray(res.data) ? (res.data as Record<string, unknown>[]) : [];
      }
    }
  }

  const rowsFiltered = regionSlug
    ? rows.filter((r) => recordMatchesRegionSlug(r, regionSlug))
    : rows;

  const sliced = rowsFiltered.slice(0, limit);

  const items: BuscarApiItem[] = [];

  for (const r of sliced) {
    const item = vwPublicRowToBuscarApiItem(r);
    if (item) items.push(item);
  }

  const ordered = rotateDeterministicPhotoBuckets(
    items,
    (it) => String(it.slug ?? it.id ?? ""),
    (it) => urlTieneFotoListado(it.fotoPrincipalUrl),
    SEARCH_ROTATION_WINDOW_MS,
    "resultados:global_texto",
  );

  return { items: ordered, error: null };
}
