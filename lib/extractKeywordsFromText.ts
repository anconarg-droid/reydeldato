/**
 * Extracción de keywords desde texto libre (descripción del negocio).
 * Usado para sugerencias en el formulario y para tests de clasificación desde texto.
 */

import { normalizeAndFilterKeyword } from "./keywordValidation";

/** Stopwords para extracción (español + términos genéricos de descripción) */
export const STOPWORDS_EXTRACCION = new Set([
  "de", "y", "para", "a", "en", "el", "la", "los", "las", "un", "una", "con", "por", "que",
  "es", "son", "al", "del", "lo", "no", "su", "e", "o", "u", "se", "te", "le", "les", "me", "nos",
  "voy", "vendo", "hago", "arreglo", "urgentes", "domicilio", "caseros", "niños", "si",
  "ya", "mas", "muy", "asi", "solo", "como", "pero", "sus", "dos", "desde", "todo", "toda",
]);

/**
 * Extrae keywords desde texto: normaliza, divide en palabras, quita stopwords,
 * aplica normalizeAndFilterKeyword. Devuelve lista de normalized_keyword (slug).
 */
export function extractKeywordsFromText(texto: string): string[] {
  const normalized = String(texto ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const palabras = normalized.split(/[\s,.;:!?()'"]+/).filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];

  for (const p of palabras) {
    const t = p.trim();
    if (t.length < 2) continue;
    if (STOPWORDS_EXTRACCION.has(t)) continue;
    const kw = normalizeAndFilterKeyword(t);
    if (kw && !seen.has(kw)) {
      seen.add(kw);
      out.push(kw);
    }
  }
  return out;
}
