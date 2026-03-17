"use client";

import { getSessionId } from "@/lib/sessionId";

type Props = {
  slug: string;
  shareUrl: string;
  style?: React.CSSProperties;
  className?: string;
  children?: React.ReactNode;
};

export default function ShareFichaButton({
  slug,
  shareUrl,
  style,
  className,
  children = "Compartir ficha",
}: Props) {
  const href = `https://wa.me/?text=${encodeURIComponent(shareUrl)}`;

  function handleClick(e: React.MouseEvent) {
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
    } catch {}
    // Dejar que el enlace abra normalmente
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={handleClick}
      style={style}
      className={className}
    >
      {children}
    </a>
  );
}
