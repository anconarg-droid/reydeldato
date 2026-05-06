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
    const pagoId = s(body.pagoId ?? body.pago_id);
    const comprobanteUrl = s(body.comprobanteUrl ?? body.comprobante_url);

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

    if (!pagoId) {
      return NextResponse.json({ ok: false, error: "missing_pagoId" }, { status: 400 });
    }
    if (!comprobanteUrl) {
      return NextResponse.json(
        { ok: false, error: "missing_comprobante_url" },
        { status: 400 }
      );
    }
    const urlLc = comprobanteUrl.toLowerCase();
    if (!urlLc.startsWith("http://") && !urlLc.startsWith("https://")) {
      return NextResponse.json(
        { ok: false, error: "invalid_comprobante_url" },
        { status: 400 }
      );
    }

    const { data: row, error: loadErr } = await supabase
      .from("pagos")
      .select("id, emprendedor_id, estado")
      .eq("id", pagoId)
      .maybeSingle();

    if (loadErr) {
      return NextResponse.json(
        {
          ok: false,
          error: "db_select_failed",
          ...supabaseErrorDevFields(loadErr),
        },
        { status: 500 }
      );
    }
    if (!row) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    const owner = s((row as { emprendedor_id?: unknown }).emprendedor_id);
    if (owner !== emprendedorId) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const estado = s((row as { estado?: unknown }).estado);
    if (estado === "aprobado" || estado === "rechazado" || estado === "expirado") {
      return NextResponse.json({ ok: false, error: "invalid_state" }, { status: 409 });
    }

    const nowIso = new Date().toISOString();
    const { data: updated, error: upErr } = await supabase
      .from("pagos")
      .update({
        comprobante_url: comprobanteUrl,
        estado: "en_revision",
        paid_at: nowIso,
      })
      .eq("id", pagoId)
      .select("id, estado, comprobante_url")
      .single();

    if (upErr || !updated) {
      return NextResponse.json(
        {
          ok: false,
          error: "db_update_failed",
          ...supabaseErrorDevFields(upErr ?? undefined),
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      pago: {
        id: s((updated as { id: string }).id),
        estado: s((updated as { estado: string }).estado),
        comprobanteUrl: s((updated as { comprobante_url?: unknown }).comprobante_url) || null,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "unexpected" },
      { status: 500 }
    );
  }
}

