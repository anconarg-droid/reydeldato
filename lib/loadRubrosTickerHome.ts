import { prettyLabelSubcategoria } from "@/lib/categoriasCatalogo";
import { normalizeTaxonomySlug } from "@/lib/normalizeTaxonomySlug";
import { createSupabaseServerPublicClient } from "@/lib/supabase/server";

const PAGE = 800;

/** Slugs de subcategoría asociados al emprendedor (misma idea que `loadCategoriasIndexCounts`). */
function collectSubSlugsFromVwRow(row: Record<string, unknown>): string[] {
  const subs = new Set<string>();
  const arr = row.subcategorias_slugs;
  if (Array.isArray(arr)) {
    for (const x of arr) {
      const k = normalizeTaxonomySlug(x);
      if (k) subs.add(k);
    }
  }
  const fin =
    row.subcategoria_slug_final != null
      ? normalizeTaxonomySlug(row.subcategoria_slug_final)
      : "";
  if (fin) subs.add(fin);
  const b = row.subcategorias_slugs_arr;
  if (Array.isArray(b)) {
    for (const x of b) {
      const k = normalizeTaxonomySlug(x);
      if (k) subs.add(k);
    }
  }
  return [...subs];
}

const SELECT_VARIANTS = [
  "id, subcategorias_slugs, subcategoria_slug_final, subcategorias_slugs_arr",
  "id, subcategorias_slugs, subcategoria_slug_final",
  "id",
] as const;

export type RubroTickerItem = { slug: string; label: string };

/**
 * Subcategorías (rubros) distintas con ≥1 emprendedor en `vw_emprendedores_publico`
 * con `estado_publicacion = publicado` (alcance nacional, mismo criterio que home/categorías).
 */
export async function loadRubrosTickerHome(): Promise<RubroTickerItem[]> {
  const supabase = createSupabaseServerPublicClient();
  const unique = new Set<string>();
  let selectCols: string | null = null;
  let variantIndex = 0;
  let from = 0;

  for (;;) {
    const cols: string =
      selectCols ??
      SELECT_VARIANTS[variantIndex] ??
      SELECT_VARIANTS[SELECT_VARIANTS.length - 1];

    const { data, error } = await supabase
      .from("vw_emprendedores_publico")
      .select(cols)
      .eq("estado_publicacion", "publicado")
      .range(from, from + PAGE - 1);

    if (error) {
      if (!selectCols && variantIndex + 1 < SELECT_VARIANTS.length) {
        variantIndex += 1;
        from = 0;
        unique.clear();
        continue;
      }
      break;
    }

    selectCols = cols;
    const rows = (data ?? []) as unknown as Record<string, unknown>[];
    if (rows.length === 0) break;

    for (const row of rows) {
      for (const sub of collectSubSlugsFromVwRow(row)) {
        unique.add(sub);
      }
    }

    if (rows.length < PAGE) break;
    from += PAGE;
    if (from > 200_000) break;
  }

  const out: RubroTickerItem[] = [...unique].map((slug) => ({
    slug,
    label: prettyLabelSubcategoria(slug),
  }));
  out.sort((a, b) => a.label.localeCompare(b.label, "es"));
  return out;
}
