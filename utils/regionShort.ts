/**
 * Convierte el nombre completo de una región de Chile a formato corto para UI.
 * La base de datos mantiene el nombre completo; solo la visualización usa el corto.
 *
 * Ejemplos:
 *   "Región Metropolitana de Santiago" → "RM"
 *   "Región Aysén del General Carlos Ibáñez del Campo" → "Aysén"
 *   "Región del Biobío" → "Biobío"
 */
const REGION_TO_SHORT: Array<{ match: string | RegExp; short: string }> = [
  { match: /metropolitana|santiago/i, short: "RM" },
  { match: /aysén|aisen|aysen/i, short: "Aysén" },
  { match: /magallanes/i, short: "Magallanes" },
  { match: /antártica chilena/i, short: "Magallanes" },
  { match: /biobío|biobio/i, short: "Biobío" },
  { match: /araucanía|araucania/i, short: "La Araucanía" },
  { match: /los ríos|los rios/i, short: "Los Ríos" },
  { match: /los lagos/i, short: "Los Lagos" },
  { match: /ñuble|nuble/i, short: "Ñuble" },
  { match: /maule/i, short: "Maule" },
  { match: /o'higgins|ohiggins|libertador/i, short: "O'Higgins" },
  { match: /valparaíso|valparaiso/i, short: "Valparaíso" },
  { match: /coquimbo/i, short: "Coquimbo" },
  { match: /atacama/i, short: "Atacama" },
  { match: /antofagasta/i, short: "Antofagasta" },
  { match: /tarapacá|tarapaca/i, short: "Tarapacá" },
  { match: /arica|parinacota/i, short: "Arica" },
];

export function getRegionShort(regionNombre: string | null | undefined): string {
  if (!regionNombre || !String(regionNombre).trim()) return "";
  const n = String(regionNombre).trim();
  for (const { match, short } of REGION_TO_SHORT) {
    if (typeof match === "string" && n.toLowerCase().includes(match.toLowerCase())) return short;
    if (match instanceof RegExp && match.test(n)) return short;
  }
  return n;
}
