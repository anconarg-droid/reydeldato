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

export async function POST(
  _req: NextRequest,
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

    const { data: actual, error: findError } = await supabase
      .from("emprendedores")
      .select("id, slug, click_whatsapp")
      .eq("slug", slug)
      .limit(1)
      .maybeSingle();

    if (findError) {
      return NextResponse.json(
        { ok: false, error: findError.message },
        { status: 500 }
      );
    }

    if (!actual) {
      return NextResponse.json(
        { ok: false, error: "Emprendimiento no encontrado" },
        { status: 404 }
      );
    }

    const nuevoValor = Number(actual.click_whatsapp || 0) + 1;

    const { error: updateError } = await supabase
      .from("emprendedores")
      .update({ click_whatsapp: nuevoValor })
      .eq("id", actual.id);

    if (updateError) {
      return NextResponse.json(
        { ok: false, error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      slug,
      click_whatsapp: nuevoValor,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Error interno" },
      { status: 500 }
    );
  }
}