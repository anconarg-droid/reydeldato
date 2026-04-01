/**
 * Búsqueda vía Algolia (solo lectura).
 * Fuente de verdad: Supabase. Algolia se usa solo para búsqueda rápida.
 * Ranking cuando hay comuna: 1) base 2) cobertura 3) regional 4) nacional.
 */
import { NextRequest, NextResponse } from "next/server";
import { getAlgoliaAdminIndex } from "@/lib/algoliaServer";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slugify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Mismo índice que app/api/reindex/emprendedores/route.ts (emprendedores)
const INDEX_NAME = process.env.ALGOLIA_INDEX_EMPRENDEDORES || "emprendedores";

const IS_DEV = process.env.NODE_ENV !== "production";

function s(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

/** Slug normalizado (minúsculas, sin acentos, guiones). Mismo criterio que `slugify`. */
function normSlug(value: unknown): string {
  return slugify(s(value));
}

function arr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x).trim().toLowerCase()).filter(Boolean);
}

type Tier = "base" | "cobertura" | "regional" | "nacional" | "general";

function tierRank(tier: Tier): number {
  switch (tier) {
    case "base": return 1;
    case "cobertura": return 2;
    case "regional": return 3;
    case "nacional": return 4;
    default: return 5;
  }
}

function getTier(
  hit: { comuna_base_slug?: string; comunas_cobertura_slugs_arr?: string[]; nivel_cobertura?: string },
  comunaSlug: string
): Tier {
  if (!comunaSlug) return "general";
  const base = slugify(s(hit.comuna_base_slug));
  const cobertura = arr(hit.comunas_cobertura_slugs_arr);
  const nivel = s(hit.nivel_cobertura).toLowerCase();

  if (base === comunaSlug) return "base";
  if (cobertura.includes(comunaSlug)) return "cobertura";
  if (nivel === "regional" || nivel === "varias_regiones") return "regional";
  if (nivel === "nacional") return "nacional";
  return "general";
}

// Ranking territorial numérico según reglas del producto
// 1) comuna base = comuna buscada   -> 100
// 2) coverage_keys contiene comuna  -> 80
// 3) nivel_cobertura = regional     -> 50
// 4) nivel_cobertura = nacional     -> 20
// else                             -> 0
function rankTerritorial(
  hit: {
    comuna_base_slug?: string;
    coverage_keys?: string[];
    nivel_cobertura?: string;
  },
  comunaSlug: string,
  regionKey?: string
): number {
  if (!comunaSlug) return 0;

  const base = slugify(s(hit.comuna_base_slug));
  const keys = arr(hit.coverage_keys);
  const nivel = s(hit.nivel_cobertura).toLowerCase();

  // 4: comuna base exacta = comuna buscada
  if (base === comunaSlug) return 4;

  // 3: coverage_keys contiene comuna buscada
  if (keys.includes(comunaSlug)) return 3;

  // 2: coverage_keys contiene la región (convención única: "region:<slug>")
  if (regionKey && keys.includes(regionKey)) {
    return 2;
  }

  // 1: cobertura nacional
  if (
    keys.includes("nacional") ||
    keys.includes("pais:chile") ||
    nivel === "nacional"
  ) {
    return 1;
  }

  // 0: resto
  return 0;
}

function rankTextMatch(
  hit: {
    nombre?: string;
    tags_slugs?: string[];
    keywords_clasificacion?: string[];
    sector_slug?: string;
  },
  q: string
): number {
  const rawQuery = s(q).toLowerCase();
  if (!rawQuery) return 0;

  const nombre = s(hit.nombre).toLowerCase();
  const tags = arr(hit.tags_slugs);
  const kwClasif = arr(hit.keywords_clasificacion);
  const sectorSlug = s(hit.sector_slug).toLowerCase();

  const tokens = rawQuery
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);

  let score = 0;

  // Coincidencia en nombre (como antes, pero ligeramente ajustado)
  if (nombre && rawQuery.length >= 2 && nombre.includes(rawQuery)) {
    score += 40;
  }

  // Boost por tags_slugs: más fuerte cuando el token coincide exactamente
  if (tags.length && tokens.length) {
    for (const tag of tags) {
      const t = tag.toLowerCase();
      if (t.length < 3) continue; // evitar ruido de tags muy cortos
      for (const tok of tokens) {
        if (tok.length < 2) continue;
        if (t === tok) {
          score += 30;
        } else if (t.includes(tok)) {
          score += 12;
        }
      }
    }
  }

  // Boost por keywords_clasificacion (más suave que tags)
  if (kwClasif.length && tokens.length) {
    for (const kw of kwClasif) {
      const k = kw.toLowerCase();
      if (k.length < 3) continue;
      for (const tok of tokens) {
        if (tok.length < 2) continue;
        if (k === tok) {
          score += 18;
        } else if (k.includes(tok)) {
          score += 8;
        }
      }
    }
  }

  // Pequeño boost por sector_slug si coincide directamente
  if (sectorSlug && tokens.length) {
    for (const tok of tokens) {
      if (sectorSlug === tok) {
        score += 10;
      }
    }
  }

  // Limitar el impacto total del texto para no superar demasiado al ranking territorial
  if (score > 80) score = 80;

  return score;
}

// Puntaje de calidad liviano para desempates (máx 10; nunca le gana al territorio).
function qualityScore(hit: {
  foto_principal_url?: string | null;
  descripcion_larga?: string | null;
  tags_slugs?: string[] | null;
  whatsapp?: string | null;
  coverage_keys?: string[] | null;
  nivel_cobertura?: string | null;
}): number {
  let score = 0;

  if (!!s(hit.foto_principal_url)) score += 2;

  const descLarga = s(hit.descripcion_larga);
  if (descLarga.length >= 80) score += 2;
  else if (descLarga.length >= 20) score += 1;

  const tagsCount = arr(hit.tags_slugs).length;
  if (tagsCount >= 3) score += 2;
  else if (tagsCount > 0) score += 1;

  if (s(hit.whatsapp)) score += 2;

  const keys = arr(hit.coverage_keys);
  const nivel = s(hit.nivel_cobertura).toLowerCase();
  if (
    keys.length > 0 ||
    ["comuna", "solo_mi_comuna", "comunas", "regional", "varias_regiones", "nacional"].includes(nivel)
  ) {
    score += 2;
  }

  if (score > 10) score = 10;
  return score;
}

type ParsedInput = {
  q: string;
  comunaRaw: string;
  comunaSlug: string;
  sectorSlugFilter: string;
  tipoActividadFilter: string;
  page: number;
  limit: number;
};

type TerritorialContext =
  | { mode: "no_comuna" }
  | {
      mode: "comuna_activa";
      comunaSlug: string;
      comunaNombre: string;
      regionKey?: string;
    }
  | {
      mode: "comuna_en_preparacion";
      comunaSlug: string;
      comunaNombre: string;
    };

type AlgoliaSearchResult = {
  hits: Record<string, unknown>[];
  totalHits: number;
};

function parseInput(req: NextRequest): ParsedInput {
  const { searchParams } = new URL(req.url);

  const q = s(searchParams.get("q"));
  const comunaRaw = s(searchParams.get("comuna"));
  const comunaSlug = normSlug(comunaRaw);
  const sectorSlugFilter = s(searchParams.get("sector"));
  const tipoActividadFilter = s(searchParams.get("tipo_actividad"));

  const page = Math.max(0, Number(searchParams.get("page")) || 0);
  const limit = Math.min(50, Math.max(6, Number(searchParams.get("limit")) || 24));

  return {
    q,
    comunaRaw,
    comunaSlug,
    sectorSlugFilter,
    tipoActividadFilter,
    page,
    limit,
  };
}

async function resolveTerritorialContext(
  input: ParsedInput
): Promise<TerritorialContext> {
  if (!input.comunaSlug) {
    return { mode: "no_comuna" };
  }

  const supabase = createSupabaseServerClient();

  const [{ data: activaRow }, { data: comunaRow }] = await Promise.all([
    supabase
      .from("comunas_activas")
      .select("activa, comuna_nombre")
      .eq("comuna_slug", input.comunaSlug)
      .maybeSingle(),
    supabase
      .from("comunas")
      .select("nombre, region_slug")
      .eq("slug", input.comunaSlug)
      .maybeSingle(),
  ]);

  const isActiva = activaRow?.activa === true;

  const comunaNombre =
    s(activaRow?.comuna_nombre) ||
    s(comunaRow?.nombre) ||
    input.comunaSlug
      .replace(/-/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());

  // Convención única para región en coverage_keys: "region:<slug>" (rankTerritorial solo usa esta forma).
  const regionSlug = s((comunaRow as any)?.region_slug);
  let regionKey: string | undefined;
  if (regionSlug) {
    const normRegion = normSlug(regionSlug);
    regionKey = normRegion ? `region:${normRegion}` : undefined;
  }

  if (!isActiva) {
    return {
      mode: "comuna_en_preparacion",
      comunaSlug: input.comunaSlug,
      comunaNombre,
    };
  }

  return {
    mode: "comuna_activa",
    comunaSlug: input.comunaSlug,
    comunaNombre,
    regionKey,
  };
}

async function searchAlgolia(
  input: ParsedInput
): Promise<AlgoliaSearchResult> {
  const index = getAlgoliaAdminIndex(INDEX_NAME);

  const facetFilters: string[][] = [];
  facetFilters.push(["estado_publicacion:publicado"]);

  if (input.sectorSlugFilter) {
    facetFilters.push([`sector_slug:${normSlug(input.sectorSlugFilter)}`]);
  }

  if (input.tipoActividadFilter) {
    facetFilters.push([`tipo_actividad:${input.tipoActividadFilter.toLowerCase()}`]);
  }

  const hasComuna = !!input.comunaSlug;
  const hitsPerPage = hasComuna ? Math.min(120, input.limit * 4) : input.limit;

  const attributesToRetrieve = [
    "objectID",
    "slug",
    "nombre",
    "descripcion_corta",
    "descripcion_larga",
    "categoria_nombre",
    "subcategorias_nombres_arr",
    "comuna_base_nombre",
    "comuna_base_slug",
    "nivel_cobertura",
    "comunas_cobertura_slugs_arr",
    "coverage_keys",
    "coverage_labels",
    "foto_principal_url",
    "whatsapp",
    "instagram",
    "web",
    "tipo_actividad",
    "sector_slug",
    "tags_slugs",
    "keywords_clasificacion",
    "clasificacion_confianza",
  ];

  const querySent = input.q || "";
  const searchParams = {
    hitsPerPage,
    page: hasComuna ? 0 : input.page,
    facetFilters: facetFilters.length > 0 ? facetFilters : undefined,
    attributesToRetrieve,
  };

  if (IS_DEV) {
    console.log("[search] Algolia params:", {
      index: INDEX_NAME,
      query: querySent,
      queryLength: querySent.length,
      facetFilters,
      hitsPerPage,
      page: searchParams.page,
    });
  }

  const result = await index.search(querySent, searchParams);

  const hits = (result.hits || []) as Record<string, unknown>[];
  const totalHits = result.nbHits ?? 0;

  if (IS_DEV) {
    console.log("[search] Algolia response: nbHits =", totalHits);
    if (totalHits === 0) {
      console.log(
        "[search] Sin resultados. Revisar: índice con datos, facetFilters (estado_publicacion:publicado) y que la query coincida con search_text/nombre/tags."
      );
    }
    const first3 = hits.slice(0, 3).map((h) => ({
      objectID: h.objectID,
      nombre: h.nombre,
      slug: h.slug,
    }));
    console.log("[search] First 3 hits (raw):", JSON.stringify(first3, null, 2));
  }

  return { hits, totalHits };
}

function sortWithTerritorialAndQuality(
  hits: Record<string, unknown>[],
  input: ParsedInput,
  ctx: Extract<TerritorialContext, { mode: "comuna_activa" }>
): Record<string, unknown>[] {
  const comunaSlug = ctx.comunaSlug;

  // Guardar índice original para respetar la relevancia textual de Algolia
  hits.forEach((hit, idx) => {
    Object.defineProperty(hit, "__idx", {
      value: idx,
      enumerable: false,
      writable: false,
    });
  });

  const filtered = hits.filter((hit) => {
    const base = normSlug(s(hit.comuna_base_slug));
    const cobertura = arr(hit.comunas_cobertura_slugs_arr);
    const nivel = s(hit.nivel_cobertura).toLowerCase();
    if (base === comunaSlug) return true;
    if (cobertura.includes(comunaSlug)) return true;
    if (nivel === "regional" || nivel === "varias_regiones" || nivel === "nacional") return true;
    return false;
  });

  filtered.sort((a, b) => {
    const territorialA = rankTerritorial(
      a as Parameters<typeof rankTerritorial>[0],
      comunaSlug,
      ctx.regionKey
    );
    const territorialB = rankTerritorial(
      b as Parameters<typeof rankTerritorial>[0],
      comunaSlug,
      ctx.regionKey
    );

    const idxA = (a as any).__idx ?? 0;
    const idxB = (b as any).__idx ?? 0;

    // 1) territorialScore desc
    if (territorialB !== territorialA) {
      return territorialB - territorialA;
    }

    // 2) relevancia textual Algolia (orden original) asc
    if (idxA !== idxB) {
      return idxA - idxB;
    }

    // 3) qualityScore desc
    const qualityA = qualityScore(a as Parameters<typeof qualityScore>[0]);
    const qualityB = qualityScore(b as Parameters<typeof qualityScore>[0]);

    if (qualityB !== qualityA) {
      return qualityB - qualityA;
    }

    // 4) nombre asc
    return String(a.nombre).localeCompare(String(b.nombre), "es");
  });

  return filtered;
}

function buildResponse(
  input: ParsedInput,
  ctx: TerritorialContext,
  searchResult: AlgoliaSearchResult
) {
  let hits = searchResult.hits;
  let totalHits = searchResult.totalHits;

  if (ctx.mode === "comuna_activa") {
    const sorted = sortWithTerritorialAndQuality(hits, input, ctx);
    totalHits = sorted.length;
    const start = input.page * input.limit;
    hits = sorted.slice(start, start + input.limit);
  }

  return NextResponse.json({
    ok: true,
    query: input.q,
    comuna: input.comunaRaw || null,
    page: input.page,
    nbPages: Math.ceil(totalHits / input.limit) || 1,
    nbHits: totalHits,
    hits,
  });
}

export async function GET(req: NextRequest) {
  try {
    const input = parseInput(req);

    if (IS_DEV) {
      console.log("[search] parseInput:", {
        q: input.q,
        comuna: input.comunaRaw,
        comunaSlug: input.comunaSlug,
        page: input.page,
        limit: input.limit,
        index: INDEX_NAME,
      });
    }

    const territorialCtx = await resolveTerritorialContext(input);

    if (territorialCtx.mode === "comuna_en_preparacion") {
      return NextResponse.json({
        modo: "comuna_en_preparacion",
        comuna: territorialCtx.comunaNombre,
        comuna_slug: territorialCtx.comunaSlug,
      });
    }

    const searchResult = await searchAlgolia(input);
    return buildResponse(input, territorialCtx, searchResult);
  } catch (err) {
    console.error("[search]", err);
    return NextResponse.json(
      {
        ok: false,
        error: "search_error",
        message: err instanceof Error ? err.message : "Error en búsqueda",
      },
      { status: 500 }
    );
  }
}
