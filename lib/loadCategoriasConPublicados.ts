import { createSupabaseServerPublicClient } from "@/lib/supabase/server";

const PAGE = 800;

/**
 * Slugs (minúsculas) de categorías que tienen al menos un emprendedor con `estado_publicacion = publicado`.
 * Pagina por si hay muchas filas; deja de pedir cuando ya no llegan filas nuevas.
 */
export async function loadCategoriaSlugsConEmprendedoresPublicados(): Promise<Set<string>> {
  const supabase = createSupabaseServerPublicClient();
  const idSet = new Set<string>();
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from("vw_emprendedores_publico")
      .select("categoria_id")
      .eq("estado_publicacion", "publicado")
      .range(from, from + PAGE - 1);

    if (error || !data?.length) break;

    for (const row of data) {
      const id = (row as { categoria_id?: unknown }).categoria_id;
      if (id != null && String(id).trim() !== "") idSet.add(String(id));
    }
    if (data.length < PAGE) break;
    from += PAGE;
    if (from > 200_000) break;
  }

  if (idSet.size === 0) return new Set();

  const ids = [...idSet];
  const { data: cats, error: catErr } = await supabase
    .from("categorias")
    .select("slug")
    .in("id", ids);

  if (catErr || !cats?.length) return new Set();

  return new Set(
    cats
      .map((c) => String((c as { slug?: unknown }).slug ?? "").trim().toLowerCase())
      .filter(Boolean)
  );
}
