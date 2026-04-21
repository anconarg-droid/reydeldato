"use client";

import { posthog } from "@/lib/posthog";

type Props = {
  slug: string;
  type: "whatsapp" | "instagram" | "web" | "email";
  href: string;
  label: string;
  bg: string;
  color?: string;
  /** primary = CTA principal; secondary = intermedio; muted = outline ligero (Instagram, email, etc.) */
  emphasis?: "primary" | "secondary" | "muted";
  className?: string;
  /** Moderación / vista previa: abre enlace sin registrar clicks. */
  disableTracking?: boolean;
  /** Para PostHog `whatsapp_click` (ficha pública). */
  emprendedorNombre?: string;
};

export default function TrackedActionButton({
  slug,
  type,
  href,
  label,
  bg,
  color = "#fff",
  emphasis = "primary",
  className,
  disableTracking = false,
  emprendedorNombre = "",
}: Props) {
  function handleClick() {
    if (!disableTracking) {
      if (type === "whatsapp") {
        try {
          posthog.capture("whatsapp_click", {
            emprendedor_slug: slug,
            emprendedor_nombre: emprendedorNombre,
          });
        } catch {
          /* noop */
        }
      }
      const payload = JSON.stringify({ slug, type });

      try {
        if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
          const blob = new Blob([payload], { type: "application/json" });
          (navigator as Navigator & { sendBeacon: (url: string, data?: BodyInit | null) => boolean }).sendBeacon(
            "/api/track-click",
            blob
          );
        } else {
          fetch("/api/track-click", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: payload,
            keepalive: true,
          }).catch((error) => {
            console.error("No se pudo registrar click", error);
          });
        }
      } catch (error) {
        console.error("No se pudo registrar click", error);
      }
    }

    window.open(href, "_blank", "noopener,noreferrer");
  }

  const isPrimary = emphasis === "primary";
  const isMuted = emphasis === "muted";

  const muted =
    type === "instagram"
      ? {
          background: "#fff",
          color: "#9f1239",
          border: "1px solid #f9a8d4",
        }
      : {
          background: "#fafafa",
          color: "#64748b",
          border: "1px solid #e2e8f0",
        };

  const baseStyle = isMuted
    ? {
        display: "flex" as const,
        justifyContent: "center" as const,
        alignItems: "center" as const,
        minHeight: 40,
        borderRadius: 10,
        fontWeight: 600,
        fontSize: 12,
        padding: "0 12px",
        width: "100%" as const,
        cursor: "pointer" as const,
        boxShadow: "none" as const,
        ...muted,
      }
    : {
        display: "flex" as const,
        justifyContent: "center" as const,
        alignItems: "center" as const,
        minHeight: isPrimary ? 54 : 44,
        borderRadius: isPrimary ? 14 : 12,
        background: bg,
        color,
        fontWeight: isPrimary ? 900 : 700,
        fontSize: isPrimary ? 16 : 13,
        padding: isPrimary ? "0 18px" : "0 14px",
        border: "none",
        width: "100%" as const,
        cursor: "pointer" as const,
        boxShadow: "none" as const,
      };

  /** Sombra solo por clase para que hover pueda intensificarla (inline pisa Tailwind). */
  const motionPrimaryWa =
    isPrimary && type === "whatsapp"
      ? "shadow-[0_4px_16px_-4px_rgba(22,163,74,0.45)] transition-all duration-200 ease-out motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-[0_18px_42px_-10px_rgba(22,163,74,0.6)] motion-safe:active:translate-y-0 motion-safe:active:scale-[0.98] motion-reduce:transition-none"
      : "";

  return (
    <button
      type="button"
      onClick={handleClick}
      style={baseStyle}
      className={[motionPrimaryWa, className].filter(Boolean).join(" ")}
    >
      {label}
    </button>
  );
}