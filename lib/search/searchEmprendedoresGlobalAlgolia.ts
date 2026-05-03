import { getAlgoliaAdminIndex } from "@/lib/algoliaServer";
import { resolveQueryFromBusquedaSinonimos } from "@/lib/busquedaSinonimosResolve";
import {
  isResolvedQueryExactGas,
} from "@/lib/gasQueryExcludeGasfiteria";
import { vwPublicRowToBuscarApiItem } from "@/lib/mapVwEmprendedorPublicoToBuscarApiItem";
import type { BuscarApiItem } from "@/lib/mapBuscarItemToEmprendedorCard";
import { normalizeText } from "@/lib/search/normalizeText";
import { rotationSeed, SEARCH_ROTATION_WINDOW_MS } from "@/lib/search/deterministicRotation";
import { createSupabaseServerPublicClient } from "@/lib/supabase/server";
import { searchEmprendedoresGlobalText } from "@/lib/resultadosGlobalSupabase";

export type EmprendedorGlobalAlgoliaScoreCtx = {
  comunaSlug?: string | null;
  detectedSub?: string | null;
};

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/** Foto principal o flag auxiliar desde fila vista (camelCase/snake opcional). */
export function hasFotos(item: BuscarApiItem): boolean {
  const ext = item as BuscarApiItem & { tiene_fotos?: unknown; tieneFotos?: unknown };
  return Boolean(item.fotoPrincipalUrl || ext.tiene_fotos || ext.tieneFotos);
}

/** Puntuación heurística (rubro / comuna / calidad superficial); sin usar clics. */
export function computeScore(
  item: BuscarApiItem,
  ctx: EmprendedorGlobalAlgoliaScoreCtx
): number {
  let score = 0;

  const detected = normalizeText(ctx.detectedSub ?? "");
  if (detected && item.subcategoriasSlugs?.some((x) => normalizeText(x) === detected)) {
    score += 50;
  }

  const comunaWanted = String(ctx.comunaSlug ?? "").trim();
  const baseSlug = normalizeText(item.comunaBaseSlug ?? "");
  if (comunaWanted && baseSlug === normalizeText(comunaWanted)) {
    score += 40;
  }

  if (comunaWanted) {
    const cov = item.comunasCobertura ?? [];
    const n = normalizeText(comunaWanted);
    if (cov.some((c) => normalizeText(c) === n)) {
      score += 25;
    }
  }

  if (hasFotos(item)) score += 15;
  const desc = String(item.descripcion ?? "").trim();
  if (desc.length > 0) score += 5;

  return score;
}

/** Misma ventana que la rotación de listados (5 min). */
export function getRotationSeed(): number {
  return rotationSeed(SEARCH_ROTATION_WINDOW_MS);
}

export function stableShuffle<T>(arr: T[], seed: number): T[] {
  const s = String(seed);
  return [...arr].sort((a, b) => {
    const ha = hash(JSON.stringify(a) + s);
    const hb = hash(JSON.stringify(b) + s);
    return ha - hb;
  });
}

function stableShuffleKeyed<T>(items: T[], seed: number, keyFn: (item: T) => string): T[] {
  const suf = String(seed);
  return [...items].sort(
    (a, b) => hash(String(keyFn(a)) + suf) - hash(String(keyFn(b)) + suf),
  );
}

/** Fila vista + ítem público ya mapeado (evita doble trabajo en score vs fotos). */
type VwRowPacked = { row: Record<string, unknown>; item: BuscarApiItem };

/** Orden: score descendente → bloques comuna → con foto primero dentro de cada bloque → shuffle estable. */
function orderPackedGlobalAlgolia(
  packed: VwRowPacked[],
  ctx: EmprendedorGlobalAlgoliaScoreCtx,
  seed: number
): VwRowPacked[] {
  const sorted = [...packed].sort(
    (a, b) => computeScore(b.item, ctx) - computeScore(a.item, ctx),
  );

  const splitByFoto = (ps: VwRowPacked[]) => {
    const con: VwRowPacked[] = [];
    const sin: VwRowPacked[] = [];
    for (const p of ps) {
      (hasFotos(p.item) ? con : sin).push(p);
    }
    return {
      shuffleCon: stableShuffleKeyed(con, seed, (p) => p.item.slug ?? p.item.id ?? ""),
      shuffleSin: stableShuffleKeyed(sin, seed, (p) => p.item.slug ?? p.item.id ?? ""),
    };
  };

  const bucketMerged = (ps: VwRowPacked[]) => {
    const { shuffleCon, shuffleSin } = splitByFoto(ps);
    return [...shuffleCon, ...shuffleSin];
  };

  const comunaRaw = String(ctx.comunaSlug ?? "").trim();
  if (!comunaRaw) {
    return bucketMerged(sorted);
  }

  const w = normalizeText(comunaRaw);
  const baseP: VwRowPacked[] = [];
  const atiendenP: VwRowPacked[] = [];
  const restP: VwRowPacked[] = [];

  for (const p of sorted) {
    const bSlug = normalizeText(p.item.comunaBaseSlug ?? "");
    if (bSlug === w) {
      baseP.push(p);
    } else if ((p.item.comunasCobertura ?? []).some((c) => normalizeText(c) === w)) {
      atiendenP.push(p);
    } else {
      restP.push(p);
    }
  }

  return [
    ...bucketMerged(baseP),
    ...bucketMerged(atiendenP),
    ...bucketMerged(restP),
  ];
}

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

/** Rubros que Algolia suele confundir por similitud tipográfica con costura (p. ej. costurera vs costanera). */
const PRINCIPAL_SLUG_PASTRY_OR_BREAD = new Set(["pasteleria", "panaderia"]);

function tokensExplicitPastryOrBread(tokens: string[]): boolean {
  const want = new Set([
    "pasteleria",
    "pastel",
    "pasteles",
    "tortas",
    "torta",
    "milhojas",
    "berlines",
    "panaderia",
    "pan",
    "panes",
    "facturas",
  ]);
  return tokens.some((t) => want.has(t));
}

function tokensSuggestCosturaTailoring(tokens: string[]): boolean {
  for (const t of tokens) {
    if (t === "modista" || t === "modistas" || t === "sastre" || t === "sastres")
      return true;
    if (
      t === "costura" ||
      t === "costuras" ||
      t === "costurera" ||
      t === "costureras"
    )
      return true;
    // costur*, longitud suficiente para no confundir con "costo", "costillas", etc.
    if (t.startsWith("costur") && t.length >= 7) return true;
  }
  return false;
}

function rowPrincipalPasteleriaOrPanaderia(row: Record<string, unknown>): boolean {
  const sub = normalizeText(row.subcategoria_slug_final ?? row.subcategoria_slug);
  return PRINCIPAL_SLUG_PASTRY_OR_BREAD.has(sub);
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
  opts?: { regionSlug?: string | null; comunaSlug?: string | null }
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
  opts?: { regionSlug?: string | null; comunaSlug?: string | null }
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

  const detectedSub = detectSubcategoria(tokens);

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
    optionalWords: tokens.length > 1 ? tokens : undefined,
    removeWordsIfNoResults: "allOptional",
    ignorePlurals: true,
    typoTolerance: "min",
    ...(detectedSub ? { filters: `subcategoria_slug:"${detectedSub}"` } : {}),
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

  /* Si el foco regional (p. ej. RM por IP) vacía el set pero Algolia sí encontró coincidencias
   * en otra región —p. ej. "reiki" en Maule—, mostrar esos hits en lugar de cero resultados. */
  if (regionSlug && rowsFiltered.length === 0 && orderedRows.length > 0) {
    rowsFiltered = orderedRows;
  }

  if (
    tokensSuggestCosturaTailoring(tokens) &&
    !tokensExplicitPastryOrBread(tokens)
  ) {
    rowsFiltered = rowsFiltered.filter((r) => !rowPrincipalPasteleriaOrPanaderia(r));
  }

  const scoreCtx: EmprendedorGlobalAlgoliaScoreCtx = {
    comunaSlug: String(opts?.comunaSlug ?? "").trim() || null,
    detectedSub,
  };

  const packed: VwRowPacked[] = [];
  for (const r of rowsFiltered) {
    const item = vwPublicRowToBuscarApiItem(r);
    if (item) packed.push({ row: r, item });
  }

  const seed = getRotationSeed();
  const orderedPacked = orderPackedGlobalAlgolia(packed, scoreCtx, seed);
  const items = orderedPacked.slice(0, limit).map((p) => p.item);

  return { items, error: null };
}
