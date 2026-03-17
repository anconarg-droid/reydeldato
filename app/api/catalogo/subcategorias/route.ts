import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase
      .from("subcategorias")
      .select("nombre, slug")
      .order("nombre");

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      items: data || [],
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Error cargando subcategorías",
      },
      { status: 500 }
    );
  }
}