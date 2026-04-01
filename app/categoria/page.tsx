import Link from "next/link";

const CATEGORIAS = [
  {
    slug: "hogar-construccion",
    nombre: "Hogar y construcción",
    descripcion:
      "Gasfitería, electricidad, destapes, maestro, mantención y servicios para el hogar.",
    emoji: "🏠",
    ejemplos: ["Gasfiter", "Electricista", "Destapes"],
  },
  {
    slug: "automotriz",
    nombre: "Automotriz",
    descripcion:
      "Mecánica, lavado, baterías, neumáticos, traslado y servicios para vehículos.",
    emoji: "🚗",
    ejemplos: ["Mecánico", "Lavado", "Neumáticos"],
  },
  {
    slug: "mascotas",
    nombre: "Mascotas",
    descripcion:
      "Veterinaria, peluquería canina, paseos, hotel y servicios para mascotas.",
    emoji: "🐾",
    ejemplos: ["Veterinario", "Peluquería", "Paseos"],
  },
  {
    slug: "alimentacion",
    nombre: "Comida y abastecimiento",
    descripcion:
      "Panadería, pastelería, colaciones, delivery, agua purificada y abastecimiento local.",
    emoji: "🍞",
    ejemplos: ["Panadería", "Pastelería", "Colaciones"],
  },
  {
    slug: "salud-bienestar",
    nombre: "Salud y bienestar",
    descripcion:
      "Kinesiología, psicología, terapias, entrenamientos y servicios de bienestar.",
    emoji: "💚",
    ejemplos: ["Kinesiología", "Psicología", "Terapias"],
  },
  {
    slug: "eventos",
    nombre: "Eventos y celebraciones",
    descripcion:
      "Banquetería, animación, decoración, música y servicios para eventos.",
    emoji: "🎉",
    ejemplos: ["Banquetería", "Animación", "Arriendos"],
  },
  {
    slug: "belleza-estetica",
    nombre: "Belleza y estética",
    descripcion:
      "Peluquería, manicure, maquillaje, barbería y servicios de estética.",
    emoji: "✨",
    ejemplos: ["Peluquería", "Manicure", "Barbería"],
  },
  {
    slug: "educacion-clases",
    nombre: "Educación y clases",
    descripcion:
      "Clases particulares, talleres, reforzamiento y apoyo educativo.",
    emoji: "📚",
    ejemplos: ["Clases", "Talleres", "Reforzamiento"],
  },
  {
    slug: "transporte-fletes",
    nombre: "Transporte y fletes",
    descripcion:
      "Mudanzas, fletes, transporte menor y apoyo logístico local.",
    emoji: "🚚",
    ejemplos: ["Fletes", "Mudanzas", "Traslados"],
  },
  {
    slug: "profesionales",
    nombre: "Servicios profesionales",
    descripcion:
      "Asesorías, contabilidad, legal, diseño y servicios profesionales.",
    emoji: "💼",
    ejemplos: ["Contabilidad", "Legal", "Diseño"],
  },
  {
    slug: "comercio-local",
    nombre: "Comercio local",
    descripcion:
      "Tiendas, papelería, librería, bazar y comercio de cercanía.",
    emoji: "🛍️",
    ejemplos: ["Papelería", "Bazar", "Librería"],
  },
  {
    slug: "otros",
    nombre: "Otros servicios",
    descripcion:
      "Rubros y servicios que no entran en una categoría principal todavía.",
    emoji: "📌",
    ejemplos: ["Oficios", "Servicios", "Varios"],
  },
];

export default function CategoriasPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-medium text-sky-700 hover:text-sky-800"
          >
            ← Volver al inicio
          </Link>
        </div>

        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            Todas las categorías
          </h1>
          <p className="mt-2 text-slate-600 max-w-3xl">
            Explora Rey del Dato por rubro. Entra a una categoría para ver sus
            subcategorías y luego filtrar por comuna.
          </p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {CATEGORIAS.map((categoria) => (
            <Link
              key={categoria.slug}
              href={`/categoria/${categoria.slug}`}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition"
            >
              <div className="text-3xl">{categoria.emoji}</div>

              <h2 className="mt-3 text-xl font-bold leading-snug">
                {categoria.nombre}
              </h2>

              <p className="mt-2 text-sm text-slate-600 min-h-[60px]">
                {categoria.descripcion}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {categoria.ejemplos.map((ejemplo) => (
                  <span
                    key={ejemplo}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                  >
                    {ejemplo}
                  </span>
                ))}
              </div>

              <div className="mt-5 text-sm font-medium text-sky-700">
                Ver categoría →
              </div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}