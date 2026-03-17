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
    const accion = s(body?.accion).toLowerCase();

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Falta id de emprendimiento." },
        { status: 400 }
      );
    }

    if (!["suspender", "reactivar"].includes(accion)) {
      return NextResponse.json(
        { ok: false, error: "Acción inválida." },
        { status: 400 }
      );
    }

    const { data: existing, error: existingError } = await supabase
      .from("emprendedores")
      .select("id, estado_publicacion, slug")
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        { ok: false, error: existingError.message },
        { status: 500 }
      );
    }

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Emprendimiento no encontrado." },
        { status: 404 }
      );
    }

    const nuevoEstado =
      accion === "suspender" ? "suspendido" : "publicado";

    const { error: updateError } = await supabase
      .from("emprendedores")
      .update({ estado_publicacion: nuevoEstado })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        { ok: false, error: updateError.message },
        { status: 500 }
      );
    }

    // Reindex puntual en Algolia si la visibilidad cambia
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    try {
      await fetch(
        `${baseUrl.replace(/\/+$/, "")}/api/reindex/emprendedores/item?id=${encodeURIComponent(
          id
        )}`
      );
    } catch (_err) {
      // No bloquear si falla reindex
    }

    return NextResponse.json({
      ok: true,
      item: {
        id: existing.id,
        estado_publicacion: nuevoEstado,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Error inesperado al actualizar publicación.",
      },
      { status: 500 }
    );
  }
}

