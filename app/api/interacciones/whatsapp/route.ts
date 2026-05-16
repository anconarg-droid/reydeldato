import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { recordEvent } from "@/lib/analytics/recordEvent";
import {
  resolveViewerIdForRequest,
  setViewerCookieOnResponse,
} from "@/lib/server/viewerIdFromRequest";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const slug = s(body?.slug);
    const emprendedorIdRaw = body?.emprendedor_id;
    const origen = s(body?.origen);
    const viewerBody = body?.viewer_id != null ? s(body.viewer_id) : "";

    if (origen !== "ficha" && origen !== "card") {
      return NextResponse.json({ ok: false, error: "origen inválido" }, { status: 400 });
    }

    const { viewerId, shouldSetCookie } = resolveViewerIdForRequest(req, viewerBody);
    if (!viewerId) {
      return NextResponse.json({ ok: false, error: "viewer_id requerido" }, { status: 400 });
    }

    let emprendedor_id = emprendedorIdRaw != null ? s(emprendedorIdRaw) : "";

    if (!emprendedor_id && slug) {
      const { data: emp, error: findError } = await supabase
        .from("emprendedores")
        .select("id")
        .eq("slug", slug)
        .eq("estado_publicacion", "publicado")
        .maybeSingle();
      if (findError) {
        return NextResponse.json({ ok: false, error: findError.message }, { status: 500 });
      }
      emprendedor_id = emp?.id ? s(emp.id) : "";
    }

    if (!emprendedor_id) {
      return NextResponse.json({ ok: false, error: "Emprendimiento no encontrado" }, { status: 404 });
    }

    const { data: pub, error: pubErr } = await supabase
      .from("emprendedores")
      .select("id, slug")
      .eq("id", emprendedor_id)
      .eq("estado_publicacion", "publicado")
      .maybeSingle();

    if (pubErr || !pub) {
      return NextResponse.json({ ok: false, error: "not_public" }, { status: 404 });
    }

    const slugResolved = s(pub.slug) || slug;

    const { data: inserted, error: insErr } = await supabase
      .from("viewer_whatsapp_clicks")
      .insert({
        emprendedor_id,
        viewer_id: viewerId,
        origen,
      })
      .select("id")
      .maybeSingle();

    if (insErr) {
      console.error("viewer_whatsapp_clicks insert:", insErr);
      return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });
    }

    const interaccion_id = inserted?.id ?? null;

    const rec = await recordEvent(supabase, {
      event_type: "whatsapp_click",
      emprendedor_id,
      slug: slugResolved || undefined,
      session_id: viewerId,
      metadata: { slug: slugResolved, origen },
    });

    if (!rec.ok) {
      console.error("recordEvent whatsapp_click after viewer insert:", rec.error);
    }

    const res = NextResponse.json({
      ok: true,
      interaccion_id,
    });

    if (shouldSetCookie) {
      setViewerCookieOnResponse(res, viewerId);
    }

    return res;
  } catch (e) {
    console.error("POST /api/interacciones/whatsapp", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
