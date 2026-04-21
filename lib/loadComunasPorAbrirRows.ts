import { createSupabaseServerPublicClient } from "@/lib/supabase/server";
import { VW_APERTURA_COMUNA_V2 } from "@/lib/aperturaComunaContrato";

export type ComunaPorAbrirRow = {
  region_id?: string | number | null;
  region_nombre?: string | null;
  comuna_id?: string | number | null;
  comuna_nombre: string;
  comuna_slug: string;
  total_emprendedores: number | null;
  avance_porcentaje: number | null;
};

function asId(v: unknown): string | number | null {
  if (v == null) return null;
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "bigint") return Number(v);
  return String(v).trim() || null;
}

/**
 * Listado para `/comunas-por-abrir`: datos de `comunas` + `regiones` + avance desde
 * `vw_apertura_comuna_v2` (misma métrica que `/abrir-comuna/[slug]`).
 * No usa `vw_regiones_comunas_detalle` (vista legacy ausente en varios entornos).
 */
export async function loadComunasPorAbrirRows(): Promise<{
  rows: ComunaPorAbrirRow[];
  error: string | null;
}> {
  const supabase = createSupabaseServerPublicClient();

  const [comunasRes, aperturaRes] = await Promise.all([
    supabase
      .from("comunas")
      .select("id, nombre, slug, emprendimientos_registrados, region_id, regiones(id, nombre)")
      .order("nombre"),
    supabase.from(VW_APERTURA_COMUNA_V2).select("comuna_slug, porcentaje_apertura"),
  ]);

  if (comunasRes.error) {
    return { rows: [], error: comunasRes.error.message };
  }

  const avanceBySlug = new Map<string, number>();
  if (!aperturaRes.error && Array.isArray(aperturaRes.data)) {
    for (const row of aperturaRes.data) {
      const r = row as { comuna_slug?: unknown; porcentaje_apertura?: unknown };
      const sl = String(r.comuna_slug ?? "").trim().toLowerCase();
      if (!sl) continue;
      const p = Number(r.porcentaje_apertura);
      avanceBySlug.set(sl, Number.isFinite(p) ? p : 0);
    }
  }

  const rows: ComunaPorAbrirRow[] = (comunasRes.data ?? []).map((raw) => {
    const c = raw as {
      id?: unknown;
      nombre?: unknown;
      slug?: unknown;
      emprendimientos_registrados?: unknown;
      region_id?: unknown;
      regiones?: { id?: unknown; nombre?: unknown } | null;
    };
    const slug = String(c.slug ?? "").trim().toLowerCase();
    const reg = c.regiones;
    const av = slug ? avanceBySlug.get(slug) : undefined;
    return {
      region_id: asId(reg?.id ?? c.region_id),
      region_nombre: reg?.nombre != null ? String(reg.nombre).trim() : null,
      comuna_id: asId(c.id),
      comuna_nombre: String(c.nombre ?? "").trim() || slug || "—",
      comuna_slug: slug,
      total_emprendedores: Number(c.emprendimientos_registrados ?? 0),
      avance_porcentaje: av !== undefined ? av : 0,
    };
  });

  rows.sort((a, b) => {
    const d =
      (Number(b.avance_porcentaje) || 0) - (Number(a.avance_porcentaje) || 0);
    if (d !== 0) return d;
    const e =
      (Number(b.total_emprendedores) || 0) - (Number(a.total_emprendedores) || 0);
    if (e !== 0) return e;
    return a.comuna_nombre.localeCompare(b.comuna_nombre, "es");
  });

  return { rows, error: null };
}
