import type { EmprendedorSearchCardProps } from "@/components/search/EmprendedorSearchCard";
import { buscarApiItemToEmprendedorCardProps } from "@/lib/mapBuscarItemToEmprendedorCard";
import { vwPublicRowToBuscarApiItem } from "@/lib/mapVwEmprendedorPublicoToBuscarApiItem";
import { createSupabaseServerPublicClient } from "@/lib/supabase/server";

const MAX_ITEMS = 10;
const FETCH_LIMIT = 40;

/**
 * Emprendimientos `publicado` más recientes para la home.
 * Orden: `updated_at` (cubre recién aprobados / cambios en ficha) y desempate `created_at`.
 * Hasta {@link MAX_ITEMS} tarjetas para {@link EmprendedorSearchCard}; si no hay filas, `[]` (mock en el caller).
 */
export async function loadUltimosEmprendimientosPublicadosHome(): Promise<EmprendedorSearchCardProps[]> {
  try {
    const supabase = createSupabaseServerPublicClient();
    const { data, error } = await supabase
      .from("vw_emprendedores_publico")
      .select("*")
      .eq("estado_publicacion", "publicado")
      .order("updated_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(FETCH_LIMIT);

    if (error) {
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.warn("[home ultimos publicados]", error.message);
      }
      return [];
    }

    const rows = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
    const cards: EmprendedorSearchCardProps[] = [];
    const seen = new Set<string>();

    for (const row of rows) {
      const item = vwPublicRowToBuscarApiItem(row);
      if (!item) continue;
      const slug = String((item as any).slug ?? "").trim();
      if (!slug || seen.has(slug)) continue;
      seen.add(slug);
      cards.push(buscarApiItemToEmprendedorCardProps(item, null, "home"));
      if (cards.length >= MAX_ITEMS) break;
    }

    return cards;
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.warn("[home ultimos publicados]", e);
    }
    return [];
  }
}
