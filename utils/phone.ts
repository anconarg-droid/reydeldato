/**
 * Normalización de teléfonos móviles chilenos.
 * Formato final guardado: 569XXXXXXXX (solo dígitos, 11 caracteres).
 */

/**
 * Normaliza un número de WhatsApp/teléfono chileno al formato 569XXXXXXXX.
 * Acepta: 912345678, +56912345678, 56912345678 (con o sin espacios).
 * - Quita espacios y +
 * - Si empieza con 9 y tiene 9 dígitos → agrega 56
 * - Si empieza con 56 y tiene 11 dígitos → válido
 * Devuelve "" si no cumple formato móvil chileno.
 */
export function normalizeChilePhone(phone: string): string {
  const digits = String(phone ?? "").replace(/\s/g, "").replace(/^\+/, "").replace(/\D/g, "");
  if (digits.length === 9 && digits.startsWith("9")) {
    return `56${digits}`;
  }
  if (digits.length === 11 && digits.startsWith("56")) {
    return digits;
  }
  return "";
}

/** Indica si la cadena normalizada es un móvil chileno válido (569XXXXXXXX). */
export function isValidChileMobile(normalized: string): boolean {
  return normalized.length === 11 && normalized.startsWith("56");
}
