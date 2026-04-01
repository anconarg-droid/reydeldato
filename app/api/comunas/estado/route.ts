import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
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

export async function GET() {
  try {
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
      .from("vw_apertura_comuna_v2")
      .select("comuna_slug, comuna_nombre, porcentaje_apertura")
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
        const vwRow = { porcentaje_apertura: c.porcentaje_apertura };
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

    if (slugs.length > 0) {
      const { data: rubrosRows } = await supabase
        .from("vw_faltantes_comuna_v2")
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
      return {
        comuna_slug: c.comuna_slug,
        comuna_nombre: c.comuna_nombre,
        porcentaje_apertura: c.porcentaje_apertura,
        estado: computeEstado(c.porcentaje_apertura),
        faltantes,
        abierta_por_minimos: c.abierta_por_minimos,
        forzar_abierta: c.forzar_abierta,
        comuna_publica_abierta: c.comuna_publica_abierta,
        motivo_apertura_override: c.motivo_apertura_override,
      };
    });

    return NextResponse.json({
      ok: true,
      items: out,
      meta: {
        fuente: "supabase_views_v2",
        vistas: ["vw_apertura_comuna_v2", "vw_faltantes_comuna_v2"],
        regla_publica:
          "comuna_publica_abierta = forzar_abierta OR abierta_por_minimos (porcentaje_apertura >= 100)",
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
