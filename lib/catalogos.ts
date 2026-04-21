import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerPublicClient } from "@/lib/supabase/server";

type ItemSlug = {
  id: number | string;
  nombre: string;
  slug: string;
  region_slug?: string;
};

export async function getCatalogos() {
  // Catálogos públicos: usar anon (no service_role).
  const supabase = createSupabaseServerPublicClient();

  const [comunasRes, categoriasRes, subcategoriasRes] = await Promise.all([
    supabase.from("comunas").select("id,nombre,slug,region_slug"),
    supabase.from("categorias").select("id,nombre,slug"),
    supabase.from("subcategorias").select("id,nombre,slug,categoria_id").eq("activo", true),
  ]);

  const categoriasRaw = (categoriasRes.data || []) as ItemSlug[];
  const subcategoriasRaw = (subcategoriasRes.data || []) as (ItemSlug & { categoria_id?: string })[];
  // Taxonomía v1: no exponer "Otros" como categoría pública
  const categorias = categoriasRaw.filter((c) => c.slug !== "otros");
  const idsPublic = new Set(categorias.map((c) => c.id));
  const subcategorias = subcategoriasRaw.filter(
    (s) => s.categoria_id == null || idsPublic.has(String(s.categoria_id))
  );

  return {
    comunas: (comunasRes.data || []) as ItemSlug[],
    categorias,
    subcategorias,
  };

}