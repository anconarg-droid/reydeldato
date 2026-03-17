import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from("categorias")
      .select("id, nombre, slug")
      .order("nombre", { ascending: true });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    // Taxonomía v1: no exponer "Otros" como categoría pública
    const list = (data ?? []).filter((c: { slug?: string }) => c.slug !== "otros");

    return NextResponse.json({
      ok: true,
      data: list,
    });

  } catch (err: any) {

    return NextResponse.json(
      { ok: false, error: err?.message || "Error interno" },
      { status: 500 }
    );

  }
}