"use client";

import Link from "next/link";
import ResultadoBadge from "@/components/ResultadoBadge";

type Item = {
  id: string;
  slug: string;
  nombre: string;
  descripcion_corta?: string;
  foto_principal_url?: string;
  logo_path?: string;

  comuna_base_slug?: string;
  categoria_slug?: string;

  _bucket?: "local" | "exacta" | "cobertura_comuna" | "regional" | "nacional" | "general";
  _motivo?: string;
};

function pretty(slug?: string) {
  return (slug ?? "")
    .split("-")
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

export default function HoverCard({ item }: { item: Item }) {
  return (
    <Link
      href={`/emprendimiento/${item.slug}`}
      className="block group"
    >
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 14,
          overflow: "hidden",
          background: "white",
          transition: "all 0.15s ease",
        }}
        className="hover:shadow-md"
      >
        {/* Imagen */}
        <div
          style={{
            width: "100%",
            height: 170,
            background: "#f3f4f6",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {item.foto_principal_url ? (
            <img
              src={item.foto_principal_url}
              alt={item.nombre}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                height: "100%",
                alignItems: "center",
                justifyContent: "center",
                color: "#9ca3af",
                fontSize: 13,
              }}
            >
              Sin imagen
            </div>
          )}
        </div>

        {/* Contenido */}
        <div
          style={{
            padding: 14,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {/* Badge geográfico */}
          {item._bucket && (
            <ResultadoBadge
              bucket={item._bucket}
              motivo={item._motivo}
            />
          )}

          {/* Nombre */}
          <h3
            style={{
              fontWeight: 700,
              fontSize: 16,
              lineHeight: 1.2,
            }}
          >
            {item.nombre}
          </h3>

          {/* Descripción */}
          {item.descripcion_corta && (
            <p
              style={{
                fontSize: 13,
                color: "#6b7280",
                lineHeight: 1.4,
              }}
            >
              {item.descripcion_corta}
            </p>
          )}

          {/* Meta info */}
          <div
            style={{
              fontSize: 12,
              color: "#9ca3af",
              marginTop: 4,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            {item.comuna_base_slug && (
              <span>📍 {pretty(item.comuna_base_slug)}</span>
            )}

            {item.categoria_slug && (
              <span>🏷 {pretty(item.categoria_slug)}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}