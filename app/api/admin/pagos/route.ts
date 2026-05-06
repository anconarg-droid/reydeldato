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

export async function GET(_req: NextRequest) {
  try {
    const { data, error } = await supabase
      .from("pagos")
      .select(
        "id, emprendedor_id, plan_codigo, metodo_pago, proveedor, referencia_pago, estado, monto, moneda, comprobante_url, observaciones, created_at, paid_at, validated_at, validated_by"
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // Enriquecer con nombre/slug emprendimiento (best-effort).
    const emprendedorIds = Array.from(
      new Set((Array.isArray(data) ? data : []).map((r) => s((r as { emprendedor_id?: unknown }).emprendedor_id)).filter(Boolean))
    );

    let empById = new Map<string, { nombre: string; slug: string }>();
    if (emprendedorIds.length > 0) {
      const { data: emps } = await supabase
        .from("emprendedores")
        .select("id, slug, nombre_emprendimiento, nombre")
        .in("id", emprendedorIds);
      for (const e of Array.isArray(emps) ? emps : []) {
        const row = e as Record<string, unknown>;
        const id = s(row.id);
        if (!id) continue;
        const nombre = s(row.nombre_emprendimiento || row.nombre || "");
        const slug = s(row.slug || "");
        empById.set(id, { nombre, slug });
      }
    }

    const items = (Array.isArray(data) ? data : []).map((r) => {
      const row = r as Record<string, unknown>;
      const eid = s(row.emprendedor_id);
      const emp = empById.get(eid);
      return {
        id: s(row.id),
        emprendedorId: eid,
        emprendedorNombre: emp?.nombre || "",
        emprendedorSlug: emp?.slug || "",
        planCodigo: s(row.plan_codigo),
        metodoPago: s(row.metodo_pago),
        proveedor: s(row.proveedor),
        referencia: s(row.referencia_pago),
        estado: s(row.estado),
        monto: Number(row.monto ?? 0),
        comprobanteUrl: s(row.comprobante_url) || null,
        observaciones: s(row.observaciones) || null,
        createdAt: s(row.created_at) || null,
        paidAt: s(row.paid_at) || null,
        validatedAt: s(row.validated_at) || null,
        validatedBy: s(row.validated_by) || null,
      };
    });

    return NextResponse.json({ ok: true, items });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "unexpected" },
      { status: 500 }
    );
  }
}

