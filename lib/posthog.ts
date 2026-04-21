import posthog from "posthog-js";

let clientInited = false;

/** API US por defecto; puedes sobreescribir con NEXT_PUBLIC_POSTHOG_HOST (p. ej. EU). */
const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com";

/**
 * Inicializa el cliente de PostHog una sola vez en el navegador.
 * Sin NEXT_PUBLIC_POSTHOG_KEY no hace nada (no rompe la app).
 */
export function initPosthogClient(): void {
  if (typeof window === "undefined" || clientInited) return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  if (!key) return;

  const apiHost = (
    process.env.NEXT_PUBLIC_POSTHOG_HOST || DEFAULT_POSTHOG_HOST
  ).replace(/\/$/, "");

  posthog.init(key, {
    api_host: apiHost,
    person_profiles: "identified_only",
    capture_pageview: true,
    capture_pageleave: true,
    /** Clics en enlaces/botones con data-ph-capture (y heurísticas DOM) para complementar eventos custom. */
    autocapture: true,
  });
  clientInited = true;
}

/** Eventos del embudo de publicación (nombres alineados al dashboard / funnels). */
export type PublicacionFunnelEvent =
  | "click_publicar_home"
  | "inicio_publicacion"
  | "paso1_completado"
  | "publicacion_exitosa";

export function capturePosthogEvent(
  event: PublicacionFunnelEvent,
  props?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;
  try {
    posthog.capture(event, props);
  } catch {
    /* no bloquear UI */
  }
}

/** Campos que reportamos en error_formulario (validación paso 1). */
export type FormularioErrorCampo = "descripcion" | "whatsapp" | "comuna";

/**
 * Validación frontend rechazada (p. ej. submit sin cumplir reglas).
 * Usar motivos estables para filtrar en PostHog.
 */
export function captureFormularioValidationError(
  campo: FormularioErrorCampo,
  motivo: string
): void {
  if (typeof window === "undefined") return;
  try {
    posthog.capture("error_formulario", { campo, motivo });
  } catch {
    /* noop */
  }
}

/**
 * Tras publicación exitosa con email válido: une el distinct_id al email.
 * Misma firma que posthog.identify(distinctId, properties).
 */
export function identifyPosthogUser(email: string): void {
  const e = String(email ?? "").trim();
  if (typeof window === "undefined" || !e) return;
  try {
    posthog.identify(e, { email: e });
  } catch {
    /* noop */
  }
}

export { posthog };
