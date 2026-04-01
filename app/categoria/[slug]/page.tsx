import Link from "next/link";
import { notFound } from "next/navigation";

const CATEGORIAS = [
  {
    slug: "hogar-construccion",
    nombre: "Hogar y construcción",
    descripcion:
      "Gasfitería, electricidad, destapes, maestro, mantención y servicios para el hogar.",
    emoji: "🏠",
    subcategorias: [
      "gasfiter",
      "electricista",
      "destapes",
      "maestro",
      "mantencion-piscina",
      "cerrajeria",
    ],
  },
  {
    slug: "automotriz",
    nombre: "Automotriz",
    descripcion:
      "Mecánica, lavado, baterías, neumáticos, traslado y servicios para vehículos.",
    emoji: "🚗",
    subcategorias: [
      "mecanico",
      "lavado-autos",
      "neumaticos",
      "baterias",
      "grua",
      "scanner-automotriz",
    ],
  },
  {
    slug: "mascotas",
    nombre: "Mascotas",
    descripcion:
      "Veterinaria, peluquería canina, paseos, hotel y servicios para mascotas.",
    emoji: "🐾",
    subcategorias: [
      "veterinario",
      "peluqueria-canina",
      "paseo-perros",
      "hotel-mascotas",
      "adiestramiento",
      "alimentos-mascotas",
    ],
  },
  {
    slug: "alimentacion",
    nombre: "Comida y abastecimiento",
    descripcion:
      "Panadería, pastelería, colaciones, delivery, agua purificada y abastecimiento local.",
    emoji: "🍞",
    subcategorias: [
      "panaderia",
      "pasteleria",
      "colaciones",
      "delivery-comida",
      "agua-purificada",
      "carniceria",
    ],
  },
  {
    slug: "salud-bienestar",
    nombre: "Salud y bienestar",
    descripcion:
      "Kinesiología, psicología, terapias, entrenamientos y servicios de bienestar.",
    emoji: "💚",
    subcategorias: [
      "kinesiologia",
      "psicologia",
      "terapias",
      "nutricion",
      "entrenador-personal",
      "masajes",
    ],
  },
  {
    slug: "eventos",
    nombre: "Eventos y celebraciones",
    descripcion:
      "Banquetería, animación, decoración, música y servicios para eventos.",
    emoji: "🎉",
    subcategorias: [
      "banqueteria",
      "animacion",
      "decoracion",
      "arriendo-mobiliario",
      "fotografia-eventos",
      "dj",
    ],
  },
  {
    slug: "belleza-estetica",
    nombre: "Belleza y estética",
    descripcion:
      "Peluquería, manicure, maquillaje, barbería y servicios de estética.",
    emoji: "✨",
    subcategorias: [
      "peluqueria",
      "manicure",
      "maquillaje",
      "barberia",
      "depilacion",
      "tratamientos-faciales",
    ],
  },
  {
    slug: "educacion-clases",
    nombre: "Educación y clases",
    descripcion:
      "Clases particulares, talleres, reforzamiento y apoyo educativo.",
    emoji: "📚",
    subcategorias: [
      "clases-particulares",
      "ingles",
      "matematicas",
      "reforzamiento-escolar",
      "talleres",
      "musica",
    ],
  },
  {
    slug: "transporte-fletes",
    nombre: "Transporte y fletes",
    descripcion:
      "Mudanzas, fletes, transporte menor y apoyo logístico local.",
    emoji: "🚚",
    subcategorias: [
      "fletes",
      "mudanzas",
      "transporte-menor",
      "retiro-escombros",
      "traslados",
      "camioneta",
    ],
  },
  {
    slug: "profesionales",
    nombre: "Servicios profesionales",
    descripcion:
      "Asesorías, contabilidad, legal, diseño y servicios profesionales.",
    emoji: "💼",
    subcategorias: [
      "contabilidad",
      "abogado",
      "diseno-grafico",
      "marketing",
      "asesoria-tributaria",
      "arquitectura",
    ],
  },
  {
    slug: "comercio-local",
    nombre: "Comercio local",
    descripcion:
      "Tiendas, papelería, librería, bazar y comercio de cercanía.",
    emoji: "🛍️",
    subcategorias: [
      "papeleria",
      "bazar",
      "libreria",
      "regalos",
      "ferreteria",
      "ropa",
    ],
  },
  {
    slug: "otros",
    nombre: "Otros servicios",
    descripcion:
      "Rubros y servicios que no entran en una categoría principal todavía.",
    emoji: "📌",
    subcategorias: [
      "oficios-varios",
      "servicios-varios",
      "tecnico",
      "tramites",
      "arriendos",
      "otros",
    ],
  },
];

function prettyLabel(slug: string) {
  return slug
    .split("-")
    .map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1) : ""))
    .join(" ");
}

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function CategoriaPage({ params }: PageProps) {
  const { slug } = await params;

  const categoria = CATEGORIAS.find((c) => c.slug === slug);

  if (!categoria) {
    notFound();
  }

  const otrasCategorias = CATEGORIAS.filter((c) => c.slug !== categoria.slug);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="mb-8 flex flex-wrap gap-3 text-sm">
          <Link
            href="/"
            className="font-medium text-sky-700 hover:text-sky-800"
          >
            Inicio
          </Link>
          <span className="text-slate-400">/</span>
          <Link
            href="/categorias"
            className="font-medium text-sky-700 hover:text-sky-800"
          >
            Categorías
          </Link>
          <span className="text-slate-400">/</span>
          <span className="font-semibold text-slate-900">{categoria.nombre}</span>
        </div>

        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-8">
          <div className="text-4xl">{categoria.emoji}</div>
          <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight">
            {categoria.nombre}
          </h1>
          <p className="mt-3 text-slate-600 max-w-3xl">
            {categoria.descripcion}
          </p>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-[1.3fr_1fr_auto] gap-3">
            <input
              type="text"
              placeholder={`¿Qué necesitas dentro de ${categoria.nombre}?`}
              className="h-12 rounded-xl border border-slate-300 px-4 text-base outline-none focus:border-sky-500"
            />

            <input
              type="text"
              placeholder="Comuna (opcional)"
              className="h-12 rounded-xl border border-slate-300 px-4 text-base outline-none focus:border-sky-500"
            />

            <button
              type="button"
              className="h-12 rounded-xl bg-slate-900 px-6 text-white font-semibold hover:bg-slate-800"
            >
              Buscar
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)] gap-6">
          <aside className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold">Otras categorías</h2>
              <div className="mt-4 space-y-2">
                {otrasCategorias.map((cat) => (
                  <Link
                    key={cat.slug}
                    href={`/categoria/${cat.slug}`}
                    className="block rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 hover:bg-slate-100 hover:border-slate-300"
                  >
                    {cat.nombre}
                  </Link>
                ))}
              </div>
            </section>
          </aside>

          <section className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
              <div className="flex items-end justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-2xl font-bold">Subcategorías</h2>
                  <p className="mt-1 text-slate-600">
                    Explora servicios específicos dentro de {categoria.nombre.toLowerCase()}.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {categoria.subcategorias.map((sub) => (
                  <Link
                    key={sub}
                    href={`/categoria/${categoria.slug}/${sub}`}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 hover:bg-slate-100 hover:border-slate-300 transition"
                  >
                    <div className="font-semibold text-sm leading-snug">
                      {prettyLabel(sub)}
                    </div>
                    <div className="mt-2 text-xs text-sky-700 font-medium">
                      Ver subcategoría →
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-bold">Próximo paso</h3>
              <p className="mt-2 text-slate-600 max-w-3xl">
                Aquí después mostraremos resultados de la categoría y la posibilidad
                de filtrar por comuna. Por ahora, esta página deja la navegación
                bien armada: categoría actual, otras categorías y subcategorías.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}