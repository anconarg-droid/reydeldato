"use client";

import { useEffect, useState } from "react";
import SimilarFichaCard from "@/components/cards/SimilarFichaCard";
import type { SimilarFichaItem } from "@/lib/getSimilaresFicha";

const MQ_MOBILE = "(max-width: 639px)";

export default function SimilaresFichaSection({
  items,
  fromSlug,
}: {
  items: SimilarFichaItem[];
  /** Slug de la ficha actual (para metadata.from_slug en card_view_click). */
  fromSlug: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MQ_MOBILE);
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const cap = isMobile ? 3 : 4;
  const visible = expanded ? items : items.slice(0, cap);
  const showVerMas = !expanded && items.length > cap;

  if (items.length === 0) return null;

  return (
    <section style={{ marginTop: 48 }}>
      <h2
        style={{
          margin: "0 0 20px 0",
          fontSize: 24,
          fontWeight: 900,
          color: "#111827",
        }}
      >
        Otros servicios en tu zona
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {visible.map((n, i) => (
          <SimilarFichaCard
            key={n.slug}
            item={n}
            fromSlug={fromSlug}
            position={i + 1}
          />
        ))}
      </div>

      {showVerMas ? (
        <div style={{ marginTop: 20, display: "flex", justifyContent: "center" }}>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            style={{
              padding: "12px 20px",
              borderRadius: 12,
              border: "1px solid #cbd5e1",
              background: "#fff",
              color: "#0f172a",
              fontWeight: 800,
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            Ver más similares
          </button>
        </div>
      ) : null}
    </section>
  );
}
