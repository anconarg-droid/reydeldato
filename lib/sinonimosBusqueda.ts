function norm(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const CORRECCIONES: Record<string, string> = {
  beterinario: "veterinario",
  vetrinario: "veterinario",
  vetrinaria: "veterinaria",
  veterinaira: "veterinaria",
  veterinarioo: "veterinario",

  gasfitr: "gasfiter",
  gasfitero: "gasfiter",
  gasfiteria: "gasfiteria",
  plomero: "gasfiter",
  plomeria: "gasfiteria",

  mecaniko: "mecanico",
  mecanik: "mecanico",
  mecanicaa: "mecanica",

  electrisista: "electricista",
  eletricista: "electricista",
  elettricista: "electricista",
  electricidads: "electricidad",

  sicologo: "psicologo",
  sicologa: "psicologo",
  psicologa: "psicologo",

  abogada: "abogado",
  abogados: "abogado",

  dentistas: "dentista",
  odontologo: "dentista",
  odontologa: "dentista",
  odontologia: "dentista",

  jardineria: "jardineria",
  jardineroo: "jardinero",

  peluqueria: "peluqueria",
  peluquera: "peluqueria",
  barberia: "barberia",

  empanadaa: "empanadas",
  empanadaz: "empanadas",

  mudanza: "mudanzas",
  mudansa: "mudanzas",
  mudansas: "mudanzas",
  flete: "fletes",

  carpinteria: "carpinteria",
  carpintero: "carpinteria",

  vulca: "vulcanizacion",
  vulcanisacion: "vulcanizacion",
  vulcanisacionn: "vulcanizacion",

  profe: "clases",
  profesora: "clases",
  profesor: "clases",

  insta: "instagram",
  wsp: "whatsapp",
  wasap: "whatsapp",
  guasap: "whatsapp",
  wap: "whatsapp",

  rm: "region metropolitana",
  stgo: "santiago",
};

const SINONIMOS: Record<string, string[]> = {
  veterinaria: [
    "veterinaria",
    "veterinario",
    "vet",
    "mascotas",
    "perros",
    "gatos",
    "vacunas",
    "consulta",
    "control",
    "desparasitacion",
  ],
  gasfiter: [
    "gasfiter",
    "gasfiteria",
    "plomero",
    "plomeria",
    "calefont",
    "destape",
    "fuga",
    "agua",
    "llaves",
    "griferia",
    "cañeria",
    "tuberia",
  ],
  gasfiteria: [
    "gasfiteria",
    "gasfiter",
    "plomeria",
    "plomero",
    "calefont",
    "destape",
    "agua",
  ],
  mecanico: [
    "mecanico",
    "mecanica",
    "autos",
    "auto",
    "motor",
    "frenos",
    "aceite",
    "scanner",
    "taller",
    "revision",
    "mantencion",
  ],
  mecanica: [
    "mecanica",
    "mecanico",
    "autos",
    "motor",
    "frenos",
    "aceite",
    "taller",
  ],
  electricista: [
    "electricista",
    "electricidad",
    "luz",
    "tablero",
    "enchufes",
    "corto",
    "cableado",
    "instalacion",
    "instalacion electrica",
  ],
  electricidad: [
    "electricidad",
    "electricista",
    "enchufes",
    "tablero",
    "luz",
    "instalacion electrica",
  ],
  abogado: [
    "abogado",
    "legal",
    "juridico",
    "juridica",
    "asesoria legal",
    "contratos",
    "familia",
    "divorcio",
    "laboral",
  ],
  dentista: [
    "dentista",
    "odontologo",
    "brackets",
    "dental",
    "muelas",
    "limpieza dental",
    "caries",
  ],
  psicologo: [
    "psicologo",
    "terapia",
    "emocional",
    "salud mental",
    "pareja",
    "adolescentes",
    "ansiedad",
  ],
  jardineria: [
    "jardineria",
    "jardinero",
    "poda",
    "pasto",
    "riego",
    "jardin",
    "plantas",
  ],
  peluqueria: [
    "peluqueria",
    "peluquera",
    "corte",
    "alisado",
    "mechas",
    "peinado",
  ],
  barberia: [
    "barberia",
    "barbero",
    "barba",
    "corte hombre",
    "fade",
  ],
  fletes: [
    "fletes",
    "flete",
    "mudanza",
    "mudanzas",
    "traslado",
    "retiro",
    "camion",
    "camioneta",
  ],
  mudanzas: [
    "mudanzas",
    "mudanza",
    "fletes",
    "traslado",
    "retiro",
    "camion",
  ],
  carpinteria: [
    "carpinteria",
    "carpintero",
    "muebles",
    "madera",
    "closet",
    "puertas",
    "repisas",
  ],
  vulcanizacion: [
    "vulcanizacion",
    "vulca",
    "neumaticos",
    "pinchazo",
    "llantas",
    "ruedas",
  ],
  clases: [
    "clases",
    "profesor",
    "profesora",
    "particular",
    "reforzamiento",
    "ingles",
    "matematicas",
    "lenguaje",
  ],
  empanadas: [
    "empanadas",
    "horneadas",
    "fritas",
    "coctel",
    "amasado",
  ],
  instagram: [
    "instagram",
    "insta",
    "ig",
  ],
  whatsapp: [
    "whatsapp",
    "wsp",
    "wasap",
    "guasap",
    "wp",
  ],
};

const FRASES_COMPUESTAS: Array<{
  match: string[];
  canonical: string;
}> = [
  { match: ["local", "fisico"], canonical: "local_fisico" },
  { match: ["delivery"], canonical: "delivery" },
  { match: ["a", "domicilio"], canonical: "domicilio" },
  { match: ["sitio", "web"], canonical: "sitio_web" },
  { match: ["redes", "sociales"], canonical: "redes_sociales" },
  { match: ["salud", "mental"], canonical: "salud_mental" },
  { match: ["asesoria", "legal"], canonical: "asesoria_legal" },
  { match: ["instalacion", "electrica"], canonical: "instalacion_electrica" },
  { match: ["limpieza", "dental"], canonical: "limpieza_dental" },
  { match: ["region", "metropolitana"], canonical: "region_metropolitana" },
  { match: ["padre", "hurtado"], canonical: "padre_hurtado" },
  { match: ["san", "bernardo"], canonical: "san_bernardo" },
  { match: ["calera", "de", "tango"], canonical: "calera_de_tango" },
];

const ABREVIACIONES_COMUNAS: Record<string, string> = {
  stgo: "santiago",
  stgo_centro: "santiago",
  sbernardo: "san_bernardo",
  p_hurtado: "padre_hurtado",
  pte_alto: "puente_alto",
  caletango: "calera_de_tango",
  calera_tango: "calera_de_tango",
};

const COMUNAS_CERCANAS: Record<string, string[]> = {
  maipu: ["cerrillos", "estacion_central", "padre_hurtado", "pudahuel"],
  padre_hurtado: ["maipu", "penaflor", "talagante"],
  penaflor: ["padre_hurtado", "talagante", "isla_de_maipo"],
  talagante: ["penaflor", "padre_hurtado", "buin", "isla_de_maipo"],
  buin: ["san_bernardo", "talagante", "paine", "calera_de_tango"],
  san_bernardo: ["buin", "calera_de_tango", "la_pintana", "el_bosque"],
  calera_de_tango: ["san_bernardo", "buin", "maipu"],
  santiago: ["providencia", "nunoa", "estacion_central", "recoleta"],
};

function tokenizar(raw: string): string[] {
  return norm(raw).split(/\s+/).filter(Boolean);
}

function aplicarFrasesCompuestas(tokens: string[]): string[] {
  const out: string[] = [];
  let i = 0;

  while (i < tokens.length) {
    let matched = false;

    for (const rule of FRASES_COMPUESTAS) {
      const len = rule.match.length;
      const chunk = tokens.slice(i, i + len);

      if (chunk.length === len && chunk.join(" ") === norm(rule.match.join(" "))) {
        out.push(rule.canonical);
        i += len;
        matched = true;
        break;
      }
    }

    if (!matched) {
      out.push(tokens[i]);
      i += 1;
    }
  }

  return out;
}

function corregirToken(token: string): string {
  const abreviado = ABREVIACIONES_COMUNAS[token];
  if (abreviado) return abreviado;

  return CORRECCIONES[token] || token;
}

function expandirTokens(tokens: string[]): string[] {
  const out = new Set<string>();

  for (const token of tokens) {
    out.add(token);

    const sinonimos = SINONIMOS[token];
    if (sinonimos?.length) {
      for (const s of sinonimos) {
        out.add(norm(s).replace(/\s+/g, "_"));
      }
    }

    const cercanas = COMUNAS_CERCANAS[token];
    if (cercanas?.length) {
      for (const c of cercanas) {
        out.add(norm(c));
      }
    }
  }

  return Array.from(out);
}

function sugerenciaDesdeCorrecciones(originalTokens: string[], corregidos: string[]) {
  const cambio =
    originalTokens.length !== corregidos.length ||
    originalTokens.some((t, i) => t !== corregidos[i]);

  if (!cambio) return "";

  return corregidos
    .map((t) => t.replace(/_/g, " "))
    .join(" ")
    .trim();
}

export function corregirBusqueda(raw: string) {
  const original = (raw || "").trim();

  const tokensOriginales = tokenizar(original);
  const tokensConFrases = aplicarFrasesCompuestas(tokensOriginales);
  const tokensCorregidos = tokensConFrases.map(corregirToken);
  const tokensExpandidos = expandirTokens(tokensCorregidos);

  const corregido = tokensCorregidos
    .map((t) => t.replace(/_/g, " "))
    .join(" ")
    .trim();

  const expandido = tokensExpandidos
    .map((t) => t.replace(/_/g, " "))
    .join(" ")
    .trim();

  const sugerencia = sugerenciaDesdeCorrecciones(tokensConFrases, tokensCorregidos);

  return {
    original,
    limpio: norm(original),
    tokensOriginales,
    tokensConFrases,
    tokensCorregidos,
    tokensExpandidos,
    corregido,
    expandido,
    sugerencia,
  };
}