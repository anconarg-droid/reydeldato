"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { FormData } from "./PublicarClient";
import { MIN_DESCRIPCION_NEGOCIO, KEYWORDS_MIN, KEYWORDS_MAX } from "./PublicarClient";

type SetField = <K extends keyof FormData>(key: K, value: FormData[K]) => void;

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
  const [keywordInput, setKeywordInput] = useState("");
  const [suggestingKeywords, setSuggestingKeywords] = useState(false);
  const [autoDismissedKeywords, setAutoDismissedKeywords] = useState<string[]>([]);
  const [relatedSuggestions, setRelatedSuggestions] = useState<string[]>([]);
  const [detectedProducts, setDetectedProducts] = useState<string[]>(
    form.productosDetectados || []
  );
  const [detectedSubcategoria, setDetectedSubcategoria] = useState<string | null>(null);
  const [learningState, setLearningState] = useState<
    "idle" | "analizando" | "aprendiendo" | "ok"
  >("idle");
  const autoDismissedRef = useRef<string[]>([]);
  const keywordItemsRef = useRef(form.keywordItems);
  const suggestTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSuggestedForRef = useRef<string>("");
  /** Último texto enviado a registrar_texto_aprendizaje en esta sesión (evita duplicados). */
  const lastRegisteredTextRef = useRef<string>("");

  useEffect(() => {
    keywordItemsRef.current = form.keywordItems;
  }, [form.keywordItems]);

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

        // 1) Productos/servicios detectados (RPC, sin lógica local)
        const { data: productosData, error: productosError } = await supabase.rpc(
          "detectar_productos_servicios",
          { texto_input: texto }
        );

        if (!productosError && Array.isArray(productosData)) {
          const cleanProductos = (productosData as string[])
            .map((p) => normalizeOneKeyword(String(p)))
            .filter(Boolean)
            .slice(0, 8);
          setDetectedProducts(cleanProductos);
          setField("productosDetectados", cleanProductos);
        }

        // 2) Subcategoría detectada (RPC dedicada)
        const { data: subcatData, error: subcatError } = await supabase.rpc(
          "detectar_subcategoria",
          { texto_input: texto }
        );

        let subcategoriaId: string | null = null;
        let subcategoriaSlug: string | null = null;

        if (!subcatError && subcatData) {
          const raw =
            Array.isArray(subcatData) && subcatData.length > 0
              ? subcatData[0]
              : subcatData;

          if (raw && typeof raw === "object") {
            subcategoriaId = (raw as any).subcategoria_id ?? null;
            subcategoriaSlug = (raw as any).subcategoria_slug ?? null;
          } else if (typeof raw === "string") {
            subcategoriaSlug = raw;
          }
        }

        setDetectedSubcategoria(subcategoriaSlug);

        // 3) Obtener keywords asociadas a la subcategoría (máximo 10) solo si hay subcategoría_id
        if (!subcategoriaId) {
          setSuggestingKeywords(false);
          return;
        }

        const { data: kwRows, error: kwError } = await supabase
          .from("keywords_rubro")
          .select("keywords")
          .eq("subcategoria_id", subcategoriaId)
          .eq("activo", true)
          .limit(1)
          .maybeSingle();

        if (kwError || !kwRows || !Array.isArray(kwRows.keywords)) {
          setSuggestingKeywords(false);
          return;
        }

        const candidates = kwRows.keywords.map((k: string) => String(k));

        const manualItems = keywordItemsRef.current.filter((k) => k.source === "manual");
        const manualValues = manualItems.map((k) => k.value);

        const { suggested, related } = getSuggestedKeywordsFromDescription(
          texto,
          candidates,
          autoDismissedRef.current,
          manualValues
        );

        setRelatedSuggestions(related);

        if (suggested.length > 0) {
          const existingAllSet = new Set(
            keywordItemsRef.current.map((k) => k.value.toLowerCase())
          );

          const newAutos = suggested
            .filter((v) => !existingAllSet.has(v))
            .slice(0, Math.max(0, KEYWORDS_MAX - manualItems.length))
            .map((value) => ({ value, source: "auto" as const }));

          const merged = [...manualItems, ...newAutos];
          const currentAuto = keywordItemsRef.current
            .filter((k) => k.source === "auto")
            .map((k) => k.value);
          const newAutoValues = newAutos.map((a) => a.value);
          const sameAutos =
            currentAuto.length === newAutoValues.length &&
            currentAuto.every(
              (v, i) => v.toLowerCase() === newAutoValues[i]?.toLowerCase()
            );
          if (!sameAutos) {
            setField("keywordItems", merged);
          }
        } else {
          setField("keywordItems", manualItems);
        }
      } catch {
        // Silently ignore; user can type keywords manually
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
      autoDismissedRef.current = [];
      setAutoDismissedKeywords([]);
      setRelatedSuggestions([]);
      setDetectedProducts([]);
      setField("productosDetectados", []);
      suggestTimeoutRef.current = setTimeout(() => {
        const current = keywordItemsRef.current;
        const manualOnly = current.filter((k) => k.source === "manual");
        if (manualOnly.length !== current.length) {
          setField("keywordItems", manualOnly);
        }
        lastSuggestedForRef.current = "";
      }, delay);
      return () => {
        if (suggestTimeoutRef.current) clearTimeout(suggestTimeoutRef.current);
      };
    }

    autoDismissedRef.current = [];
    setAutoDismissedKeywords([]);
    setRelatedSuggestions([]);
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

  function removeDetectedProduct(value: string) {
    const norm = normalizeKeywordForSearch(value);
    if (!norm) return;
    const next = detectedProducts.filter((p) => p !== norm);
    setDetectedProducts(next);
    setField("productosDetectados", next);
  }

  function removeKeyword(index: number) {
    const item = form.keywordItems[index];
    if (item?.source === "auto") {
      const norm = normalizeKeywordForSearch(item.value);
      if (norm) {
        setAutoDismissedKeywords((prev) => [...prev, norm]);
        autoDismissedRef.current = [...autoDismissedRef.current, norm];
      }
    }
    const next = form.keywordItems.filter((_, i) => i !== index);
    setField("keywordItems", next);
  }

  function addKeyword(raw: string) {
    const kw = normalizeKeywordForSearch(raw);
    if (!kw) return;
    const currentLower = form.keywordItems.map((k) => k.value.toLowerCase());
    if (currentLower.includes(kw)) return;
    if (form.keywordItems.length >= KEYWORDS_MAX) return;
    setField("keywordItems", [...form.keywordItems, { value: kw, source: "manual" }]);
    setKeywordInput("");
  }

  function handleKeywordKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const el = e.target as HTMLInputElement;
      const value = el.value.replace(/,/g, "").trim();
      if (value) addKeyword(value);
      setKeywordInput("");
    }
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
        <label style={labelStyle}>Productos o servicios detectados</label>
        <div style={helperStyle}>
          Detectamos estos productos o servicios en tu descripción. Puedes eliminar los que no correspondan.
        </div>
        <div style={chipsContainerStyle}>
          {detectedProducts.map((item) => (
            <span key={item} style={chipStyle}>
              {item}
              <button
                type="button"
                aria-label={`Quitar ${item}`}
                onClick={() => removeDetectedProduct(item)}
                style={chipRemoveStyle}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      {detectedSubcategoria && (
        <div style={{ marginBottom: 16, fontSize: 13, color: "#4b5563" }}>
          <strong>Subcategoría detectada:</strong> {detectedSubcategoria}
        </div>
      )}

      <div style={{ marginBottom: 22 }}>
        <label style={labelStyle}>Palabras clave sugeridas</label>

        {/* Sugeridas automáticamente (chips actuales) */}
        <div style={chipsContainerStyle}>
          {form.keywordItems.map((item, index) => (
            <span key={`${item.value}-${index}`} style={chipStyle}>
              {item.value}
              <button
                type="button"
                aria-label={`Quitar ${item.value}`}
                onClick={() => removeKeyword(index)}
                style={chipRemoveStyle}
              >
                ×
              </button>
            </span>
          ))}
        </div>

        {/* Agregar manualmente */}
        {form.keywordItems.length < KEYWORDS_MAX && (
          <div style={{ marginTop: 10 }}>
            <div style={{ ...helperStyle, marginTop: 0, marginBottom: 4 }}>
              Agregar manualmente:
            </div>
            <div style={chipsContainerStyle}>
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={handleKeywordKeyDown}
                onBlur={() => {
                  if (keywordInput.trim()) addKeyword(keywordInput);
                }}
                placeholder="Agregar palabra clave y presiona Enter (ej: empanadas, sopaipillas, tortas)"
                style={chipInputStyle}
              />
            </div>
          </div>
        )}

        <div style={helperStyle}>
          Sugerimos palabras clave automáticamente según lo que escribiste. Puedes eliminar las que no representen tu negocio o agregar otras.
        </div>
        <div style={suggestingIndicatorRowStyle}>
          {suggestingKeywords ? (
            <span style={spinnerStyle} aria-hidden />
          ) : null}
        </div>
        {relatedSuggestions.length > 0 && (
          <div style={{ marginTop: 4, fontSize: 12, color: "#6b7280" }}>
            Otras sugerencias relacionadas: {relatedSuggestions.join(", ")}
          </div>
        )}
        {form.keywordItems.length > 0 && (
          <div style={counterStyle}>
            {form.keywordItems.length} de {KEYWORDS_MAX} palabras clave
          </div>
        )}
        {errors.keywords ? (
          <p style={errorStyle}>{errors.keywords}</p>
        ) : null}
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
