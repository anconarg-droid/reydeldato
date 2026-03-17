/**
 * Fixture de taxonomía v1 para pruebas de clasificación.
 * Subcategorías y keyword_to_subcategory_map con IDs deterministas
 * para validar mapKeywordsToSubcategories con casos reales chilenos.
 */

export const CATEGORIA_ALIMENTACION_ID = "cat-ali";
export const CATEGORIA_HOGAR_ID = "cat-hogar";
export const CATEGORIA_VEHICULOS_ID = "cat-vehi";
export const CATEGORIA_SALUD_ID = "cat-salud";
export const CATEGORIA_EDUCACION_ID = "cat-edu";
export const CATEGORIA_COMERCIO_ID = "cat-com";

export const SUBCATEGORIAS_FIXTURE = [
  { id: "sub-pan", slug: "panaderia", nombre: "Panadería", categoria_id: CATEGORIA_ALIMENTACION_ID },
  { id: "sub-past", slug: "pasteleria", nombre: "Pastelería y repostería", categoria_id: CATEGORIA_ALIMENTACION_ID },
  { id: "sub-emp", slug: "empanadas", nombre: "Empanadas", categoria_id: CATEGORIA_ALIMENTACION_ID },
  { id: "sub-gas", slug: "gasfiter", nombre: "Gasfitería", categoria_id: CATEGORIA_HOGAR_ID },
  { id: "sub-elec", slug: "electricista", nombre: "Electricidad", categoria_id: CATEGORIA_HOGAR_ID },
  { id: "sub-vulc", slug: "vulcanizacion", nombre: "Vulcanización", categoria_id: CATEGORIA_VEHICULOS_ID },
  { id: "sub-mec", slug: "mecanico", nombre: "Mecánico automotriz", categoria_id: CATEGORIA_VEHICULOS_ID },
  { id: "sub-flet", slug: "fletes", nombre: "Fletes y mudanzas", categoria_id: CATEGORIA_VEHICULOS_ID },
  { id: "sub-vet", slug: "veterinaria", nombre: "Veterinaria", categoria_id: CATEGORIA_SALUD_ID },
  { id: "sub-ferr", slug: "ferreteria", nombre: "Ferretería", categoria_id: CATEGORIA_COMERCIO_ID },
  { id: "sub-clas", slug: "clases", nombre: "Clases y capacitación", categoria_id: CATEGORIA_EDUCACION_ID },
  { id: "sub-peluq", slug: "peluqueria", nombre: "Peluquería", categoria_id: CATEGORIA_SALUD_ID },
  { id: "sub-pizz", slug: "pizzas", nombre: "Pizzas", categoria_id: CATEGORIA_ALIMENTACION_ID },
  { id: "sub-comida", slug: "comida_casera", nombre: "Comida casera y delivery", categoria_id: CATEGORIA_ALIMENTACION_ID },
] as const;

/** Mapeo normalized_keyword -> subcategoria_id (slug para legibilidad, se resuelve a id en el mock) */
const KEYWORD_MAP_BY_SLUG: Array<{ normalized_keyword: string; sub_slug: string; confidence_default: number }> = [
  { normalized_keyword: "panaderia", sub_slug: "panaderia", confidence_default: 1.0 },
  { normalized_keyword: "panadero", sub_slug: "panaderia", confidence_default: 0.95 },
  { normalized_keyword: "pan", sub_slug: "panaderia", confidence_default: 0.85 },
  { normalized_keyword: "amasado", sub_slug: "panaderia", confidence_default: 0.85 },
  { normalized_keyword: "masas", sub_slug: "panaderia", confidence_default: 0.8 },
  { normalized_keyword: "pasteleria", sub_slug: "pasteleria", confidence_default: 1.0 },
  { normalized_keyword: "reposteria", sub_slug: "pasteleria", confidence_default: 0.95 },
  { normalized_keyword: "repostero", sub_slug: "pasteleria", confidence_default: 0.9 },
  { normalized_keyword: "tortas", sub_slug: "pasteleria", confidence_default: 0.95 },
  { normalized_keyword: "dulces", sub_slug: "pasteleria", confidence_default: 0.85 },
  { normalized_keyword: "empanadas", sub_slug: "empanadas", confidence_default: 1.0 },
  { normalized_keyword: "gasfiter", sub_slug: "gasfiter", confidence_default: 1.0 },
  { normalized_keyword: "plomero", sub_slug: "gasfiter", confidence_default: 0.95 },
  { normalized_keyword: "plomeria", sub_slug: "gasfiter", confidence_default: 0.95 },
  { normalized_keyword: "canerias", sub_slug: "gasfiter", confidence_default: 0.85 },
  { normalized_keyword: "destape", sub_slug: "gasfiter", confidence_default: 0.85 },
  { normalized_keyword: "destapes", sub_slug: "gasfiter", confidence_default: 0.85 },
  { normalized_keyword: "calefont", sub_slug: "gasfiter", confidence_default: 0.8 },
  { normalized_keyword: "electricista", sub_slug: "electricista", confidence_default: 1.0 },
  { normalized_keyword: "electricidad", sub_slug: "electricista", confidence_default: 0.9 },
  { normalized_keyword: "vulcanizacion", sub_slug: "vulcanizacion", confidence_default: 1.0 },
  { normalized_keyword: "vulca", sub_slug: "vulcanizacion", confidence_default: 0.9 },
  { normalized_keyword: "mecanico", sub_slug: "mecanico", confidence_default: 1.0 },
  { normalized_keyword: "taller-mecanico", sub_slug: "mecanico", confidence_default: 0.95 },
  { normalized_keyword: "lavado", sub_slug: "mecanico", confidence_default: 0.75 },
  { normalized_keyword: "autos", sub_slug: "mecanico", confidence_default: 0.8 },
  { normalized_keyword: "fletes", sub_slug: "fletes", confidence_default: 1.0 },
  { normalized_keyword: "flete", sub_slug: "fletes", confidence_default: 0.9 },
  { normalized_keyword: "mudanza", sub_slug: "fletes", confidence_default: 0.9 },
  { normalized_keyword: "veterinaria", sub_slug: "veterinaria", confidence_default: 1.0 },
  { normalized_keyword: "veterinario", sub_slug: "veterinaria", confidence_default: 0.95 },
  { normalized_keyword: "ferreteria", sub_slug: "ferreteria", confidence_default: 1.0 },
  { normalized_keyword: "herramientas", sub_slug: "ferreteria", confidence_default: 0.85 },
  { normalized_keyword: "construccion", sub_slug: "ferreteria", confidence_default: 0.8 },
  { normalized_keyword: "clases", sub_slug: "clases", confidence_default: 1.0 },
  { normalized_keyword: "clases-particulares", sub_slug: "clases", confidence_default: 0.95 },
  { normalized_keyword: "matematicas", sub_slug: "clases", confidence_default: 0.85 },
  { normalized_keyword: "reforzamiento", sub_slug: "clases", confidence_default: 0.85 },
  { normalized_keyword: "refuerzo", sub_slug: "clases", confidence_default: 0.85 },
  { normalized_keyword: "preuniversitario", sub_slug: "clases", confidence_default: 0.9 },
  { normalized_keyword: "peluqueria", sub_slug: "peluqueria", confidence_default: 1.0 },
  { normalized_keyword: "peluquero", sub_slug: "peluqueria", confidence_default: 0.95 },
  { normalized_keyword: "cortes", sub_slug: "peluqueria", confidence_default: 0.8 },
  { normalized_keyword: "barberia", sub_slug: "peluqueria", confidence_default: 0.9 },
  { normalized_keyword: "pizzas", sub_slug: "pizzas", confidence_default: 1.0 },
  { normalized_keyword: "pizza", sub_slug: "pizzas", confidence_default: 0.95 },
  { normalized_keyword: "comida-casera", sub_slug: "comida_casera", confidence_default: 0.95 },
  { normalized_keyword: "almuerzos", sub_slug: "comida_casera", confidence_default: 0.85 },
  { normalized_keyword: "delivery", sub_slug: "comida_casera", confidence_default: 0.85 },
];

const subBySlug = Object.fromEntries(SUBCATEGORIAS_FIXTURE.map((s) => [s.slug, s]));

export const KEYWORD_TO_SUBCATEGORY_MAP_FIXTURE = KEYWORD_MAP_BY_SLUG.map((row) => {
  const sub = subBySlug[row.sub_slug];
  return {
    keyword: row.normalized_keyword,
    normalized_keyword: row.normalized_keyword,
    subcategoria_id: sub?.id ?? "",
    confidence_default: row.confidence_default,
  };
}).filter((r) => r.subcategoria_id);
