/**
 * Normalización de teléfonos móviles chilenos.
 * Formato final guardado: 569XXXXXXXX (solo dígitos, 11 caracteres).
 */

/**
 * Normaliza un número de WhatsApp/teléfono chileno al formato 569XXXXXXXX.
 * Acepta: 912345678, +56912345678, 56912345678 (con o sin espacios).
 * Si no encaja en los casos típicos, devuelve solo los dígitos (`v`) para que
 * `isValidChileMobile` pueda rechazarlo.
 */
export function normalizeChilePhone(input: string): string {
  let v = String(input ?? "").replace(/\D/g, "");

  if (v.startsWith("9") && v.length === 9) {
    // 56 + 912345678 → 56912345678 (11 dígitos). No "569" + v (serían 12).
    return "56" + v;
  }

  if (v.startsWith("56") && v.length === 11) {
    return v;
  }

  return v;
}

/** Indica si la cadena normalizada es un móvil chileno válido (569XXXXXXXX). */
export function isValidChileMobile(normalized: string): boolean {
  return normalized.length === 11 && normalized.startsWith("56");
}

/**
 * Validación estricta de WhatsApp móvil Chile.
 *
 * Entrada válida (con separadores comunes): 9XXXXXXXX, 569XXXXXXXX, +569XXXXXXXX, 56 9XXXXXXXX
 * Salida normalizada: 569XXXXXXXX
 */
/** Solo dígitos y separadores permitidos al escribir (bloquea letras y símbolos raros). */
export function sanitizeChileWhatsappInput(raw: string): string {
  return String(raw ?? "").replace(/[^0-9+\s\-()]/g, "");
}

export function normalizeAndValidateChileWhatsappStrict(input: string): {
  ok: boolean;
  normalized: string;
} {
  const raw = String(input ?? "").trim();
  if (!raw) return { ok: false, normalized: "" };

  // Solo permitimos separadores comunes; cualquier otro caracter se rechaza.
  if (/[^0-9\s\-()+]/.test(raw)) return { ok: false, normalized: "" };

  const digits = raw.replace(/\D/g, "");

  // Un solo móvil chileno: 9 dígitos nacionales o 11 con prefijo 56. Nada más.
  if (digits.length !== 9 && digits.length !== 11) {
    return { ok: false, normalized: "" };
  }

  // Caso 1: 9XXXXXXXX (9 dígitos, empieza en 9) → 569XXXXXXXX
  if (digits.length === 9 && digits.startsWith("9")) {
    return { ok: true, normalized: `56${digits}` };
  }

  // Caso 2/3: 569XXXXXXXX (11 dígitos, tercer dígito = 9)
  if (digits.length === 11 && digits.startsWith("56") && digits[2] === "9") {
    return { ok: true, normalized: digits };
  }

  return { ok: false, normalized: "" };
}

/** Formato de lectura unificado: +56912345678 (12 caracteres con +). */
export function formatChileWhatsappDisplay(normalized11Digits: string): string {
  const d = String(normalized11Digits ?? "").replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("56") && d[2] === "9") {
    return `+${d}`;
  }
  return String(normalized11Digits ?? "").trim();
}

/** Convierte valor guardado (569…) o entrada válida al formato mostrado +569…. */
export function chileWhatsappStorageToDisplay(raw: string): string {
  const v = normalizeAndValidateChileWhatsappStrict(raw);
  if (v.ok) return formatChileWhatsappDisplay(v.normalized);
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("56") && digits[2] === "9") {
    return formatChileWhatsappDisplay(digits);
  }
  return String(raw ?? "").trim();
}
