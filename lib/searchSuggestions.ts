/**
 * Base para sugerencias de búsqueda (tipo Google).
 * Normalización de queries y estrategia de alimentación desde keyword_to_subcategory_map,
 * subcategorias y futuras búsquedas populares. Sin UI aún.
 */

import { toSlugForm } from "@/lib/classifyBusiness";

export const SEARCH_SUGGESTION_SOURCE_TYPES = [
  "seed",
  "keyword",
  "popular_search",
  "subcategoria",
  "categoria",
] as const;
export type SearchSuggestionSourceType = (typeof SEARCH_SUGGESTION_SOURCE_TYPES)[number];

/**
 * Normaliza un texto de búsqueda para matching y almacenamiento en search_suggestions.
 * Misma lógica que slug: minúsculas, sin tildes, espacios/guiones colapsados.
 */
export function normalizeSearchQuery(query: string): string {
  return toSlugForm(query || "");
}
