export type AccionPlanWhatsApp = "activar" | "renovar" | "gestionar";

/**
 * Enlace wa.me con mensaje ya armado (p. ej. {@link buildPlanActivationMessage}).
 */
export function buildWhatsAppPlanContactoHref(mensaje: string): string | null {
  const raw = process.env.NEXT_PUBLIC_ACTIVAR_FICHA_WHATSAPP || "";
  const number = raw.replace(/\D/g, "");
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(mensaje)}`;
}

/**
 * CTA corta hacia WhatsApp (sin pasarela).
 */
export function buildWhatsAppPlanSolicitudHref(opts: {
  accion: AccionPlanWhatsApp;
  planEtiquetaUsuario?: string;
  slugNegocio?: string;
}): string | null {
  const raw = process.env.NEXT_PUBLIC_ACTIVAR_FICHA_WHATSAPP || "";
  const number = raw.replace(/\D/g, "");
  if (!number) return null;

  const neg = opts.slugNegocio?.trim() ? ` (${opts.slugNegocio.trim()})` : "";
  const planTxt = opts.planEtiquetaUsuario?.trim()
    ? ` — ${opts.planEtiquetaUsuario.trim()}`
    : "";
  const verbo =
    opts.accion === "renovar"
      ? "Renovar mi perfil completo"
      : opts.accion === "gestionar"
        ? "Gestionar mi plan de perfil completo"
        : "Activar perfil completo";
  const text = `Hola, quiero ${verbo}${planTxt} en Rey del Dato${neg}`;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
