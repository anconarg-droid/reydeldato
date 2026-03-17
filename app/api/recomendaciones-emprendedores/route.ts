import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function s(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const nombre_emprendimiento = s(body?.nombre_emprendimiento);
    const servicio_texto_raw = s(body?.servicio_texto);
    const comuna_slug = s(body?.comuna_slug);
    const contacto = s(body?.contacto);

    if (!nombre_emprendimiento || nombre_emprendimiento.length < 2) {
      return NextResponse.json(
        { ok: false, error: "Falta el nombre del emprendimiento." },
        { status: 400 }
      );
    }

    if (!comuna_slug) {
      return NextResponse.json(
        { ok: false, error: "Falta la comuna." },
        { status: 400 }
      );
    }

    if (!contacto) {
      return NextResponse.json(
        { ok: false, error: "Falta el contacto del emprendimiento." },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    const { data: comuna, error: comunaError } = await supabase
      .from("comunas")
      .select("id")
      .eq("slug", comuna_slug)
      .maybeSingle();

    if (comunaError) {
      return NextResponse.json(
        { ok: false, error: `Error buscando comuna: ${comunaError.message}` },
        { status: 500 }
      );
    }

    if (!comuna) {
      return NextResponse.json(
        { ok: false, error: "No encontramos la comuna seleccionada." },
        { status: 400 }
      );
    }

    const { error: insertError } = await supabase
      .from("recomendaciones_emprendedores")
      .insert({
        nombre_emprendimiento,
        servicio_texto: servicio_texto_raw || null,
        comuna_id: (comuna as any).id,
        contacto,
        estado: "pendiente",
      });

    if (insertError) {
      return NextResponse.json(
        { ok: false, error: `No pudimos guardar la recomendación: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Error inesperado.",
      },
      { status: 500 }
    );
  }
}

