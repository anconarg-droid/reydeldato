/** Alinea `region-metropolitana` (cobertura) con `metropolitana` (`regiones.slug`). */
export function normRegionSlugForMatch(raw: string): string {
  const t = String(raw ?? "").trim().toLowerCase();
  if (!t) return "";
  return t.replace(/^region-/, "");
}

function parseStrArr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x ?? "").trim()).filter(Boolean);
}

/**
 * Un negocio pertenece a la región si `region_slug` coincide o `regiones_cobertura_slugs_arr` la incluye.
 * Aplica a filas `vw_emprendedores_publico` o hits Algolia con los mismos campos.
 */
export function recordMatchesRegionSlug(
  row: { region_slug?: unknown; regiones_cobertura_slugs_arr?: unknown },
  regionSlug: string
): boolean {
  const target = normRegionSlugForMatch(regionSlug);
  if (!target) return false;
  const base = normRegionSlugForMatch(String(row.region_slug ?? ""));
  if (base && base === target) return true;
  const cov = parseStrArr(row.regiones_cobertura_slugs_arr).map(normRegionSlugForMatch);
  return cov.some((x) => x === target);
}
