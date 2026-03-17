import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function s(v: any): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function pickFoto(row: any): string {
  return (
    s(row?.foto_principal_url) ||
    s(row?.foto_principal) ||
    s(row?.foto_url) ||
    s(row?.imagen_url) ||
    s(row?.imagen) ||
    s(row?.foto) ||
    "/placeholder-emprendedor.jpg"
  );
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("vw_emprendedores_algolia_final")
      .select("*")
      .limit(8);

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          message: error.message,
        },
        { status: 500 }
      );
    }

    const items = Array.isArray(data) ? data : [];

    return NextResponse.json({
      ok: true,
      items: items.map((row: any) => ({
        id: s(row?.id),
        slug: s(row?.slug),
        nombre: s(row?.nombre),
        descripcion: s(row?.descripcion_corta),
        foto: pickFoto(row),
        comuna: s(row?.comuna_base_nombre),
        categoria: s(row?.categoria_nombre),
      })),
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        message: e?.message || "No se pudieron cargar destacados",
      },
      { status: 500 }
    );
  }
}