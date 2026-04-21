export type CategoriaCatalogoItem = {
  slug: string;
  nombre: string;
  descripcion: string;
  emoji: string;
  subcategorias: string[];
};

/** Catálogo alineado con `app/categoria/[slug]/page.tsx` (slugs de subcategoría para URLs). */
export const CATEGORIAS_CATALOGO: CategoriaCatalogoItem[] = [
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

export function prettyLabelSubcategoria(slug: string): string {
  return slug
    .split("-")
    .map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1) : ""))
    .join(" ");
}
