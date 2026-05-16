import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolveViewerIdForRequest, setViewerCookieOnResponse } from "@/lib/server/viewerIdFromRequest";

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
    const emprendedor_id = s(body?.emprendedor_id);
    const respuesta = s(body?.respuesta);
    const interaccion_id = body?.interaccion_id != null ? s(body.interaccion_id) : "";
    const bodyViewer = body?.viewer_id != null ? s(body.viewer_id) : "";

    if (!emprendedor_id) {
      return NextResponse.json({ ok: false, error: "emprendedor_id requerido" }, { status: 400 });
    }
    if (!interaccion_id) {
      return NextResponse.json({ ok: false, error: "interaccion_id requerido" }, { status: 400 });
    }
    if (respuesta !== "recomienda" && respuesta !== "no_recomienda") {
      return NextResponse.json({ ok: false, error: "respuesta inválida" }, { status: 400 });
    }

    const { viewerId, shouldSetCookie } = resolveViewerIdForRequest(req, bodyViewer);
    if (!viewerId) {
      return NextResponse.json({ ok: false, error: "viewer_id requerido" }, { status: 400 });
    }

    const { data: pub } = await supabase
      .from("emprendedores")
      .select("id")
      .eq("id", emprendedor_id)
      .eq("estado_publicacion", "publicado")
      .maybeSingle();

    if (!pub?.id) {
      return NextResponse.json({ ok: false, error: "not_public" }, { status: 404 });
    }

    const { data: iCheck } = await supabase
      .from("viewer_whatsapp_clicks")
      .select("id")
      .eq("id", interaccion_id)
      .eq("emprendedor_id", emprendedor_id)
      .eq("viewer_id", viewerId)
      .maybeSingle();
    if (!iCheck?.id) {
      return NextResponse.json({ ok: false, error: "interaccion_invalida" }, { status: 400 });
    }

    const { error: insErr } = await supabase.from("emprendedor_recomendaciones").insert({
      emprendedor_id,
      viewer_id: viewerId,
      interaccion_id,
      respuesta,
    });

    if (insErr) {
      if (insErr.code === "23505") {
        return NextResponse.json({ ok: false, error: "ya_registrado" }, { status: 409 });
      }
      console.error("emprendedor_recomendaciones insert", insErr);
      return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });
    }

    const res = NextResponse.json({ ok: true });
    if (shouldSetCookie) {
      setViewerCookieOnResponse(res, viewerId);
    }
    return res;
  } catch (e) {
    console.error("POST /api/recomendaciones", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
