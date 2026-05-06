import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  isPlanCodigoPago,
  planCodigoToPeriodicidad,
} from "@/lib/planPagoCatalogo";
import { activarPlanEmprendedorEnSupabase } from "@/app/api/_lib/activarPlanEmprendedorSupabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function s(v: unknown): string {
  return String(v ?? "").trim();
}

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const pagoId = s(id);
    if (!pagoId) {
      return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
    }

    const { data: row, error } = await supabase
      .from("pagos")
      .select("id, emprendedor_id, plan_codigo, estado, metodo_pago, proveedor, monto")
      .eq("id", pagoId)
      .maybeSingle();

    if (error || !row) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    const estado = s((row as { estado?: unknown }).estado);
    if (estado === "aprobado") {
      return NextResponse.json({ ok: true, already: true });
    }
    if (estado === "rechazado" || estado === "expirado") {
      return NextResponse.json({ ok: false, error: "invalid_state" }, { status: 409 });
    }

    const planCodigo = s((row as { plan_codigo?: unknown }).plan_codigo).toLowerCase();
    if (!isPlanCodigoPago(planCodigo)) {
      return NextResponse.json({ ok: false, error: "invalid_planCodigo" }, { status: 400 });
    }

    const emprendedorId = s((row as { emprendedor_id?: unknown }).emprendedor_id);
    if (!emprendedorId) {
      return NextResponse.json({ ok: false, error: "missing_emprendedor_id" }, { status: 400 });
    }

    // Activar/renovar plan reutilizando lógica existente (maneja trial → inicio diferido).
    await activarPlanEmprendedorEnSupabase(
      supabase,
      emprendedorId,
      planCodigoToPeriodicidad(planCodigo)
    );

    const nowIso = new Date().toISOString();
    const { error: upErr } = await supabase
      .from("pagos")
      .update({
        estado: "aprobado",
        validated_at: nowIso,
        validated_by: "admin",
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

