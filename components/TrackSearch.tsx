"use client";

import { useEffect, useRef } from "react";

export default function TrackSearch({
  q,
  comuna,
  categoria,
  subcategoria,
  totalResultados,
}: {
  q?: string;
  comuna?: string;
  categoria?: string;
  subcategoria?: string;
  totalResultados: number;
}) {
  const sentRef = useRef(false);

  useEffect(() => {
    if (sentRef.current) return;

    const hasSomething =
      (q && q.trim()) ||
      (comuna && comuna.trim()) ||
      (categoria && categoria.trim()) ||
      (subcategoria && subcategoria.trim());

    if (!hasSomething) return;

    sentRef.current = true;

    const sessionId = getSessionId();
    fetch("/api/track-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: q || "",
        comuna: comuna || "",
        categoria: categoria || "",
        subcategoria: subcategoria || "",
        total_resultados: totalResultados,
        session_id: sessionId || undefined,
      }),
    }).catch((err) => {
      console.error("track-search error:", err);
    });
  }, [q, comuna, categoria, subcategoria, totalResultados]);

  return null;
}