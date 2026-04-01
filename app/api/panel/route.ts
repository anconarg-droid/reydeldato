import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { panelInsightCase } from "@/lib/panelInsightCase";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");
    const idParam = searchParams.get("id");
    const rangeRaw = searchParams.get("range");
    const range =
      rangeRaw === "7d" || rangeRaw === "30d" || rangeRaw === "all"
        ? rangeRaw
        : "all";

    if (!slug && !idParam) {
      return NextResponse.json(
        { ok: false, error: "Missing slug or id" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let emprendedor_id: string;

    if (idParam) {
      const { data: byId, error: byIdErr } = await supabase
        .from("emprendedores")
        .select("id")
        .eq("id", idParam)
        .maybeSingle();
      if (byIdErr || !byId) {
        return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
      }
      emprendedor_id = byId.id;
    } else {
      const { data: emp, error: empError } = await supabase
        .from("emprendedores")
        .select("id")
        .eq("slug", slug as string)
        .single();

      if (empError || !emp) {
        return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
      }

      emprendedor_id = emp.id;
    }

    const now = new Date();
    let startDate: Date | null = null;
    if (range === "7d") {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
    } else if (range === "30d") {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 30);
    }

    // 2. traer eventos
    let eventsQuery = supabase
      .from("analytics_events")
      .select("event_type")
      .eq("emprendedor_id", emprendedor_id);

    if (startDate) {
      eventsQuery = eventsQuery.gte("created_at", startDate.toISOString());
    }

    const { data: events, error: eventsError } = await eventsQuery;

    if (eventsError) {
      return NextResponse.json({ ok: false, error: "Error loading events" }, { status: 500 });
    }

    // 3. agrupar métricas
    let impresiones = 0;
    let visitas = 0;
    let click_whatsapp = 0;
    let click_ficha = 0;

    for (const e of events || []) {
      if (e.event_type === "search_result_impression") impresiones++;
      if (e.event_type === "page_view_profile") visitas++;
      if (e.event_type === "whatsapp_click") click_whatsapp++;
      if (e.event_type === "card_view_click") click_ficha++;
    }

    const insight_case = panelInsightCase({
      impresiones,
      visitas,
      click_whatsapp,
    });

    return NextResponse.json({
      ok: true,
      data: {
        impresiones,
        visitas,
        click_whatsapp,
        click_ficha,
        insight_case,
      },
    });

  } catch (e) {
    console.error("PANEL ERROR:", e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}