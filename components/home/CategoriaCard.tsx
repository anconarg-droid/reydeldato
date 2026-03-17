"use client";

import Link from "next/link";

type SubcategoriaItem = {
  slug: string;
  nombre: string;
};

type CategoriaCardProps = {
  slug: string;
  nombre: string;
  imagen: string;
  subcategorias: SubcategoriaItem[];
};

export default function CategoriaCard({
  slug,
  nombre,
  imagen,
  subcategorias,
}: CategoriaCardProps) {
  return (
    <>
      <article
        className="categoria-card"
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 24,
          overflow: "hidden",
          background: "#ffffff",
          boxShadow: "0 6px 18px rgba(15, 23, 42, 0.06)",
          transition: "transform 0.18s ease, box-shadow 0.18s ease",
        }}
      >
        <Link
          href={`/categoria/${slug}`}
          style={{
            textDecoration: "none",
            color: "inherit",
            display: "block",
          }}
        >
          <div
            style={{
              position: "relative",
              height: 180,
              overflow: "hidden",
              background: "#e5e7eb",
            }}
          >
            <img
              src={imagen}
              alt={nombre}
              className="categoria-card-image"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
                transition: "transform 0.25s ease",
              }}
            />

            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(to top, rgba(17,24,39,0.55), rgba(17,24,39,0.08))",
              }}
            />

            <div
              style={{
                position: "absolute",
                left: 16,
                right: 16,
                bottom: 14,
                color: "#ffffff",
                fontSize: 24,
                lineHeight: 1.05,
                fontWeight: 900,
                textShadow: "0 2px 6px rgba(0,0,0,0.28)",
              }}
            >
              {nombre}
            </div>
          </div>
        </Link>

        <div style={{ padding: 18 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: "#6b7280",
              marginBottom: 12,
            }}
          >
            Subcategorías destacadas
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            {subcategorias.slice(0, 5).map((sub) => (
              <Link
                key={sub.slug}
                href={`/buscar?categoria=${slug}&subcategoria=${sub.slug}`}
                style={{
                  textDecoration: "none",
                  border: "1px solid #d1d5db",
                  borderRadius: 999,
                  padding: "10px 12px",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#111827",
                  background: "#ffffff",
                  lineHeight: 1.2,
                }}
              >
                {sub.nombre}
              </Link>
            ))}
          </div>

          <div style={{ marginTop: 16 }}>
            <Link
              href={`/categoria/${slug}`}
              style={{
                textDecoration: "none",
                fontSize: 15,
                fontWeight: 800,
                color: "#1d4ed8",
              }}
            >
              Ver categoría completa
            </Link>
          </div>
        </div>
      </article>

      <style jsx>{`
        .categoria-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 14px 28px rgba(15, 23, 42, 0.12);
        }

        .categoria-card:hover .categoria-card-image {
          transform: scale(1.04);
        }
      `}</style>
    </>
  );
}