import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function prettySlug(slug: string) {
  return slug
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const [{ data: resumen, error: resumenError }, { data: ultimosEmp, error: empError }] =
      await Promise.all([
        supabase
          .from("vw_comunas_expansion_estado")
          .select("*")
          .eq("comuna_slug", slug)
          .maybeSingle(),

        supabase
          .from("comunas_pre_registro_emprendedores")
          .select(
            "id,nombre_emprendimiento,categoria_referencial,descripcion_corta,created_at"
          )
          .eq("comuna_slug", slug)
          .order("created_at", { ascending: false })
          .limit(6),
      ]);

    if (resumenError) {
      return NextResponse.json(
        {
          ok: false,
          error: "resumen_error",
          message: resumenError.message,
        },
        { status: 500 }
      );
    }

    if (empError) {
      return NextResponse.json(
        {
          ok: false,
          error: "ultimos_error",
          message: empError.message,
        },
        { status: 500 }
      );
    }

    const item =
      resumen || {
        comuna_slug: slug,
        comuna_nombre: prettySlug(slug),
        region_nombre: "",
        meta_emprendedores: 40,
        total_emprendedores: 0,
        total_vecinos: 0,
        avance_porcentaje: 0,
        estado: "sin_movimiento",
      };

    return NextResponse.json({
      ok: true,
      item,
      ultimos_emprendedores: ultimosEmp || [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "unexpected_error",
        message:
          error instanceof Error
            ? error.message
            : "Error inesperado cargando expansión.",
      },
      { status: 500 }
    );
  }
}