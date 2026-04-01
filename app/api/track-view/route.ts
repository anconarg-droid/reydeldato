import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { recordEvent } from "@/lib/analytics/recordEvent";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const recentViewEvents = new Map<string, number>();

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  const first = fwd?.split(",")[0]?.trim();
  return (
    req.headers.get("x-real-ip") ||
    first ||
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const slug = String(body?.slug || "").trim();
    const session_id = body?.session_id ? String(body.session_id).trim() : null;

    if (!slug) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const ip = getClientIp(req);
    const key = `${ip}|${slug}|page_view_profile`;
    const now = Date.now();
    const last = recentViewEvents.get(key) || 0;

    if (now - last < 10_000) {
      return NextResponse.json({ ok: true });
    }
    recentViewEvents.set(key, now);

    const { data: item, error: findError } = await supabase
      .from("emprendedores")
      .select("id")
      .eq("slug", slug)
      .single();

    if (findError || !item) {
      return NextResponse.json({ ok: false }, { status: 404 });
    }

    const result = await recordEvent(supabase, {
      event_type: "page_view_profile",
      emprendedor_id: item.id,
      slug,
      session_id: session_id || undefined,
      metadata: { slug, session_id: session_id || null },
    });

    if (!result.ok) {
      console.error("track-view recordEvent:", result.error);
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}