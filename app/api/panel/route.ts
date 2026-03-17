import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function s(v: any): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = s(url.searchParams.get("id"));
    const range = s(url.searchParams.get("range")).toLowerCase() || "total";

    if (!id) {
      return NextResponse.json(
        { ok: false, message: "Falta id" },
        { status: 400 }
      );
    }

    const { data: item, error: itemError } = await supabase
      .from("emprendedores")
      .select("id, nombre, slug, estado, plan")
      .eq("id", id)
      .maybeSingle();

    if (itemError) throw itemError;

    if (!item) {
      return NextResponse.json(
        { ok: false, message: "No encontramos el emprendimiento" },
        { status: 404 }
      );
    }

    const { data: statsRow, error: statsError } = await supabase
      .from("emprendedor_stats")
      .select("page_view_profile, whatsapp_click, instagram_click, website_click")
      .eq("emprendedor_id", id)
      .maybeSingle();

    if (statsError) {
      throw statsError;
    }

    const vistas_ficha = Number(statsRow?.page_view_profile ?? 0);
    const click_whatsapp = Number(statsRow?.whatsapp_click ?? 0);
    const click_instagram = Number(statsRow?.instagram_click ?? 0);
    const click_web = Number(statsRow?.website_click ?? 0);

    return NextResponse.json({
      ok: true,
      item,
      stats: {
        vistas_ficha,
        click_whatsapp,
        click_instagram,
        click_web,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        message: e?.message || "No se pudo cargar el panel",
      },
      { status: 500 }
    );
  }
}