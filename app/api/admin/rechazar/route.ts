import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function s(v: unknown) {
  return String(v ?? "").trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = s(body?.id);

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Falta el id del emprendimiento." },
        { status: 400 }
      );
    }

    const { data: existing, error: findError } = await supabase
      .from("emprendedores")
      .select("id, nombre_emprendimiento, estado_publicacion")
      .eq("id", id)
      .maybeSingle();

    if (findError) {
      return NextResponse.json(
        { ok: false, error: findError.message },
        { status: 500 }
      );
    }

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Emprendimiento no encontrado." },
        { status: 404 }
      );
    }

    const { error: updateError } = await supabase
      .from("emprendedores")
      .update({
        estado_publicacion: "rechazado",
      })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        { ok: false, error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      item: {
        id: existing.id,
        nombre: existing.nombre_emprendimiento,
        estado_publicacion: "rechazado",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Error inesperado al rechazar.",
      },
      { status: 500 }
    );
  }
}