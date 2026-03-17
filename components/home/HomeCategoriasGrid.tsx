import Link from "next/link";

type CategoriaItem = {
  slug: string;
  nombre: string;
  imagen: string;
  subcategorias: string[];
};

function prettySlug(slug: string) {
  return slug
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

export default function HomeCategoriasGrid({
  categorias,
}: {
  categorias: CategoriaItem[];
}) {
  return (
    <section className="w-full">
      <div
        className="grid gap-4 sm:gap-5 md:gap-6"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
        }}
      >
        {categorias.map((cat) => (
          <article
            key={cat.slug}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 22,
              overflow: "hidden",
              background: "#fff",
              boxShadow: "0 6px 18px rgba(15,23,42,0.05)",
            }}
          >
            <Link
              href={`/buscar?categoria=${cat.slug}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div
                style={{
                  height: 160,
                  background: `center / cover no-repeat url(${cat.imagen})`,
                }}
              />
            </Link>

            <div style={{ padding: 18 }}>
              <h3
                style={{
                  margin: "0 0 12px 0",
                  fontSize: 24,
                  lineHeight: 1.05,
                  fontWeight: 900,
                  color: "#111827",
                }}
              >
                {cat.nombre}
              </h3>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  marginBottom: 14,
                }}
              >
                {cat.subcategorias.slice(0, 3).map((sub) => (
                  <Link
                    key={sub}
                    href={`/buscar?categoria=${cat.slug}&subcategoria=${sub}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      minHeight: 32,
                      padding: "0 12px",
                      borderRadius: 999,
                      border: "1px solid #d1d5db",
                      background: "#fff",
                      color: "#111827",
                      textDecoration: "none",
                      fontWeight: 700,
                      fontSize: 14,
                    }}
                  >
                    {prettySlug(sub)}
                  </Link>
                ))}
              </div>

              <Link
                href={`/buscar?categoria=${cat.slug}`}
                style={{
                  display: "inline-flex",
                  minHeight: 36,
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 14px",
                  borderRadius: 999,
                  border: "1px solid #d1d5db",
                  textDecoration: "none",
                  color: "#111827",
                  fontWeight: 800,
                  fontSize: 14,
                }}
              >
                Ver categoría
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}