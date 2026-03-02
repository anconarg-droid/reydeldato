import algoliasearch, { SearchClient } from "algoliasearch";

type Tier = "base" | "cobertura" | "regional" | "nacional";

type ModoTerritorial = "rank" | "strict" | "rank_exclude_irrelevant";

type Hit = {
  id: string;
  nombre: string;
  slug: string;

  descripcion_corta?: string | null;
  descripcion_larga?: string | null;

  categoria_id?: string | null;
  categoria_nombre?: string | null;
  categoria_slug?: string | null;

  comuna_base_id?: string | null;
  comuna_base_slug?: string | null;
  comuna_base_nombre?: string | null;

  subcategorias_slugs?: string[] | null;
  subcategorias_nombres?: string[] | null;

  tipos_atencion_ids?: string[] | null;
  tipos_atencion_nombres?: string[] | null;

  cobertura_comunas_ids?: string[] | null;
  cobertura_comunas_slugs?: string[] | null;
  cobertura_comunas_nombres?: string[] | null;

  nivel_cobertura?:
    | "solo_mi_comuna"
    | "varias_comunas"
    | "varias_regiones"
    | "nacional"
    | string;

  region_ids?: string[] | null;
  region_nombres?: string[] | null;

  search_text?: string | null;

  objectID?: string;
  _highlightResult?: any;
};

type Scored = Hit & {
  tier: Tier;
  score: number;
  reason: string;
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Falta variable de entorno ${name}`);
  return v;
}

function getAlgoliaClient(): SearchClient {
  const appId = requireEnv("ALGOLIA_APP_ID");
  const searchKey = requireEnv("ALGOLIA_SEARCH_KEY"); // Search API key
  return algoliasearch(appId, searchKey);
}

const INDEX_NAME = process.env.ALGOLIA_INDEX_EMPRENDEDORES ?? "emprendedores";

const SCORE: Record<Tier, number> = {
  base: 1000,
  cobertura: 700,
  regional: 400,
  nacional: 100,
};

function classifyTier(
  hit: Hit,
  comunaSlug: string,
  regionId?: string
): { tier: Tier; reason: string } {
  const baseSlug = (hit.comuna_base_slug ?? "").trim().toLowerCase();
  const comuna = (comunaSlug ?? "").trim().toLowerCase();

  // 1) BASE
  if (baseSlug && comuna && baseSlug === comuna) {
    return { tier: "base", reason: `Es de ${comuna}.` };
  }

  // 2) COBERTURA (varias comunas)
  const coberturaSlugs = (hit.cobertura_comunas_slugs ?? []).map((s) =>
    (s ?? "").toLowerCase()
  );

  if (
    hit.nivel_cobertura === "varias_comunas" &&
    comuna &&
    coberturaSlugs.includes(comuna)
  ) {
    return { tier: "cobertura", reason: `Atiende ${comuna} desde otra comuna.` };
  }

  // 3) REGIONAL (varias regiones)
  const regiones = hit.region_ids ?? [];
  if (
    regionId &&
    hit.nivel_cobertura === "varias_regiones" &&
    regiones.includes(regionId)
  ) {
    return { tier: "regional", reason: `Disponible en tu región.` };
  }

  // 4) NACIONAL real
  if (hit.nivel_cobertura === "nacional") {
    return { tier: "nacional", reason: `Disponible con cobertura nacional.` };
  }

  // 5) Sin match territorial (cae al final como "nacional" por defecto)
  return { tier: "nacional", reason: `Sin match territorial, cae al final.` };
}

function shuffleDeterministico<T>(arr: T[], seed: string): T[] {
  // “aleatorio” estable por 5 minutos: mismo seed => mismo orden, seed cambia => rota
  let x = 0;
  for (let i = 0; i < seed.length; i++) x = (x * 31 + seed.charCodeAt(i)) >>> 0;

  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    x = (1103515245 * x + 12345) >>> 0;
    const j = x % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function ejecutarBusqueda(
  q: string,
  comunaSlug: string,
  regionId?: string,
  modo: ModoTerritorial = "rank"
) {
  const client = getAlgoliaClient();
  const index = client.initIndex(INDEX_NAME);

  const query = (q ?? "").trim();
  const comuna = (comunaSlug ?? "").trim().toLowerCase();

  if (!query) {
    return {
      ok: true,
      query: "",
      comunaSlug: comuna,
      regionId: regionId ?? null,
      perfect: [],
      related: [],
    };
  }

  // 1) PERFECT: frase exacta (sin typos)
  const perfectRes = await index.search<Hit>(`"${query}"`, {
    hitsPerPage: 20,
    advancedSyntax: true,
    typoTolerance: false,
  });

  // 2) RELATED: tolerante (typos ON)
  const relatedRes = await index.search<Hit>(query, {
    hitsPerPage: 80,
    typoTolerance: true,
  });

  // Clasificar + score
  const scoreify = (hits: Hit[]) =>
    hits.map((hit) => {
      const { tier, reason } = classifyTier(hit, comuna, regionId);
      return {
        ...hit,
        tier,
        score: SCORE[tier],
        reason,
        objectID: hit.objectID ?? hit.id,
      } as Scored;
    });

  const perfectScored = scoreify(perfectRes.hits);
  const relatedScored = scoreify(relatedRes.hits);

  // Dedup: si está en perfect, no repetir en related
  const perfectIds = new Set(
    perfectScored.map((h) => h.id || h.objectID || h.slug)
  );
  const relatedFiltered = relatedScored.filter((h) => {
    const k = h.id || h.objectID || h.slug;
    return !perfectIds.has(k);
  });

  // Orden por score (tier)
  const sortScore = (arr: Scored[]) => arr.sort((a, b) => b.score - a.score);

  const perfectSorted = sortScore(perfectScored);
  const relatedSorted = sortScore(relatedFiltered);

  // Rotación “justa” cada 5 minutos dentro de cada tier
  const bucketize = (arr: Scored[]) => {
    const buckets: Record<Tier, Scored[]> = {
      base: [],
      cobertura: [],
      regional: [],
      nacional: [],
    };
    for (const x of arr) buckets[x.tier].push(x);
    return buckets;
  };

  const seed5min = `${query}|${comuna}|${regionId ?? ""}|${Math.floor(
    Date.now() / (5 * 60 * 1000)
  )}`;

  const rotate = (arr: Scored[]) => {
    const b = bucketize(arr);
    return [
      ...shuffleDeterministico(b.base, seed5min + "|base"),
      ...shuffleDeterministico(b.cobertura, seed5min + "|cobertura"),
      ...shuffleDeterministico(b.regional, seed5min + "|regional"),
      ...shuffleDeterministico(b.nacional, seed5min + "|nacional"),
    ];
  };

  const perfectRotated = rotate(perfectSorted);
  const relatedRotated = rotate(relatedSorted);

  // ✅ FILTRO TERRITORIAL SEGÚN MODO
  const aplicarModoTerritorial = (arr: Scored[]) => {
    // si no hay comuna, no filtramos (queda global)
    if (!comuna) return arr;

    if (modo === "rank") {
      // Ranking territorial: NO elimina nada, solo ordena por tier (lo actual)
      return arr;
    }

    if (modo === "strict") {
      // Filtro estricto: elimina los “sin match territorial”
      // (ojo: tier 'nacional' puede ser "nacional real" o "sin match". Lo distinguimos por nivel_cobertura)
      return arr.filter((h) => {
        if (h.tier !== "nacional") return true;
        return h.nivel_cobertura === "nacional";
      });
    }

    // rank_exclude_irrelevant:
    // Mantiene nacionales reales, pero corta los “sin match territorial”
    // (es básicamente strict pero pensado como “ranking + limpieza”)
    return arr.filter((h) => {
      if (h.tier !== "nacional") return true;
      return h.nivel_cobertura === "nacional";
    });
  };

  const perfectFinal = aplicarModoTerritorial(perfectRotated);
  const relatedFinal = aplicarModoTerritorial(relatedRotated);

  return {
    ok: true,
    query,
    comunaSlug: comuna,
    regionId: regionId ?? null,
    perfect: perfectFinal,
    related: relatedFinal,
    debug: {
      modo,
      perfectHits: perfectRes.nbHits,
      relatedHits: relatedRes.nbHits,
      seed5min,
      note: "perfect = exacta sin typos. related = tolerante. Rotación 5 min. Modo territorial aplica filtrado si hay comuna.",
    },
  };
}