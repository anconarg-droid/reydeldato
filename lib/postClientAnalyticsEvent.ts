"use client";

import { getSessionId } from "@/lib/sessionId";

/**
 * Envía un evento a POST /api/event sin bloquear la UI (sendBeacon o fetch keepalive).
 */
export function postClientAnalyticsEvent(payload: Record<string, unknown>) {
  try {
    const sessionId =
      (typeof payload.session_id === "string" && payload.session_id.trim()) ||
      getSessionId() ||
      undefined;
    const body = JSON.stringify({
      ...payload,
      session_id: sessionId,
    });
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
  } catch {
    /* no bloquear UI */
  }
}
