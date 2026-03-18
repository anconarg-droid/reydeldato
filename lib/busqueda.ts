export type Tier = "base" | "cobertura" | "regional" | "nacional";

export type HitBusqueda = {
  id?: string;
  objectID?: string;
  slug?: string;
  nombre?: string;

  comuna_base_slug?: string | null;
  comuna_base_nombre?: string | null;

  categoria_slug?: string | null;
  categoria_nombre?: string | null;

  nivel_cobertura?: string | null;

  cobertura_comunas_slugs?: string[] | null;
  comunas_cobertura_slugs?: string[] | null;

  region_ids?: string[] | null;

  score_popularidad?: number | string | null;
  vistas_ficha?: number | string | null;
  click_whatsapp?: number | string | null;
  click_instagram?: number | string | null;
  click_web?: number | string | null;

  [key: string]: any;
};

function s(v: any): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function arr(v: any): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter(Boolean).map((x) => String(x).trim());
}

function normalizeText(v: any): string {
  return s(v).toLowerCase();
}

function getCoberturaComunasSlugs(hit: HitBusqueda): string[] {
  const a = arr(hit.cobertura_comunas_slugs).map((x) => x.toLowerCase());
  const b = arr(hit.comunas_cobertura_slugs).map((x) => x.toLowerCase());
  return a.length > 0 ? a : b;
}

export function classifyTier(
  hit: HitBusqueda,
  comunaSlug?: string,
  regionId?: string
): { tier: Tier; reason: string } {
  const baseSlug = normalizeText(hit.comuna_base_slug);
  const comuna = normalizeText(comunaSlug);
  const coberturaSlugs = getCoberturaComunasSlugs(hit);
  const regiones = arr(hit.region_ids);
  const nivel = normalizeText(hit.nivel_cobertura);

  // 1) BASE: es de la comuna buscada
  if (baseSlug && comuna && baseSlug === comuna) {
    return { tier: "base", reason: `Es de ${comuna}.` };
  }

  // 2) COBERTURA: atiende la comuna buscada desde otra comuna
  if (
    nivel === "varias_comunas" &&
    comuna &&
    coberturaSlugs.includes(comuna)
  ) {
    return {
      tier: "cobertura",
      reason: `Atiende ${comuna} desde otra comuna.`,
    };
  }

  // 3) REGIONAL: cubre varias regiones y coincide con la región buscada
  if (
    (nivel === "regional" || nivel === "varias_regiones") &&
    regionId &&
    regiones.includes(regionId)
  ) {
    return {
      tier: "regional",
      reason: "Disponible en tu región.",
    };
  }

  // 4) NACIONAL
  if (nivel === "nacional") {
    return {
      tier: "nacional",
      reason: "Disponible con cobertura nacional.",
    };
  }

  // fallback
  return {
    tier: "nacional",
    reason: "Sin match territorial, cae al final.",
  };
}

function compareNombre(a: HitBusqueda, b: HitBusqueda): number {
  return s(a.nombre).localeCompare(s(b.nombre), "es", { sensitivity: "base" });
}

function shuffleDeterministico<T>(input: T[], seed: string): T[] {
  const arr = [...input];

  function hash(str: string): number {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    }
    return h >>> 0;
  }

  for (let i = arr.length - 1; i > 0; i--) {
    const j = hash(`${seed}:${i}`) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}

function ordenarBucket(
  items: HitBusqueda[],
  seedMin: string,
  tier: Tier
): HitBusqueda[] {
  // 1) orden estable y justo por nombre
  const ordenados = [...items].sort(compareNombre);

  // 2) mezcla suave para que no salgan siempre igual
  return shuffleDeterministico(ordenados, `${seedMin}:${tier}`);
}

export function organizarResultadosBusqueda(params: {
  hits: HitBusqueda[];
  comunaSlug?: string;
  regionId?: string;
  seedMin?: string;
}) {
  const { hits, comunaSlug, regionId, seedMin = "0" } = params;

  const buckets: Record<Tier, HitBusqueda[]> = {
    base: [],
    cobertura: [],
    regional: [],
    nacional: [],
  };

  for (const hit of hits) {
    const { tier } = classifyTier(hit, comunaSlug, regionId);
    buckets[tier].push(hit);
  }

  const base = ordenarBucket(buckets.base, seedMin, "base");
  const cobertura = ordenarBucket(buckets.cobertura, seedMin, "cobertura");
  const regional = ordenarBucket(buckets.regional, seedMin, "regional");
  const nacional = ordenarBucket(buckets.nacional, seedMin, "nacional");

  return {
    base,
    cobertura,
    regional,
    nacional,
    all: [...base, ...cobertura, ...regional, ...nacional],
  };
}