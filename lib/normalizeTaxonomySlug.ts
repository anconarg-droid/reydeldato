/**
 * Normaliza slugs de categoría/subcategoría para comparar de forma estable
 * (minúsculas, sin tildes, espacios colapsados). Misma regla que en `/api/categoria`.
 */
export function normalizeTaxonomySlug(v: unknown): string {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
