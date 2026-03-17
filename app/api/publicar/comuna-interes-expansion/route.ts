import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function s(v: unknown): string {
  return String(v ?? "").trim().toLowerCase();
}

/**
 * POST: registra interés por una comuna aún no habilitada (desde formulario de publicación).
 * Body: { comuna_slug: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const comuna_slug = s((body as Record<string, unknown>).comuna_slug);
    if (!comuna_slug) {
      return NextResponse.json({ ok: false, error: "Falta comuna_slug" }, { status: 400 });
    }
    const { error } = await supabase.from("comuna_expansion_interes").insert({ comuna_slug });
    if (error && error.code !== "42P01") {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Error al registrar" }, { status: 500 });
  }
}
