import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { pagoReintentoActivacionAllowed } from "@/lib/pagoReintentoActivacionAuth";
import { reintentarActivacionPlanDesdePagoPagado } from "@/app/api/_lib/reintentarActivacionDesdePago";

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
 * Reintenta `activarPlanEmprendedorEnSupabase` para un pago ya `pagado` con
 * `plan_activation_error` en `raw_response` (fallo post-commit Transbank).
 *
 * Idempotente: sin `plan_activation_error` o con negocio ya alineado al plan → `skipped` + traza.
 * Trazas en `raw_response`: `retry_attempted_at`, `retry_result`, `retry_error`.
 *
 * Body: `{ "pagoId": "uuid" }` o `{ "tokenWs": "..." }`
 * Header (prod): `x-pago-reintento-secret: <PAGO_REINTENTO_ACTIVACION_SECRET>`
 */
export async function POST(req: NextRequest) {
  try {
    if (!pagoReintentoActivacionAllowed(req)) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const pagoId = s(body.pagoId);
    const tokenWs = s(body.tokenWs);

    const result = await reintentarActivacionPlanDesdePagoPagado({
      supabase,
      pagoId: pagoId || undefined,
      tokenWs: tokenWs || undefined,
    });

    if (!result.ok) {
      const body: Record<string, unknown> = {
        ok: false,
        error: result.error,
      };
      if (result.error === "activation_failed") {
        body.retry_result = "failed";
      }
      return NextResponse.json(body, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      skipped: result.skipped,
      retry_result: result.retry_result,
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
