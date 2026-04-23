import {
  abiertaPorMinimosFromVwRow,
  comunaPublicaAbierta,
} from "@/lib/comunaPublicaAbierta";
import { loadAperturaComunaV2Resumen } from "@/lib/loadAperturaComunaV2Resumen";
import { createSupabaseServerPublicClient } from "@/lib/supabase/server";

export type ComunaAperturaPublicaUi = {
  /** `comunas.forzar_abierta` (apertura manual / demo). */
  comuna_abierta_forzada: boolean;
  /** `comunas.motivo_apertura_override` (nota interna; opcional). */
  motivo_apertura_override: string | null;
  /** Solo vista `vw_apertura_comuna_v2` + regla de mínimos (sin forzar). */
  cumple_minimos_apertura: boolean;
  /** Producto: forzada OR mínimos cumplidos — directorio tratado como abierto. */
  comuna_publica_abierta: boolean;
  /**
   * `vw_apertura_comuna_v2.porcentaje_apertura` (meta de apertura comunal, mismo origen que /abrir-comuna).
   * `null` si no hay fila en la vista.
   */
  porcentaje_apertura_comuna: number | null;
  /** Fila `comunas_activas` si existe. */
  estado_apertura: string | null;
};

/**
 * Estado de apertura para UI (categoría, banners, etc.).
 * Alineado con `app/[comuna]/page.tsx` y `lib/comunaDirectorioNavegable.ts`.
 */
export async function loadComunaAperturaPublicaPorSlug(
  comunaSlugRaw: string
): Promise<ComunaAperturaPublicaUi | null> {
  const slug = String(comunaSlugRaw || "").trim().toLowerCase();
  if (!slug) return null;

  const sb = createSupabaseServerPublicClient();
  const { data: cr } = await sb
    .from("comunas")
    .select("id, forzar_abierta, motivo_apertura_override")
    .eq("slug", slug)
    .maybeSingle();

  if (!cr || (cr as { id?: unknown }).id == null) return null;

  const forzar = (cr as { forzar_abierta?: unknown }).forzar_abierta;
  const motivoRaw = (cr as { motivo_apertura_override?: unknown }).motivo_apertura_override;
  const motivo_apertura_override =
    motivoRaw == null ? null : String(motivoRaw).trim() || null;

  const { data: vwRow } = await loadAperturaComunaV2Resumen(sb, slug);

  const vw = vwRow
    ? {
        porcentaje_apertura: Number(
          (vwRow as { porcentaje_apertura?: unknown }).porcentaje_apertura ?? 0
        ),
        abierta: (vwRow as { abierta?: unknown }).abierta,
      }
    : null;

  let porcentaje_apertura_comuna: number | null = null;
  if (vwRow) {
    const p = Number((vwRow as { porcentaje_apertura?: unknown }).porcentaje_apertura ?? NaN);
    if (Number.isFinite(p)) {
      porcentaje_apertura_comuna = Math.min(100, Math.max(0, p));
    }
  }

  const cumple_minimos_apertura = abiertaPorMinimosFromVwRow(vw);
  const comuna_publica_abierta = comunaPublicaAbierta(forzar, vw);

  const { data: act } = await sb
    .from("comunas_activas")
    .select("estado_apertura")
    .eq("comuna_slug", slug)
    .maybeSingle();

  const rawEstado = (act as { estado_apertura?: unknown } | null)?.estado_apertura;
  const estado_apertura =
    rawEstado != null && String(rawEstado).trim() !== ""
      ? String(rawEstado).trim()
      : null;

  return {
    comuna_abierta_forzada: Boolean(forzar),
    motivo_apertura_override,
    cumple_minimos_apertura,
    comuna_publica_abierta,
    porcentaje_apertura_comuna,
    estado_apertura,
  };
}
