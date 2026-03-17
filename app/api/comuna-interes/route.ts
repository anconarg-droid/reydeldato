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

    const comuna_slug = s(body?.comuna_slug);
    const nombre = s(body?.nombre);
    const telefono = s(body?.telefono);
    const rubro = s(body?.rubro);
    const comentario = s(body?.comentario);
    const email = s(body?.email);

    if (!comuna_slug) {
      return NextResponse.json({ ok: false, error: "Falta comuna_slug" }, { status: 400 });
    }
    if (!nombre || nombre.length < 2) {
      return NextResponse.json({ ok: false, error: "Falta nombre" }, { status: 400 });
    }
    if (!telefono || telefono.length < 6) {
      return NextResponse.json({ ok: false, error: "Falta teléfono" }, { status: 400 });
    }
    if (!rubro || rubro.length < 2) {
      return NextResponse.json({ ok: false, error: "Falta rubro" }, { status: 400 });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ ok: false, error: "Email inválido" }, { status: 400 });
    }

    const supabase = createSupabaseServerClient();
    const { error } = await supabase.from("comuna_interes").insert({
      comuna_slug,
      nombre,
      telefono,
      rubro,
      comentario: comentario || null,
      email,
    });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Error" },
      { status: 500 }
    );
  }
}

