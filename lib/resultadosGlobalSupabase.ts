import { createSupabaseServerPublicClient } from "@/lib/supabase/server";
import { tieneFichaCompleta } from "@/lib/tieneFichaCompleta";

export type GlobalDbItem = {
  slug: string;
  nombre_emprendimiento: string;
  frase_negocio: string | null;
  descripcion_libre: string | null;
  foto_principal_url: string | null;
  whatsapp_principal: string | null;
  comuna_nombre: string | null;
  cobertura_tipo: string | null;
  comunas_cobertura: string[] | null;
  regiones_cobertura: string[] | null;
  esFichaCompleta: boolean;
  estadoFicha: "ficha_completa" | "ficha_basica";
  esNuevo: boolean;
};

function isTrue(v: unknown): boolean {
  if (v === true) return true;
  if (v === false || v == null) return false;
  const s = String(v).trim().toLowerCase();
  return s === "true" || s === "1" || s === "t" || s === "yes" || s === "y";
}

function esEmprendedorNuevo(createdAt: unknown): boolean {
  if (createdAt == null) return false;
  const d = new Date(String(createdAt));
  if (Number.isNaN(d.getTime())) return false;
  const ageMs = Date.now() - d.getTime();
  if (ageMs < 0) return false;
  const days = ageMs / 86_400_000;
  return days <= 30;
}

/** Evita que % y _ de la query actúen como comodines en ILIKE. */
function escapeIlikePattern(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function uniqueComunaIds(rows: Record<string, unknown>[]): number[] {
  const out = new Set<number>();
  for (const r of rows) {
    const id = r.comuna_id;
    if (id == null) continue;
    const n = typeof id === "number" ? id : Number(id);
    if (Number.isFinite(n)) out.add(n);
  }
  return [...out];
}

/**
 * Búsqueda global (sin comuna) sobre emprendedores publicados en Supabase.
 * Complementa / reemplaza Algolia para entornos sin índice o para pruebas con datos reales.
 *
 * Sin embed `emprendedores → comunas` (varias FK posibles); nombres de comuna vía segunda consulta.
 */
export async function searchEmprendedoresGlobalText(
  q: string,
  limit = 24
): Promise<{ items: GlobalDbItem[]; error: string | null }> {
  const term = String(q ?? "")
    .trim()
    .replace(/,/g, " ")
    .slice(0, 120);
  if (!term) {
    return { items: [], error: null };
  }

  const supabase = createSupabaseServerPublicClient();
  const pattern = `%${escapeIlikePattern(term)}%`;

  const { data, error } = await supabase
    .from("emprendedores")
    .select(
      "slug, nombre_emprendimiento, frase_negocio, descripcion_libre, foto_principal_url, whatsapp_principal, comuna_id, cobertura_tipo, comunas_cobertura, regiones_cobertura, plan_activo, plan_expira_at, trial_expira_at"
    )
    .eq("estado_publicacion", "publicado")
    .or(
      `nombre_emprendimiento.ilike.${pattern},frase_negocio.ilike.${pattern},descripcion_libre.ilike.${pattern}`
    )
    .limit(limit);

  if (error) {
    return { items: [], error: error.message };
  }

  const rows = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
  const comunaIds = uniqueComunaIds(rows);
  const nombrePorComunaId = new Map<number, string>();

  if (comunaIds.length > 0) {
    const { data: comunasRows, error: comunasError } = await supabase
      .from("comunas")
      .select("id, nombre")
      .in("id", comunaIds);

    if (comunasError) {
      return { items: [], error: comunasError.message };
    }

    for (const c of comunasRows ?? []) {
      const row = c as { id?: unknown; nombre?: unknown };
      const id = row.id;
      const n = typeof id === "number" ? id : Number(id);
      if (!Number.isFinite(n)) continue;
      const nombre = row.nombre == null ? "" : String(row.nombre).trim();
      if (nombre) nombrePorComunaId.set(n, nombre);
    }
  }

  const items: GlobalDbItem[] = [];

  for (const r of rows) {
    const slug = String(r.slug ?? "").trim();
    if (!slug) continue;

    const cid = r.comuna_id;
    const comunaKey =
      cid == null ? NaN : typeof cid === "number" ? cid : Number(cid);
    const comunaNombre =
      Number.isFinite(comunaKey) ? nombrePorComunaId.get(comunaKey) ?? null : null;

    const comunasC = Array.isArray(r.comunas_cobertura)
      ? (r.comunas_cobertura as unknown[]).map((x) => String(x))
      : null;
    const regionesC = Array.isArray(r.regiones_cobertura)
      ? (r.regiones_cobertura as unknown[]).map((x) => String(x))
      : null;
    const esFichaCompleta = tieneFichaCompleta({
      planActivo: isTrue(r.plan_activo),
      planExpiraAt: r.plan_expira_at == null ? null : String(r.plan_expira_at),
      trialExpiraAt: r.trial_expira_at == null ? null : String(r.trial_expira_at),
      trialExpira: null,
    });

    items.push({
      slug,
      nombre_emprendimiento: String(r.nombre_emprendimiento ?? "").trim(),
      frase_negocio: r.frase_negocio == null ? null : String(r.frase_negocio),
      descripcion_libre: r.descripcion_libre == null ? null : String(r.descripcion_libre),
      foto_principal_url: r.foto_principal_url == null ? null : String(r.foto_principal_url),
      whatsapp_principal: r.whatsapp_principal == null ? null : String(r.whatsapp_principal),
      comuna_nombre: comunaNombre,
      cobertura_tipo: r.cobertura_tipo == null ? null : String(r.cobertura_tipo),
      comunas_cobertura: comunasC,
      regiones_cobertura: regionesC,
      esFichaCompleta,
      estadoFicha: esFichaCompleta ? "ficha_completa" : "ficha_basica",
      esNuevo: esEmprendedorNuevo(r.created_at),
    });
  }

  return { items, error: null };
}
