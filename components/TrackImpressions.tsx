"use client";

import { useEffect } from "react";
import { getSessionId } from "@/lib/sessionId";

type Props = {
  slugs: string[];
  comuna_slug?: string;
  sector_slug?: string;
  q?: string;
};

export default function TrackImpressions({
  slugs,
  comuna_slug,
  sector_slug,
  q,
}: Props) {
  useEffect(() => {
    if (!slugs || slugs.length === 0) return;

    const sessionId = getSessionId();

    fetch("/api/track-impression", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slugs,
        comuna_slug: comuna_slug ?? undefined,
        sector_slug: sector_slug ?? undefined,
        q: q ?? undefined,
        session_id: sessionId || undefined,
      }),
    })
      .then(() => {})
      .catch((err) => console.error("Track impressions error:", err));
  }, [slugs, comuna_slug, sector_slug, q]);

  return null;
}