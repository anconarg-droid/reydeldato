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
      .select("id, nombre, estado_publicacion")
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
        estado_publicacion: "publicado",
        publicado: true,
      })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        { ok: false, error: updateError.message },
        { status: 500 }
      );
    }

    // Actualizar índice de Algolia para que aparezca en búsqueda y sugerencias
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    try {
      const reindexRes = await fetch(
        `${baseUrl.replace(/\/+$/, "")}/api/reindex/emprendedores/item?id=${encodeURIComponent(id)}`
      );
      if (!reindexRes.ok) {
        console.warn("[aprobar] Reindex Algolia no ok:", reindexRes.status, await reindexRes.text());
      }
    } catch (err) {
      console.warn("[aprobar] Error llamando reindex Algolia:", err);
    }

    return NextResponse.json({
      ok: true,
      item: {
        id: existing.id,
        nombre: existing.nombre,
        estado_publicacion: "publicado",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Error inesperado al aprobar.",
      },
      { status: 500 }
    );
  }
}