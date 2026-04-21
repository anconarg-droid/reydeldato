import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { panelPlanMutationAllowed } from "@/lib/panelPlanActivationAuth";
import { syncEmprendedorToAlgoliaWithSupabase } from "@/lib/algoliaSyncEmprendedor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function s(v: unknown): string {
  return String(v ?? "").trim();
}

/**
 * POST /api/panel/plan/desactivar
 * Fuerza vencimiento de plan (QA).
 */
export async function POST(req: NextRequest) {
  try {
    if (!panelPlanMutationAllowed(req)) {
      return NextResponse.json(
        { ok: false, error: "forbidden" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const emprendedorId = s(body?.emprendedorId ?? body?.id);

    if (!emprendedorId) {
      return NextResponse.json(
        { ok: false, error: "missing_emprendedorId" },
        { status: 400 }
      );
    }

    const pasado = new Date(Date.now() - 60_000);

    const { error: upErr } = await supabase
      .from("emprendedores")
      .update({
        plan_activo: false,
        plan_expira_at: pasado.toISOString(),
      })
      .eq("id", emprendedorId);

    if (upErr) {
      return NextResponse.json(
        { ok: false, error: upErr.message },
        { status: 500 }
      );
    }

    try {
      await syncEmprendedorToAlgoliaWithSupabase(supabase, emprendedorId);
    } catch {
      /* no bloquear */
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "unexpected",
      },
      { status: 500 }
    );
  }
}
