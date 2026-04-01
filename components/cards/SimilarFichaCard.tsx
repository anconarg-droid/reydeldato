"use client";

import { sendSimilarFichaCardViewClick } from "@/components/search/TrackedCardLink";
import {
  buildSubtituloSimilarFicha,
  type SimilarFichaBucket,
  type SimilarFichaItem,
} from "@/lib/getSimilaresFicha";

function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function bucketLabel(bucket: SimilarFichaBucket): string {
  switch (bucket) {
    case "misma_comuna":
      return "De tu comuna";
    case "atiende_comuna":
      return "Atiende tu comuna";
    case "misma_region":
      return "Región";
    case "nacional":
      return "Todo Chile";
    case "misma_categoria":
      return "Misma categoría";
    default:
      return "Similar";
  }
}

function bucketColor(bucket: SimilarFichaBucket): { bg: string; border: string; text: string } {
  switch (bucket) {
    case "misma_comuna":
      return { bg: "#ecfdf5", border: "#bbf7d0", text: "#166534" };
    case "atiende_comuna":
      return { bg: "#eff6ff", border: "#bfdbfe", text: "#1e40af" };
    case "misma_region":
      return { bg: "#fefce8", border: "#fde68a", text: "#854d0e" };
    case "nacional":
      return { bg: "#f1f5f9", border: "#cbd5e1", text: "#334155" };
    case "misma_categoria":
      return { bg: "#faf5ff", border: "#e9d5ff", text: "#6b21a8" };
    default:
      return { bg: "#f1f5f9", border: "#cbd5e1", text: "#334155" };
  }
}

type Props = {
  item: SimilarFichaItem;
  /** Slug de la ficha donde se muestra la sección similares (tracking). */
  fromSlug?: string;
  /** Posición 1-based entre las tarjetas visibles. */
  position?: number;
};

export default function SimilarFichaCard({ item, fromSlug, position }: Props) {
  const nombre = s(item.nombre_emprendimiento) || s(item.slug);
  const subtitulo = buildSubtituloSimilarFicha(item);
  const badge = bucketLabel(item.bucket);
  const c = bucketColor(item.bucket);
  const track =
    s(fromSlug).length > 0 &&
    typeof position === "number" &&
    position >= 1;

  function handleClick() {
    if (!track) return;
    sendSimilarFichaCardViewClick({
      fromSlug: s(fromSlug),
      toSlug: s(item.slug),
      bucket: item.bucket,
      position,
    });
  }

  return (
    <a
      href={`/emprendedor/${encodeURIComponent(item.slug)}`}
      onClick={handleClick}
      style={{
        display: "block",
        borderRadius: 16,
        border: "1px solid #e2e8f0",
        background: "#fff",
        padding: 14,
        textDecoration: "none",
        color: "#0f172a",
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div
          style={{
            width: 54,
            height: 54,
            borderRadius: 12,
            background: "#f1f5f9",
            overflow: "hidden",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#94a3b8",
            fontSize: 22,
            fontWeight: 900,
          }}
        >
          {item.foto_principal_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.foto_principal_url}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : (
            "🏪"
          )}
        </div>

        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 900, fontSize: 16, lineHeight: 1.25 }}>{nombre}</div>
          <span
            style={{
              display: "inline-block",
              marginTop: 6,
              padding: "3px 10px",
              borderRadius: 999,
              border: `1px solid ${c.border}`,
              background: c.bg,
              color: c.text,
              fontSize: 11,
              fontWeight: 800,
            }}
          >
            {badge}
          </span>
          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: "#475569",
              lineHeight: 1.35,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {subtitulo}
          </div>
        </div>
      </div>
    </a>
  );
}
