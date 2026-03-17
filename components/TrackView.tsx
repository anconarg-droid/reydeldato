"use client";

import { useEffect } from "react";
import { getSessionId } from "@/lib/sessionId";

export default function TrackView({ slug }: { slug: string }) {
  useEffect(() => {
    const sessionId = getSessionId();
    fetch("/api/track-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, session_id: sessionId || undefined }),
    }).catch((err) => console.error("track-view error", err));
  }, [slug]);

  return null;
}