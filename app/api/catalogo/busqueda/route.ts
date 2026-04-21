import { NextResponse } from "next/server";
import { createSupabaseServerPublicClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createSupabaseServerPublicClient();

    const [comunasRes, categoriasRes, subcategoriasRes] = await Promise.all([
      supabase.from("comunas").select("nombre, slug").order("nombre"),
      supabase.from("categorias").select("id, nombre, slug").order("nombre"),
      supabase.from("subcategorias").select("nombre, slug, categoria_id").eq("activo", true).order("nombre"),
    ]);

    if (comunasRes.error) throw comunasRes.error;
    if (categoriasRes.error) throw categoriasRes.error;
    if (subcategoriasRes.error) throw subcategoriasRes.error;

    const categoriasRaw = categoriasRes.data || [];
    const subcategoriasRaw = subcategoriasRes.data || [];
    // Taxonomía v1: no exponer "Otros" como categoría pública
    const categorias = categoriasRaw.filter((c: { slug?: string }) => c.slug !== "otros");
    const otrosIds = new Set(
      categoriasRaw.filter((c: { slug?: string }) => c.slug === "otros").map((c: { id?: string }) => c.id)
    );
    const subcategorias = subcategoriasRaw.filter(
      (s: { categoria_id?: string }) => !s.categoria_id || !otrosIds.has(s.categoria_id)
    ).map((s: { nombre: string; slug: string }) => ({ nombre: s.nombre, slug: s.slug }));

    return NextResponse.json({
      ok: true,
      items: {
        comunas: comunasRes.data || [],
        categorias: categorias.map((c: { nombre: string; slug: string }) => ({ nombre: c.nombre, slug: c.slug })),
        subcategorias,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "Error cargando catálogo de búsqueda.",
      },
      { status: 500 }
    );
  }
}