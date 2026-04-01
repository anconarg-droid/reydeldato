import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { ok, serverError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Catálogo completo (ids) para clasificación en admin.
 * No exponer categoría interna "otros" como opción de moderación.
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data: cats, error: catErr } = await supabase
      .from("categorias")
      .select("id, nombre, slug")
      .order("nombre");

    if (catErr) {
      return serverError("No se pudieron cargar categorías", catErr.message);
    }

    const categorias = (cats ?? []).filter(
      (c) => s((c as { slug?: unknown }).slug).toLowerCase() !== "otros"
    );

    const { data: subs, error: subErr } = await supabase
      .from("subcategorias")
      .select("id, nombre, slug, categoria_id")
      .order("nombre");

    if (subErr) {
      return serverError("No se pudieron cargar subcategorías", subErr.message);
    }

    const categoriaIds = new Set(
      categorias.map((c) => s((c as { id?: unknown }).id)).filter(Boolean)
    );
    const subcategorias = (subs ?? []).filter((sc) =>
      categoriaIds.has(s((sc as { categoria_id?: unknown }).categoria_id))
    );

    return ok({
      ok: true,
      categorias,
      subcategorias,
    });
  } catch (e) {
    return serverError(
      "Error inesperado en taxonomía moderación",
      e instanceof Error ? e.message : String(e)
    );
  }
}

function s(v: unknown): string {
  return v === null || v === undefined ? "" : String(v).trim();
}
