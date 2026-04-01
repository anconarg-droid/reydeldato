/**
 * Slug canónico: minúsculas, sin acentos, guiones; espacios y "_" pasan a "-".
 * Usar desde backend y cliente para una sola fuente de verdad.
 */
export function slugify(input: string): string {
  const t = String(input ?? "").trim();
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");
}

// Normalización liviana recomendada (útil para comparar slugs "humanos")
export function normalizarSlug(texto: string): string {
  return String(texto ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}
