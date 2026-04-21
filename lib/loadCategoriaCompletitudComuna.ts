import {
  calcularCompletitudCategoriaComuna,
  type FilaFaltanteRubroComuna,
  type ResultadoCompletitudCategoriaComuna,
} from "@/lib/calcularCompletitudCategoriaComuna";
import { createSupabaseServerPublicClient } from "@/lib/supabase/server";

export type CategoriaCompletitudCargada = ResultadoCompletitudCategoriaComuna & {
  ok: boolean;
};

/**
 * Faltantes por rubro de apertura para una comuna; filtrado al catálogo de la categoría en app.
 */
export async function loadCategoriaCompletitudComuna(
  comunaSlug: string,
  subSlugsCatalogo: readonly string[]
): Promise<CategoriaCompletitudCargada> {
  const slug = String(comunaSlug || "").trim().toLowerCase();
  if (!slug || subSlugsCatalogo.length === 0) {
    return {
      ok: true,
      tieneRubrosConfigurados: false,
      categoriaCompleta: true,
      actual: 0,
      minimo: 0,
      totalFaltan: 0,
      faltantes: [],
    };
  }

  const supabase = createSupabaseServerPublicClient();
  const { data, error } = await supabase
    .from("vw_faltantes_comuna_v2")
    .select("subcategoria_slug, subcategoria_nombre, maximo_contable, total_contado, faltantes")
    .eq("comuna_slug", slug);

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[loadCategoriaCompletitudComuna]", error);
    }
    return {
      ok: false,
      tieneRubrosConfigurados: false,
      categoriaCompleta: true,
      actual: 0,
      minimo: 0,
      totalFaltan: 0,
      faltantes: [],
    };
  }

  const filas: FilaFaltanteRubroComuna[] = (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      subcategoria_slug: String(r.subcategoria_slug ?? ""),
      subcategoria_nombre: String(r.subcategoria_nombre ?? ""),
      maximo_contable: Number(r.maximo_contable ?? 0),
      total_contado: Number(r.total_contado ?? 0),
      faltantes: Number(r.faltantes ?? 0),
    };
  });

  const computed = calcularCompletitudCategoriaComuna(subSlugsCatalogo, filas);
  return { ok: true, ...computed };
}
