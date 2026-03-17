/**
 * Validación y normalización de keywords para keyword_to_subcategory_map.
 * Usado en learnFromManualClassification y en cualquier helper que inserte keywords nuevas.
 * Reglas: minúsculas, sin tildes, trim, colapsar espacios, longitud 2–40, rechazar ruido.
 */

import { toSlugForm } from "@/lib/classifyBusiness";

/** Longitud máxima permitida para normalized_keyword (y keyword guardada) */
export const MAX_KEYWORD_LENGTH = 40;

/** Longitud mínima (después de normalizar) */
export const MIN_KEYWORD_LENGTH = 2;

/** Palabras genéricas que no se guardan como keyword (ruido) */
export const NOISE_WORDS = new Set([
  "somos",
  "empresa",
  "servicio",
  "servicios",
  "calidad",
  "experiencia",
  "lider",
  "lideres",
  "mejor",
  "mejores",
  "solucion",
  "soluciones",
  "profesional",
  "profesionales",
  "atencion",
  "atención",
  "cliente",
  "clientes",
  "trabajo",
  "buen",
  "buena",
  "gran",
  "todo",
  "todos",
  "nuestro",
  "nuestra",
  "usted",
  "aqui",
  "aquí",
  "ahora",
  "siempre",
  "mas",
  "más",
  "muy",
  "tan",
  "como",
  "para",
  "por",
  "con",
  "sin",
  "del",
  "los",
  "las",
  "una",
  "uno",
  "que",
  "en",
  "de",
  "el",
  "la",
  "y",
  "a",
  "e",
  "o",
  "u",
  "al",
  "se",
  "es",
  "lo",
  "no",
  "su",
  "sus",
  "te",
  "ti",
  "un",
]);

/**
 * Normaliza y filtra un término para usar como keyword.
 * - Minúsculas, quitar tildes, trim, colapsar espacios.
 * - Rechaza vacíos, longitud &lt; 2, longitud &gt; 40 y palabras de ruido.
 * @returns normalized keyword (slug form) o null si no es válido
 */
export function normalizeAndFilterKeyword(term: string): string | null {
  const t = String(term ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (t.length < MIN_KEYWORD_LENGTH) return null;
  const slug = toSlugForm(t);
  if (!slug || slug.length < MIN_KEYWORD_LENGTH) return null;
  if (slug.length > MAX_KEYWORD_LENGTH) return null;
  if (NOISE_WORDS.has(slug) || NOISE_WORDS.has(t)) return null;
  return slug;
}

/**
 * Prioridad de source_type: manual > ai_feedback > seed > user_keyword.
 * Indica si está permitido reemplazar una fila existente con el nuevo source_type.
 * - manual: puede reemplazar cualquier fuente.
 * - ai_feedback: puede reemplazar seed y user_keyword; NO puede reemplazar manual.
 * - seed / user_keyword: no pueden reemplazar manual ni ai_feedback (solo insert si no existe o mismo source).
 */
export const SOURCE_TYPE_PRIORITY: Record<string, number> = {
  manual: 4,
  ai_feedback: 3,
  seed: 2,
  user_keyword: 1,
};

export function canOverwriteKeywordSource(
  existingSourceType: string | null | undefined,
  newSourceType: "manual" | "ai_feedback" | "seed" | "user_keyword"
): boolean {
  if (!existingSourceType) return true;
  const existing = SOURCE_TYPE_PRIORITY[existingSourceType] ?? 0;
  const incoming = SOURCE_TYPE_PRIORITY[newSourceType] ?? 0;
  return incoming >= existing;
}
