/**
 * Normaliza WhatsApp para comparar igualdad entre postulación y emprendedor publicado.
 * Prioriza móvil Chile: 9 dígitos nacionales comenzando en 9 (tras quitar prefijo 56).
 */
export function normalizeWhatsappForComparison(
  raw: string | null | undefined
): string {
  if (raw == null) return "";
  const digits = String(raw).replace(/\D/g, "");
  if (!digits) return "";

  let rest = digits;
  while (rest.startsWith("56") && rest.length > 9) {
    rest = rest.slice(2);
  }
  if (rest.length > 9) {
    rest = rest.slice(-9);
  }
  if (rest.length === 9 && rest.startsWith("9")) {
    return rest;
  }

  return digits;
}

/** Muestra solo los últimos 4 dígitos para el panel de moderación. */
export function maskWhatsappForModeracion(
  raw: string | null | undefined
): string {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length < 4) return "••••";
  return `••• ••${digits.slice(-4)}`;
}
