import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";
import { resolveEmprendedorIdForPanelMetrics } from "@/lib/panelNegocioAccessToken";
import {
  isPlanCodigoPago,
  montoClpPorPlanCodigo,
  type PlanCodigoPago,
} from "@/lib/planPagoCatalogo";

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

function slugToken(slug: string): string {
  const clean = slug
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  return clean.slice(0, 8) || "PAGO";
}

function random4(): string {
  const n = randomBytes(2).readUInt16BE(0) % 10000;
  return String(n).padStart(4, "0");
}

async function generarReferenciaPago(emprendedorId: string): Promise<string> {
  // Preferir slug del emprendedor si existe.
  const { data } = await supabase
    .from("emprendedores")
    .select("slug")
    .eq("id", emprendedorId)
    .maybeSingle();
  const slug = data && typeof data === "object" ? s((data as { slug?: unknown }).slug) : "";
  const token = slug ? slugToken(slug) : slugToken(emprendedorId);
  return `RDD-${token}-${random4()}`;
}

export async function POST(req: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
    }

    const accessToken = s(body.access_token ?? body.accessToken);
    const emprendedorIdRaw = s(body.emprendedorId ?? body.id);
    const planRaw = s(body.planCodigo ?? body.plan).toLowerCase();

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

    const emprendedorId = emprendedorIdRaw || resolvedEmprendedorId;
    if (emprendedorId !== resolvedEmprendedorId) {
      return NextResponse.json({ ok: false, error: "access_token_mismatch" }, { status: 403 });
    }

    if (!isPlanCodigoPago(planRaw)) {
      return NextResponse.json({ ok: false, error: "invalid_planCodigo" }, { status: 400 });
    }

    const planCodigo = planRaw as PlanCodigoPago;
    const monto = montoClpPorPlanCodigo(planCodigo);
    if (!Number.isFinite(monto) || monto <= 0) {
      return NextResponse.json({ ok: false, error: "invalid_monto" }, { status: 400 });
    }

    // Reusar pago pendiente/en_revision si ya existe para ese plan.
    const { data: existing, error: existingErr } = await supabase
      .from("pagos")
      .select("id, referencia_pago, estado, monto, comprobante_url, created_at")
      .eq("emprendedor_id", emprendedorId)
      .eq("metodo_pago", "transferencia")
      .eq("proveedor", "manual")
      .eq("plan_codigo", planCodigo)
      .in("estado", ["pendiente", "en_revision"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingErr) {
      return NextResponse.json(
        {
          ok: false,
          error: "db_select_failed",
          ...supabaseErrorDevFields(existingErr),
        },
        { status: 500 }
      );
    }

    if (existing) {
      const row = existing as {
        id: string;
        referencia_pago: string;
        estado: string;
        monto: number;
        comprobante_url?: string | null;
      };
      const transferenciaId = s(row.id);
      const referenciaResp = s(row.referencia_pago);
      return NextResponse.json({
        ok: true,
        transferenciaId,
        referencia: referenciaResp,
        pago: {
          id: transferenciaId,
          referencia: referenciaResp,
          estado: s(row.estado),
          monto: Number(row.monto),
          comprobanteUrl: s(row.comprobante_url ?? "") || null,
        },
      });
    }

    let referencia = await generarReferenciaPago(emprendedorId);
    let lastInsertError: SupabaseErrShape | null = null;
    // Best-effort: si colisiona por UNIQUE, regenerar una vez.
    for (let i = 0; i < 2; i++) {
      const { data: inserted, error } = await supabase
        .from("pagos")
        .insert({
          emprendedor_id: emprendedorId,
          plan_codigo: planCodigo,
          metodo_pago: "transferencia",
          proveedor: "manual",
          referencia_pago: referencia,
          estado: "pendiente",
          monto,
          moneda: "CLP",
        })
        .select("id, referencia_pago, estado, monto")
        .single();

      if (!error && inserted) {
        const r = inserted as {
          id: string;
          referencia_pago: string;
          estado: string;
          monto: number;
        };
        const transferenciaId = s(r.id);
        const referenciaResp = s(r.referencia_pago);
        return NextResponse.json({
          ok: true,
          transferenciaId,
          referencia: referenciaResp,
          pago: {
            id: transferenciaId,
            referencia: referenciaResp,
            estado: s(r.estado),
            monto: Number(r.monto),
            comprobanteUrl: null,
          },
        });
      }

      if (error) {
        lastInsertError = error;
        console.error("[pagos/transferencia/crear] insert:", error.code, error.message);
      }

      referencia = await generarReferenciaPago(emprendedorId);
    }

    return NextResponse.json(
      {
        ok: false,
        error: "db_insert_failed",
        ...supabaseErrorDevFields(lastInsertError ?? undefined),
      },
      { status: 500 }
    );
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "unexpected" },
      { status: 500 }
    );
  }
}

