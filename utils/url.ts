/**
 * Normalización de URLs (sitio web).
 * Si el usuario escribe midominio.cl se guarda como https://midominio.cl
 */

/**
 * Normaliza URL de sitio web: si no tiene protocolo, agrega https://
 */
export function normalizeWebsite(url: string): string {
  const raw = String(url ?? "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}
