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
  /** Origen del listado para `card_view_click` (no aplica a WhatsApp). */
  analyticsSource?: CardViewListingSource;
};

/** Listados de tarjeta → `metadata.source` en `card_view_click`. */
export type CardViewListingSource = "search" | "comuna" | "home";

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

/**
 * Clic en tarjeta: WhatsApp → /api/track-click;
 * ver ficha → /api/analytics con `card_view_click` y metadata.source.
 */
export function sendTrackedCardEvent(
  slug: string,
  type: "whatsapp" | "view_ficha",
  opts?: { source?: CardViewListingSource }
) {
  const s = String(slug || "").trim();
  if (!s) return;

  try {
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
      const source = opts?.source ?? "search";
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
  analyticsSource = "search",
}: Props) {
  function handleClick() {
    sendTrackedCardEvent(
      slug,
      type,
      type === "view_ficha" ? { source: analyticsSource } : undefined
    );
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
