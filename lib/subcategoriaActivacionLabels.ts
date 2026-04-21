/**
 * Textos en minúsculas para copy de activación (plural en titulares / cuerpo; singular tras "un buen …").
 * Clave = slug de subcategoría en minúsculas (como en URL).
 */
const BY_SLUG: Record<string, { plural: string; singular: string }> = {
  gasfiter: { plural: "gasfiteres", singular: "gasfiter" },
  electricista: { plural: "electricistas", singular: "electricista" },
  destapes: { plural: "servicios de destape", singular: "destape" },
  maestro: { plural: "maestros", singular: "maestro" },
  "mantencion-piscina": {
    plural: "mantenciones de piscina",
    singular: "mantención de piscina",
  },
  cerrajeria: { plural: "cerrajerías", singular: "cerrajería" },
  mecanico: { plural: "mecánicos", singular: "mecánico" },
  "lavado-autos": { plural: "lavados de autos", singular: "lavado de autos" },
  neumaticos: { plural: "neumáticos", singular: "neumático" },
  baterias: { plural: "baterías", singular: "batería" },
  grua: { plural: "grúas", singular: "grúa" },
  "scanner-automotriz": {
    plural: "escáneres automotrices",
    singular: "escáner automotriz",
  },
  veterinario: { plural: "veterinarios", singular: "veterinario" },
  "peluqueria-canina": {
    plural: "peluquerías caninas",
    singular: "peluquería canina",
  },
  "paseo-perros": {
    plural: "paseadores de perros",
    singular: "paseo de perros",
  },
  "hotel-mascotas": {
    plural: "hoteles para mascotas",
    singular: "hotel para mascotas",
  },
  adiestramiento: { plural: "adiestramientos", singular: "adiestramiento" },
  "alimentos-mascotas": {
    plural: "negocios de alimento para mascotas",
    singular: "alimento para mascotas",
  },
  panaderia: { plural: "panaderías", singular: "panadería" },
  pasteleria: { plural: "pastelerías", singular: "pastelería" },
  colaciones: { plural: "colaciones", singular: "colación" },
  "delivery-comida": {
    plural: "deliveries de comida",
    singular: "delivery de comida",
  },
  "agua-purificada": {
    plural: "puntos de agua purificada",
    singular: "agua purificada",
  },
  carniceria: { plural: "carnicerías", singular: "carnicería" },
  kinesiologia: { plural: "kinesiólogos", singular: "kinesiología" },
  psicologia: { plural: "psicólogos", singular: "psicología" },
  terapias: { plural: "terapias", singular: "terapia" },
  nutricion: { plural: "nutricionistas", singular: "nutrición" },
  "entrenador-personal": {
    plural: "entrenadores personales",
    singular: "entrenador personal",
  },
  masajes: { plural: "masajes", singular: "masaje" },
  banqueteria: { plural: "banqueterías", singular: "banquetería" },
  animacion: { plural: "animadores", singular: "animación" },
  decoracion: { plural: "decoradores", singular: "decoración" },
  "arriendo-mobiliario": {
    plural: "arriendos de mobiliario",
    singular: "arriendo de mobiliario",
  },
  "fotografia-eventos": {
    plural: "fotógrafos de eventos",
    singular: "fotografía de eventos",
  },
  dj: { plural: "DJs", singular: "DJ" },
  peluqueria: { plural: "peluquerías", singular: "peluquería" },
  manicure: { plural: "manicures", singular: "manicure" },
  maquillaje: { plural: "maquilladores", singular: "maquillaje" },
  barberia: { plural: "barberías", singular: "barbería" },
  depilacion: { plural: "depilaciones", singular: "depilación" },
  "tratamientos-faciales": {
    plural: "tratamientos faciales",
    singular: "tratamiento facial",
  },
  "clases-particulares": {
    plural: "clases particulares",
    singular: "clase particular",
  },
  ingles: { plural: "profesores de inglés", singular: "profesor de inglés" },
  matematicas: {
    plural: "apoyos en matemáticas",
    singular: "apoyo en matemáticas",
  },
  "reforzamiento-escolar": {
    plural: "refuerzos escolares",
    singular: "refuerzo escolar",
  },
  talleres: { plural: "talleres", singular: "taller" },
  musica: { plural: "clases de música", singular: "clase de música" },
  fletes: { plural: "fletes", singular: "flete" },
  mudanzas: { plural: "mudanzas", singular: "mudanza" },
  "transporte-menor": {
    plural: "transportes menores",
    singular: "transporte menor",
  },
  "retiro-escombros": {
    plural: "retiros de escombros",
    singular: "retiro de escombros",
  },
  traslados: { plural: "traslados", singular: "traslado" },
  camioneta: {
    plural: "servicios con camioneta",
    singular: "servicio con camioneta",
  },
  contabilidad: { plural: "contadores", singular: "contador" },
  abogado: { plural: "abogados", singular: "abogado" },
  "diseno-grafico": {
    plural: "diseñadores gráficos",
    singular: "diseño gráfico",
  },
  marketing: { plural: "servicios de marketing", singular: "marketing" },
  "asesoria-tributaria": {
    plural: "asesorías tributarias",
    singular: "asesoría tributaria",
  },
  arquitectura: { plural: "arquitectos", singular: "arquitecto" },
  papeleria: { plural: "papelerías", singular: "papelería" },
  bazar: { plural: "bazares", singular: "bazar" },
  libreria: { plural: "librerías", singular: "librería" },
  regalos: { plural: "tiendas de regalos", singular: "tienda de regalos" },
  ferreteria: { plural: "ferreterías", singular: "ferretería" },
  ropa: { plural: "tiendas de ropa", singular: "tienda de ropa" },
  "oficios-varios": { plural: "oficios", singular: "oficio" },
  "servicios-varios": { plural: "servicios", singular: "servicio" },
  tecnico: { plural: "técnicos", singular: "técnico" },
  tramites: { plural: "trámites", singular: "trámite" },
  arriendos: { plural: "arriendos", singular: "arriendo" },
  otros: { plural: "servicios", singular: "servicio" },
};

export type SubcategoriaActivacionLabels = { plural: string; singular: string };

/**
 * Resuelve plural y singular para copy de “categoría en preparación”.
 * Si el slug no está mapeado, infiere desde guiones (mejor que nada).
 */
export function subcategoriaActivacionLabels(
  slug: string | null | undefined
): SubcategoriaActivacionLabels | null {
  const k = (slug ?? "").trim().toLowerCase();
  if (!k) return null;
  const hit = BY_SLUG[k];
  if (hit) return hit;
  const words = k.split("-").filter(Boolean);
  if (words.length === 0) return null;
  const singular = words.join(" ");
  const plural =
    singular + (/[aeiouáéíóú]$/i.test(singular) ? "s" : "es");
  return { plural, singular };
}
