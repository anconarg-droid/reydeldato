import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolveEmprendedorIdForPanelMetrics } from "@/lib/panelNegocioAccessToken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const isDev = process.env.NODE_ENV !== "production";

type SupabaseErrShape = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

function supabaseErrorDevFields(err: SupabaseErrShape | null | undefined) {
  if (!isDev || !err) return {};
  return {
    supabaseCode: err.code,
    supabaseMessage: err.message,
    supabaseDetails: err.details,
    supabaseHint: err.hint,
  };
}

function s(v: unknown): string {
  return String(v ?? "").trim();
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const accessToken = s(url.searchParams.get("access_token") || url.searchParams.get("token"));
    if (!accessToken || accessToken.length < 8) {
      return NextResponse.json({ ok: false, error: "missing_access_token" }, { status: 401 });
    }

    const resolvedEmprendedorId = await resolveEmprendedorIdForPanelMetrics(
      supabase,
      accessToken
    );
    if (!resolvedEmprendedorId) {
      return NextResponse.json({ ok: false, error: "invalid_access_token" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("pagos")
      .select(
        "id, plan_codigo, metodo_pago, proveedor, referencia_pago, estado, monto, moneda, comprobante_url, observaciones, created_at, paid_at, validated_at"
      )
      .eq("emprendedor_id", resolvedEmprendedorId)
      .eq("metodo_pago", "transferencia")
      .eq("proveedor", "manual")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: "db_select_failed",
          ...supabaseErrorDevFields(error),
        },
        { status: 500 }
      );
    }

    const items = (Array.isArray(data) ? data : []).map((r) => {
      const row = r as Record<string, unknown>;
      return {
        id: s(row.id),
        planCodigo: s(row.plan_codigo),
        referencia: s(row.referencia_pago),
        estado: s(row.estado),
        monto: Number(row.monto ?? 0),
        comprobanteUrl: s(row.comprobante_url) || null,
        createdAt: s(row.created_at) || null,
        paidAt: s(row.paid_at) || null,
        validatedAt: s(row.validated_at) || null,
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

