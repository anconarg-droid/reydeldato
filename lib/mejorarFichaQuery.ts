/**
 * Construye query string preservando parámetros relevantes (panel, redirects legacy, etc.).
 */
export function buildMejorarFichaQueryString(
  entries: Record<string, string | undefined>,
): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(entries)) {
    const t = String(v ?? "").trim();
    if (!t) continue;
    qs.set(k, t);
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}
