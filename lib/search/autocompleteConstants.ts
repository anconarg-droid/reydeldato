/**
 * Constantes para autocomplete V1: sectores y helper de etiquetas.
 * Lenguaje de producto (oficios, rubros, comunas), no técnico.
 */

export const SECTORES: { slug: string; label: string }[] = [
  { slug: "alimentacion", label: "Alimentación" },
  { slug: "hogar_construccion", label: "Hogar y construcción" },
  { slug: "automotriz", label: "Automotriz" },
  { slug: "salud_bienestar", label: "Salud y bienestar" },
  { slug: "belleza_estetica", label: "Belleza y estética" },
  { slug: "mascotas", label: "Mascotas" },
  { slug: "eventos", label: "Eventos" },
  { slug: "educacion_clases", label: "Educación y clases" },
  { slug: "tecnologia", label: "Tecnología" },
  { slug: "comercio_tiendas", label: "Comercio y tiendas" },
  { slug: "transporte_fletes", label: "Transporte y fletes" },
  { slug: "jardin_agricultura", label: "Jardín y agricultura" },
  { slug: "profesionales_asesorias", label: "Profesionales y asesorías" },
  { slug: "turismo_alojamiento", label: "Turismo y alojamiento" },
  { slug: "otros", label: "Otros" },
];

/** Convierte slug a etiqueta legible (ej. gasfiter -> Gasfiter, calera-de-tango -> Calera de Tango) */
export function intentLabelFromSlug(slug: string): string {
  const s = (slug || "").trim().replace(/_/g, " ");
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/** Convierte slug de comuna a etiqueta (ej. calera-de-tango -> Calera de Tango) */
export function comunaLabelFromSlug(slug: string): string {
  const s = (slug || "").trim().replace(/-/g, " ");
  if (!s) return "";
  return s
    .split(" ")
    .map((w) => (w.length ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ""))
    .join(" ");
}
