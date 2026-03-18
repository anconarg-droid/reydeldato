/**
 * Lógica de match por comuna: local físico, base, cobertura, regional, nacional.
 * Usado en búsqueda y ficha para distinguir "tiene local en la comuna" vs "atiende la comuna".
 */

export type ComunaMatchSource =
  | "local"     // tiene local físico en la comuna buscada
  | "base"      // comuna_base_id = comuna buscada
  | "cobertura" // atiende por cobertura explícita (varias_comunas)
  | "regional"  // atiende por cobertura regional
  | "nacional"; // atiende por cobertura nacional

export type ComunaMatchResult = {
  tiene_local_en_comuna: boolean;
  atiende_comuna: boolean;
  comuna_match_source: ComunaMatchSource | null;
};

function norm(s: string): string {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");
}

function arr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x ?? "").trim()).filter(Boolean);
}

/**
 * Calcula tiene_local_en_comuna, atiende_comuna y comuna_match_source para un item
 * en contexto de búsqueda por comuna.
 */
export function getComunaMatch(params: {
  comunaSlugBuscada: string;
  comunaBaseSlug: string | null;
  nivelCobertura: string | null;
  coverageKeys: string[];
  coverageLabels: string[];
  tieneLocalEnComuna: boolean;
}): ComunaMatchResult {
  const comuna = norm(params.comunaSlugBuscada);
  if (!comuna) {
    return {
      tiene_local_en_comuna: false,
      atiende_comuna: false,
      comuna_match_source: null,
    };
  }

  const baseSlug = norm(params.comunaBaseSlug ?? "");
  const nivel = norm(params.nivelCobertura ?? "");
  const keys = arr(params.coverageKeys).map(norm);
  const labels = arr(params.coverageLabels).map((l) => norm(l).replace(/\s+/g, "-"));

  const atiendePorCobertura =
    (nivel === "varias_comunas" && (keys.includes(comuna) || labels.some((l) => l === comuna || l.includes(comuna)))) ||
    (nivel === "regional" || nivel === "varias_regiones") ||
    (nivel === "nacional");

  if (params.tieneLocalEnComuna) {
    return {
      tiene_local_en_comuna: true,
      atiende_comuna: true,
      comuna_match_source: "local",
    };
  }

  if (baseSlug && baseSlug === comuna) {
    return {
      tiene_local_en_comuna: false,
      atiende_comuna: true,
      comuna_match_source: "base",
    };
  }

  if (nivel === "varias_comunas" && (keys.includes(comuna) || labels.some((l) => l === comuna || l.includes(comuna)))) {
    return {
      tiene_local_en_comuna: false,
      atiende_comuna: true,
      comuna_match_source: "cobertura",
    };
  }

  if (nivel === "regional" || nivel === "varias_regiones") {
    return {
      tiene_local_en_comuna: false,
      atiende_comuna: true,
      comuna_match_source: "regional",
    };
  }

  if (nivel === "nacional") {
    return {
      tiene_local_en_comuna: false,
      atiende_comuna: true,
      comuna_match_source: "nacional",
    };
  }

  return {
    tiene_local_en_comuna: false,
    atiende_comuna: false,
    comuna_match_source: null,
  };
}

/** Orden de ranking: local > base > cobertura > regional > nacional > general */
export function comunaMatchSourceRank(source: ComunaMatchSource | null): number {
  switch (source) {
    case "local": return 0;
    case "base": return 1;
    case "cobertura": return 2;
    case "regional": return 3;
    case "nacional": return 4;
    default: return 5;
  }
}
