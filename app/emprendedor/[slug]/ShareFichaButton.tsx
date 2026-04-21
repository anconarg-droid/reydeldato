"use client";

import { useCallback, useState } from "react";
import { getSessionId } from "@/lib/sessionId";

type Props = {
  slug: string;
  shareUrl: string;
  style?: React.CSSProperties;
  className?: string;
  /** Texto del botón antes de compartir / copiar. */
  children?: React.ReactNode;
  /** No enviar beacon a /api/analytics (vista previa moderación). */
  skipAnalytics?: boolean;
};

function sendShareAnalytics(slug: string) {
  const payload = JSON.stringify({
    event_type: "share_click",
    slug,
    session_id: getSessionId() || undefined,
  });
  try {
    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      const blob = new Blob([payload], { type: "application/json" });
      (navigator as Navigator & { sendBeacon: (u: string, d?: BodyInit | null) => boolean }).sendBeacon(
        "/api/analytics",
        blob
      );
    } else {
      fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    /* noop */
  }
}

export default function ShareFichaButton({
  slug,
  shareUrl,
  style,
  className,
  children = "Compartir ficha",
  skipAnalytics = false,
}: Props) {
  const [feedback, setFeedback] = useState<"copied" | null>(null);

  const handleClick = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      if (!skipAnalytics) sendShareAnalytics(slug);

      if (typeof navigator === "undefined") return;

      try {
        if (typeof navigator.share === "function") {
          await navigator.share({
            title: "Rey del Dato",
            text: "Mira esta ficha",
            url: shareUrl,
          });
          return;
        }
      } catch (err) {
        const name = err && typeof err === "object" && "name" in err ? String((err as Error).name) : "";
        if (name === "AbortError") return;
      }

      try {
        await navigator.clipboard.writeText(shareUrl);
        setFeedback("copied");
        window.setTimeout(() => setFeedback(null), 2500);
      } catch {
        setFeedback(null);
      }
    },
    [shareUrl, slug, skipAnalytics]
  );

  return (
    <button
      type="button"
      onClick={handleClick}
      style={style}
      className={className}
    >
      {feedback === "copied" ? "Enlace copiado" : children}
    </button>
  );
}
