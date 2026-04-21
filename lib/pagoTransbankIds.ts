import { randomBytes } from "crypto";

/** buy_order Transbank: máx. 26 caracteres (alfanumérico). */
export function generarBuyOrderTransbank(): string {
  return randomBytes(13).toString("hex").slice(0, 26);
}

/**
 * session_id Transbank: máx. 61 caracteres.
 * Incluye prefijo del emprendedor para trazabilidad.
 */
export function generarSessionIdTransbank(emprendedorId: string): string {
  const compact = emprendedorId.replace(/-/g, "");
  const emp = compact.slice(0, 8);
  const ts = String(Date.now());
  const s = `e${emp}x${ts}`;
  return s.slice(0, 61);
}
