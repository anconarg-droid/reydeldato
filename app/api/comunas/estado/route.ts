import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { VW_APERTURA_COMUNA_V2, VW_FALTANTES_COMUNA_V2 } from "@/lib/aperturaComunaContrato";
import {
  abiertaPorMinimosFromVwRow,
  comunaPublicaAbierta,
} from "@/lib/comunaPublicaAbierta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EstadoComuna = "vacia" | "preparacion" | "abierta";

function computeEstado(porcentaje: number): EstadoComuna {
  if (porcentaje < 25) return "vacia";
  if (porcentaje < 80) return "preparacion";
  return "abierta";
}

export async function GET(req: NextRequest) {
  try {
    const contextComunaSlug = (
      req.nextUrl.searchParams.get("comuna") ||
      req.nextUrl.searchParams.get("context_comuna_slug") ||
      ""
    )
      .trim()
      .toLowerCase();
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        {
          ok: false,
          error: "config",
          message: "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY",
        },
        { status: 503 }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: comunasRows, error: comunasErr } = await supabase
      .from("comunas")
      .select("slug, forzar_abierta, motivo_apertura_override");

    if (comunasErr) {
      return NextResponse.json(
        { ok: false, error: comunasErr.message },
        { status: 500 }
      );
    }

    const overrideBySlug = new Map<
      string,
      { forzar: boolean; motivo: string | null }
    >();
    for (const r of comunasRows || []) {
      const row = r as Record<string, unknown>;
      const slug = String(row.slug || "").trim();
      if (!slug) continue;
      overrideBySlug.set(slug, {
        forzar: Boolean(row.forzar_abierta),
        motivo:
          row.motivo_apertura_override == null
            ? null
            : String(row.motivo_apertura_override),
      });
    }

    const { data: baseRows, error: baseErr } = await supabase
      .from(VW_APERTURA_COMUNA_V2)
      .select(
        "comuna_slug, comuna_nombre, porcentaje_apertura, total_requerido, total_cumplido, abierta"
      )
      .order("porcentaje_apertura", { ascending: false });

    if (baseErr) {
      return NextResponse.json(
        { ok: false, error: baseErr.message },
        { status: 500 }
      );
    }

    const allFromVw = (baseRows || [])
      .map((r: any) => ({
        comuna_slug: String(r.comuna_slug || "").trim(),
        comuna_nombre: String(r.comuna_nombre || "").trim(),
        porcentaje_apertura: Number(r.porcentaje_apertura || 0),
        total_requerido: Number(r.total_requerido ?? NaN),
        total_cumplido: Number(r.total_cumplido ?? NaN),
        abierta: r.abierta,
      }))
      .filter(
        (r) =>
          r.comuna_slug &&
          r.comuna_nombre &&
          Number.isFinite(r.porcentaje_apertura)
      );

    /**
     * “En preparación” en home: porcentaje < 100 Y NO comuna_publica_abierta
     * (así Maipú demo con forzar_abierta no compite con el bloque de resultados).
     */
    const candidates = allFromVw
      .map((c) => {
        const ov = overrideBySlug.get(c.comuna_slug) ?? {
          forzar: false,
          motivo: null,
        };
        const vwRow = {
          porcentaje_apertura: c.porcentaje_apertura,
          abierta: (c as { abierta?: unknown }).abierta,
        };
        const abierta_por_minimos = abiertaPorMinimosFromVwRow(vwRow);
        const comuna_publica_abierta = comunaPublicaAbierta(ov.forzar, vwRow);
        return {
          ...c,
          forzar_abierta: ov.forzar,
          motivo_apertura_override: ov.motivo,
          abierta_por_minimos,
          comuna_publica_abierta,
        };
      })
      .filter(
        (c) =>
          c.porcentaje_apertura < 100 && !c.comuna_publica_abierta
      )
      .slice(0, 40);

    const slugs = candidates.map((c) => c.comuna_slug);
    const faltantesBySlug = new Map<
      string,
      Array<{ subcategoria: string; faltan: number }>
    >();

    const regionSlugByComunaSlug = new Map<string, string>();
    if (slugs.length > 0) {
      const { data: regionRows } = await supabase
        .from("comunas")
        .select("slug, regiones(slug)")
        .in("slug", slugs);
      for (const row of (regionRows || []) as any[]) {
        const s = String(row.slug || "").trim();
        const rs = String(row.regiones?.slug || "").trim();
        if (s && rs) regionSlugByComunaSlug.set(s, rs);
      }
    }

    let contextRegionSlug: string | null = null;
    if (contextComunaSlug) {
      const { data: ctxComuna } = await supabase
        .from("comunas")
        .select("regiones(slug)")
        .eq("slug", contextComunaSlug)
        .maybeSingle();
      contextRegionSlug = String(
        (ctxComuna as { regiones?: { slug?: string } | null } | null)?.regiones?.slug ?? ""
      ).trim() || null;
    }

    if (slugs.length > 0) {
      const { data: rubrosRows } = await supabase
        .from(VW_FALTANTES_COMUNA_V2)
        .select("comuna_slug, subcategoria_nombre, faltantes")
        .in("comuna_slug", slugs);

      for (const row of (rubrosRows || []) as any[]) {
        const slug = String(row.comuna_slug || "").trim();
        const sub = String(row.subcategoria_nombre || "").trim();
        const faltan = Number(row.faltantes || 0);
        if (!slug || !sub || !Number.isFinite(faltan) || faltan <= 0) continue;
        const arr = faltantesBySlug.get(slug) ?? [];
        arr.push({ subcategoria: sub, faltan });
        faltantesBySlug.set(slug, arr);
      }
    }

    const out = candidates.map((c) => {
      const faltantes = (faltantesBySlug.get(c.comuna_slug) ?? [])
        .sort((a, b) => b.faltan - a.faltan)
        .slice(0, 10);
      const tr = Number(c.total_requerido ?? NaN);
      const tc = Number(c.total_cumplido ?? NaN);
      return {
        comuna_slug: c.comuna_slug,
        comuna_nombre: c.comuna_nombre,
        porcentaje_apertura: c.porcentaje_apertura,
        total_requerido: Number.isFinite(tr) && tr > 0 ? Math.floor(tr) : null,
        total_cumplido: Number.isFinite(tc) && tc >= 0 ? Math.floor(tc) : null,
        region_slug: regionSlugByComunaSlug.get(c.comuna_slug) ?? null,
        estado: computeEstado(c.porcentaje_apertura),
        faltantes,
        abierta_por_minimos: c.abierta_por_minimos,
        forzar_abierta: c.forzar_abierta,
        comuna_publica_abierta: c.comuna_publica_abierta,
        motivo_apertura_override: c.motivo_apertura_override,
      };
    });

    if (contextComunaSlug) {
      const tier = (row: (typeof out)[0]) => {
        if (row.comuna_slug === contextComunaSlug) return 2;
        if (
          contextRegionSlug &&
          row.region_slug &&
          row.region_slug === contextRegionSlug
        )
          return 1;
        return 0;
      };
      out.sort((a, b) => {
        const d = tier(b) - tier(a);
        if (d !== 0) return d;
        return b.porcentaje_apertura - a.porcentaje_apertura;
      });
    }

    return NextResponse.json({
      ok: true,
      items: out,
      meta: {
        fuente: "supabase_views_v2",
        vistas: [VW_APERTURA_COMUNA_V2, VW_FALTANTES_COMUNA_V2],
        regla_publica:
          "comuna_publica_abierta = forzar_abierta OR vw.abierta (todos los rubros_apertura activos cumplen mínimo)",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Error cargando estado de comunas",
      },
      { status: 500 }
    );
  }
}
