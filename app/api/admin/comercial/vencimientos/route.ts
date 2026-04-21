import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getEstadoComercialEmprendedor,
  type EstadoComercialEmprendedor,
} from "@/lib/getEstadoComercialEmprendedor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type Fila = {
  id: string;
  nombre_emprendimiento: string | null;
  slug: string | null;
  plan_activo: boolean | null;
  plan_expira_at: string | null;
  trial_expira_at: string | null;
  trial_expira: string | null;
};

/**
 * GET /api/admin/comercial/vencimientos
 * Diagnóstico: emprendedores en trial/plan por vencer o vencidos recientes.
 */
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("emprendedores")
      .select(
        "id, nombre_emprendimiento, slug, plan_activo, plan_expira_at, trial_expira_at, trial_expira, estado_publicacion"
      )
      .eq("estado_publicacion", "publicado")
      .limit(800);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    const rows = (Array.isArray(data) ? data : []) as Fila[];

    type OutItem = {
      id: string;
      nombre: string;
      slug: string | null;
      estado: EstadoComercialEmprendedor;
      diasRestantes: number | null;
      fechaExpiracion: string | null;
    };

    const trial_por_vencer: OutItem[] = [];
    const plan_por_vencer: OutItem[] = [];
    const vencido_reciente: OutItem[] = [];

    for (const r of rows) {
      const input = {
        planActivo: r.plan_activo === true ? true : null,
        planExpiraAt: r.plan_expira_at ?? null,
        trialExpiraAt: r.trial_expira_at ?? null,
        trialExpira: r.trial_expira ?? null,
      };
      const ev = getEstadoComercialEmprendedor(input);
      const item: OutItem = {
        id: r.id,
        nombre: String(r.nombre_emprendimiento ?? "").trim() || "(sin nombre)",
        slug: r.slug,
        estado: ev.estado,
        diasRestantes: ev.diasRestantes,
        fechaExpiracion: ev.fechaExpiracion,
      };
      if (ev.estado === "trial_por_vencer") trial_por_vencer.push(item);
      else if (ev.estado === "plan_por_vencer") plan_por_vencer.push(item);
      else if (ev.estado === "vencido_reciente") vencido_reciente.push(item);
    }

    return NextResponse.json({
      ok: true,
      generado_at: new Date().toISOString(),
      totales: {
        trial_por_vencer: trial_por_vencer.length,
        plan_por_vencer: plan_por_vencer.length,
        vencido_reciente: vencido_reciente.length,
      },
      trial_por_vencer,
      plan_por_vencer,
      vencido_reciente,
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
