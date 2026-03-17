import PublicarClient from "./PublicarClient";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function PublicarPage() {

  const supabase = createSupabaseServerClient();

  const { data: categoriasRaw } = await supabase
    .from("categorias")
    .select("id,nombre,slug")
    .order("nombre");

  const { data: subcategoriasRaw } = await supabase
    .from("subcategorias")
    .select("id,categoria_id,nombre,slug,is_destacada,orden_destacada")
    .order("nombre");

  const categorias = (categoriasRaw || []).filter((c: { slug?: string }) => c.slug !== "otros");
  const otrosId = (categoriasRaw || []).find((c: { slug?: string }) => c.slug === "otros")?.id;
  const subcategorias = (subcategoriasRaw || []).filter(
    (s: { categoria_id?: string }) => !otrosId || s.categoria_id !== otrosId
  );

  const { data: comunas } = await supabase
    .from("vw_comunas_busqueda")
    .select("id,nombre,slug,region_id,region_nombre,display_name")
    .order("nombre");

  const { data: regiones } = await supabase
    .from("regiones")
    .select("id,nombre,slug")
    .order("nombre");

  return (
    <PublicarClient
      categorias={categorias}
      subcategorias={subcategorias}
      comunas={comunas || []}
      regiones={regiones || []}
    />
  );
}