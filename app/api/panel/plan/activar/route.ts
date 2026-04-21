import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { activarPlanEmprendedorEnSupabase } from "@/app/api/_lib/activarPlanEmprendedorSupabase";
import type { PlanPeriodicidad } from "@/lib/planConstants";
import { panelPlanMutationAllowed } from "@/lib/panelPlanActivationAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function s(v: unknown): string {
  return String(v ?? "").trim();
}

type PlanBody = "basico" | "semestral" | "anual";

function toPeriodicidad(plan: PlanBody): PlanPeriodicidad {
  if (plan === "basico") return "mensual";
  if (plan === "semestral") return "semestral";
  return "anual";
}

/**
 * POST /api/panel/plan/activar
 * Activa plan pagado (MVP / QA). Protegido con `PANEL_PLAN_ACTIVATION_SECRET` en producción.
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
    const planRaw = s(body?.plan).toLowerCase() as PlanBody;

    if (!emprendedorId) {
      return NextResponse.json(
        { ok: false, error: "missing_emprendedorId" },
        { status: 400 }
      );
    }

    if (!["basico", "semestral", "anual"].includes(planRaw)) {
      return NextResponse.json(
        { ok: false, error: "invalid_plan" },
        { status: 400 }
      );
    }

    const periodicidad = toPeriodicidad(planRaw);

    const { data: existing, error: findErr } = await supabase
      .from("emprendedores")
      .select("id")
      .eq("id", emprendedorId)
      .maybeSingle();

    if (findErr || !existing) {
      return NextResponse.json(
        { ok: false, error: "not_found" },
        { status: 404 }
      );
    }

    let expiraIso: string;
    try {
      const r = await activarPlanEmprendedorEnSupabase(
        supabase,
        emprendedorId,
        periodicidad
      );
      expiraIso = r.plan_expira_at;
    } catch (e) {
      return NextResponse.json(
        {
          ok: false,
          error: e instanceof Error ? e.message : "update_failed",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      plan_periodicidad: periodicidad,
      plan_expira_at: expiraIso,
    });
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
