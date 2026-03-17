/**
 * Constantes para la Home 1.0.
 * Rubros/sectores alineados con sector_slug (clasificación nueva).
 */

export const SECTORES_HOME: { slug: string; label: string }[] = [
  { slug: "hogar_construccion", label: "Hogar y construcción" },
  { slug: "alimentacion", label: "Comida y abastecimiento" },
  { slug: "transporte_fletes", label: "Transporte y fletes" },
  { slug: "mascotas", label: "Mascotas" },
  { slug: "salud_bienestar", label: "Salud y bienestar" },
  { slug: "belleza_estetica", label: "Belleza" },
  { slug: "automotriz", label: "Automotriz" },
  { slug: "eventos", label: "Eventos" },
  { slug: "educacion_clases", label: "Educación" },
  { slug: "tecnologia", label: "Tecnología" },
  { slug: "profesionales_asesorias", label: "Servicios profesionales" },
  { slug: "comercio_tiendas", label: "Comercio local" },
  { slug: "turismo_alojamiento", label: "Turismo y alojamiento" },
  { slug: "jardin_agricultura", label: "Jardín y agricultura" },
  { slug: "otros", label: "Otros" },
];

/** Chips del hero: navegan a /buscar?q=<value> (y comuna si existe) */
export const CHIPS_HERO = [
  "Gasfiter",
  "Fletes",
  "Panadería",
  "Veterinaria",
  "Venta de gas",
  "Arriendo de parcelas",
] as const;

/** Tags "lo más buscado" (mock por comuna). Mismo listado genérico. */
export const TAGS_MAS_BUSCADOS = [
  "Gasfiter",
  "Electricista",
  "Fletes",
  "Venta de gas",
  "Panadería",
  "Veterinaria",
] as const;

/** Comunas activas fijas para la home si la API falla o no devuelve count */
export const COMUNAS_ACTIVAS_FALLBACK: { slug: string; nombre: string }[] = [
  { slug: "calera-de-tango", nombre: "Calera de Tango" },
  { slug: "talagante", nombre: "Talagante" },
  { slug: "penaflor", nombre: "Peñaflor" },
  { slug: "padre-hurtado", nombre: "Padre Hurtado" },
  { slug: "buin", nombre: "Buin" },
  { slug: "maipu", nombre: "Maipú" },
  { slug: "san-bernardo", nombre: "San Bernardo" },
];

/** Comunas candidatas (mock) para bloque "¿Quieres que llegue a tu comuna?" */
export const COMUNAS_CANDIDATAS_MOCK: { slug: string; nombre: string; progreso: number }[] = [
  { slug: "santiago", nombre: "Santiago Centro", progreso: 20 },
  { slug: "huechuraba", nombre: "Huechuraba", progreso: 10 },
  { slug: "la-florida", nombre: "La Florida", progreso: 8 },
  { slug: "la-cisterna", nombre: "La Cisterna", progreso: 6 },
];

export function prettyComunaSlug(raw: string): string {
  const v = raw.trim();
  if (!v) return "";
  if (v.includes(" ")) return v;
  const withSpaces = v.replace(/-/g, " ");
  return withSpaces
    .split(" ")
    .map((w) => (w.length ? w.charAt(0).toUpperCase() + w.slice(1) : ""))
    .join(" ");
}
