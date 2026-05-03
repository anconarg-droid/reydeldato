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

/** Término suelto normalizado → slug de subcategoría canónico (alineado a `lib/categoriasCatalogo` / seeds). */
const INTENT_TOKEN_MAP: Record<string, string> = {
  cecinas: "carniceria",
  carne: "carniceria",
  fugas: "gasfiter",
  fuga: "gasfiter",
  agua: "gasfiter",
  destape: "gasfiter",
  destapes: "gasfiter",
  pastel: "pasteleria",
  pasteles: "pasteleria",
};

const INTENT_TARGET_SLUGS = new Set(Object.values(INTENT_TOKEN_MAP));

function mapQueryTokensByIntent(raw: string): string {
  const parts = raw.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  return parts
    .map((t) => {
      const key = normalizeText(t);
      return INTENT_TOKEN_MAP[key] ?? t;
    })
    .join(" ");
}

function detectIntentSubcategoriaSlug(queryFinal: string): string | null {
  const tokens = normalizeText(queryFinal).split(/\s+/).filter(Boolean);
  for (const tok of tokens) {
    if (INTENT_TARGET_SLUGS.has(tok)) return tok;
  }
  return null;
}

function rowMatchesIntentSubcategoria(
  row: Record<string, unknown>,
  slug: string
): boolean {
  const target = normalizeText(slug);
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

  const term = resolvedFromSynonyms
    .trim()
    .replace(/,/g, " ")
    .slice(0, 120);
  const normTerm = normalizeText(term);
  if (!normTerm) {
    return { items: [], error: null };
  }

  const queryForAlgolia = mapQueryTokensByIntent(term);

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
    advancedSyntax: true,
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

  const detectedSlug = detectIntentSubcategoriaSlug(queryForAlgolia);
  if (detectedSlug) {
    const exact: Record<string, unknown>[] = [];
    const related: Record<string, unknown>[] = [];
    for (const r of rowsFiltered) {
      if (rowMatchesIntentSubcategoria(r, detectedSlug)) exact.push(r);
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
