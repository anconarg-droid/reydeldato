/**
 * Normaliza entradas típicas de móvil chileno a E.164 local (+569XXXXXXXX).
 * Acepta por ejemplo: 912345678, 56912345678, +56912345678, 09 1234 5678.
 */
export function normalizeChileWhatsapp(input: string): string | null {
  const raw = String(input ?? "").trim();
  if (!raw) return null;

  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("00")) digits = digits.slice(2);

  if (digits.length === 11 && /^569\d{8}$/.test(digits)) {
    return `+${digits}`;
  }

  if (digits.length === 10 && /^09\d{8}$/.test(digits)) {
    return `+56${digits.slice(1)}`;
  }

  if (digits.length === 9 && /^9\d{8}$/.test(digits)) {
    return `+56${digits}`;
  }

  const embedded = digits.match(/(569\d{8})/);
  if (embedded) {
    return `+${embedded[1]}`;
  }

  return null;
}
