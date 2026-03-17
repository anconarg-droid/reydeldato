import { NextRequest, NextResponse } from "next/server";
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

/**
 * PATCH /api/publicar/borrador/[id]
 * Actualiza un borrador con campos parciales (nombre, whatsapp, comuna, rubro).
 * Solo permite actualizar si estado = borrador.
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

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const nombre = body.nombre != null ? s(body.nombre) : undefined;
    const whatsapp = body.whatsapp != null ? s(body.whatsapp) : undefined;
    const comuna_base_slug = body.comuna_base_slug != null ? s(body.comuna_base_slug) : undefined;
    const descripcion_negocio = body.descripcion_negocio != null ? s(body.descripcion_negocio) : undefined;
    const frase_negocio = body.frase_negocio != null ? s(body.frase_negocio).slice(0, 120) : undefined;
    const sector_slug = body.sector_slug != null ? s(body.sector_slug) : undefined;
    const categoria_slug = body.categoria_slug != null ? s(body.categoria_slug) : undefined;

    const { data: row, error: fetchErr } = await supabase
      .from("emprendedores")
      .select("id, estado, comuna_base_id")
      .eq("id", id)
      .single();

    if (fetchErr || !row) {
      return NextResponse.json({ ok: false, error: "Borrador no encontrado" }, { status: 404 });
    }

    if ((row as any).estado !== "borrador") {
      return NextResponse.json(
        { ok: false, error: "Solo se puede actualizar un borrador" },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {
      ultimo_avance: new Date().toISOString(),
    };

    if (nombre !== undefined) updates.nombre = nombre;
    if (whatsapp !== undefined) updates.whatsapp = whatsapp;
    if (descripcion_negocio !== undefined) updates.descripcion_negocio = descripcion_negocio || null;
    if (frase_negocio !== undefined) updates.frase_negocio = frase_negocio || null;
    if (sector_slug !== undefined) updates.sector_slug = sector_slug || null;
    if (categoria_slug !== undefined) {
      const { data: cat } = await supabase
        .from("categorias")
        .select("id")
        .eq("slug", categoria_slug)
        .maybeSingle();
      if (cat?.id) updates.categoria_id = cat.id;
    }

    if (comuna_base_slug !== undefined) {
      const { data: comuna } = await supabase
        .from("comunas")
        .select("id, nombre, slug")
        .eq("slug", comuna_base_slug)
        .maybeSingle();
      if (comuna?.id) {
        updates.comuna_base_id = comuna.id;
        updates.coverage_keys = [comuna.slug];
        updates.coverage_labels = [comuna.nombre];
      }
    }

    const { error: updateErr } = await supabase
      .from("emprendedores")
      .update(updates)
      .eq("id", id)
      .eq("estado", "borrador");

    if (updateErr) {
      console.error("[publicar/borrador PATCH] error:", updateErr);
      return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[publicar/borrador PATCH] error:", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Error al guardar borrador" },
      { status: 500 }
    );
  }
}
