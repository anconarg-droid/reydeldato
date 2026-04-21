import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { columnaYValorBusquedaEmprendedor } from "@/lib/emprendedorLookupParam";
import { panelInsightCase } from "@/lib/panelInsightCase";
import { resolveEmprendedorIdForPanelMetrics } from "@/lib/panelNegocioAccessToken";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");
    const idParam = searchParams.get("id");
    const accessToken = searchParams.get("access_token")?.trim() ?? "";
    const rangeRaw = searchParams.get("range");
    const range =
      rangeRaw === "7d" || rangeRaw === "30d" || rangeRaw === "all"
        ? rangeRaw
        : "all";

    const idTrim = idParam?.trim() ?? "";
    const slugTrim = slug?.trim() ?? "";
    const busqueda = columnaYValorBusquedaEmprendedor(idTrim, slugTrim);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let emprendedor_id: string | null = null;

    if (accessToken.length >= 8 && !idTrim && !slugTrim) {
      emprendedor_id = await resolveEmprendedorIdForPanelMetrics(
        supabase,
        accessToken
      );
      if (!emprendedor_id) {
        const insight_case = panelInsightCase({
          impresiones: 0,
          visitas: 0,
          click_whatsapp: 0,
        });
        return NextResponse.json({
          ok: true,
          data: {
            impresiones: 0,
            visitas: 0,
            click_whatsapp: 0,
            click_ficha: 0,
            click_waze: 0,
            click_maps: 0,
            insight_case,
          },
        });
      }
    } else if (!busqueda) {
      return NextResponse.json(
        { ok: false, error: "Missing slug or id" },
        { status: 400 }
      );
    } else {
      const empQ = supabase.from("emprendedores").select("id");
      const { data: empRow, error: empErr } = await empQ
        .eq(busqueda.columna, busqueda.valor)
        .maybeSingle();

      if (empErr || !empRow) {
        return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
      }

      emprendedor_id = empRow.id as string;
    }

    if (!emprendedor_id) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
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
    let click_waze = 0;
    let click_maps = 0;

    for (const e of events || []) {
      if (e.event_type === "search_result_impression") impresiones++;
      if (e.event_type === "page_view_profile") visitas++;
      if (e.event_type === "whatsapp_click") click_whatsapp++;
      if (e.event_type === "waze_click") click_waze++;
      if (e.event_type === "maps_click") click_maps++;
      if (
        e.event_type === "card_view_click" ||
        e.event_type === "instagram_click" ||
        e.event_type === "website_click" ||
        e.event_type === "email_click" ||
        e.event_type === "share_click" ||
        e.event_type === "waze_click" ||
        e.event_type === "maps_click"
      )
        click_ficha++;
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
        click_waze,
        click_maps,
        insight_case,
      },
    });

  } catch (e) {
    console.error("PANEL ERROR:", e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}