import { getAlgoliaAdminIndex } from "@/lib/algoliaServer";
import { resolveQueryFromBusquedaSinonimos } from "@/lib/busquedaSinonimosResolve";
import {
  isResolvedQueryExactGas,
} from "@/lib/gasQueryExcludeGasfiteria";
import { vwPublicRowToBuscarApiItem } from "@/lib/mapVwEmprendedorPublicoToBuscarApiItem";
import type { BuscarApiItem } from "@/lib/mapBuscarItemToEmprendedorCard";
import { normalizeText } from "@/lib/search/normalizeText";
import {
  rotateDeterministicPhotoBuckets,
  SEARCH_ROTATION_WINDOW_MS,
} from "@/lib/search/deterministicRotation";
import { urlTieneFotoListado } from "@/lib/search/sortItemsConFotoPrimero";
import { createSupabaseServerPublicClient } from "@/lib/supabase/server";
import { searchEmprendedoresGlobalText } from "@/lib/resultadosGlobalSupabase";

function s(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
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

const INDEX_NAME =
  process.env.ALGOLIA_INDEX_EMPRENDEDORES ||
  process.env.NEXT_PUBLIC_ALGOLIA_INDEX_EMPRENDEDORES ||
  "emprendedores";

/** Palabras normalizadas → slug subcategoría canónico (no `gasfiteria`; en BD es `gasfiter`). */
const INTENCIONES: Record<string, string> = {
  tortas: "pasteleria",
  pastel: "pasteleria",
  pasteles: "pasteleria",
  cecinas: "carniceria",
  carne: "carniceria",
  fugas: "gasfiter",
  fuga: "gasfiter",
  agua: "gasfiter",
  destapes: "gasfiter",
  destape: "gasfiter",
};

function detectSubcategoria(tokens: string[]): string | null {
  for (const t of tokens) {
    const m = INTENCIONES[t];
    if (m) return m;
  }
  return null;
}

function rowMatchesDetectedSubcategoria(
  row: Record<string, unknown>,
  detectedSub: string
): boolean {
  const target = normalizeText(detectedSub);
  const principal = normalizeText(
    row.subcategoria_slug_final ?? row.subcategoria_slug
  );
  if (principal && principal === target) return true;
  return parseStrArr(row.subcategorias_slugs).some(
    (x) => normalizeText(x) === target
  );
}

function algoliaEnvReady(): boolean {
  return !!(process.env.ALGOLIA_APP_ID && process.env.ALGOLIA_ADMIN_KEY);
}

/**
 * Búsqueda global (sin comuna) vía Algolia (typo tolerance + sinónimos en índice),
 * hidratando fichas desde `vw_emprendedores_publico` para el mismo `BuscarApiItem` que Supabase-only.
 *
 * Si faltan credenciales Algolia o la llamada falla, delega en {@link searchEmprendedoresGlobalText}.
 */
export async function searchEmprendedoresGlobalAlgolia(
  q: string,
  limit = 24,
  opts?: { regionSlug?: string | null }
): Promise<{ items: BuscarApiItem[]; error: string | null }> {
  if (!algoliaEnvReady()) {
    return searchEmprendedoresGlobalText(q, limit, opts);
  }

  try {
    return await searchEmprendedoresGlobalAlgoliaInner(q, limit, opts);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[global-search] Algolia falló; usando Supabase.", msg);
    return searchEmprendedoresGlobalText(q, limit, opts);
  }
}

async function searchEmprendedoresGlobalAlgoliaInner(
  q: string,
  limit: number,
  opts?: { regionSlug?: string | null }
): Promise<{ items: BuscarApiItem[]; error: string | null }> {
  const regionSlug = String(opts?.regionSlug ?? "").trim() || null;
  const supabase = createSupabaseServerPublicClient();

  const inputTerm = String(q ?? "").trim();
  if (isResolvedQueryExactGas(inputTerm)) {
    return { items: [], error: null };
  }

  const resolvedFromSynonyms =
    (await resolveQueryFromBusquedaSinonimos(supabase, inputTerm)) || inputTerm;

  const rawTerm = resolvedFromSynonyms
    .trim()
    .replace(/,/g, " ")
    .slice(0, 120);

  const tokens = normalizeText(rawTerm).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return { items: [], error: null };
  }

  const queryForAlgolia = tokens.join(" ");

  const index = getAlgoliaAdminIndex(INDEX_NAME);

  /** Pedir más hits si hay filtro regional (mismo criterio que antes: filtrar en memoria). */
  const hitsPerPage = regionSlug
    ? Math.min(500, Math.max(limit * 50, 200))
    : Math.min(120, Math.max(limit * 3, limit));

  const result = await index.search(queryForAlgolia, {
    hitsPerPage,
    page: 0,
    facetFilters: [["estado_publicacion:publicado"]],
    attributesToRetrieve: ["slug", "objectID"],
    optionalWords: tokens,
    removeWordsIfNoResults: "allOptional",
    ignorePlurals: true,
    typoTolerance: "min",
  });

  const rawHits = (result.hits || []) as Record<string, unknown>[];
  const seenSlug = new Set<string>();
  const slugsOrdered: string[] = [];
  for (const h of rawHits) {
    const slug = s(h.slug);
    if (!slug || seenSlug.has(slug)) continue;
    seenSlug.add(slug);
    slugsOrdered.push(slug);
  }

  if (slugsOrdered.length === 0) {
    return { items: [], error: null };
  }

  const { data: vwRows, error: vwError } = await supabase
    .from("vw_emprendedores_publico")
    .select("*")
    .eq("estado_publicacion", "publicado")
    .in("slug", slugsOrdered);

  if (vwError) {
    console.error("[global-search] Error hidratando vw_emprendedores_publico:", vwError.message);
    return { items: [], error: vwError.message };
  }

  const bySlug = new Map<string, Record<string, unknown>>();
  for (const row of Array.isArray(vwRows) ? vwRows : []) {
    const r = row as Record<string, unknown>;
    const slug = s(r.slug);
    if (slug) bySlug.set(slug, r);
  }

  const orderedRows: Record<string, unknown>[] = [];
  for (const slug of slugsOrdered) {
    const row = bySlug.get(slug);
    if (row) orderedRows.push(row);
  }

  let rowsFiltered = regionSlug
    ? orderedRows.filter((r) => rowMatchesRegionSlug(r, regionSlug))
    : orderedRows;

  const detectedSub = detectSubcategoria(tokens);
  if (detectedSub) {
    const exact: Record<string, unknown>[] = [];
    const related: Record<string, unknown>[] = [];
    for (const r of rowsFiltered) {
      if (rowMatchesDetectedSubcategoria(r, detectedSub)) exact.push(r);
      else related.push(r);
    }
    rowsFiltered = [...exact, ...related];
  }

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
    "resultados:global_algolia",
  );

  return { items: ordered, error: null };
}
