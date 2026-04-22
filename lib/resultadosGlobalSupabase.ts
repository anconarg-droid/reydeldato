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
import { createSupabaseServerPublicClient } from "@/lib/supabase/server";

/** @deprecated Usar {@link BuscarApiItem}; se mantiene alias por imports antiguos. */
export type GlobalDbItem = BuscarApiItem;

/** Evita que % y _ de la query actúen como comodines en ILIKE. */
function escapeIlikePattern(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function parseStrArr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x ?? "").trim()).filter(Boolean);
}

/** Alinea `region-metropolitana` (cobertura) con `metropolitana` (`regiones.slug`). */
function normRegionSlugForMatch(raw: string): string {
  const t = String(raw ?? "").trim().toLowerCase();
  if (!t) return "";
  return t.replace(/^region-/, "");
}

function rowMatchesRegionSlug(row: Record<string, unknown>, regionSlug: string): boolean {
  const target = normRegionSlugForMatch(regionSlug);
  if (!target) return false;
  const base = normRegionSlugForMatch(String(row.region_slug ?? ""));
  if (base && base === target) return true;
  const cov = parseStrArr(row.regiones_cobertura_slugs_arr).map(normRegionSlugForMatch);
  return cov.some((x) => x === target);
}

/**
 * Techo de filas traídas por la búsqueda de texto antes del filtro regional.
 * Subido desde 400: el orden de la query no prioriza región; con un tope bajo,
 * los primeros N matches podían ser casi todos fuera de la región y el filtro
 * dejaba fuera fichas válidas aun existiendo más abajo en el resultado set.
 */
const GLOBAL_FETCH_CAP_WITH_REGION = 2000;

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
  if (!term) {
    return { items: [], error: null };
  }

  const pattern = `%${escapeIlikePattern(term)}%`;

  const fetchCap = regionSlug
    ? Math.min(GLOBAL_FETCH_CAP_WITH_REGION, Math.max(limit * 50, 200))
    : limit;

  const { data, error } = await supabase
    .from("vw_emprendedores_publico")
    .select("*")
    .eq("estado_publicacion", "publicado")
    .or(
      `nombre_emprendimiento.ilike.${pattern},frase_negocio.ilike.${pattern},descripcion_libre.ilike.${pattern},keywords_finales.cs.{${term}}`
    )
    .limit(fetchCap);

  if (error) {
    return { items: [], error: error.message };
  }

  const rows = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];

  const rowsFiltered = regionSlug
    ? rows.filter((r) => rowMatchesRegionSlug(r, regionSlug))
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
