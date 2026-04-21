import { NextResponse } from "next/server";
import { recordEvent } from "@/lib/analytics/recordEvent";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { slug, type } = body;

    if (!slug || !type) {
      return NextResponse.json({ ok: false, error: "Missing data" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: emp } = await supabase
      .from("emprendedores")
      .select("id")
      .eq("slug", slug)
      .eq("estado_publicacion", "publicado")
      .maybeSingle();

    if (!emp) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    let event_type = "";

    if (type === "whatsapp") event_type = "whatsapp_click";
    if (type === "instagram") event_type = "instagram_click";
    if (type === "web") event_type = "website_click";
    if (type === "email") event_type = "email_click";

    if (!event_type) {
      return NextResponse.json({ ok: false, error: "Invalid type" }, { status: 400 });
    }

    const result = await recordEvent(supabase, {
      event_type,
      emprendedor_id: emp.id,
      slug,
      metadata: { slug, type },
    });

    if (!result.ok) {
      console.error("TRACK CLICK recordEvent:", result.error);
      return NextResponse.json(
        { ok: false, error: result.error ?? "recordEvent failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("TRACK CLICK ERROR:", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}