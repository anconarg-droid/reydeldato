"use client";

type Props = {
  slug: string;
  type: "whatsapp" | "instagram" | "web" | "email";
  href: string;
  label: string;
  bg: string;
  color?: string;
};

export default function TrackedActionButton({
  slug,
  type,
  href,
  label,
  bg,
  color = "#fff",
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

  return (
    <button
      type="button"
      onClick={handleClick}
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: 50,
        borderRadius: 14,
        background: bg,
        color,
        fontWeight: 800,
        fontSize: 14,
        textDecoration: "none",
        padding: "0 16px",
        border: "none",
        width: "100%",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}