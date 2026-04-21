"use client";

import Link from "next/link";
import SimilarFichaCard from "@/components/cards/SimilarFichaCard";
import type { SimilarFichaItem } from "@/lib/getSimilaresFicha";

export default function SimilaresFichaSection({
  items,
  fromSlug,
  title,
  verMasHref,
  verMasLabel,
  comunaContextoNombre,
}: {
  items: SimilarFichaItem[];
  fromSlug: string;
  title: string;
  verMasHref: string | null;
  verMasLabel: string;
  comunaContextoNombre: string;
}) {
  if (items.length === 0) return null;

  return (
    <section
      style={{
        marginTop: 56,
        padding: "24px 20px 22px",
        borderRadius: 20,
        border: "1px solid #e2e8f0",
        background: "#f8fafc",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: "0.14em",
          color: "#64748b",
          textTransform: "uppercase",
        }}
      >
        Más resultados
      </p>
      <h2
        style={{
          margin: "8px 0 0 0",
          fontSize: 22,
          fontWeight: 900,
          color: "#0f172a",
          letterSpacing: "-0.03em",
          lineHeight: 1.2,
        }}
      >
        {title}
      </h2>
      <p
        style={{
          margin: "8px 0 20px 0",
          fontSize: 13,
          fontWeight: 500,
          color: "#64748b",
          lineHeight: 1.45,
          maxWidth: 640,
        }}
      >
        Estas fichas son sugerencias en tu zona; no forman parte del perfil que estás viendo.
      </p>

      <div
        className="grid grid-cols-2 min-[880px]:grid-cols-4 gap-3 sm:gap-4"
        style={{ alignItems: "stretch" }}
      >
        {items.map((n, i) => (
          <div key={n.slug} className="min-w-0 flex">
            <SimilarFichaCard
              item={n}
              comunaContextoNombre={comunaContextoNombre}
              fromSlug={fromSlug}
              position={i + 1}
            />
          </div>
        ))}
      </div>

      {verMasHref ? (
        <div style={{ marginTop: 22, display: "flex", justifyContent: "center" }}>
          <Link
            href={verMasHref}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 48,
              padding: "0 22px",
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              background: "#fff",
              color: "#0f172a",
              fontWeight: 800,
              fontSize: 14,
              textDecoration: "none",
              boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
            }}
          >
            {verMasLabel}
          </Link>
        </div>
      ) : null}
    </section>
  );
}
