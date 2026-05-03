import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { VW_APERTURA_COMUNA_V2 } from "@/lib/aperturaComunaContrato";
import {
  abiertaPorMinimosFromVwRow,
  comunaPublicaAbierta,
} from "@/lib/comunaPublicaAbierta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const out: R[] = [];
  let idx = 0;
  const pool = Array.from({ length: Math.max(1, limit) }).map(async () => {
    while (idx < items.length) {
      const current = items[idx++];
      out.push(await fn(current));
    }
  });
  await Promise.all(pool);
  return out;
}

export async function GET() {
  try {
    /**
     * Comunas con resultados (home): solo comuna_publica_abierta =
     * forzar_abierta OR abierta_por_minimos(vw_apertura_comuna_v2).
     * No usar solo comunas_config / comunas_activas (evita doble listado con “en preparación”).
     */
    type Candidate = {
      id: number;
      slug: string;
      nombre: string;
      forzar_abierta: boolean;
      motivo_apertura_override: string | null;
      abierta_por_minimos: boolean;
      comuna_publica_abierta: boolean;
    };

    const { data: comunasRows, error: comunasErr } = await supabase
      .from("comunas")
      .select("id, slug, nombre, forzar_abierta, motivo_apertura_override")
      .order("nombre", { ascending: true });

    if (comunasErr) {
      return NextResponse.json(
        { ok: false, error: comunasErr.message, items: [] },
        { status: 500 }
      );
    }

    const { data: vwRows, error: vwErr } = await supabase
      .from(VW_APERTURA_COMUNA_V2)
      .select("comuna_slug, porcentaje_apertura, abierta");

    if (vwErr) {
      return NextResponse.json(
        { ok: false, error: vwErr.message, items: [] },
        { status: 500 }
      );
    }

    const vwBySlug = new Map<
      string,
      { porcentaje_apertura: number; abierta?: unknown }
    >();
    for (const r of vwRows || []) {
      const row = r as Record<string, unknown>;
      const slug = String(row.comuna_slug || "").trim();
      if (!slug) continue;
      vwBySlug.set(slug, {
        porcentaje_apertura: Number(row.porcentaje_apertura ?? 0),
        abierta: row.abierta,
      });
    }

    const candidates: Candidate[] = (comunasRows || [])
      .map((c: Record<string, unknown>) => {
        const slug = String(c.slug || "").trim();
        const vw = vwBySlug.get(slug) ?? null;
        const forzar = Boolean(c.forzar_abierta);
        const vwParaRegla = vw
          ? {
              porcentaje_apertura: vw.porcentaje_apertura,
              abierta: vw.abierta,
            }
          : null;
        const abierta_por_minimos = abiertaPorMinimosFromVwRow(vwParaRegla);
        const comuna_publica_abierta = comunaPublicaAbierta(forzar, vwParaRegla);
        return {
          id: Number(c.id ?? 0),
          slug,
          nombre: String(c.nombre || "").trim(),
          forzar_abierta: forzar,
          motivo_apertura_override:
            c.motivo_apertura_override == null
              ? null
              : String(c.motivo_apertura_override),
          abierta_por_minimos,
          comuna_publica_abierta,
        };
      })
      .filter(
        (c) =>
          c.id > 0 &&
          c.slug &&
          c.nombre &&
          c.comuna_publica_abierta
      );

    if (candidates.length === 0) {
      return NextResponse.json({ ok: true, items: [] });
    }

    // 2) Conteo fuente de verdad: mismo RPC que usa /resultados (via /api/buscar).
    //    Nos quedamos SOLO con comunas con count > 0.
    const counted = await mapWithConcurrency(
      candidates,
      4,
      async (c): Promise<{
        slug: string;
        nombre: string;
        count: number;
        abierta_por_minimos: boolean;
        forzar_abierta: boolean;
        comuna_publica_abierta: boolean;
        motivo_apertura_override: string | null;
      }> => {
        const { data, error } = await supabase.rpc("buscar_emprendedores_por_cobertura", {
          comuna_buscada_id: c.id,
          comuna_buscada_slug: c.slug,
        });
        if (error)
          return {
            slug: c.slug,
            nombre: c.nombre,
            count: 0,
            abierta_por_minimos: c.abierta_por_minimos,
            forzar_abierta: c.forzar_abierta,
            comuna_publica_abierta: c.comuna_publica_abierta,
            motivo_apertura_override: c.motivo_apertura_override,
          };
        return {
          slug: c.slug,
          nombre: c.nombre,
          count: Array.isArray(data) ? data.length : 0,
          abierta_por_minimos: c.abierta_por_minimos,
          forzar_abierta: c.forzar_abierta,
          comuna_publica_abierta: c.comuna_publica_abierta,
          motivo_apertura_override: c.motivo_apertura_override,
        };
      }
    );

    // Todas las comunas con resultados (el trabajo RPC ya está hecho sobre `candidates`).
    // La home pagina visualmente (“Ver más”) para no abrumar la UI.
    const items = counted.filter((x) => (x.count || 0) > 0);
    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Error", items: [] },
      { status: 500 }
    );
  }
}
