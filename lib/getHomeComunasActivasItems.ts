import { createClient } from "@supabase/supabase-js";
import { VW_APERTURA_COMUNA_V2 } from "@/lib/aperturaComunaContrato";
import {
  abiertaPorMinimosFromVwRow,
  comunaPublicaAbierta,
} from "@/lib/comunaPublicaAbierta";

export type HomeComunaActivaItem = {
  slug: string;
  nombre: string;
  count: number;
  abierta_por_minimos: boolean;
  forzar_abierta: boolean;
  comuna_publica_abierta: boolean;
  motivo_apertura_override: string | null;
};

type Candidate = {
  id: number;
  slug: string;
  nombre: string;
  forzar_abierta: boolean;
  motivo_apertura_override: string | null;
  abierta_por_minimos: boolean;
  comuna_publica_abierta: boolean;
};

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

/**
 * Misma lógica que GET /api/home/comunas-activas (comunas públicas con conteo RPC).
 */
export async function getHomeComunasActivasItems(): Promise<
  { ok: true; items: HomeComunaActivaItem[] } | { ok: false; error: string; items: [] }
> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { data: comunasRows, error: comunasErr } = await supabase
      .from("comunas")
      .select("id, slug, nombre, forzar_abierta, motivo_apertura_override")
      .order("nombre", { ascending: true });

    if (comunasErr) {
      return { ok: false, error: comunasErr.message, items: [] };
    }

    const { data: vwRows, error: vwErr } = await supabase
      .from(VW_APERTURA_COMUNA_V2)
      .select("comuna_slug, porcentaje_apertura, abierta");

    if (vwErr) {
      return { ok: false, error: vwErr.message, items: [] };
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
          c.id > 0 && c.slug && c.nombre && c.comuna_publica_abierta
      );

    if (candidates.length === 0) {
      return { ok: true, items: [] };
    }

    const counted = await mapWithConcurrency(
      candidates,
      4,
      async (c): Promise<HomeComunaActivaItem> => {
        const { data, error } = await supabase.rpc(
          "buscar_emprendedores_por_cobertura",
          {
            comuna_buscada_id: c.id,
            comuna_buscada_slug: c.slug,
          }
        );
        if (error) {
          return {
            slug: c.slug,
            nombre: c.nombre,
            count: 0,
            abierta_por_minimos: c.abierta_por_minimos,
            forzar_abierta: c.forzar_abierta,
            comuna_publica_abierta: c.comuna_publica_abierta,
            motivo_apertura_override: c.motivo_apertura_override,
          };
        }
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

    const items = counted.filter((x) => (x.count || 0) > 0);
    return { ok: true, items };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return { ok: false, error: msg, items: [] };
  }
}
