/**
 * Configuración única del índice de emprendedores en Algolia.
 * Única fuente de verdad para `setSettings`: aplicar desde el reindex canónico
 * (`app/api/reindex/emprendedores`) o un job explícito; no duplicar en otros archivos.
 *
 * Debe alinearse con los campos que emite {@link toAlgoliaRecord} en `lib/algolia.ts`.
 */
export function getEmprendedoresAlgoliaIndexSettings(): Record<string, unknown> {
  return {
    searchableAttributes: [
      "unordered(nombre)",
      "unordered(subcategoria_slug)",
      "unordered(categoria_slug)",
      "unordered(tags_slugs)",
      "unordered(keywords)",
      "unordered(descripcion_corta)",
      "unordered(descripcion_larga)",
    ],
    /** Incluye facetas nuevas más las que usa `/api/search` y filtros por categoría (`categoria_slug`). */
    attributesForFaceting: [
      "filterOnly(estado_publicacion)",
      "filterOnly(publicado)",
      "filterOnly(categoria_slug)",
      "filterOnly(subcategoria_slug)",
      "filterOnly(sector_slug)",
      "filterOnly(tipo_actividad)",
      "filterOnly(comuna_base_slug)",
      "filterOnly(nivel_cobertura)",
      "filterOnly(coverage_keys)",
    ],
    customRanking: ["desc(publicado)"],
    typoTolerance: "min",
    removeWordsIfNoResults: "lastWords",
    advancedSyntax: true,
    distinct: true,
    attributeForDistinct: "slug",
    ignorePlurals: true,
    minWordSizefor1Typo: 5,
    minWordSizefor2Typos: 8,
    attributesToSnippet: ["descripcion_corta:20", "descripcion_larga:30"],
    attributesToHighlight: ["nombre", "descripcion_corta", "descripcion_larga"],
  };
}

/** Aplica la configuración canónica al índice (admin / reindex masivo). */
export async function applyEmprendedoresIndexSettings(
  index: { setSettings: (s: Record<string, unknown>) => Promise<unknown> }
): Promise<void> {
  await index.setSettings(getEmprendedoresAlgoliaIndexSettings());
}
