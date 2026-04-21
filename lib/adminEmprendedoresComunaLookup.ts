import type { SupabaseClient } from "@supabase/supabase-js";

export type ComunaNombreSlug = { id: string; nombre: string; slug: string };

/**
 * Resuelve comunas sin embed PostgREST (evita errores si falta FK o el nombre del constraint no coincide).
 */
export async function mapComunasByIdForEmprendedorRows(
  supabase: SupabaseClient,
  rows: Record<string, unknown>[]
): Promise<Map<string, ComunaNombreSlug>> {
  const ids = new Set<string>();
  for (const r of rows) {
    const raw = r.comuna_base_id ?? r.comuna_id;
    if (raw == null || raw === "") continue;
    ids.add(String(raw));
  }
  const out = new Map<string, ComunaNombreSlug>();
  if (ids.size === 0) return out;

  const idList = [...ids];
  const { data, error } = await supabase
    .from("comunas")
    .select("id,nombre,slug")
    .in("id", idList);

  if (error || !data?.length) return out;

  for (const row of data) {
    const o = row as Record<string, unknown>;
    const id = o.id;
    if (id == null) continue;
    const idStr = String(id);
    const nombre = String(o.nombre ?? "").trim();
    const slug = String(o.slug ?? "").trim();
    out.set(idStr, {
      id: idStr,
      nombre: nombre || "—",
      slug,
    });
  }
  return out;
}

export function comunaIdPreferidaEmprendedorRow(
  r: Record<string, unknown>
): string | null {
  const raw = r.comuna_base_id ?? r.comuna_id;
  if (raw == null || raw === "") return null;
  return String(raw);
}

export type CategoriaNombreSlug = { id: string; nombre: string; slug: string };

/** Sin embed `categorias` (evita errores de FK / relación PostgREST). */
export async function mapCategoriasByIdForEmprendedorRows(
  supabase: SupabaseClient,
  rows: Record<string, unknown>[]
): Promise<Map<string, CategoriaNombreSlug>> {
  const ids = new Set<string>();
  for (const r of rows) {
    const raw = r.categoria_id;
    if (raw == null || raw === "") continue;
    ids.add(String(raw));
  }
  const out = new Map<string, CategoriaNombreSlug>();
  if (ids.size === 0) return out;

  const idList = [...ids];
  const { data, error } = await supabase
    .from("categorias")
    .select("id,nombre,slug")
    .in("id", idList);

  if (error || !data?.length) return out;

  for (const row of data) {
    const o = row as Record<string, unknown>;
    const id = o.id;
    if (id == null) continue;
    const idStr = String(id);
    const nombre = String(o.nombre ?? "").trim();
    const slug = String(o.slug ?? "").trim();
    out.set(idStr, {
      id: idStr,
      nombre: nombre || "—",
      slug,
    });
  }
  return out;
}

export function categoriaIdEmprendedorRow(r: Record<string, unknown>): string | null {
  const raw = r.categoria_id;
  if (raw == null || raw === "") return null;
  return String(raw);
}
