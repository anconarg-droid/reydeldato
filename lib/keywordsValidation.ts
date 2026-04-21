/**
 * Limpieza de keywords_finales (sin IA).
 *
 * **Activo:** {@link normalizarKeyword}, dedupe, filtro suave ({@link pasaFiltroSuave}),
 * exclusión de comunas/relleno, expansión controlada de bigramas → unigramas, y
 * {@link filtrarUnigramasAmbiguas} / {@link KEYWORDS_AMBIGUAS}.
 *
 * **En pausa** (ver flags {@link KEYWORDS_APLICAR_BLACKLIST_RUBRO_CRUZADO},
 * {@link KEYWORDS_APLICAR_WHITELIST_SUBCATEGORIA}): whitelist estricta por subcategoría y blacklist
 * cruzada por slug; el diccionario y las funciones siguen en el archivo para reactivarlas.
 */

export const MAX_KEYWORDS_FIN = 40;

/**
 * Si `true`, aplica {@link filtrarKeywordsPorBlacklist} cuando el slug incluye `mascotas`.
 * Por defecto `false`: evita reglas manuales demasiado rígidas.
 */
export const KEYWORDS_APLICAR_BLACKLIST_RUBRO_CRUZADO = false;

/**
 * Si `true`, solo dejan pasar keywords que coincidan con {@link KEYWORDS_VALIDAS_POR_SUBCATEGORIA}.
 * Por defecto `false`: la whitelist estricta queda desactivada.
 */
export const KEYWORDS_APLICAR_WHITELIST_SUBCATEGORIA = false;

/**
 * Términos de otras rubricas (p. ej. automotriz, educación) que no deben mezclarse
 * en subcategorías de **mascotas**. Ver {@link filtrarKeywordsPorBlacklist}.
 * (Solo se usa si {@link KEYWORDS_APLICAR_BLACKLIST_RUBRO_CRUZADO} es `true`.)
 */
export const PALABRAS_PROHIBIDAS: readonly string[] = [
  "auto",
  "motor",
  "clases",
  "profesor",
];

/**
 * Diccionario para filtro estricto opcional (desactivado por defecto).
 * Reactivar con {@link KEYWORDS_APLICAR_WHITELIST_SUBCATEGORIA} = true.
 */
export const KEYWORDS_VALIDAS_POR_SUBCATEGORIA: Record<string, readonly string[]> = {
  peluqueria: ["corte", "cortes", "pelo", "peinados", "damas", "varones", "tinte", "alisado"],
  veterinaria: ["veterinaria", "urgencia", "mascotas", "clinica", "vacuna", "desparasita"],
  veterinario: ["veterinaria", "veterinario", "urgencia", "mascotas", "clinica", "vacuna"],
  "peluqueria-mascotas": ["peluqueria", "bano", "corte", "perros", "gatos", "mascotas"],
  "peluqueria-canina": ["peluqueria", "bano", "corte", "perros", "gatos", "mascotas"],
  gasfiteria: ["gasfiter", "gasfiteria", "calefont", "griferia", "lavamanos", "fuga", "caneria"],
  gasfiter: ["gasfiter", "gasfiteria", "calefont", "griferia", "lavamanos", "fuga", "caneria"],
  electricista: ["electric", "luz", "instalacion", "enchufe", "tablero", "cableado"],
  manicure: ["manicure", "unas", "gel", "esmalte", "pedicure"],
  barberia: ["barba", "barberia", "corte", "fade", "afeitado"],
  mecanico: ["mecanico", "motor", "aceite", "freno", "auto", "vehiculo", "revision"],
  panaderia: ["pan", "masa", "pasteleria", "facturas", "amasar"],
  kinesiologia: ["kinesiolog", "rehabilitacion", "lesion", "columna", "ejercicio"],
  psicologia: ["psicolog", "terapia", "ansiedad", "emocional", "salud mental"],
};

/** Slug de subcategoría comparable con las claves del diccionario. */
function slugSubcategoriaKey(raw: string): string {
  return s(raw).toLowerCase().trim();
}

/**
 * `includes` sobre toda la keyword puede pegar subcadenas dentro de una palabra (p. ej. "profesor" en "profesional").
 * Aquí la prohibición cuenta solo si el término aparece como token (separado por espacios) o como palabra completa.
 */
function keywordContieneTerminoProhibido(
  keywordNormalizada: string,
  prohibidaNormalizada: string
): boolean {
  if (!keywordNormalizada || !prohibidaNormalizada) return false;
  if (keywordNormalizada === prohibidaNormalizada) return true;
  const esc = prohibidaNormalizada.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|\\s)${esc}($|\\s)`, "").test(keywordNormalizada);
}

/**
 * Aplica {@link PALABRAS_PROHIBIDAS} solo si el slug sugiere rubro mascotas.
 * Desactivado por defecto vía {@link KEYWORDS_APLICAR_BLACKLIST_RUBRO_CRUZADO}.
 */
function filtrarKeywordsPorBlacklist(
  subcategoriaSlugKey: string,
  finales: string[]
): string[] {
  if (!subcategoriaSlugKey.includes("mascotas")) {
    return finales;
  }
  return finales.filter((k) => {
    const nk = normalizarKeyword(k);
    return !PALABRAS_PROHIBIDAS.some((p) => {
      const np = normalizarKeyword(p);
      return np.length > 0 && keywordContieneTerminoProhibido(nk, np);
    });
  });
}

/** True si la keyword (normalizada) contiene algún término permitido (normalizado). */
function keywordCoincideConPermitidas(
  keywordNormalizada: string,
  permitidas: readonly string[]
): boolean {
  if (!keywordNormalizada) return false;
  return permitidas.some((p) => {
    const token = normalizarKeyword(p);
    return token.length > 0 && keywordNormalizada.includes(token);
  });
}

/** Máximo de palabras por keyword (1 unigrama o 2 bigrama tipo "cambio aceite"). */
const MAX_PALABRAS_POR_KEYWORD = 2;

/** Evita frases absurdamente largas aunque tengan pocas palabras. */
const MAX_CARACTERES_KEYWORD = 48;

function s(v: unknown): string {
  return v === null || v === undefined ? "" : String(v).trim();
}

/**
 * Normaliza texto de keyword antes de tokenizar: minúsculas, sin tildes, trim y espacios colapsados.
 */
export function normalizarKeyword(k: string): string {
  return String(k ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Unigramas demasiado genéricos: solos añaden ruido entre rubros (ej. "corte" desde "corte pelo" y "corte césped").
 * No se eliminan si forman parte de un bigrama ("corte pelo" se mantiene). Ver {@link filtrarUnigramasAmbiguas}.
 */
export const KEYWORDS_AMBIGUAS: readonly string[] = [
  "corte",
  "cortes",
  "cambio",
  "clases",
  "servicio",
  "servicios",
  "reparacion",
  "venta",
  "atencion",
  "urgencia",
  "trabajo",
];

const KEYWORDS_AMBIGUAS_SET: ReadonlySet<string> = new Set(
  KEYWORDS_AMBIGUAS.map((w) => normalizarKeyword(w)).filter(Boolean)
);

/** True si la keyword es un solo término y coincide con {@link KEYWORDS_AMBIGUAS} (normalizado). */
function esUnigramaAmbigua(keyword: string): boolean {
  const n = normalizarKeyword(keyword);
  if (!n) return false;
  const partes = n.split(" ").filter(Boolean);
  if (partes.length !== 1) return false;
  return KEYWORDS_AMBIGUAS_SET.has(partes[0]);
}

/** Quita solo unigramas ambiguos; conserva bigramas (2 palabras) íntegros. */
function filtrarUnigramasAmbiguas(keywords: string[]): string[] {
  return keywords.filter((k) => !esUnigramaAmbigua(k));
}

/**
 * Slugs y nombres frecuentes de comunas (Chile), en forma ya comparable con `normalizarKeyword`.
 * Ampliar aquí si aparecen comunas que siguen colándose como keyword.
 */
const COMUNAS_NORMALIZADAS_EXACTAS: readonly string[] = [
  "santiago",
  "providencia",
  "las condes",
  "vitacura",
  "lo barnechea",
  "penalolen",
  "la reina",
  "nunoa",
  "maipu",
  "puente alto",
  "la florida",
  "san bernardo",
  "la pintana",
  "el bosque",
  "pedro aguirre cerda",
  "lo espejo",
  "cerrillos",
  "estacion central",
  "independencia",
  "recoleta",
  "conchali",
  "huechuraba",
  "quilicura",
  "renca",
  "cerro navia",
  "pudahuel",
  "quinta normal",
  "lo prado",
  "valparaiso",
  "vina del mar",
  "concon",
  "quilpue",
  "villa alemana",
  "limache",
  "san antonio",
  "rancagua",
  "machali",
  "san fernando",
  "curico",
  "talca",
  "linares",
  "chillan",
  "concepcion",
  "talcahuano",
  "hualpen",
  "san pedro de la paz",
  "coronel",
  "los angeles",
  "temuco",
  "villarrica",
  "valdivia",
  "osorno",
  "puerto montt",
  "castro",
  "coyhaique",
  "punta arenas",
  "arica",
  "iquique",
  "alto hospicio",
  "antofagasta",
  "calama",
  "copiapo",
  "la serena",
  "coquimbo",
  "ovalle",
  "los andes",
  "san felipe",
  "quillota",
  "calera",
  "melipilla",
  "buin",
  "paine",
  "colina",
  "lampa",
  "tiltil",
  "alhue",
  "curacavi",
  "maria pinto",
  "san pedro",
  "isla de maipo",
  "el monte",
  "padre hurtado",
  "penaflor",
  "talagante",
];

let comunasSetCache: ReadonlySet<string> | null = null;

function comunasNormalizadasSet(): ReadonlySet<string> {
  if (!comunasSetCache) {
    const uniq = [...new Set(COMUNAS_NORMALIZADAS_EXACTAS)];
    comunasSetCache = new Set(
      uniq.map((c) => normalizarKeyword(c)).filter(Boolean)
    );
  }
  return comunasSetCache;
}

/** True si el keyword completo coincide con una comuna conocida (nombre/slug habitual). */
export function esKeywordExactamenteComuna(normalizado: string): boolean {
  const n = normalizarKeyword(normalizado);
  if (!n) return false;
  return comunasNormalizadasSet().has(n);
}

const PALABRAS_RELLENO: ReadonlySet<string> = new Set(
  [
    "servicio",
    "servicios",
    "general",
    "generales",
    "todo",
    "toda",
    "todas",
    "todos",
    "tipo",
    "negocio",
    "negocios",
    "empresa",
    "empresas",
    "trabajos",
    "trabajo",
    "oferta",
    "ofertas",
    "calidad",
    "mejor",
    "mejores",
    "rapido",
    "rápido",
    "economico",
    "económico",
    "barato",
    "contacto",
    "whatsapp",
    "wsp",
    "fono",
    "telefono",
    "teléfono",
    "celular",
    "atencion",
    "atención",
    "cliente",
    "clientes",
    "profesional",
    "profesionales",
    "experto",
    "expertos",
    "experiencia",
    "anos",
    "años",
  ].map((w) => normalizarKeyword(w))
);

function contarPalabras(normalizado: string): number {
  if (!normalizarKeyword(normalizado)) return 0;
  return normalizarKeyword(normalizado).split(" ").filter(Boolean).length;
}

function tokens(normalizado: string): string[] {
  const n = normalizarKeyword(normalizado);
  return n.split(" ").filter(Boolean);
}

function esSoloRelleno(normalizado: string): boolean {
  const t = tokens(normalizado);
  if (t.length === 0) return true;
  return t.every((w) => PALABRAS_RELLENO.has(w));
}

function pasaFiltroSuave(raw: string): boolean {
  const original = s(raw);
  if (!original) return false;

  const n = normalizarKeyword(original);
  if (!n) return false;

  if (original.length > MAX_CARACTERES_KEYWORD) return false;

  const nPalabras = contarPalabras(n);
  if (nPalabras < 1 || nPalabras > MAX_PALABRAS_POR_KEYWORD) return false;

  if (esKeywordExactamenteComuna(n)) return false;

  if (esSoloRelleno(n)) return false;

  if (nPalabras === 2) {
    const [a, b] = tokens(n);
    if (PALABRAS_RELLENO.has(a) || PALABRAS_RELLENO.has(b)) return false;
    if (esKeywordExactamenteComuna(a) || esKeywordExactamenteComuna(b)) return false;
  }

  if (nPalabras === 1 && PALABRAS_RELLENO.has(n)) return false;

  return true;
}

function deduplicarKeywordsPreservandoOrden(keywords: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const k of keywords) {
    const raw = s(k);
    if (!raw) continue;
    const key = normalizarKeyword(raw);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(raw);
  }
  return out;
}

/**
 * Si hay un bigrama útil ("cortes pelo"), añade también los unigramas "cortes" y "pelo"
 * para que la búsqueda global (`keywords_finales.cs.{token}`) encuentre términos sueltos.
 * Cada unigrama pasa el mismo filtro suave que el resto.
 */
function expandirUnigramasDesdeBigramas(keywords: string[]): string[] {
  const extras: string[] = [];
  for (const k of keywords) {
    const n = normalizarKeyword(k);
    const t = tokens(n);
    if (t.length !== 2) continue;
    for (const w of t) {
      if (pasaFiltroSuave(w)) {
        extras.push(w);
      }
    }
  }
  return deduplicarKeywordsPreservandoOrden([...keywords, ...extras]);
}

/** Texto legible si hay que usar solo la subcategoría como keyword. */
export function fallbackKeywordDesdeSlugSubcategoria(subcategoriaSlug: string): string {
  const slug = s(subcategoriaSlug).toLowerCase();
  if (!slug) return "";
  return slug.replace(/-/g, " ").replace(/\s+/g, " ").trim();
}

/** Solo para depuración (ej. `KEYWORDS_FILTRAR_DEBUG=1 npx tsx scripts/backfill-keywords.ts`). */
let _filtrarKeywordsDebugCount = 0;

/**
 * Limpieza suave: dedupe, sin comunas como keyword, sin relleno, máx. 2 palabras y largo acotado.
 * Si no queda nada, usa el slug de subcategoría normalizado (ej. `fugas-de-agua` → `fugas de agua`).
 */
export function filtrarKeywordsPorSubcategoria(
  subcategoriaSlug: string,
  keywords: string[]
): string[] {
  const deduped = deduplicarKeywordsPreservandoOrden(keywords);
  const filtradas = deduped.filter((k) => pasaFiltroSuave(k));
  const conUnigramas = expandirUnigramasDesdeBigramas(filtradas);
  let finales = conUnigramas.filter((k) => pasaFiltroSuave(k));

  if (KEYWORDS_APLICAR_BLACKLIST_RUBRO_CRUZADO) {
    finales = filtrarKeywordsPorBlacklist(
      slugSubcategoriaKey(subcategoriaSlug),
      finales
    );
  }
  finales = filtrarUnigramasAmbiguas(finales);

  let finalesTrasWhitelist = finales;
  if (KEYWORDS_APLICAR_WHITELIST_SUBCATEGORIA) {
    const subKey = slugSubcategoriaKey(subcategoriaSlug);
    const permitidas = KEYWORDS_VALIDAS_POR_SUBCATEGORIA[subKey];
    if (permitidas && permitidas.length > 0) {
      finalesTrasWhitelist = finales.filter((k) =>
        keywordCoincideConPermitidas(normalizarKeyword(k), permitidas)
      );
    }
  }

  let out: string[];
  if (finalesTrasWhitelist.length > 0) {
    out = finalesTrasWhitelist.slice(0, MAX_KEYWORDS_FIN);
  } else {
    const fb = fallbackKeywordDesdeSlugSubcategoria(subcategoriaSlug);
    out = fb ? [fb].slice(0, MAX_KEYWORDS_FIN) : [];
  }

  if (
    process.env.KEYWORDS_FILTRAR_DEBUG === "1" &&
    _filtrarKeywordsDebugCount < 2
  ) {
    _filtrarKeywordsDebugCount++;
    // eslint-disable-next-line no-console
    console.log("[filtrarKeywordsPorSubcategoria]", {
      subcategoriaSlug,
      input: keywords,
      output: out,
    });
  }

  return out;
}
