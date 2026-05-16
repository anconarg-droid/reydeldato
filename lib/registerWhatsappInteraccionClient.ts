"use client";

import { getSessionId } from "@/lib/sessionId";

export type WhatsappInteraccionOrigen = "ficha" | "card";

const HINT_EVENT = "rdd_whatsapp_contact_hint";

export function dispatchWhatsappContactHint(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(HINT_EVENT));
}

/**
 * Registra clic WhatsApp (viewer + emprendedor) y dispara mensaje no invasivo si OK.
 * No bloquea la navegación: usar sin await desde onClick.
 */
export function registerWhatsappInteraccionClient(payload: {
  slug: string;
  emprendedorId?: string | null;
  origen: WhatsappInteraccionOrigen;
}): void {
  const slug = String(payload.slug || "").trim();
  if (!slug) return;

  const viewer_id = getSessionId();
  if (!viewer_id) return;

  const body = JSON.stringify({
    slug,
    emprendedor_id: payload.emprendedorId ? String(payload.emprendedorId).trim() : undefined,
    origen: payload.origen,
    viewer_id,
  });

  void fetch("/api/interacciones/whatsapp", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  })
    .then((r) => {
      if (r.ok) dispatchWhatsappContactHint();
    })
    .catch(() => {
      /* noop — no molestar si falla red */
    });
}
