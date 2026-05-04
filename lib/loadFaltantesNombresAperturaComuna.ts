import type { SupabaseClient } from "@supabase/supabase-js";
import { VW_FALTANTES_COMUNA_V2 } from "@/lib/aperturaComunaContrato";

/**
 * Nombres de subcategorías/rubros que aún faltan para apertura (vista pública de apertura).
 * Misma fuente que `/api/comunas/estado`; solo lectura, sin tocar reglas de negocio.
 */
export async function loadFaltantesNombresAperturaComuna(
  supabase: SupabaseClient,
  comunaSlug: string,
  limit = 8
): Promise<string[]> {
  const slug = String(comunaSlug || "").trim().toLowerCase();
  if (!slug) return [];

  const { data, error } = await supabase
    .from(VW_FALTANTES_COMUNA_V2)
    .select("subcategoria_nombre, faltantes")
    .eq("comuna_slug", slug)
    .gt("faltantes", 0)
    .order("faltantes", { ascending: false })
    .limit(Math.max(1, Math.min(30, limit)));

  if (error || !Array.isArray(data)) return [];

  const nombres: string[] = [];
  const seen = new Set<string>();
  for (const row of data) {
    const r = row as Record<string, unknown>;
    const n = String(r.subcategoria_nombre ?? "").trim();
    if (!n || seen.has(n.toLowerCase())) continue;
    seen.add(n.toLowerCase());
    nombres.push(n);
  }
  return nombres;
}
