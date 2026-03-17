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

/** Claves que devolvemos al cliente (panel del emprendedor) */
type Conteos = {
  view_ficha: number;
  impresiones_resultados: number;
  clics_tarjeta: number;
  click_whatsapp: number;
  click_instagram: number;
  click_web: number;
  click_email: number;
};

const VACIO: Conteos = {
  view_ficha: 0,
  impresiones_resultados: 0,
  clics_tarjeta: 0,
  click_whatsapp: 0,
  click_instagram: 0,
  click_web: 0,
  click_email: 0,
};

function sumarEventosFromAnalytics(rows: { event_type?: string }[]): Conteos {
  const out = { ...VACIO };
  for (const row of rows || []) {
    const t = s(row?.event_type);
    if (t === "page_view_profile") out.view_ficha += 1;
    else if (t === "search_result_impression") out.impresiones_resultados += 1;
    else if (t === "whatsapp_click") out.click_whatsapp += 1;
    else if (t === "instagram_click") out.click_instagram += 1;
    else if (t === "website_click") out.click_web += 1;
    else if (t === "email_click") out.click_email += 1;
  }
  return out;
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const params = await context.params;
    const slug = s(params?.slug);

    if (!slug) {
      return NextResponse.json(
        { ok: false, error: "Slug requerido" },
        { status: 400 }
      );
    }

    const { data: emp, error: empError } = await supabase
      .from("emprendedores")
      .select("id, slug, nombre")
      .eq("slug", slug)
      .limit(1)
      .maybeSingle();

    if (empError) {
      return NextResponse.json(
        { ok: false, error: empError.message },
        { status: 500 }
      );
    }

    if (!emp) {
      return NextResponse.json(
        { ok: false, error: "Emprendimiento no encontrado" },
        { status: 404 }
      );
    }

    const now = new Date();
    const d7 = new Date(now);
    d7.setDate(now.getDate() - 7);
    const d30 = new Date(now);
    d30.setDate(now.getDate() - 30);

    const { data: statsRow } = await supabase
      .from("emprendedor_stats")
      .select(
        "page_view_profile, search_result_impression, whatsapp_click, instagram_click, website_click, email_click"
      )
      .eq("emprendedor_id", emp.id)
      .maybeSingle();

    const [res7, res30] = await Promise.all([
      supabase
        .from("analytics_events")
        .select("event_type")
        .eq("emprendedor_id", emp.id)
        .gte("created_at", d7.toISOString()),
      supabase
        .from("analytics_events")
        .select("event_type")
        .eq("emprendedor_id", emp.id)
        .gte("created_at", d30.toISOString()),
    ]);

    const ultimos7 = sumarEventosFromAnalytics(res7.data || []);
    const ultimos30 = sumarEventosFromAnalytics(res30.data || []);

    const historico: Conteos = {
      view_ficha: Number(statsRow?.page_view_profile ?? 0),
      impresiones_resultados: Number(statsRow?.search_result_impression ?? 0),
      clics_tarjeta: 0,
      click_whatsapp: Number(statsRow?.whatsapp_click ?? 0),
      click_instagram: Number(statsRow?.instagram_click ?? 0),
      click_web: Number(statsRow?.website_click ?? 0),
      click_email: Number(statsRow?.email_click ?? 0),
    };

    return NextResponse.json({
      ok: true,
      item: {
        id: emp.id,
        slug: emp.slug,
        nombre: emp.nombre,
      },
      historico,
      ultimos7,
      ultimos30,
    });
  } catch (e: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Error interno",
      },
      { status: 500 }
    );
  }
}
