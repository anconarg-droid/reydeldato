"use client";

type Props = {
  type: "local" | "local_en_comuna" | "coverage";
  comunaBuscada: string;
};

const badgeBase = {
  padding: "4px 10px",
  fontSize: "13px",
  display: "inline-flex" as const,
  alignItems: "center" as const,
  gap: "6px",
  fontWeight: 500,
};

/**
 * Badge reutilizable (copy estable):
 * - Base exacta en la comuna buscada: "De tu comuna"
 * - Cobertura externa que atiende la comuna: "Atiende tu comuna"
 * - Local físico (cuando aplica): "Con local en [comuna]"
 */
export default function CoverageBadge({ type, comunaBuscada }: Props) {
  if (type === "local_en_comuna") {
    return (
      <span
        style={{
          ...badgeBase,
          backgroundColor: "#FEF3C7",
          color: "#92400E",
          border: "1px solid #FCD34D",
          borderRadius: "12px",
        }}
        aria-label={`Con local en ${comunaBuscada}`}
      >
        <span aria-hidden>🏪</span>
        Con local en {comunaBuscada}
      </span>
    );
  }
  if (type === "local") {
    return (
      <span
        style={{
          ...badgeBase,
          backgroundColor: "#E8F1FF",
          color: "#1D4ED8",
          border: "1px solid #93C5FD",
          borderRadius: "12px",
        }}
        aria-label="De tu comuna"
      >
        <span aria-hidden>📍</span>
        De tu comuna
      </span>
    );
  }

  return (
    <span
      style={{
        ...badgeBase,
        backgroundColor: "#E8F6EE",
        color: "#1F7A4C",
        border: "1px solid #B7E4C7",
        borderRadius: "14px",
      }}
      aria-label="Atiende tu comuna"
    >
      <span aria-hidden>✔</span>
      Atiende tu comuna
    </span>
  );
}
