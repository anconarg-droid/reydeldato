import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  analyticsEventUsesEmprendedorStats,
  isValidEventType,
  recordEvent,
} from "@/lib/analytics/recordEvent";

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
    const rawMeta =
      body?.metadata &&
      typeof body.metadata === "object" &&
      !Array.isArray(body.metadata)
        ? (body.metadata as Record<string, unknown>)
        : {};

    if (!event_type || !isValidEventType(event_type)) {
      return NextResponse.json(
        { ok: false, error: "event_type inválido o faltante" },
        { status: 400 }
      );
    }

    const needsEmpStats = analyticsEventUsesEmprendedorStats(event_type);
    const idFromBody = Boolean(emprendedor_id);

    if (!emprendedor_id && slug) {
      let qb = supabase.from("emprendedores").select("id").eq("slug", slug).limit(1);
      if (needsEmpStats) qb = qb.eq("estado_publicacion", "publicado");
      const { data: emp, error: findError } = await qb.maybeSingle();
      if (findError) {
        console.error("event resolve slug error:", findError);
        return NextResponse.json({ ok: false }, { status: 500 });
      }
      emprendedor_id = emp?.id ?? null;
    }

    if (needsEmpStats) {
      if (slug && !emprendedor_id) {
        return NextResponse.json({ ok: false, error: "not_public" }, { status: 404 });
      }
      if (emprendedor_id && idFromBody) {
        const { data: pub, error: pubErr } = await supabase
          .from("emprendedores")
          .select("id")
          .eq("id", emprendedor_id)
          .eq("estado_publicacion", "publicado")
          .maybeSingle();
        if (pubErr || !pub) {
          return NextResponse.json({ ok: false, error: "not_public" }, { status: 404 });
        }
      }
    }

    const mergedMeta: Record<string, unknown> = {
      slug: slug || null,
      comuna_slug: comuna_slug || null,
      sector_slug: sector_slug || null,
      q: q || null,
      session_id: session_id || null,
      ...rawMeta,
    };

    if (event_type === "card_view_click" && !s(mergedMeta.source)) {
      mergedMeta.source = "unknown";
    }

    const result = await recordEvent(supabase, {
      event_type,
      emprendedor_id: emprendedor_id ?? undefined,
      slug: slug || undefined,
      session_id: session_id || undefined,
      metadata: mergedMeta,
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
