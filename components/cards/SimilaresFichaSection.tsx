"use client";

import Link from "next/link";
import SimilarFichaCard from "@/components/cards/SimilarFichaCard";
import type { SimilarFichaItem } from "@/lib/getSimilaresFicha";

export default function SimilaresFichaSection({
  items,
  fromSlug,
  title,
  subtitle,
  verMasHref,
  verMasLabel,
  comunaContextoNombre,
}: {
  items: SimilarFichaItem[];
  fromSlug: string;
  title: string;
  subtitle?: string | null;
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
        Resultados similares
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
        {subtitle ||
          "Negocios que pueden atenderte en tu comuna u opciones parecidas en el rubro."}
      </p>

      {items.length > 1 ? (
        <p className="mb-3 mt-1 text-sm font-medium text-slate-500 md:hidden">
          Desliza para ver más negocios →
        </p>
      ) : null}

      <div
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-2 [-webkit-overflow-scrolling:touch] sm:gap-4 md:snap-none"
        style={{ alignItems: "stretch" }}
      >
        {items.map((n, i) => (
          <div
            key={n.slug}
            className="w-[min(186px,calc(100vw-4.25rem))] flex-none snap-start min-w-0 sm:w-[220px] lg:w-[200px]"
          >
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
