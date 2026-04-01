"use client";

import Link from "next/link";

type Props = {
  href: string;
  comunaSlug?: string;
  origen: string;
  className?: string;
  children: React.ReactNode;
};

export default function StartPublicacionLink({
  href,
  comunaSlug,
  origen,
  className,
  children,
}: Props) {
  function handleClick() {
    try {
      const body = JSON.stringify({
        event_type: "start_publicacion",
        comuna_slug: comunaSlug,
        origen,
      });
      const blob = new Blob([body], { type: "application/json" });
      if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
        (navigator as Navigator & { sendBeacon: (url: string, data?: BodyInit | null) => boolean }).sendBeacon(
          "/api/event",
          blob
        );
        return;
      }

      void fetch("/api/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      });
    } catch {
      // no bloquear navegación
    }
  }

  return (
    <Link href={href} onClick={handleClick} className={className}>
      {children}
    </Link>
  );
}

