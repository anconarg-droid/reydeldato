import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getViewerIdFromRequest } from "@/lib/server/viewerIdFromRequest";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

/**
 * GET /api/recomendaciones/pendiente?emprendedor_id=...
 * viewer_id: cookie rdd_viewer_id o query viewer_id (mismo valor que localStorage en cliente).
 */
export async function GET(req: NextRequest) {
  try {
    const emprendedor_id = s(req.nextUrl.searchParams.get("emprendedor_id"));
    const viewer_id = getViewerIdFromRequest(req);

    if (!emprendedor_id || !viewer_id) {
      return NextResponse.json({ show: false, reason: "missing_ids" });
    }

    const { data: ya } = await supabase
      .from("emprendedor_recomendaciones")
      .select("id")
      .eq("emprendedor_id", emprendedor_id)
      .eq("viewer_id", viewer_id)
      .maybeSingle();

    if (ya?.id) {
      return NextResponse.json({ show: false, reason: "ya_recomendo" });
    }

    const { data: clickRow, error: clickErr } = await supabase
      .from("viewer_whatsapp_clicks")
      .select("id, created_at")
      .eq("emprendedor_id", emprendedor_id)
      .eq("viewer_id", viewer_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (clickErr || !clickRow?.id || !clickRow.created_at) {
      return NextResponse.json({ show: false, reason: "sin_whatsapp_click" });
    }

    const created = new Date(clickRow.created_at).getTime();
    const now = Date.now();
    const twoHoursMs = 2 * 60 * 60 * 1000;
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    if (now - created < twoHoursMs) {
      return NextResponse.json({ show: false, reason: "debounce_2h" });
    }
    if (now - created > thirtyDaysMs) {
      return NextResponse.json({ show: false, reason: "interaccion_expirada" });
    }

    return NextResponse.json({
      show: true,
      interaccion_id: clickRow.id,
    });
  } catch (e) {
    console.error("GET /api/recomendaciones/pendiente", e);
    return NextResponse.json({ show: false, reason: "error" }, { status: 500 });
  }
}
