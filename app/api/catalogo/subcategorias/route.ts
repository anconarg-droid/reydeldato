import { NextResponse } from "next/server";
import { createSupabaseServerPublicClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createSupabaseServerPublicClient();

    const { data, error } = await supabase
      .from("subcategorias")
      .select("nombre, slug")
      .eq("activo", true)
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