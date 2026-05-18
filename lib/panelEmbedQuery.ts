/** Vista embebida en iframe del panel (sin chrome del sitio). */
export function parsePanelEmbedQuery(
  raw: string | string[] | null | undefined
): boolean {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return ["1", "true", "yes"].includes(String(v ?? "").trim().toLowerCase());
}
