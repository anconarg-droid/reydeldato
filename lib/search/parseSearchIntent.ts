import { detectComunaFromQuery } from "./comunaAliases";
import { INTENT_ALIASES } from "./intentAliases";

function normalize(text: string): string {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export type ParsedSearchIntent = {
  finalQuery: string;
  sectorSlug: string | null;
  comunaSlug: string | null;
};

/**
 * Parsea el texto de búsqueda: detecta comuna (y la quita de q) e intención (sector).
 * La query final nunca incluye la comuna detectada; la comuna queda solo en comunaSlug.
 * Si hay intención reconocida, finalQuery es la query canónica (ej. "gasfiter"), no texto redundante.
 */
export function parseSearchIntent(raw: string): ParsedSearchIntent {
  const rawTrim = (raw || "").trim();
  const { q: rest, comunaSlug } = detectComunaFromQuery(rawTrim);
  const restNorm = normalize(rest);

  if (!restNorm) {
    return { finalQuery: rest, sectorSlug: null, comunaSlug };
  }

  for (const def of Object.values(INTENT_ALIASES)) {
    for (const alias of def.aliases) {
      const aliasNorm = normalize(alias);
      if (!aliasNorm) continue;
      if (
        restNorm === aliasNorm ||
        restNorm.includes(aliasNorm) ||
        aliasNorm.includes(restNorm)
      ) {
        return {
          finalQuery: def.finalQuery,
          sectorSlug: def.sectorSlug ?? null,
          comunaSlug,
        };
      }
    }
  }

  return {
    finalQuery: rest,
    sectorSlug: null,
    comunaSlug,
  };
}
