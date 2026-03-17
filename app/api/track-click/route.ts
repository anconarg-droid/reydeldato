import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { recordEvent } from "@/lib/analytics/recordEvent";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FIELD_MAP: Record<string, string> = {
  whatsapp: "click_whatsapp",
  instagram: "click_instagram",
  web: "click_web",
  email: "click_email",
};

const EVENT_TYPE_MAP: Record<string, "whatsapp_click" | "instagram_click" | "website_click" | "email_click"> = {
  whatsapp: "whatsapp_click",
  instagram: "instagram_click",
  web: "website_click",
  email: "email_click",
};

const recentClickEvents = new Map<string, number>();

function getClientIp(req: NextRequest): string {
  return (
    req.ip ||
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const slug = String(body.slug || "").trim();
    const type = String(body.type || "").trim();

    if (!slug || !FIELD_MAP[type]) {
      return NextResponse.json({ ok: false, error: "Parametros invalidos" }, { status: 400 });
    }

    const ip = getClientIp(req);
    const key = `${ip}|${slug}|${type}`;
    const now = Date.now();
    const last = recentClickEvents.get(key) || 0;

    if (now - last < 10_000) {
      // Ignorar múltiples clicks muy rápidos del mismo visitante/canal
      return NextResponse.json({ ok: true });
    }
    recentClickEvents.set(key, now);

    const field = FIELD_MAP[type];

    const { data: item, error: findError } = await supabase
      .from("emprendedores")
      .select(`id, ${field}`)
      .eq("slug", slug)
      .single();

    if (findError || !item) {
      console.error("No se encontró emprendimiento:", findError);
      return NextResponse.json({ ok: false }, { status: 404 });
    }

    const current = Number(item[field] || 0);

    const { error: updateError } = await supabase
      .from("emprendedores")
      .update({ [field]: current + 1 })
      .eq("slug", slug);

    if (updateError) {
      console.error("Error actualizando:", updateError);
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    const analyticsEventType = EVENT_TYPE_MAP[type];
    if (analyticsEventType) {
      await recordEvent(supabase, {
        event_type: analyticsEventType,
        emprendedor_id: item.id,
        slug,
        metadata: { slug, type },
      });
    }

    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error("track-click error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}