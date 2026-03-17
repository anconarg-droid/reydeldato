import CategoriaCard from "./CategoriaCard";

type SubcategoriaItem = {
  slug: string;
  nombre: string;
};

type CategoriaItem = {
  slug: string;
  nombre: string;
  imagen: string;
  subcategorias: SubcategoriaItem[];
};

export default function CategoriasGrid({
  categorias,
}: {
  categorias: CategoriaItem[];
}) {
  return (
    <section
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: "10px 14px 34px",
      }}
    >
      <div style={{ marginBottom: 22 }}>
        <h2
          style={{
            margin: 0,
            fontSize: 30,
            lineHeight: 1.05,
            fontWeight: 900,
            color: "#111827",
          }}
        >
          Explora por categoría
        </h2>

        <p
          style={{
            marginTop: 10,
            fontSize: 17,
            lineHeight: 1.6,
            color: "#4b5563",
            maxWidth: 780,
          }}
        >
          También puedes entrar por categoría y descubrir subcategorías
          relacionadas con lo que necesitas.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 18,
        }}
      >
        {categorias.map((categoria) => (
          <CategoriaCard
            key={categoria.slug}
            slug={categoria.slug}
            nombre={categoria.nombre}
            imagen={categoria.imagen}
            subcategorias={categoria.subcategorias}
          />
        ))}
      </div>
    </section>
  );
}