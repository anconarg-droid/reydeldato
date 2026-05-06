import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function s(v: unknown): string {
  return String(v ?? "").trim();
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const pagoId = s(id);
    if (!pagoId) {
      return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
    }

    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }
    const observaciones = s(body.observaciones ?? body.motivo);

    const { data: row, error } = await supabase
      .from("pagos")
      .select("id, estado")
      .eq("id", pagoId)
      .maybeSingle();

    if (error || !row) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    const estado = s((row as { estado?: unknown }).estado);
    if (estado === "rechazado") {
      return NextResponse.json({ ok: true, already: true });
    }
    if (estado === "aprobado" || estado === "expirado") {
      return NextResponse.json({ ok: false, error: "invalid_state" }, { status: 409 });
    }

    const nowIso = new Date().toISOString();
    const { error: upErr } = await supabase
      .from("pagos")
      .update({
        estado: "rechazado",
        validated_at: nowIso,
        validated_by: "admin",
        observaciones: observaciones || null,
      })
      .eq("id", pagoId);

    if (upErr) {
      return NextResponse.json({ ok: false, error: "db_update_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "unexpected" },
      { status: 500 }
    );
  }
}

