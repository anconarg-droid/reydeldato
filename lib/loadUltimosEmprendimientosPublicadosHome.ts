import type { EmprendedorSearchCardProps } from "@/components/search/EmprendedorSearchCard";
import { buscarApiItemToEmprendedorCardProps } from "@/lib/mapBuscarItemToEmprendedorCard";
import { vwPublicRowToBuscarApiItem } from "@/lib/mapVwEmprendedorPublicoToBuscarApiItem";
import { createSupabaseServerPublicClient } from "@/lib/supabase/server";

const MAX_ITEMS = 10;
const FETCH_LIMIT = 28;

/**
 * Emprendimientos `publicado` más recientes (`created_at` desc) para la home.
 * Hasta {@link MAX_ITEMS} tarjetas para {@link EmprendedorSearchCard}; si no hay filas, `[]` (mock en el caller).
 */
export async function loadUltimosEmprendimientosPublicadosHome(): Promise<EmprendedorSearchCardProps[]> {
  try {
    const supabase = createSupabaseServerPublicClient();
    const { data, error } = await supabase
      .from("vw_emprendedores_publico")
      .select("*")
      .eq("estado_publicacion", "publicado")
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

    for (const row of rows) {
      const item = vwPublicRowToBuscarApiItem(row);
      if (!item) continue;
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
