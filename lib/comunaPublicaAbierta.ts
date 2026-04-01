/**
 * Regla de producto: apertura real (mínimos) vs override demo, y estado público final.
 *
 * - abierta_por_minimos: derivado de vw_apertura_comuna_v2 (sin tocar su SQL aquí).
 * - comuna_publica_abierta: lo que ve el usuario como “comuna con directorio abierto”.
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
