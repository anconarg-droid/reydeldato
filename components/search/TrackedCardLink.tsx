"use client";

import { getSessionId } from "@/lib/sessionId";

type Props = {
  slug: string;
  href: string;
  type: "whatsapp" | "view_ficha";
  /** Opcional si el enlace es solo overlay (`aria-label`). */
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  target?: string;
  rel?: string;
  "aria-label"?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  /** Origen del listado para `card_view_click` (no aplica a WhatsApp). */
  analyticsSource?: CardViewListingSource;
  /** Comuna de contexto para tracking en home (`/api/event`). */
  trackingComunaSlug?: string | null;
  /** Id público del emprendedor cuando está disponible en la tarjeta. */
  trackingEmprendedorId?: string | null;
};

/** Listados de tarjeta → `metadata.source` en `card_view_click`. */
export type CardViewListingSource =
  | "search"
  | "comuna"
  | "home"
  | "categoria"
  | "panel";

function postAnalyticsBody(body: string) {
  const blob = new Blob([body], { type: "application/json" });
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    navigator.sendBeacon("/api/analytics", blob);
  } else {
    void fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  }
}

function postEventApi(body: string) {
  const blob = new Blob([body], { type: "application/json" });
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    navigator.sendBeacon("/api/event", blob);
  } else {
    void fetch("/api/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  }
}

/**
 * Clic en tarjeta: home → POST /api/event (whatsapp_click | profile_click);
 * otros listados → WhatsApp `/api/track-click`; ver ficha → `/api/analytics` `card_view_click`.
 */
export function sendTrackedCardEvent(
  slug: string,
  type: "whatsapp" | "view_ficha",
  opts?: {
    source?: CardViewListingSource;
    comunaSlug?: string | null;
    emprendedorId?: string | null;
  }
) {
  const s = String(slug || "").trim();
  if (!s) return;

  const source = opts?.source ?? "search";
  const comunaSlug =
    opts?.comunaSlug != null && String(opts.comunaSlug).trim()
      ? String(opts.comunaSlug).trim()
      : null;
  const emprendedorIdRaw = opts?.emprendedorId != null ? String(opts.emprendedorId).trim() : "";
  const emprendedorId = emprendedorIdRaw || undefined;

  try {
    if (source === "home") {
      const sessionId = getSessionId() || undefined;
      const eventType = type === "whatsapp" ? "whatsapp_click" : "profile_click";
      const payload: Record<string, unknown> = {
        event_type: eventType,
        slug: s,
        session_id: sessionId,
        comuna_slug: comunaSlug,
        metadata: { source: "card_home" },
      };
      if (emprendedorId) payload.emprendedor_id = emprendedorId;
      postEventApi(JSON.stringify(payload));
      return;
    }

    if (type === "whatsapp") {
      const body = JSON.stringify({ slug: s, type: "whatsapp" });
      const blob = new Blob([body], { type: "application/json" });
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon("/api/track-click", blob);
      } else {
        void fetch("/api/track-click", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        });
      }
    } else {
      const sessionId = getSessionId();
      const body = JSON.stringify({
        slug: s,
        event_type: "card_view_click",
        session_id: sessionId || undefined,
        metadata: {
          source,
          to_slug: s,
        },
      });
      postAnalyticsBody(body);
    }
  } catch {
    /* no bloquear UI */
  }
}

/** Clic en tarjeta de la sección similares (misma ruta que listados). */
export function sendSimilarFichaCardViewClick(payload: {
  fromSlug: string;
  toSlug: string;
  bucket: string;
  position: number;
}) {
  const toSlug = String(payload.toSlug || "").trim();
  const fromSlug = String(payload.fromSlug || "").trim();
  if (!toSlug || !fromSlug) return;

  try {
    const sessionId = getSessionId();
    const body = JSON.stringify({
      slug: toSlug,
      event_type: "card_view_click",
      session_id: sessionId || undefined,
      metadata: {
        source: "similares",
        from_slug: fromSlug,
        to_slug: toSlug,
        bucket: payload.bucket,
        position: payload.position,
      },
    });
    postAnalyticsBody(body);
  } catch {
    /* no bloquear UI */
  }
}

export default function TrackedCardLink({
  slug,
  href,
  type,
  children,
  className,
  style,
  target,
  rel,
  "aria-label": ariaLabel,
  onClick,
  analyticsSource = "search",
  trackingComunaSlug = null,
  trackingEmprendedorId = null,
}: Props) {
  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.stopPropagation();
    sendTrackedCardEvent(slug, type, {
      source: analyticsSource,
      comunaSlug: trackingComunaSlug,
      emprendedorId: trackingEmprendedorId,
    });
    onClick?.(e);
  }

  return (
    <a
      href={href}
      onClick={handleClick}
      className={className}
      style={style}
      target={target}
      rel={rel}
      aria-label={ariaLabel}
    >
      {children}
    </a>
  );
}
