import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function mapEventTypeToCanal(eventType: string): string {
  if (eventType === "whatsapp_click") return "whatsapp";
  if (eventType === "instagram_click") return "instagram";
  if (eventType === "website_click") return "web";
  if (eventType === "email_click") return "email";
  if (eventType === "page_view_profile") return "ficha";
  if (eventType === "card_view_click") return "ver_ficha_listado";
  return "otros";
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = s(url.searchParams.get("id"));

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "missing_id", message: "Falta id de emprendedor" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("analytics_events")
      .select("event_type, metadata, created_at")
      .eq("emprendedor_id", id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: "db_error",
          message: error.message,
        },
        { status: 500 }
      );
    }

    const items = (data || []).map((e: any) => ({
      tipo_evento: s(e.event_type),
      canal: mapEventTypeToCanal(s(e.event_type)),
      metadata: e.metadata || null,
      created_at: e.created_at,
    }));

    return NextResponse.json({
      ok: true,
      items,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "unexpected_error",
        message: error instanceof Error ? error.message : "Error inesperado",
      },
      { status: 500 }
    );
  }
}

