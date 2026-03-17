import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase
      .from("categorias")
      .select("nombre, slug")
      .order("nombre");

    if (error) throw error;

    // Taxonomía v1: no exponer "Otros" como categoría pública
    const items = (data || []).filter((c: { slug?: string }) => c.slug !== "otros");

    return NextResponse.json({
      ok: true,
      items,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Error cargando categorías",
      },
      { status: 500 }
    );
  }
}