"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import type { FormData } from "./PublicarClient";
import { MIN_DESCRIPCION_NEGOCIO, KEYWORDS_MAX } from "./PublicarClient";
import { cleanDetectedProducts } from "@/lib/cleanDetectedProducts";

type SetField = <K extends keyof FormData>(key: K, value: FormData[K]) => void;

/** Frases que representan productos/servicios compuestos y deben detectarse primero. */
const PRIORITY_PHRASES = [
  /* OFICIOS */
  "maestro pintor",
  "maestro gasfiter",
  "maestro chasquilla",
  "maestro carpintero",
  "maestro electrico",
  "maestro constructor",
  "maestro albañil",
  "maestro soldador",
  "tecnico refrigeracion",
  "tecnico lavadoras",
  "tecnico secadoras",
  "tecnico calefont",
  "tecnico aire acondicionado",
  "tecnico computadores",
  "reparacion lavadoras",
  "reparacion refrigeradores",
  "reparacion calefont",
  "destape cañerias",
  "instalacion calefont",
  "instalacion aire acondicionado",

  /* CONSTRUCCION */
  "pintura casas",
  "pintura interiores",
  "pintura exteriores",
  "instalacion ceramica",
  "instalacion porcelanato",
  "instalacion piso flotante",
  "instalacion piso vinilico",
  "cierre perimetral",
  "porton electrico",
  "reparacion techos",
  "instalacion canaletas",

  /* COMIDA RAPIDA */
  "completos italianos",
  "carro completos",
  "carro hamburguesas",
  "carro papas fritas",
  "carro sopaipillas",
  "carro churrascos",
  "carro cabritas",
  "carro algodones",
  "carro hot dog",
  "hamburguesas caseras",
  "pizzas artesanales",
  "sandwich chacarero",
  "sandwich churrasco",
  "empanadas caseras",
  "empanadas fritas",
  "papas fritas",
  "papas rusticas",
  "comida rapida",
  "venta completos",
  "venta empanadas",

  /* EVENTOS */
  "juegos inflables",
  "camas elasticas",
  "fiestas infantiles",
  "cumpleaños infantiles",
  "animacion fiestas",
  "animador infantil",
  "pintacaritas",
  "globoflexia",
  "decoracion globos",
  "decoracion cumpleaños",
  "carro cabritas",
  "carro algodones",
  "arriendo mesas",
  "arriendo sillas",
  "arriendo vajilla",
  "arriendo carpas",
  "arriendo inflables",

  /* EDUCACION */
  "clases matematicas",
  "clases ingles",
  "clases particulares",
  "clases lenguaje",
  "clases fisica",
  "clases quimica",
  "reforzamiento escolar",
  "preparacion pruebas",
  "preuniversitario",
  "clases guitarra",
  "clases piano",
  "clases canto",
  "clases baile",

  /* SERVICIOS HOGAR / LIMPIEZA / JARDINERIA */
  "fletes mudanzas",
  "mudanzas",
  "fletes economicos",
  "transporte carga",
  "retiro escombros",
  "retiro basura",
  "limpieza casas",
  "limpieza oficinas",
  "limpieza alfombras",
  "limpieza tapiz",
  "jardineria",
  "mantencion jardines",
  "corte pasto",
  "podas arboles",
  "control plagas",
  "fumigacion",

  /* MASCOTAS */
  "peluqueria canina",
  "peluqueria mascotas",
  "adiestramiento perros",
  "guarderia perros",
  "paseo perros",
  "veterinario domicilio",
  "venta alimentos mascotas",

  /* ALIMENTOS / TIENDAS DE BARRIO */
  "verduleria",
  "carniceria",
  "panaderia",
  "pasteleria",
  "minimarket",
  "botilleria",
  "venta frutas",
  "venta verduras",
  "venta huevos",
  "venta miel",
  "venta frutos secos",

  /* BELLEZA */
  "peluqueria domicilio",
  "barberia domicilio",
  "corte cabello",
  "tintura cabello",
  "alisado brasilero",
  "manicure permanente",
  "pedicure clinica",
  "depilacion laser",
  "depilacion cera",
  "maquillaje profesional",
  "peinados novia",
  "estetica facial",

  /* VEHICULOS */
  "lavado autos",
  "lavado vehiculos",
  "mecanico domicilio",
  "mecanico automotriz",
  "electricidad automotriz",
  "scanner automotriz",
  "vulcanizacion domicilio",
  "vulcanizacion",
  "cambio aceite",
  "alineacion balanceo",
  "lavado motor",
  "detailing automotriz",
  "pulido autos",
];

/** Listas de filtrado para detección de productos/servicios. */
const STOPWORDS = new Set([
  "de", "y", "para", "con", "en", "por", "a", "el", "la", "los", "las", "del", "al"
]);

const COMMERCIAL_VERBS = new Set([
  "vendo", "vendemos", "ofrezco", "ofrecemos",
  "arrienda", "arriendo", "arrendamos",
  "presto", "prestamos", "servicio", "servicios",
  "empresa", "negocio", "local"
]);

/** Palabras demasiado genéricas que no deben quedar como productos detectados. */
const GENERIC_WORDS = new Set([
  "domicilio",
  "casa",
  "hogar",
  "servicio",
  "servicios",
  "trabajo",
  "trabajos",
  "trabajo",
  "trabajos",
  "reparaciones",
  "instalacion",
  "instalación",
  "gas",
  "agua",
]);

function normalizeForNgrams(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extrae productos/servicios del texto combinando:
 * - Frases prioritarias (compuestas) primero.
 * - Luego palabras individuales limpias.
 * Máximo 6 resultados, sin duplicados.
 */
function extractProductNgrams(description: string): string[] {
  const descNorm = normalizeForNgrams(description);
  if (!descNorm) return [];

  const detected = new Set<string>();

  // 1) Detectar frases prioritarias sobre el texto normalizado
  const priorityWordsToSkip = new Set<string>();
  for (const phrase of PRIORITY_PHRASES) {
    const normPhrase = normalizeForNgrams(phrase);
    if (!normPhrase) continue;
    if (descNorm.includes(normPhrase)) {
      detected.add(phrase);
      normPhrase.split(" ").forEach((w) => {
        if (w) priorityWordsToSkip.add(w);
      });
    }
  }

  const tokens = descNorm.split(" ").filter(Boolean);

  // 2) Priorizar frases cercanas (2-3 palabras) antes que palabras sueltas.
  // La idea es mantener expresiones como "cocinas a gas" y evitar separar en "cocinas" y "gas".
  const phraseWordsToSkip = new Set<string>();
  const maxTotal = 6;

  const hasUsefulToken = (phraseTokens: string[]) =>
    phraseTokens.some((t) => !STOPWORDS.has(t) && !COMMERCIAL_VERBS.has(t));

  const hasNonGenericToken = (phraseTokens: string[]) =>
    phraseTokens.some(
      (t) => !STOPWORDS.has(t) && !COMMERCIAL_VERBS.has(t) && !GENERIC_WORDS.has(t)
    );

  for (const len of [3, 2] as const) {
    if (detected.size >= maxTotal) break;
    for (let i = 0; i <= tokens.length - len; i++) {
      if (detected.size >= maxTotal) break;
      const slice = tokens.slice(i, i + len);
      // Evitar construir frases sin señal (solo conectores/stopwords)
      if (!hasUsefulToken(slice)) continue;
      // Requiere al menos un token no genérico dentro de la frase
      if (!hasNonGenericToken(slice)) continue;

      const phrase = slice.join(" ");
      // Evitar duplicar si ya hay una frase prioritaria equivalente
      if (detected.has(phrase)) continue;

      detected.add(phrase);
      // Evitar que tokens de una frase elegida aparezcan además como sueltos
      slice.forEach((t) => {
        if (t) phraseWordsToSkip.add(t);
      });
    }
  }

  // 3) Detector normal de palabras individuales (tokens limpios)
  const cleanTokens = tokens.filter(
    (t) => !STOPWORDS.has(t) && !COMMERCIAL_VERBS.has(t)
  );
  if (cleanTokens.length === 0) return Array.from(detected).slice(0, maxTotal);

  for (const word of cleanTokens) {
    if (priorityWordsToSkip.has(word)) continue;
    if (phraseWordsToSkip.has(word)) continue;
    if (GENERIC_WORDS.has(word)) continue;
    detected.add(word);
  }

  // 4) Máximo 6 resultados totales
  return Array.from(detected).slice(0, maxTotal);
}

type Keyword = { value: string; source: "auto" | "manual" };

function normalizeOneKeyword(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 40);
}

function cleanChipDisplayValue(raw: string): string {
  return raw
    .trim()
    .replace(/^[,]+|[,]+$/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 60);
}

function splitCandidates(raw: string): string[] {
  const s = raw.trim();
  if (!s) return [];
  return s
    .split(",")
    .map((x) => cleanChipDisplayValue(x))
    .filter(Boolean);
}

function normalizeManualKeywordForStorage(raw: string): string {
  return normalizeOneKeyword(raw).slice(0, 30);
}

const BASIC_MANUAL_BLACKLIST = new Set(
  [
    "mejor",
    "barato",
    "barata",
    "económico",
    "economico",
    "excelente",
    "calidad",
  ].map(normalizeManualKeywordForStorage)
);

function isBlacklistedManualKeyword(raw: string): boolean {
  const norm = normalizeManualKeywordForStorage(raw);
  if (!norm) return true;
  return BASIC_MANUAL_BLACKLIST.has(norm);
}

/** Normalización básica para consistencia en el buscador (ej: empanada → empanadas). */
const KEYWORD_NORMALIZE_MAP: Record<string, string> = {
  empanada: "empanadas",
  torta: "tortas",
  pastel: "pasteles",
  dulce: "dulces",
};
function normalizeKeywordForSearch(raw: string): string {
  const base = normalizeOneKeyword(raw);
  if (!base) return base;
  return KEYWORD_NORMALIZE_MAP[base] ?? base;
}

// Palabras genéricas de 1 solo término que no queremos sugerir
const GENERIC_SINGLE_WORDS = new Set([
  "pan",
  "servicio",
  "producto",
  "negocio",
  "local",
  "calidad",
  "venta",
  "vendo",
  "hacemos",
  "ofrecemos",
  "domicilio",
]);

// Palabras irrelevantes para matching por tokens (stopwords de descripción)
const STOP_TOKENS = new Set([
  "vendo",
  "ofrezco",
  "ofrecemos",
  "hacemos",
  "somos",
  "servicio",
  "servicios",
  "producto",
  "productos",
  "negocio",
  "negocios",
  "local",
  "locales",
  "calidad",
  "domicilio",
  "y",
  "e",
  "de",
  "del",
  "la",
  "el",
  "los",
  "las",
  "en",
  "por",
  "para",
  "a",
]);

function normalizeTextForMatch(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function areSimplePluralEquivalents(a: string, b: string): boolean {
  if (a === b) return true;
  const strip = (w: string) =>
    w.endsWith("es") ? w.slice(0, -2) : w.endsWith("s") ? w.slice(0, -1) : w;
  return strip(a) === strip(b);
}

function toSlugFormLocal(s: string): string {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9ñ]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function extractMatchedPriorityPhrases(description: string): string[] {
  const descNorm = normalizeForNgrams(description);
  if (!descNorm) return [];
  const out: string[] = [];
  for (const phrase of PRIORITY_PHRASES) {
    const normPhrase = normalizeForNgrams(phrase);
    if (!normPhrase) continue;
    if (descNorm.includes(normPhrase)) out.push(phrase);
  }
  return out;
}

const SUBCATEGORIA_PRIORITY: Record<string, number> = {
  // Solo desempate. Mayor = más prioridad.
  // Agrega/ajusta según reglas internas cuando lo necesites.
  gasfiter: 100,
  electricista: 90,
  vulcanizacion: 80,
};

async function detectPrimarySubcategoriaFromSignals(params: {
  supabaseClient: typeof supabase;
  phrases: string[];
  manualKeywords: string[];
  autoKeywords: string[];
}): Promise<string | null> {
  const { supabaseClient, phrases, manualKeywords, autoKeywords } = params;

  // Orden de prioridad: frases > manual > automático
  const items: Array<{ keyword: string; source: "phrase" | "manual" | "auto"; weight: number }> = [
    ...phrases.map((k) => ({ keyword: k, source: "phrase" as const, weight: 3 })),
    ...manualKeywords.map((k) => ({ keyword: k, source: "manual" as const, weight: 2 })),
    ...autoKeywords.map((k) => ({ keyword: k, source: "auto" as const, weight: 1 })),
  ];

  const normToBestWeight = new Map<string, number>();
  for (const it of items) {
    const norm = toSlugFormLocal(it.keyword);
    if (!norm) continue;
    const prev = normToBestWeight.get(norm) ?? 0;
    if (it.weight > prev) normToBestWeight.set(norm, it.weight);
  }

  const normalized = Array.from(normToBestWeight.keys()).slice(0, 60);
  if (normalized.length === 0) return null;

  // 1) keyword_to_subcategory_map
  const { data: mapRows, error: mapErr } = await supabaseClient
    .from("keyword_to_subcategory_map")
    .select("subcategoria_id, normalized_keyword, confidence_default")
    .eq("activo", true)
    .in("normalized_keyword", normalized);

  if (mapErr || !mapRows || mapRows.length === 0) return null;

  const subIds = Array.from(
    new Set(mapRows.map((r: any) => String(r.subcategoria_id)).filter(Boolean))
  );
  if (subIds.length === 0) return null;

  // 2) Resolver slug de subcategorías
  const { data: subs, error: subsErr } = await supabaseClient
    .from("subcategorias")
    .select("id,slug")
    .in("id", subIds);
  if (subsErr || !subs || subs.length === 0) return null;

  const idToSlug = new Map<string, string>();
  for (const s of subs as any[]) {
    if (s?.id && s?.slug) idToSlug.set(String(s.id), String(s.slug));
  }

  type Score = {
    slug: string;
    matchPoints: number; // ponderado (frase>manual>auto)
    matches: number; // cantidad de coincidencias únicas
    confidenceSum: number;
  };
  const scores = new Map<string, Score>();
  const usedPerSlug = new Map<string, Set<string>>();

  for (const row of mapRows as any[]) {
    const subId = String(row.subcategoria_id || "");
    const slug = idToSlug.get(subId);
    if (!slug) continue;
    const normKw = String(row.normalized_keyword || "");
    const weight = normToBestWeight.get(normKw) ?? 0;
    if (!weight) continue;

    const conf = Number(row.confidence_default) || 0.85;

    if (!usedPerSlug.has(slug)) usedPerSlug.set(slug, new Set());
    const used = usedPerSlug.get(slug)!;
    if (used.has(normKw)) continue;
    used.add(normKw);

    const existing = scores.get(slug) ?? {
      slug,
      matchPoints: 0,
      matches: 0,
      confidenceSum: 0,
    };
    existing.matchPoints += weight;
    existing.matches += 1;
    existing.confidenceSum += conf;
    scores.set(slug, existing);
  }

  const list = Array.from(scores.values());
  if (list.length === 0) return null;

  // Conflictos: más coincidencias (ponderadas), luego más coincidencias reales,
  // luego prioridad interna, luego "más específica" (slug más largo/más tokens).
  list.sort((a, b) => {
    if (a.matchPoints !== b.matchPoints) return b.matchPoints - a.matchPoints;
    if (a.matches !== b.matches) return b.matches - a.matches;
    const ap = SUBCATEGORIA_PRIORITY[a.slug] ?? 0;
    const bp = SUBCATEGORIA_PRIORITY[b.slug] ?? 0;
    if (ap !== bp) return bp - ap;
    const aTokens = a.slug.split(/[-_]+/g).filter(Boolean).length;
    const bTokens = b.slug.split(/[-_]+/g).filter(Boolean).length;
    if (aTokens !== bTokens) return bTokens - aTokens;
    return b.slug.length - a.slug.length;
  });

  return list[0]!.slug;
}

function pickPrimarySubcategoriaSlug(subcatData: unknown): string | null {
  if (!subcatData) return null;

  const asCandidate = (raw: any) => {
    const slug =
      typeof raw === "string"
        ? raw
        : raw && typeof raw === "object"
          ? (raw.subcategoria_slug ?? raw.slug ?? null)
          : null;
    if (!slug || typeof slug !== "string") return null;

    const scoreRaw =
      raw && typeof raw === "object"
        ? raw.score ?? raw.confidence ?? raw.similarity ?? raw.prob ?? null
        : null;
    const score =
      typeof scoreRaw === "number"
        ? scoreRaw
        : typeof scoreRaw === "string"
          ? Number(scoreRaw)
          : null;

    const normSlug = String(slug).trim();
    const tokenCount = normSlug.split(/[-_\\s/]+/g).filter(Boolean).length;
    const length = normSlug.length;

    return { slug: normSlug, score, tokenCount, length };
  };

  const items: any[] = Array.isArray(subcatData) ? subcatData : [subcatData];
  const candidates = items.map(asCandidate).filter(Boolean) as Array<{
    slug: string;
    score: number | null;
    tokenCount: number;
    length: number;
  }>;
  if (candidates.length === 0) return null;

  // Regla: siempre UNA subcategoría final.
  // Si hay conflicto: priorizar la más específica.
  // Heurística: score (si existe) desc; luego tokenCount desc; luego length desc.
  candidates.sort((a, b) => {
    const aScore = a.score ?? -Infinity;
    const bScore = b.score ?? -Infinity;
    if (aScore !== bScore) return bScore - aScore;
    if (a.tokenCount !== b.tokenCount) return b.tokenCount - a.tokenCount;
    return b.length - a.length;
  });

  return candidates[0]!.slug;
}

type SuggestionResult = {
  suggested: string[];
  related: string[];
};

function getSuggestedKeywordsFromDescription(
  description: string,
  keywordCandidates: string[],
  removedKeywords: string[],
  manualKeywords: string[]
): SuggestionResult {
  const descNorm = normalizeTextForMatch(description);
  if (!descNorm) return { suggested: [], related: [] };

  const tokens = descNorm.split(" ").filter(Boolean);
  const descTokens = new Set(tokens);

  // Construir n-gramas (1 a 3 palabras) que aparecen literalmente en la descripción
  const ngrams = new Set<string>();
  for (let len = 1; len <= 3; len++) {
    for (let i = 0; i <= tokens.length - len; i++) {
      ngrams.add(tokens.slice(i, i + len).join(" "));
    }
  }

  const removedSet = new Set(removedKeywords.map(normalizeOneKeyword));
  const manualSet = new Set(manualKeywords.map(normalizeOneKeyword));

  const primary: string[] = [];
  const related: string[] = [];
  const seenNorm: string[] = [];

  function addIfNew(target: string[], kw: string) {
    const norm = normalizeOneKeyword(kw);
    if (!norm) return;
    if (removedSet.has(norm) || manualSet.has(norm)) return;
    if (
      seenNorm.some((existing) => areSimplePluralEquivalents(existing, norm))
    )
      return;
    seenNorm.push(norm);
    target.push(norm);
  }

  let rubroKeyword: string | null = null;

  for (const raw of keywordCandidates) {
    const norm = normalizeKeywordForSearch(String(raw));
    if (!norm) continue;

    if (!rubroKeyword && !GENERIC_SINGLE_WORDS.has(norm)) {
      rubroKeyword = norm;
    }

    const kwTokens = norm.split(" ").filter(Boolean);
    const isSingle = kwTokens.length === 1;

    // Nunca sugerir si el usuario la eliminó o ya la tiene manualmente
    if (removedSet.has(norm) || manualSet.has(norm)) continue;

    const phraseMatch = ngrams.has(norm);

    // Matching singular/plural simple para una sola palabra
    let tokenMatch = false;
    if (!phraseMatch) {
      for (const t of kwTokens) {
        const tokenNorm = normalizeOneKeyword(t);
        if (!tokenNorm || STOP_TOKENS.has(tokenNorm)) continue;
        for (const dt of descTokens) {
          if (areSimplePluralEquivalents(tokenNorm, dt)) {
            tokenMatch = true;
            break;
          }
        }
        if (tokenMatch) break;
      }
    }

    const matches = phraseMatch || tokenMatch;
    const isGenericSingle = isSingle && GENERIC_SINGLE_WORDS.has(norm);

    if (matches && !isGenericSingle) {
      if (primary.length < 10) addIfNew(primary, norm);
    } else {
      if (related.length < 5) addIfNew(related, norm);
    }
  }

  // Si hay espacio, agregar una única keyword del rubro detectado (por ejemplo "panaderia")
  if (rubroKeyword && primary.length < 10) {
    addIfNew(primary, rubroKeyword);
  }

  return { suggested: primary.slice(0, 10), related: related.slice(0, 5) };
}

export default function PasoDescripcionImagenes({
  form,
  errors,
  setField,
  nextStep,
  prevStep,
}: {
  form: FormData;
  errors: Record<string, string>;
  setField: SetField;
  nextStep: () => void;
  prevStep: () => void;
}) {
  const [suggestingKeywords, setSuggestingKeywords] = useState(false);
  const [autoDetectedProducts, setAutoDetectedProducts] = useState<string[]>([]);
  const [manualProducts, setManualProducts] = useState<string[]>([]);
  const [removedAutoProducts, setRemovedAutoProducts] = useState<string[]>([]);
  const [detectedSubcategoria, setDetectedSubcategoria] = useState<string | null>(null);
  const [learningState, setLearningState] = useState<
    "idle" | "analizando" | "aprendiendo" | "ok"
  >("idle");
  const [manualProductInput, setManualProductInput] = useState("");
  const [manualProductError, setManualProductError] = useState<string>("");
  const removedAutoRef = useRef<string[]>([]);
  const setFieldRef = useRef(setField);
  const manualProductsRef = useRef<string[]>(manualProducts);
  const suggestTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSuggestedForRef = useRef<string>("");
  /** Último texto enviado a registrar_texto_aprendizaje en esta sesión (evita duplicados). */
  const lastRegisteredTextRef = useRef<string>("");

  useEffect(() => {
    setFieldRef.current = setField;
  }, [setField]);

  useEffect(() => {
    removedAutoRef.current = removedAutoProducts;
  }, [removedAutoProducts]);

  useEffect(() => {
    manualProductsRef.current = manualProducts;
  }, [manualProducts]);

  const combinedProducts = useMemo(() => {
    const removedSet = new Set(removedAutoProducts.map(normalizeOneKeyword));
    const auto = autoDetectedProducts.filter(
      (p) => !removedSet.has(normalizeOneKeyword(p))
    );
    const merged = cleanDetectedProducts([
      ...auto.map(normalizeManualKeywordForStorage),
      ...manualProducts.map(normalizeManualKeywordForStorage),
    ]);
    return merged.slice(0, 10);
  }, [autoDetectedProducts, manualProducts, removedAutoProducts]);

  useEffect(() => {
    const current = Array.isArray(form.productosDetectados)
      ? cleanDetectedProducts(form.productosDetectados)
      : [];
    const next = combinedProducts;
    const same =
      current.length === next.length &&
      current.every((v, i) => normalizeOneKeyword(v) === normalizeOneKeyword(next[i] || ""));
    if (same) return;
    setFieldRef.current("productosDetectados", next);
  }, [combinedProducts, form.productosDetectados]);

  const suggestKeywords = useCallback(
    async (descripcion: string, nombre: string) => {
      const desc = descripcion.trim();
      const nom = nombre.trim();
      if (desc.length < MIN_DESCRIPCION_NEGOCIO) return;

      const key = `${desc}\n${nom}`;
      if (lastSuggestedForRef.current === key) return;
      lastSuggestedForRef.current = key;

      setSuggestingKeywords(true);
      try {
        const texto = nom ? `${nom}. ${desc}` : desc;

        // 1) Productos/servicios detectados solo desde la descripción (prioridad palabras sueltas)
        const productNgrams = extractProductNgrams(desc);
        setAutoDetectedProducts(productNgrams);

        // 2) Subcategoría principal (UNA) basada en señales:
        // frases prioritarias > keywords manuales > keywords automáticas
        const phraseMatches = extractMatchedPriorityPhrases(desc);
        const manualNow = manualProductsRef.current || [];
        const localSlug = await detectPrimarySubcategoriaFromSignals({
          supabaseClient: supabase,
          phrases: phraseMatches,
          manualKeywords: manualNow,
          autoKeywords: productNgrams,
        });

        if (localSlug) {
          setDetectedSubcategoria(localSlug);
        } else {
          // Fallback: RPC existente (mantener compatibilidad)
          const { data: subcatData, error: subcatError } = await supabase.rpc(
            "detectar_subcategoria",
            { texto_input: texto }
          );
          const subcategoriaSlug = !subcatError && subcatData
            ? pickPrimarySubcategoriaSlug(subcatData)
            : null;
          setDetectedSubcategoria(subcategoriaSlug);
        }
      } catch {
        // ignore
      } finally {
        setSuggestingKeywords(false);
      }
    },
    [setField]
  );

  const suggestKeywordsRef = useRef(suggestKeywords);
  suggestKeywordsRef.current = suggestKeywords;

  useEffect(() => {
    if (suggestTimeoutRef.current) clearTimeout(suggestTimeoutRef.current);
    const desc = form.descripcionNegocio.trim();
    const delay = 500;

    if (desc.length < MIN_DESCRIPCION_NEGOCIO) {
      setAutoDetectedProducts([]);
      setDetectedSubcategoria(null);
      suggestTimeoutRef.current = setTimeout(() => {
        lastSuggestedForRef.current = "";
      }, delay);
      return () => {
        if (suggestTimeoutRef.current) clearTimeout(suggestTimeoutRef.current);
      };
    }

    suggestTimeoutRef.current = setTimeout(() => {
      suggestKeywordsRef.current(desc, form.nombre);
    }, delay);
    return () => {
      if (suggestTimeoutRef.current) clearTimeout(suggestTimeoutRef.current);
    };
  }, [form.descripcionNegocio, form.nombre]);

  // Registrar texto en textos_aprendizaje (RPC existente): debounce 1200 ms, mínimo 20 chars, sin duplicados en sesión.
  useEffect(() => {
    const desc = form.descripcionNegocio.trim();
    if (desc.length < 20) {
      setLearningState("idle");
      return;
    }
    if (desc === lastRegisteredTextRef.current) {
      setLearningState("idle");
      return;
    }

    setLearningState("analizando");

    const timer = setTimeout(() => {
      setLearningState("aprendiendo");
      lastRegisteredTextRef.current = desc;
      supabase
        .rpc("registrar_texto_aprendizaje", {
          p_texto: desc,
          p_fuente: "formulario_publicar",
        })
        .then(({ error }) => {
          if (error) {
            lastRegisteredTextRef.current = "";
            setLearningState("idle");
          } else {
            setLearningState("ok");
            setTimeout(() => setLearningState("idle"), 2000);
          }
        })
        .catch(() => {
          lastRegisteredTextRef.current = "";
          setLearningState("idle");
        });
    }, 1200);

    return () => clearTimeout(timer);
  }, [form.descripcionNegocio]);

  function removeProductChip(value: string) {
    const norm = normalizeOneKeyword(value);
    if (!norm) return;

    const manualSet = new Set(manualProducts.map(normalizeOneKeyword));
    if (manualSet.has(norm)) {
      setManualProducts((prev) =>
        prev.filter((p) => normalizeOneKeyword(p) !== norm)
      );
      return;
    }

    const autoSet = new Set(autoDetectedProducts.map(normalizeOneKeyword));
    if (autoSet.has(norm)) {
      setRemovedAutoProducts((prev) => {
        const next = [...prev, value];
        const cleaned = cleanDetectedProducts(next).slice(0, 50);
        return cleaned;
      });
    }
  }

  function tryAddManualProducts(raw: string) {
    const candidates = splitCandidates(raw);
    if (candidates.length === 0) {
      setManualProductError("Esta palabra no es válida");
      return;
    }

    setManualProducts((prev) => {
      const currentKeys = new Set(prev.map(normalizeManualKeywordForStorage));

      const next = [...prev];
      let added = 0;
      for (const c of candidates) {
        const display = cleanChipDisplayValue(c);
        const trimmed = display.trim();
        if (trimmed.length < 2 || trimmed.length > 30) continue;
        if (isBlacklistedManualKeyword(trimmed)) continue;

        const storageKey = normalizeManualKeywordForStorage(trimmed);
        if (!storageKey) continue;
        if (currentKeys.has(storageKey)) continue;
        if (next.length >= 10) break;

        currentKeys.add(storageKey);
        next.push(trimmed);
        added += 1;
      }

      if (added === 0) {
        setManualProductError("Esta palabra no es válida");
      } else {
        setManualProductError("");
      }

      return next.slice(0, 10);
    });

    setManualProductInput("");
  }

  return (
    <div style={cardStyle}>
      <h2 style={sectionTitle}>Descripción e imágenes</h2>

      <div style={infoBoxStyle}>
        Cuéntanos qué hace tu emprendimiento. Con eso clasificamos tu negocio automáticamente; no necesitas elegir categorías.
      </div>

      <div style={{ marginBottom: 22 }}>
        <label style={labelStyle}>Describe tu producto o servicio *</label>
        <textarea
          value={form.descripcionNegocio}
          onChange={(e) => setField("descripcionNegocio", e.target.value)}
          placeholder="Ej: Hago pan amasado y empanadas caseras en Padre Hurtado. También vendo pasteles por encargo y atiendo eventos."
          style={{ ...textareaStyle, minHeight: 140 }}
        />
        <div style={helperStyle}>
          Describe qué vendes o qué servicio prestas. Evita frases como «somos los mejores» o «líderes en el mercado». Ejemplo: «Vendo empanadas, pan amasado y dulces caseros con retiro en Maipú».
        </div>
        <div style={form.descripcionNegocio.length < MIN_DESCRIPCION_NEGOCIO ? counterStyleShort : counterStyle}>
          {form.descripcionNegocio.length}/{MIN_DESCRIPCION_NEGOCIO} caracteres mínimo
        </div>
        {form.descripcionNegocio.length < MIN_DESCRIPCION_NEGOCIO && (
          <p style={shortDescMessageStyle}>
            Te faltan {MIN_DESCRIPCION_NEGOCIO - form.descripcionNegocio.length} caracteres para completar la descripción.
          </p>
        )}

        {errors.descripcionNegocio ? (
          <p style={errorStyle}>{errors.descripcionNegocio}</p>
        ) : null}

        {learningState === "analizando" && (
          <p className="text-xs text-slate-500 mt-1">
            Analizando descripción...
          </p>
        )}
        {learningState === "aprendiendo" && (
          <p className="text-xs text-blue-600 mt-1">
            Aprendiendo de tu descripción...
          </p>
        )}
        {learningState === "ok" && (
          <p className="text-xs text-green-600 mt-1">
            ✔ descripción registrada
          </p>
        )}
      </div>

      <div style={{ marginBottom: 22 }}>
        <label className="block text-sm font-medium">
          ¿Qué palabras usaría un cliente para encontrarte?
        </label>
        <div style={helperStyle}>Agrega hasta 10 palabras o frases cortas</div>
        <input
          type="text"
          value={manualProductInput}
          onChange={(e) => setManualProductInput(e.target.value)}
          placeholder="Ej: gasfiter, destape cañerías, calefont, fugas de agua"
          className="w-full border rounded p-2 mt-2"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              tryAddManualProducts(manualProductInput);
            }
          }}
          onBlur={() => {
            if (manualProductInput.trim()) tryAddManualProducts(manualProductInput);
          }}
        />
        {manualProducts.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {manualProducts.map((p, i) => (
              <span
                key={`${p}-${i}`}
                className="bg-gray-200 px-3 py-1 rounded-full text-sm flex items-center"
              >
                {p}
                <button
                  type="button"
                  aria-label={`Quitar ${p}`}
                  className="ml-2 text-red-500 hover:text-red-700"
                  onClick={() => removeProductChip(p)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        {manualProductError ? (
          <div style={errorStyle}>{manualProductError}</div>
        ) : null}
        <div style={helperStyle}>
          No pongas frases como "el mejor" o "barato". Enfócate en lo que haces.
        </div>
      </div>

      <div style={grid2}>
        <div style={sectionBoxStyle}>
          <label style={labelStyle}>Foto principal *</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) =>
              setField("fotoPrincipal", e.target.files?.[0] || null)
            }
            style={fileInputStyle}
          />

          <div style={helperStyle}>
            Esta será la imagen principal de tu ficha y de las tarjetas de
            búsqueda.
          </div>

          {form.fotoPrincipal ? (
            <div style={helperBlueStyle}>
              Archivo seleccionado: {form.fotoPrincipal.name}
            </div>
          ) : null}

          {errors.fotoPrincipal ? (
            <p style={errorStyle}>{errors.fotoPrincipal}</p>
          ) : null}
        </div>

        <div style={sectionBoxStyle}>
          <label style={labelStyle}>Galería de fotos</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) =>
              setField("galeria", Array.from(e.target.files || []))
            }
            style={fileInputStyle}
          />

          <div style={helperStyle}>
            Puedes subir hasta 6 imágenes adicionales para mostrar mejor tu
            trabajo, productos o local.
          </div>

          <div style={helperStyle}>
            Máximo recomendado: fotos claras, bien iluminadas y representativas
            de tu emprendimiento.
          </div>

          {form.galeria.length > 0 ? (
            <div style={helperBlueStyle}>
              Imágenes seleccionadas: {form.galeria.length} de 6
            </div>
          ) : null}

          {errors.galeria ? (
            <p style={errorStyle}>{errors.galeria}</p>
          ) : null}
        </div>
      </div>

      <div style={footerStyle}>
        <button type="button" onClick={prevStep} style={secondaryButtonStyle}>
          Volver
        </button>

        <button type="button" onClick={nextStep} style={primaryButtonStyle}>
          Continuar
        </button>
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 26,
  padding: 28,
};

const sectionTitle: React.CSSProperties = {
  margin: "0 0 18px",
  fontSize: 28,
  fontWeight: 900,
  lineHeight: 1.05,
  letterSpacing: "-0.02em",
  color: "#111827",
};

const infoBoxStyle: React.CSSProperties = {
  marginBottom: 18,
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  color: "#1e3a8a",
  borderRadius: 14,
  padding: 14,
  fontSize: 14,
  lineHeight: 1.55,
};

const grid2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0,1fr))",
  gap: 18,
};

const sectionBoxStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  padding: 18,
  background: "#fff",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 900,
  marginBottom: 6,
  color: "#111827",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 12,
  border: "1px solid #d1d5db",
  padding: "12px 14px",
  fontSize: 15,
  color: "#111827",
  background: "#fff",
  resize: "vertical",
};

const fileInputStyle: React.CSSProperties = {
  width: "100%",
  height: 48,
  borderRadius: 12,
  border: "1px solid #d1d5db",
  padding: "10px 14px",
  fontSize: 14,
  color: "#111827",
  background: "#fff",
};

const helperStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#6b7280",
  marginTop: 6,
  lineHeight: 1.5,
};

const counterStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#374151",
  fontWeight: 800,
  marginTop: 8,
};

const counterStyleShort: React.CSSProperties = {
  ...counterStyle,
  color: "#b91c1c",
};

const shortDescMessageStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#b91c1c",
  fontWeight: 700,
  marginTop: 6,
  lineHeight: 1.4,
};

const helperBlueStyle: React.CSSProperties = {
  marginTop: 8,
  fontSize: 13,
  fontWeight: 700,
  color: "#2563eb",
};

const suggestingIndicatorRowStyle: React.CSSProperties = {
  height: 24,
  marginTop: 4,
  display: "flex",
  alignItems: "center",
};

const spinnerStyle: React.CSSProperties = {
  display: "inline-block",
  width: 16,
  height: 16,
  border: "2px solid #e5e7eb",
  borderTopColor: "#2563eb",
  borderRadius: "50%",
  animation: "rey-keywords-spin 0.7s linear infinite",
};

const errorStyle: React.CSSProperties = {
  margin: "6px 0 0",
  fontSize: 13,
  color: "#b91c1c",
  fontWeight: 700,
};

const footerStyle: React.CSSProperties = {
  marginTop: 28,
  paddingTop: 20,
  borderTop: "1px solid #e5e7eb",
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
};

const primaryButtonStyle: React.CSSProperties = {
  minHeight: 46,
  padding: "0 18px",
  borderRadius: 12,
  border: "none",
  background: "#111827",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  minHeight: 46,
  padding: "0 18px",
  borderRadius: 12,
  border: "1px solid #d1d5db",
  background: "#fff",
  color: "#111827",
  fontWeight: 800,
  cursor: "pointer",
};

const chipsContainerStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  alignItems: "center",
  minHeight: 48,
  padding: "8px 14px",
  borderRadius: 12,
  border: "1px solid #d1d5db",
  background: "#fff",
};

const chipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 10px",
  borderRadius: 10,
  background: "#f3f4f6",
  color: "#111827",
  fontSize: 14,
  fontWeight: 600,
};

const chipRemoveStyle: React.CSSProperties = {
  padding: 0,
  margin: 0,
  border: "none",
  background: "transparent",
  color: "#6b7280",
  fontSize: 18,
  lineHeight: 1,
  cursor: "pointer",
  fontWeight: 700,
};

const chipInputStyle: React.CSSProperties = {
  flex: "1 1 120px",
  minWidth: 120,
  border: "none",
  outline: "none",
  fontSize: 15,
  color: "#111827",
  background: "transparent",
};
