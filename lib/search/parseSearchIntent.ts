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

  // Caso especial: "gas" exacto no debe resolver a intent (ej. gasfiter).
  if (restNorm === "gas") {
    return { finalQuery: rest, sectorSlug: null, comunaSlug };
  }

  // Resolver intención por "mejor match".
  // Importante: evitamos que queries cortas (ej. "auto") matcheen dentro de palabras
  // no relacionadas (ej. "automático" → electricista). Para esas, exigimos match
  // por token completo ("auto") o equivalencias claras.
  const restTokens = restNorm.split(" ").filter(Boolean);
  const isShortQuery = restNorm.length <= 4 || restTokens.some((t) => t.length <= 4);

  let best:
    | { def: (typeof INTENT_ALIASES)[string]; score: number }
    | null = null;

  function scoreAlias(aliasNorm: string): number {
    if (!aliasNorm) return 0;
    if (restNorm === aliasNorm) return 100;

    const aliasTokens = aliasNorm.split(" ").filter(Boolean);

    // token exact (ej. "auto" presente como palabra completa)
    if (aliasTokens.includes(restNorm)) return 95;

    // multi-token: uno de los tokens coincide exacto
    if (restTokens.some((t) => aliasTokens.includes(t))) return 90;

    // Para queries cortas: NO permitimos match por substring dentro de tokens (ej. auto ⊂ automático)
    if (isShortQuery) return 0;

    // Prefijo en token (ej. "gasfit" → "gasfiter")
    if (aliasTokens.some((t) => t.startsWith(restNorm))) return 70;

    // Substring (último recurso para queries largas)
    if (restNorm.includes(aliasNorm) || aliasNorm.includes(restNorm)) return 50;

    return 0;
  }

  for (const def of Object.values(INTENT_ALIASES)) {
    for (const alias of def.aliases) {
      const aliasNorm = normalize(alias);
      const score = scoreAlias(aliasNorm);
      if (!score) continue;
      if (!best || score > best.score) best = { def, score };
      if (best.score >= 100) break;
    }
    if (best?.score >= 100) break;
  }

  if (best) {
    return {
      finalQuery: best.def.finalQuery,
      sectorSlug: best.def.sectorSlug ?? null,
      comunaSlug,
    };
  }

  return {
    finalQuery: rest,
    sectorSlug: null,
    comunaSlug,
  };
}
