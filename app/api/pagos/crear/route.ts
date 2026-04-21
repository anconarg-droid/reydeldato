import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generarBuyOrderTransbank, generarSessionIdTransbank } from "@/lib/pagoTransbankIds";
import {
  isPlanCodigoPago,
  montoClpPorPlanCodigo,
  type PlanCodigoPago,
} from "@/lib/planPagoCatalogo";
import {
  getWebpayPlusTransaction,
  TransbankConfigError,
  urlRetornoWebpayPlus,
} from "@/lib/transbankWebpayConfig";
import {
  buildTransbankCreateDevDetail,
  describeTransbankCreateError,
  getWebpayCreateDevContext,
} from "@/lib/transbankCreateErrorDiagnostics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function s(v: unknown): string {
  return String(v ?? "").trim();
}

export async function POST(req: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { ok: false, error: "invalid_json" },
        { status: 400 }
      );
    }

    const emprendedorId = s(body.emprendedorId ?? body.id);
    const planRaw = s(body.planCodigo ?? body.plan).toLowerCase();

    if (!emprendedorId) {
      return NextResponse.json(
        { ok: false, error: "missing_emprendedorId" },
        { status: 400 }
      );
    }

    if (!isPlanCodigoPago(planRaw)) {
      return NextResponse.json(
        { ok: false, error: "invalid_planCodigo" },
        { status: 400 }
      );
    }

    const planCodigo = planRaw as PlanCodigoPago;
    const monto = montoClpPorPlanCodigo(planCodigo);

    const { data: emp, error: empErr } = await supabase
      .from("emprendedores")
      .select("id")
      .eq("id", emprendedorId)
      .maybeSingle();

    if (empErr || !emp) {
      return NextResponse.json(
        { ok: false, error: "not_found" },
        { status: 404 }
      );
    }

    try {
      urlRetornoWebpayPlus();
      getWebpayPlusTransaction();
    } catch (e) {
      if (e instanceof TransbankConfigError) {
        return NextResponse.json(
          { ok: false, error: "payment_unavailable" },
          { status: 503 }
        );
      }
      throw e;
    }

    const buyOrder = generarBuyOrderTransbank();
    const sessionId = generarSessionIdTransbank(emprendedorId);

    const { data: inserted, error: insErr } = await supabase
      .from("pagos_emprendedores")
      .insert({
        emprendedor_id: emprendedorId,
        plan_codigo: planCodigo,
        monto,
        moneda: "CLP",
        estado: "pendiente",
        provider: "transbank",
        buy_order: buyOrder,
        session_id: sessionId,
        token_ws: null,
      })
      .select("id")
      .single();

    if (insErr || !inserted) {
      return NextResponse.json(
        { ok: false, error: "db_insert_failed" },
        { status: 500 }
      );
    }

    const pagoId = String((inserted as { id: string }).id);
    const returnUrl = urlRetornoWebpayPlus();

    let createRes: Record<string, unknown>;
    try {
      const tx = getWebpayPlusTransaction();
      createRes = (await tx.create(
        buyOrder,
        sessionId,
        monto,
        returnUrl
      )) as Record<string, unknown>;
    } catch (e) {
      const isDev = process.env.NODE_ENV === "development";
      const described = describeTransbankCreateError(e);
      const devCtx = isDev ? getWebpayCreateDevContext(returnUrl) : null;
      const devDetail = isDev ? buildTransbankCreateDevDetail(described) : null;

      if (isDev) {
        console.error("[api/pagos/crear] Transbank tx.create failed", {
          errorName: described.name,
          errorMessage: described.message,
          httpStatus: described.httpStatus ?? null,
          responseBodyPreview: described.responseBodyPreview ?? null,
          ...devCtx,
        });
      }

      await supabase
        .from("pagos_emprendedores")
        .update({
          estado: "fallido",
          raw_response: {
            phase: "create",
            error: e instanceof Error ? e.message : String(e),
            ...(isDev
              ? {
                  dev_http_status: described.httpStatus ?? null,
                  dev_response_preview: described.responseBodyPreview ?? null,
                }
              : {}),
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", pagoId);

      return NextResponse.json(
        {
          ok: false,
          error: "transbank_create_failed",
          ...(isDev && devCtx && devDetail
            ? {
                dev_detail: devDetail,
                dev_app_base_url: devCtx.dev_app_base_url,
                dev_environment: devCtx.dev_environment,
                dev_return_url: devCtx.dev_return_url,
                dev_commerce_code: devCtx.dev_commerce_code,
                dev_api_key_source: devCtx.dev_api_key_source,
              }
            : {}),
        },
        { status: 502 }
      );
    }

    const token = s(createRes.token);
    const url = s(createRes.url);

    if (!token || !url) {
      await supabase
        .from("pagos_emprendedores")
        .update({
          estado: "fallido",
          raw_response: createRes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", pagoId);

      return NextResponse.json(
        { ok: false, error: "transbank_invalid_response" },
        { status: 502 }
      );
    }

    const { error: upTokErr } = await supabase
      .from("pagos_emprendedores")
      .update({
        token_ws: token,
        raw_response: createRes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", pagoId);

    if (upTokErr) {
      return NextResponse.json(
        { ok: false, error: "db_update_failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      url,
      token,
    });
  } catch (e) {
    if (e instanceof TransbankConfigError) {
      return NextResponse.json(
        { ok: false, error: "payment_unavailable" },
        { status: 503 }
      );
    }
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "unexpected",
      },
      { status: 500 }
    );
  }
}
