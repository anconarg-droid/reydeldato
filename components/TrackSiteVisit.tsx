"use client";

import { useEffect, useRef } from "react";
import { getSessionId } from "@/lib/sessionId";

export default function TrackSiteVisit() {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;

    const sessionId = getSessionId();
    if (!sessionId) return;

    fetch("/api/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: "page_view_home",
        session_id: sessionId,
      }),
    }).catch((err) => console.error("TrackSiteVisit error:", err));
  }, []);

  return null;
}
