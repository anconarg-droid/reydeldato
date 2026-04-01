"use client";

import { buildSubtituloFicha } from "@/lib/emprendedorProfileCopy";

type Props = {
  categoria?: string;
  subcategoria?: string;
  comuna?: string;
  nombreNegocio?: string;
};

function iconoRubro(servicio: string): string {
  const t = String(servicio || "").toLowerCase();
  if (/manicure|uñas|belleza|pelu/i.test(t)) return "💅";
  if (/hogar|gasfiter|electric|repar|mantenci/i.test(t)) return "🏠";
  if (/comida|panader|pastel|caf[eé]|restaurant/i.test(t)) return "🥖";
  if (/mec[aá]nic|auto|automotr/i.test(t)) return "🔧";
  if (/mascot|veterin|pet/i.test(t)) return "🐾";
  return "🛍️";
}

export default function PlaceholderCard({
  categoria,
  subcategoria,
  comuna,
  nombreNegocio,
}: Props) {
  const rubro =
    subcategoria?.trim() || categoria?.trim() || "Servicios";
  const zona = comuna?.trim() || "tu zona";
  const nombre = nombreNegocio?.trim() || "Emprendimiento";
  const icono = iconoRubro(rubro);
  const subtitulo = buildSubtituloFicha({
    categoria: rubro,
    comuna: zona,
    cobertura: "",
  });

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: 24,
        background:
          "linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)",
      }}
    >
      <div>
        <div style={{ fontSize: 56, marginBottom: 12 }}>{icono}</div>
        <div
          style={{
            marginTop: 12,
            fontSize: 15,
            color: "#334155",
            fontWeight: 500,
          }}
        >
          Atención en {zona}
        </div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: "#0f172a",
            lineHeight: 1.15,
            marginBottom: 10,
          }}
        >
          {subtitulo}
        </div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: "#475569",
            lineHeight: 1.3,
          }}
        >
          {nombre}
        </div>
        <div
          style={{
            marginTop: 10,
            fontSize: 14,
            color: "#64748b",
          }}
        >
          Disponible en {zona}
        </div>
      </div>
    </div>
  );
}