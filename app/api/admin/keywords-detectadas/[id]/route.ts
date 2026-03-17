import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { updateEstadoKeywordDetectada } from "@/lib/keywordsDetectadas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * PATCH: cambiar estado de una keyword detectada.
 * Body: { estado: "aprobada" | "bloqueada", subcategoria_id?: string }
 * Para estado "aprobada" es obligatorio subcategoria_id (se agrega al diccionario).
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ ok: false, error: "Falta id" }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      estado?: string;
      subcategoria_id?: string | null;
    };
    const estado = body.estado as "aprobada" | "bloqueada" | undefined;
    if (!estado || !["aprobada", "bloqueada"].includes(estado)) {
      return NextResponse.json(
        { ok: false, error: "estado debe ser 'aprobada' o 'bloqueada'" },
        { status: 400 }
      );
    }

    const result = await updateEstadoKeywordDetectada(
      supabase,
      id,
      estado,
      body.subcategoria_id ?? undefined
    );

    if (!result.ok) {
      const status = result.error.includes("subcategoria_id") ? 400 : 500;
      return NextResponse.json({ ok: false, error: result.error }, { status });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/keywords-detectadas PATCH]", err);
    return NextResponse.json(
      { ok: false, error: "Error al actualizar estado." },
      { status: 500 }
    );
  }
}
