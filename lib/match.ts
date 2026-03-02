// lib/match.ts

export type MatchIntent = {
  qClean: string;
  categoriaSlug?: string;
  subcategoriasSlugs?: string[];
  tiposAtencion?: string[]; // si manejas ids mejor
};

// Normaliza: minúsculas, sin tildes, sin doble espacio
export function normalizeText(s: string) {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Diccionario mínimo (lo vamos creciendo)
const SUBCAT_SYNONYMS: Array<{ terms: string[]; subcat: string }> = [
  { terms: ["veterinaria", "vet", "veterinario", "vacunas", "desparasitacion"], subcat: "veterinarias" },
  { terms: ["gasfiter", "gasfit", "gásfiter", "plomero"], subcat: "gasfiteria" },
  { terms: ["carpas", "carpa", "arriendo carpas"], subcat: "carpas" },
];

const CATEGORIA_BY_SUBCAT: Record<string, string> = {
  veterinarias: "mascotas",
  // gasfiteria: "hogar", etc cuando lo tengas
};

const TIPOS_ATENCION_TERMS: Array<{ terms: string[]; tipo: string }> = [
  { terms: ["a domicilio", "domicilio", "en casa"], tipo: "a_domicilio" },
  { terms: ["urgencia", "urgente", "24 horas", "24h"], tipo: "urgencias" },
];

export function inferIntent(rawQ: string): MatchIntent {
  const qN = normalizeText(rawQ);

  // Detectar subcategorías
  const foundSubcats = new Set<string>();
  for (const rule of SUBCAT_SYNONYMS) {
    if (rule.terms.some((t) => qN.includes(normalizeText(t)))) {
      foundSubcats.add(rule.subcat);
    }
  }

  // Detectar tipos atención
  const foundTipos = new Set<string>();
  for (const rule of TIPOS_ATENCION_TERMS) {
    if (rule.terms.some((t) => qN.includes(normalizeText(t)))) {
      foundTipos.add(rule.tipo);
    }
  }

  // Limpiar query quitando palabras “ruido” (opcional)
  const noise = ["a domicilio", "domicilio", "urgencia", "urgente", "24 horas", "24h"];
  let qClean = qN;
  for (const n of noise) qClean = qClean.replaceAll(normalizeText(n), " ");
  qClean = normalizeText(qClean);

  const subcategoriasSlugs = Array.from(foundSubcats);
  const categoriaSlug =
    subcategoriasSlugs.length > 0 ? CATEGORIA_BY_SUBCAT[subcategoriasSlugs[0]] : undefined;

  return {
    qClean: qClean || qN,
    categoriaSlug,
    subcategoriasSlugs: subcategoriasSlugs.length ? subcategoriasSlugs : undefined,
    tiposAtencion: foundTipos.size ? Array.from(foundTipos) : undefined,
  };
}