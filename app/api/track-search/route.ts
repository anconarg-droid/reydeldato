import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function clean(value: unknown) {
  return (value ?? "").toString().trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const q = clean(body.q);
    const comuna = clean(body.comuna);
    const categoria = clean(body.categoria);
    const subcategoria = clean(body.subcategoria);
    const total_resultados = Number(body.total_resultados || 0);
    const session_id = body?.session_id ? clean(body.session_id) : null;

    const { error } = await supabase.from("busquedas_log").insert({
      q: q || null,
      comuna: comuna || null,
      categoria: categoria || null,
      subcategoria: subcategoria || null,
      total_resultados: Number.isFinite(total_resultados) ? total_resultados : 0,
    });

    if (error) {
      console.error("track-search insert error:", error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    // Métricas unificadas (emprendedor_eventos): search_performed (sin emprendedor específico)
    const { error: trackingError } = await supabase
      .from("emprendedor_eventos")
      .insert({
        emprendedor_id: null,
        tipo_evento: "search_performed",
        canal: "busqueda",
        metadata: {
          q: q || null,
          comuna: comuna || null,
          categoria: categoria || null,
          subcategoria: subcategoria || null,
          total_resultados: Number.isFinite(total_resultados) ? total_resultados : 0,
          session_id: session_id || null,
        },
      });
    if (trackingError) {
      console.error("emprendedor_eventos search_performed:", trackingError);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("track-search fatal:", err);
    return NextResponse.json(
      { ok: false, error: "Error interno" },
      { status: 500 }
    );
  }
}