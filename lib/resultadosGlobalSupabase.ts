import { vwPublicRowToBuscarApiItem } from "@/lib/mapVwEmprendedorPublicoToBuscarApiItem";
import type { BuscarApiItem } from "@/lib/mapBuscarItemToEmprendedorCard";
import {
  rotateDeterministicPhotoBuckets,
  SEARCH_ROTATION_WINDOW_MS,
} from "@/lib/search/deterministicRotation";
import { urlTieneFotoListado } from "@/lib/search/sortItemsConFotoPrimero";
import { resolveQueryFromBusquedaSinonimos } from "@/lib/busquedaSinonimosResolve";
import {
  isResolvedQueryExactGas,
} from "@/lib/gasQueryExcludeGasfiteria";
import { createSupabaseServerPublicClient } from "@/lib/supabase/server";

/** @deprecated Usar {@link BuscarApiItem}; se mantiene alias por imports antiguos. */
export type GlobalDbItem = BuscarApiItem;

/** Evita que % y _ de la query actúen como comodines en ILIKE. */
function escapeIlikePattern(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/**
 * Búsqueda global (sin comuna) sobre `vw_emprendedores_publico` — **mismo enriquecimiento**
 * que la home (últimos emprendimientos): locales, modalidades, cobertura con slugs, región RM, etc.
 */
export async function searchEmprendedoresGlobalText(
  q: string,
  limit = 24,
  _opts?: { regionSlug?: string | null }
): Promise<{ items: BuscarApiItem[]; error: string | null }> {
  void _opts;
  const supabase = createSupabaseServerPublicClient();

  const inputTerm = String(q ?? "").trim();
  // Regla producto: "gas" exacto NO debe devolver resultados.
  // - NO usar fallback de texto
  // - Retornar lista vacía
  if (isResolvedQueryExactGas(inputTerm)) {
    return { items: [], error: null };
  }

  const resolvedFromSynonyms =
    (await resolveQueryFromBusquedaSinonimos(supabase, inputTerm)) || inputTerm;

  const term = resolvedFromSynonyms
    .trim()
    .replace(/,/g, " ")
    .slice(0, 120);
  if (!term) {
    return { items: [], error: null };
  }

  const pattern = `%${escapeIlikePattern(term)}%`;

  const { data, error } = await supabase
    .from("vw_emprendedores_publico")
    .select("*")
    .eq("estado_publicacion", "publicado")
    .or(
      `nombre_emprendimiento.ilike.${pattern},frase_negocio.ilike.${pattern},descripcion_libre.ilike.${pattern},keywords_finales.cs.{${term}}`
    )
    .limit(limit);

  if (error) {
    return { items: [], error: error.message };
  }

  const rows = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];

  const items: BuscarApiItem[] = [];

  for (const r of rows) {
    const item = vwPublicRowToBuscarApiItem(r);
    if (item) items.push(item);
  }

  const ordered = rotateDeterministicPhotoBuckets(
    items,
    (it) => String(it.slug ?? it.id ?? ""),
    (it) => urlTieneFotoListado(it.fotoPrincipalUrl),
    SEARCH_ROTATION_WINDOW_MS,
    "resultados:global_texto",
  );

  return { items: ordered, error: null };
}
