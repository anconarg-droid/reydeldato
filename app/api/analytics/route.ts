import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  analyticsEventUsesEmprendedorStats,
  isValidEventType,
  recordEvent,
} from "@/lib/analytics/recordEvent";

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey);
}

function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

/**
 * POST /api/analytics
 * Body: { event_type, slug?, emprendedor_id?, session_id?, comuna_slug?, sector_slug?, q?, metadata? }
 * Escribe en analytics_events y actualiza emprendedor_stats y site_stats_daily.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      // Evita fallar en build/import si falta config; responde 500 en runtime.
      return NextResponse.json(
        { ok: false, error: "server_misconfigured" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const event_type = s(body?.event_type);
    const slug = s(body?.slug);
    let emprendedor_id = body?.emprendedor_id ?? null;
    const comuna_slug = body?.comuna_slug != null ? s(body.comuna_slug) : null;
    const sector_slug = body?.sector_slug != null ? s(body.sector_slug) : null;
    const q = body?.q != null ? s(body.q) : null;
    const session_id = body?.session_id != null ? s(body.session_id) : null;
    const rawMeta =
      body?.metadata &&
      typeof body.metadata === "object" &&
      !Array.isArray(body.metadata)
        ? (body.metadata as Record<string, unknown>)
        : {};

    const metadata: Record<string, unknown> = {
      ...rawMeta,
      slug: slug || null,
      comuna_slug,
      sector_slug,
      q,
      session_id,
    };

    /** Payloads viejos u externos: solo slug + event_type sin metadata.source */
    if (event_type === "card_view_click" && !s(metadata.source)) {
      metadata.source = "unknown";
    }

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
        console.error("analytics resolve slug error:", findError);
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

    const result = await recordEvent(supabase, {
      event_type,
      emprendedor_id: emprendedor_id || undefined,
      slug: slug || undefined,
      session_id: session_id || undefined,
      metadata,
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("api/analytics error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
