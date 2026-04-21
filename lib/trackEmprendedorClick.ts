/**
 * Registro de clics desde la ficha pública (misma carga útil que TrackedActionButton).
 */
export function beaconEmprendedorClick(
  slug: string,
  type: "whatsapp" | "instagram" | "web" | "email",
): void {
  if (typeof window === "undefined") return;
  const payload = JSON.stringify({ slug, type });
  try {
    if ("sendBeacon" in navigator) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/track-click", blob);
    } else {
      fetch("/api/track-click", {
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
