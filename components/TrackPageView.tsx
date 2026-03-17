"use client";

import { useEffect, useRef } from "react";
import { getSessionId } from "@/lib/sessionId";

type PageViewType =
  | "page_view_home"
  | "page_view_search"
  | "page_view_comuna"
  | "page_view_profile";

type Props = {
  eventType: PageViewType;
  slug?: string | null;
  comuna_slug?: string | null;
};

export default function TrackPageView({
  eventType,
  slug,
  comuna_slug,
}: Props) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;

    const sessionId = getSessionId();
    const payload: Record<string, unknown> = {
      event_type: eventType,
      session_id: sessionId || undefined,
    };
    if (slug) payload.slug = slug;
    if (comuna_slug) payload.comuna_slug = comuna_slug;

    fetch("/api/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch((err) => console.error("TrackPageView error:", err));
  }, [eventType, slug, comuna_slug]);

  return null;
}
