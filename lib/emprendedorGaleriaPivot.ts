import type { SupabaseClient } from "@supabase/supabase-js";

/** Clave estable para emparejar filas RPC / hidratación / pivot (UUID). */
export function normalizeEmprendedorId(id: unknown): string {
  return String(id ?? "").trim().toLowerCase();
}

/**
 * Cantidad de filas en `emprendedor_galeria` por emprendedor (misma fuente que la ficha pública).
 * La regla de perfil completo ya no depende de la galería; el conteo sigue útil para métricas / auditoría.
 */
export async function countGaleriaPivotByEmprendedorIds(
  supabase: SupabaseClient,
  rawIds: unknown[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const ids = [
    ...new Set(
      rawIds
        .map((x) => normalizeEmprendedorId(x))
        .filter((id) => id.length > 0)
    ),
  ];
  if (ids.length === 0) return map;

  const chunkSize = 200;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const slice = ids.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from("emprendedor_galeria")
      .select("emprendedor_id")
      .in("emprendedor_id", slice);

    if (error) continue;

    for (const r of data ?? []) {
      const row = r as { emprendedor_id?: unknown };
      const k = normalizeEmprendedorId(row.emprendedor_id);
      if (!k) continue;
      map.set(k, (map.get(k) ?? 0) + 1);
    }
  }

  return map;
}

/**
 * URLs públicas de galería (solo `emprendedor_galeria`), orden de inserción.
 * Usa el cliente anon del servidor (misma política que la ficha pública).
 */
export async function fetchGaleriaImagenesUrlsPublicas(
  supabase: SupabaseClient,
  emprendedorId: unknown
): Promise<string[]> {
  const eid = String(emprendedorId ?? "").trim();
  if (!eid) return [];

  const { data, error } = await supabase
    .from("emprendedor_galeria")
    .select("imagen_url")
    .eq("emprendedor_id", eid)
    .order("created_at", { ascending: true });

  if (error || !Array.isArray(data) || data.length === 0) return [];

  return (data as { imagen_url?: unknown }[])
    .map((r) => String(r.imagen_url ?? "").trim())
    .filter(Boolean)
    .slice(0, 8);
}
