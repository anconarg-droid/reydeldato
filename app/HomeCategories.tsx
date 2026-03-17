"use client";

import Link from "next/link";

type Subcategoria = { nombre: string; slug: string };

type CategoriaConSubs = {
  id: string;
  nombre: string;
  slug: string;
  subcategorias: Subcategoria[];
};

type Props = {
  categorias: CategoriaConSubs[];
};

const MAX_SUBCATEGORIAS_POR_CARD = 5;

export default function HomeCategories({ categorias }: Props) {
  if (!categorias?.length) return null;

  return (
    <section style={{ marginTop: 48 }}>
      <h2
        style={{
          fontSize: 24,
          fontWeight: 900,
          marginBottom: 20,
          color: "#111827",
        }}
      >
        Explora por categoría
      </h2>
      <p
        style={{
          marginBottom: 24,
          color: "#6b7280",
          fontSize: 15,
        }}
      >
        Elige una categoría o subcategoría para ver emprendimientos.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 20,
        }}
      >
        {categorias.map((cat) => (
          <Link
            key={cat.id}
            href={`/categoria/${cat.slug}`}
            style={{
              display: "block",
              padding: 20,
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 20,
              textDecoration: "none",
              color: "inherit",
              transition: "box-shadow 0.2s, border-color 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.06)";
              e.currentTarget.style.borderColor = "#93c5fd";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.borderColor = "#e5e7eb";
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "#111827",
                marginBottom: 12,
              }}
            >
              {cat.nombre}
            </div>
            {cat.subcategorias.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                {cat.subcategorias.slice(0, MAX_SUBCATEGORIAS_POR_CARD).map((sub) => (
                  <Link
                    key={sub.slug}
                    href={`/buscar?subcategoria=${encodeURIComponent(sub.slug)}`}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      padding: "4px 10px",
                      background: "#eff6ff",
                      color: "#1d4ed8",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                  >
                    {sub.nombre}
                  </Link>
                ))}
                {cat.subcategorias.length > MAX_SUBCATEGORIAS_POR_CARD && (
                  <span style={{ fontSize: 12, color: "#6b7280", alignSelf: "center" }}>
                    +{cat.subcategorias.length - MAX_SUBCATEGORIAS_POR_CARD} más
                  </span>
                )}
              </div>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
