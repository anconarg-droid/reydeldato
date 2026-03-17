import { NextRequest, NextResponse } from "next/server";
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

const EVENTOS_VALIDOS = new Set([
  "view_ficha",
  "click_whatsapp",
  "click_instagram",
  "click_web",
  "click_email",
]);

const MAPA_COLUMNAS: Record<string, string> = {
  view_ficha: "vistas_ficha",
  click_whatsapp: "click_whatsapp",
  click_instagram: "click_instagram",
  click_web: "click_web",
  click_email: "click_email",
};

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const params = await context.params;
    const slug = s(params?.slug);

    if (!slug) {
      return NextResponse.json(
        { ok: false, error: "Slug requerido" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const tipo_evento = s(body?.tipo_evento);
    const origen = s(body?.origen);

    if (!EVENTOS_VALIDOS.has(tipo_evento)) {
      return NextResponse.json(
        { ok: false, error: "tipo_evento inválido" },
        { status: 400 }
      );
    }

    const { data: emp, error: findError } = await supabase
      .from("emprendedores")
      .select("id, slug, vistas_ficha, click_whatsapp, click_instagram, click_web, click_email")
      .eq("slug", slug)
      .limit(1)
      .maybeSingle();

    if (findError) {
      return NextResponse.json(
        { ok: false, error: findError.message },
        { status: 500 }
      );
    }

    if (!emp) {
      return NextResponse.json(
        { ok: false, error: "Emprendimiento no encontrado" },
        { status: 404 }
      );
    }

    const columna = MAPA_COLUMNAS[tipo_evento];
    const valorActual = Number((emp as any)[columna] || 0);
    const nuevoValor = valorActual + 1;

    const { error: updateError } = await supabase
      .from("emprendedores")
      .update({ [columna]: nuevoValor })
      .eq("id", emp.id);

    if (updateError) {
      return NextResponse.json(
        { ok: false, error: updateError.message },
        { status: 500 }
      );
    }

    const { error: insertError } = await supabase
      .from("emprendedor_eventos")
      .insert({
        emprendedor_id: emp.id,
        tipo_evento,
        canal: "otros",
        metadata: { slug, origen: origen || null },
      });

    if (insertError) {
      return NextResponse.json(
        { ok: false, error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      slug,
      tipo_evento,
      contador: nuevoValor,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Error interno" },
      { status: 500 }
    );
  }
}