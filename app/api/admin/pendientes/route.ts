import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("emprendedores")
      .select(`
        id,
        nombre,
        slug,
        descripcion_corta,
        descripcion_larga,
        whatsapp,
        email,
        instagram,
        sitio_web,
        responsable_nombre,
        mostrar_responsable,
        nivel_cobertura,
        cobertura,
        coverage_labels,
        foto_principal_url,
        galeria_urls,
        estado,
        estado_publicacion,
        publicado,
        created_at,
        categorias (
          id,
          nombre,
          slug
        ),
        comunas!emprendedores_comuna_base_id_fkey (
          id,
          nombre,
          slug
        )
      `)
      .eq("estado", "pendiente_revision")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: "pendientes_fetch_error",
          message: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      items: data || [],
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: "pendientes_unexpected_error",
        message: err instanceof Error ? err.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}