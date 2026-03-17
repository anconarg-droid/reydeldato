import { createSupabaseServerClient } from "@/lib/supabase/server";

function normSlug(s: string): string {
  return String(s ?? "").trim().toLowerCase().replace(/\s+/g, "-");
}

export type ComunaRow = {
  id: string;
  slug: string;
  nombre: string;
  region_id: string;
};

export type CategoriaRow = {
  id: string;
  slug: string;
  nombre: string;
};

export type SubcategoriaRow = {
  id: string;
  slug: string;
  nombre: string;
  categoria_id: string;
};

export type ResolvedSegment =
  | { type: "subcategoria"; id: string; slug: string; nombre: string; categoria_id: string }
  | { type: "categoria"; id: string; slug: string; nombre: string };

/**
 * Comuna por slug. Devuelve null si no existe.
 */
export async function getComunaBySlug(slug: string): Promise<ComunaRow | null> {
  const norm = normSlug(slug);
  if (!norm) return null;
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("comunas")
    .select("id, slug, nombre, region_id")
    .eq("slug", norm)
    .maybeSingle();
  if (error || !data) return null;
  return data as ComunaRow;
}

/**
 * Subcategoría por slug. Opcionalmente filtrar por categoria_id.
 */
export async function getSubcategoriaBySlug(
  slug: string,
  categoriaId?: string
): Promise<SubcategoriaRow | null> {
  const norm = normSlug(slug);
  if (!norm) return null;
  const supabase = createSupabaseServerClient();
  let q = supabase.from("subcategorias").select("id, slug, nombre, categoria_id").eq("slug", norm);
  if (categoriaId) q = q.eq("categoria_id", categoriaId);
  const { data, error } = await q.maybeSingle();
  if (error || !data) return null;
  return data as SubcategoriaRow;
}

/**
 * Categoría por slug.
 */
export async function getCategoriaBySlug(slug: string): Promise<CategoriaRow | null> {
  const norm = normSlug(slug);
  if (!norm || norm === "otros") return null;
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("categorias")
    .select("id, slug, nombre")
    .eq("slug", norm)
    .maybeSingle();
  if (error || !data) return null;
  return data as CategoriaRow;
}

/**
 * Resuelve el segundo segmento de la URL: primero como subcategoría, si no existe como categoría.
 * Útil para /[comuna]/[segment] cuando no se sabe si segment es categoria o subcategoria.
 */
export async function resolveSegment(segmentSlug: string): Promise<ResolvedSegment | null> {
  const sub = await getSubcategoriaBySlug(segmentSlug);
  if (sub) {
    return {
      type: "subcategoria",
      id: sub.id,
      slug: sub.slug,
      nombre: sub.nombre,
      categoria_id: sub.categoria_id,
    };
  }
  const cat = await getCategoriaBySlug(segmentSlug);
  if (cat) {
    return {
      type: "categoria",
      id: cat.id,
      slug: cat.slug,
      nombre: cat.nombre,
    };
  }
  return null;
}
