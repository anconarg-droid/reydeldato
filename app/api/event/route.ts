import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { recordEvent, isValidEventType } from "@/lib/analytics/recordEvent";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

/**
 * POST /api/event
 * Acepta los mismos event_type que el sistema de métricas.
 * Escribe en analytics_events y actualiza emprendedor_stats y site_stats_daily.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const event_type = s(body?.event_type);
    const slug = s(body?.slug);
    let emprendedor_id = body?.emprendedor_id ?? null;
    const comuna_slug = body?.comuna_slug ? s(body.comuna_slug) : null;
    const sector_slug = body?.sector_slug ? s(body.sector_slug) : null;
    const q = body?.q != null ? s(body.q) : null;
    const session_id = body?.session_id ? s(body.session_id) : null;
    const metadata =
      body?.metadata && typeof body.metadata === "object" ? body.metadata : null;

    if (!event_type || !isValidEventType(event_type)) {
      return NextResponse.json(
        { ok: false, error: "event_type inválido o faltante" },
        { status: 400 }
      );
    }

    if (!emprendedor_id && slug) {
      const { data: emp, error: findError } = await supabase
        .from("emprendedores")
        .select("id")
        .eq("slug", slug)
        .limit(1)
        .maybeSingle();
      if (findError) {
        console.error("event resolve slug error:", findError);
        return NextResponse.json({ ok: false }, { status: 500 });
      }
      emprendedor_id = emp?.id ?? null;
    }

    const result = await recordEvent(supabase, {
      event_type,
      emprendedor_id: emprendedor_id ?? undefined,
      slug: slug || undefined,
      session_id: session_id || undefined,
      metadata: {
        slug: slug || null,
        comuna_slug: comuna_slug || null,
        sector_slug: sector_slug || null,
        q: q || null,
        session_id: session_id || null,
        ...(metadata || {}),
      },
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("api/event error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
