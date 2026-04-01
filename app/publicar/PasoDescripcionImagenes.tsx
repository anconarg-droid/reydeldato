"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { FormData } from "./PublicarClient";
import { MIN_DESCRIPCION_NEGOCIO } from "./PublicarClient";
import { cleanDetectedProducts } from "@/lib/cleanDetectedProducts";

type SetField = <K extends keyof FormData>(key: K, value: FormData[K]) => void;

const PRIORITY_PHRASES = [
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
  "arriendo mesas",
  "arriendo sillas",
  "arriendo vajilla",
  "arriendo carpas",
  "arriendo inflables",
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
  "peluqueria canina",
  "peluqueria mascotas",
  "adiestramiento perros",
  "guarderia perros",
  "paseo perros",
  "veterinario domicilio",
  "venta alimentos mascotas",
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

const STOPWORDS = new Set([
  "de",
  "y",
  "para",
  "con",
  "en",
  "por",
  "a",
  "el",
  "la",
  "los",
  "las",
  "del",
  "al",
]);

const COMMERCIAL_VERBS = new Set([
  "vendo",
  "vendemos",
  "ofrezco",
  "ofrecemos",
  "arrienda",
  "arriendo",
  "arrendamos",
  "presto",
  "prestamos",
  "servicio",
  "servicios",
  "empresa",
  "negocio",
  "local",
]);

const GENERIC_WORDS = new Set([
  "domicilio",
  "casa",
  "hogar",
  "servicio",
  "servicios",
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

function extractProductNgrams(description: string): string[] {
  const descNorm = normalizeForNgrams(description);
  if (!descNorm) return [];

  const detected = new Set<string>();
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
  const phraseWordsToSkip = new Set<string>();
  const maxTotal = 6;

  const hasUsefulToken = (phraseTokens: string[]) =>
    phraseTokens.some((t) => !STOPWORDS.has(t) && !COMMERCIAL_VERBS.has(t));

  const hasNonGenericToken = (phraseTokens: string[]) =>
    phraseTokens.some(
      (t) =>
        !STOPWORDS.has(t) &&
        !COMMERCIAL_VERBS.has(t) &&
        !GENERIC_WORDS.has(t)
    );

  for (const len of [3, 2] as const) {
    if (detected.size >= maxTotal) break;
    for (let i = 0; i <= tokens.length - len; i++) {
      if (detected.size >= maxTotal) break;
      const slice = tokens.slice(i, i + len);
      if (!hasUsefulToken(slice)) continue;
      if (!hasNonGenericToken(slice)) continue;

      const phrase = slice.join(" ");
      if (detected.has(phrase)) continue;

      detected.add(phrase);
      slice.forEach((t) => {
        if (t) phraseWordsToSkip.add(t);
      });
    }
  }

  const cleanTokens = tokens.filter(
    (t) => !STOPWORDS.has(t) && !COMMERCIAL_VERBS.has(t)
  );

  for (const word of cleanTokens) {
    if (priorityWordsToSkip.has(word)) continue;
    if (phraseWordsToSkip.has(word)) continue;
    if (GENERIC_WORDS.has(word)) continue;
    detected.add(word);
  }

  return Array.from(detected).slice(0, maxTotal);
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
  gasfiter: 100,
  electricista: 90,
  vulcanizacion: 80,
};

async function detectPrimarySubcategoriaFromSignals(params: {
  supabaseClient: typeof supabase;
  phrases: string[];
  autoKeywords: string[];
  userKeywords: string[];
}): Promise<string | null> {
  const { supabaseClient, phrases, autoKeywords, userKeywords } = params;

  const items: Array<{ keyword: string; weight: number }> = [
    ...phrases.map((k) => ({ keyword: k, weight: 3 })),
    ...autoKeywords.map((k) => ({ keyword: k, weight: 1 })),
    ...userKeywords.map((k) => ({ keyword: k, weight: 2 })),
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
    matchPoints: number;
    matches: number;
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
  const [autoDetectedProducts, setAutoDetectedProducts] = useState<string[]>(
    []
  );
  const [detectedSubcategoria, setDetectedSubcategoria] = useState<
    string | null
  >(null);
  const [learningState, setLearningState] = useState<
    "idle" | "analizando" | "aprendiendo" | "ok"
  >("idle");

  const setFieldRef = useRef(setField);
  const suggestTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSuggestedForRef = useRef<string>("");
  const lastRegisteredTextRef = useRef<string>("");

  useEffect(() => {
    setFieldRef.current = setField;
  }, [setField]);

  const combinedProducts = useMemo(() => {
    return cleanDetectedProducts(autoDetectedProducts).slice(0, 10);
  }, [autoDetectedProducts]);

  useEffect(() => {
    const current = Array.isArray(form.productosDetectados)
      ? cleanDetectedProducts(form.productosDetectados)
      : [];
    const next = combinedProducts;

    const same =
      current.length === next.length && current.every((v, i) => v === next[i]);

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

      try {
        const texto = nom ? `${nom}. ${desc}` : desc;

        const productNgrams = extractProductNgrams(desc);
        setAutoDetectedProducts(productNgrams);

        const phraseMatches = extractMatchedPriorityPhrases(desc);

        const localSlug = await detectPrimarySubcategoriaFromSignals({
          supabaseClient: supabase,
          phrases: phraseMatches,
          autoKeywords: productNgrams,
          userKeywords: (form.keywordsUsuario || "")
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean),
        });

        if (localSlug) {
          setDetectedSubcategoria(localSlug);
        } else {
          const { data: subcatData, error: subcatError } = await supabase.rpc(
            "detectar_subcategoria",
            { texto_input: texto }
          );

          if (!subcatError && subcatData) {
            if (Array.isArray(subcatData) && subcatData.length > 0) {
              const first = subcatData[0];
              const slug =
                typeof first === "string"
                  ? first
                  : typeof first === "object" && first
                    ? String(first.subcategoria_slug ?? first.slug ?? "")
                    : "";
              setDetectedSubcategoria(slug || null);
            } else {
              setDetectedSubcategoria(null);
            }
          } else {
            setDetectedSubcategoria(null);
          }
        }
      } catch {
        // ignore
      }
    },
    []
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
        if (suggestTimeoutRef.current)
          clearTimeout(suggestTimeoutRef.current);
      };
    }

    suggestTimeoutRef.current = setTimeout(() => {
      suggestKeywordsRef.current(desc, form.nombre);
    }, delay);

    return () => {
      if (suggestTimeoutRef.current) clearTimeout(suggestTimeoutRef.current);
    };
  }, [form.descripcionNegocio, form.nombre]);

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

      void (async () => {
        try {
          const { error } = await supabase.rpc("registrar_texto_aprendizaje", {
            p_texto: desc,
            p_fuente: "formulario_publicar",
          });
          if (error) {
            lastRegisteredTextRef.current = "";
            setLearningState("idle");
          } else {
            setLearningState("ok");
            setTimeout(() => setLearningState("idle"), 2000);
          }
        } catch {
          lastRegisteredTextRef.current = "";
          setLearningState("idle");
        }
      })();
    }, 1200);

    return () => clearTimeout(timer);
  }, [form.descripcionNegocio]);

  const descripcionActual = form.descripcionNegocio.trim();
  const descripcionValida =
    descripcionActual.length >= MIN_DESCRIPCION_NEGOCIO;
  const fotoPrincipalValida = !!form.fotoPrincipal;
  const puedeContinuar = descripcionValida && fotoPrincipalValida;

  const faltantes: string[] = [];
  if (!descripcionValida) {
    faltantes.push(
      `Completar descripción (${
        MIN_DESCRIPCION_NEGOCIO - descripcionActual.length
      } caracteres faltantes)`
    );
  }
  if (!fotoPrincipalValida) {
    faltantes.push("Agregar foto principal");
  }

  return (
    <div style={cardStyle}>
      <h2 style={sectionTitle}>Descripción e imágenes</h2>

      <div style={infoBoxStyle}>
        Cuéntanos qué hace tu emprendimiento. Con eso clasificamos tu negocio
        automáticamente. No necesitas elegir categorías ni agregar palabras
        clave manualmente.
      </div>

      <div style={puedeContinuar ? checklistOkBoxStyle : checklistWarnBoxStyle}>
        <div style={checklistTitleStyle}>
          {puedeContinuar
            ? "Ya puedes continuar"
            : "Antes de continuar te falta:"}
        </div>

        {puedeContinuar ? (
          <div style={checklistTextStyle}>
            La descripción mínima y la foto principal ya están listas.
          </div>
        ) : (
          <ul style={checklistListStyle}>
            {faltantes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </div>

      <div style={{ marginBottom: 22 }}>
        <label style={labelStyle}>Descripción corta *</label>
        <textarea
          value={form.descripcionNegocio}
          onChange={(e) => setField("descripcionNegocio", e.target.value)}
          placeholder="Ej: Hago pan amasado y empanadas caseras en Padre Hurtado. También vendo pasteles por encargo y atiendo eventos."
          style={{
            ...textareaStyle,
            minHeight: 140,
            border: errors.descripcionNegocio
              ? "2px solid #ef4444"
              : "1px solid #d1d5db",
          }}
        />

        <div style={helperStyle}>
          Incluye qué vendes o qué servicio prestas, productos/servicios concretos y la comuna donde atiendes.
          Ejemplo: “Vendo empanadas, pan amasado y dulces caseros con retiro en Maipú”.
        </div>

        <div
          style={
            form.descripcionNegocio.length < MIN_DESCRIPCION_NEGOCIO
              ? counterStyleShort
              : counterStyle
          }
        >
          {form.descripcionNegocio.length}/{MIN_DESCRIPCION_NEGOCIO} caracteres
          mínimo
        </div>

        {form.descripcionNegocio.length < MIN_DESCRIPCION_NEGOCIO && (
          <p style={shortDescMessageStyle}>
            Te faltan{" "}
            {MIN_DESCRIPCION_NEGOCIO - form.descripcionNegocio.length}{" "}
            caracteres para completar la descripción.
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

        {combinedProducts.length > 0 && (
          <div style={detectedBoxStyle}>
            <div style={detectedTitleStyle}>
              Detectamos estos productos o servicios
            </div>
            <div style={chipsRowStyle}>
              {combinedProducts.map((p, i) => (
                <span key={`${p}-${i}`} style={chipStyle}>
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ marginBottom: 22 }}>
        <label style={labelStyle}>
          Palabras que ayuden a encontrar tu negocio (opcional)
        </label>
        <input
          type="text"
          value={form.keywordsUsuario}
          onChange={(e) => setField("keywordsUsuario", e.target.value)}
          placeholder="Ej: pan amasado, empanadas, kuchen"
          style={inputStyle}
        />
        <div style={helperStyle}>
          No se muestran públicamente. Úsalas para ayudar a la clasificación y la búsqueda.
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
            style={{
              ...fileInputStyle,
              border: errors.fotoPrincipal
                ? "2px solid #ef4444"
                : "1px solid #d1d5db",
            }}
          />

          <div style={helperStyle}>
            Esta será la imagen principal de tu ficha y de las tarjetas de
            búsqueda.
          </div>

          {form.fotoPrincipal ? (
            <div style={helperSuccessStyle}>
              ✓ Foto principal cargada: {form.fotoPrincipal.name}
            </div>
          ) : (
            <div style={helperWarnStyle}>
              Debes subir una foto principal para continuar.
            </div>
          )}

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

          {form.galeria.length > 0 ? (
            <div style={helperBlueStyle}>
              Imágenes seleccionadas: {form.galeria.length} de 6
            </div>
          ) : null}

          {errors.galeria ? <p style={errorStyle}>{errors.galeria}</p> : null}
        </div>
      </div>

      {detectedSubcategoria && (
        <div style={suggestionBoxStyle}>
          <strong>Clasificación sugerida:</strong> {detectedSubcategoria}
        </div>
      )}

      <div style={footerStyle}>
        <button type="button" onClick={prevStep} style={secondaryButtonStyle}>
          Volver
        </button>

        <button
          type="button"
          onClick={nextStep}
          disabled={!puedeContinuar}
          style={{
            ...primaryButtonStyle,
            opacity: puedeContinuar ? 1 : 0.55,
            cursor: puedeContinuar ? "pointer" : "not-allowed",
          }}
        >
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

const checklistWarnBoxStyle: React.CSSProperties = {
  marginBottom: 18,
  background: "#fff7ed",
  border: "1px solid #fdba74",
  color: "#9a3412",
  borderRadius: 14,
  padding: 14,
};

const checklistOkBoxStyle: React.CSSProperties = {
  marginBottom: 18,
  background: "#ecfdf5",
  border: "1px solid #86efac",
  color: "#166534",
  borderRadius: 14,
  padding: 14,
};

const checklistTitleStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 900,
  marginBottom: 8,
};

const checklistTextStyle: React.CSSProperties = {
  fontSize: 13,
  lineHeight: 1.5,
};

const checklistListStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: 18,
  fontSize: 13,
  lineHeight: 1.6,
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

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 12,
  border: "1px solid #d1d5db",
  padding: "12px 14px",
  fontSize: 15,
  color: "#111827",
  background: "#fff",
  boxSizing: "border-box",
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

const helperSuccessStyle: React.CSSProperties = {
  marginTop: 8,
  fontSize: 13,
  fontWeight: 700,
  color: "#15803d",
};

const helperWarnStyle: React.CSSProperties = {
  marginTop: 8,
  fontSize: 13,
  fontWeight: 700,
  color: "#b45309",
};

const errorStyle: React.CSSProperties = {
  margin: "6px 0 0",
  fontSize: 13,
  color: "#b91c1c",
  fontWeight: 700,
};

const detectedBoxStyle: React.CSSProperties = {
  marginTop: 14,
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  background: "#f8fafc",
  padding: 14,
};

const detectedTitleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 900,
  color: "#111827",
  marginBottom: 10,
};

const chipsRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
};

const chipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  borderRadius: 9999,
  background: "#e2e8f0",
  color: "#0f172a",
  fontSize: 13,
  fontWeight: 700,
};

const suggestionBoxStyle: React.CSSProperties = {
  marginTop: 16,
  borderRadius: 12,
  border: "1px solid #bfdbfe",
  background: "#eff6ff",
  color: "#1e3a8a",
  padding: "10px 12px",
  fontSize: 13,
  lineHeight: 1.5,
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



