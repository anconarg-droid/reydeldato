"use client";

type Props = {
  slug: string;
  type: "whatsapp" | "instagram" | "web" | "email";
  href: string;
  label: string;
  bg: string;
  color?: string;
  /** primary = CTA principal; secondary = intermedio; muted = outline ligero (Instagram, email, etc.) */
  emphasis?: "primary" | "secondary" | "muted";
};

export default function TrackedActionButton({
  slug,
  type,
  href,
  label,
  bg,
  color = "#fff",
  emphasis = "primary",
}: Props) {
  function handleClick() {
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
        boxShadow:
          isPrimary && type === "whatsapp"
            ? ("0 2px 10px rgba(22, 163, 74, 0.2)" as const)
            : ("none" as const),
      };

  return (
    <button type="button" onClick={handleClick} style={baseStyle}>
      {label}
    </button>
  );
}