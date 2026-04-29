/**
 * Regla de producto: apertura real (mínimos por rubro) vs override controlado en BD, y estado público final.
 *
 * **Fuente en BD (recomendado):** columnas en `public.comunas` (ver migración
 * `20260331210000_comunas_forzar_abierta.sql`):
 * - `forzar_abierta` — si `true`, la comuna cuenta como abierta aunque la vista v2 no cumpla mínimos.
 * - `motivo_apertura_override` — texto opcional solo para equipo / trazabilidad; **no** entra en esta función.
 *
 * - `abierta_por_minimos`: `vw_apertura_comuna_v2.abierta` o `porcentaje_apertura` ≥ 100 (sin tocar conteos).
 * - `comuna_publica_abierta`: lo que usa la app (`/[comuna]`, APIs, categoría) = `forzar_abierta` OR mínimos.
 *   En SQL, `vw_apertura_comuna_v2.comuna_abierta` replica la misma condición (lectura directa / diagnóstico).
 */

export type VwAperturaRow = {
  abierta?: unknown;
  porcentaje_apertura?: unknown;
} | null;

function isTrue(v: unknown): boolean {
  if (v === true) return true;
  if (v === false || v == null) return false;
  const s = String(v).trim().toLowerCase();
  return s === "true" || s === "1" || s === "t" || s === "yes" || s === "y";
}

/** True si la vista marca comuna abierta por mínimos o porcentaje ≥ 100. */
export function abiertaPorMinimosFromVwRow(row: VwAperturaRow): boolean {
  if (!row) return false;
  if (isTrue(row.abierta)) return true;
  const p = Number(row.porcentaje_apertura ?? NaN);
  return Number.isFinite(p) && p >= 100;
}

/** Estado público final para listados y ruta /[comuna]. */
export function comunaPublicaAbierta(
  forzarAbierta: unknown,
  vwRow: VwAperturaRow
): boolean {
  if (isTrue(forzarAbierta)) return true;
  return abiertaPorMinimosFromVwRow(vwRow);
}
