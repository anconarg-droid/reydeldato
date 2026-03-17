"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { detectComunaFromQuery } from "@/lib/search/comunaAliases";
import { parseSearchIntent } from "@/lib/search/parseSearchIntent";
import { getRegionShort } from "@/utils/regionShort";
import SearchAutocompleteDropdown, {
  type AutocompleteSuggestion,
} from "@/components/SearchAutocompleteDropdown";

type ComunaSuggestion = {
  nombre: string;
  slug: string;
  region_nombre?: string;
};

type TagPopular = { tag: string; tagSlug: string; count: number };

type Props = {
  sugerencias: string[];
  /** Comuna desde URL (?comuna=slug) para placeholder y chips por comuna */
  initialComunaSlug?: string | null;
};

function norm(v: string) {
  return v
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

const PLACEHOLDER_DEFAULT = "Ej: gasfiter, panadería, fletes";

function prettyComunaSlug(raw: string): string {
  const v = String(raw ?? "").trim();
  if (!v) return "";
  if (v.includes(" ")) return v;
  return v
    .replace(/-/g, " ")
    .split(" ")
    .map((w) => (w.length ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ""))
    .join(" ");
}

export default function HomeSearchClient({ sugerencias, initialComunaSlug }: Props) {
  const router = useRouter();

  const [q, setQ] = useState("");
  const [comunaInput, setComunaInput] = useState(() =>
    initialComunaSlug ? prettyComunaSlug(initialComunaSlug) : ""
  );
  const [selectedComunaSlug, setSelectedComunaSlug] = useState<string | null>(
    initialComunaSlug || null
  );
  const [openQuery, setOpenQuery] = useState(false);
  const [openComuna, setOpenComuna] = useState(false);
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [comunaSuggestions, setComunaSuggestions] = useState<ComunaSuggestion[]>([]);
  const [loadingComuna, setLoadingComuna] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [popularTags, setPopularTags] = useState<TagPopular[]>([]);
  const [totalGlobal, setTotalGlobal] = useState<number | null>(null);
  const [totalComuna, setTotalComuna] = useState<number | null>(null);

  const queryBoxRef = useRef<HTMLDivElement>(null);
  const comunaBoxRef = useRef<HTMLDivElement>(null);
  const queryDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const comunaDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const effectiveComunaSlug = selectedComunaSlug || initialComunaSlug || null;

  // Cargar total global de emprendimientos publicados para el botón de la home
  useEffect(() => {
    let cancelled = false;
    fetch("/api/stats/emprendedores")
      .then((res) => res.json())
      .then((data: { ok?: boolean; total?: number }) => {
        if (cancelled) return;
        if (data?.ok && typeof data.total === "number") {
          setTotalGlobal(data.total);
        }
      })
      .catch(() => {
        if (!cancelled) setTotalGlobal(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Cargar total por comuna cuando haya comuna efectiva
  useEffect(() => {
    if (!effectiveComunaSlug) {
      setTotalComuna(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/stats/emprendedores?comuna=${encodeURIComponent(effectiveComunaSlug)}`)
      .then((res) => res.json())
      .then((data: { ok?: boolean; total?: number }) => {
        if (cancelled) return;
        if (data?.ok && typeof data.total === "number") {
          setTotalComuna(data.total);
        }
      })
      .catch(() => {
        if (!cancelled) setTotalComuna(null);
      });
    return () => {
      cancelled = true;
    };
  }, [effectiveComunaSlug]);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    params.set("limit", "5");
    if (effectiveComunaSlug) params.set("comuna", effectiveComunaSlug);
    fetch(`/api/buscar/tags-populares?${params.toString()}`)
      .then((res) => res.json())
      .then((data: { ok?: boolean; tags?: TagPopular[] }) => {
        if (cancelled || !data?.ok || !Array.isArray(data.tags)) return;
        setPopularTags(data.tags);
      })
      .catch(() => {
        if (!cancelled) setPopularTags([]);
      });
    return () => {
      cancelled = true;
    };
  }, [effectiveComunaSlug]);

  const placeholderText = useMemo(() => {
    if (popularTags.length >= 2) {
      return "Ej: " + popularTags.slice(0, 3).map((t) => t.tag).join(", ");
    }
    return PLACEHOLDER_DEFAULT;
  }, [popularTags]);

  const buttonLabel = useMemo(
    () => (effectiveComunaSlug ? "Buscar en mi comuna" : "Buscar emprendimientos"),
    [effectiveComunaSlug]
  );

  const statsLabel = useMemo(() => {
    if (effectiveComunaSlug && totalComuna != null) {
      const n = totalComuna;
      const sufijo = n === 1 ? "emprendimiento publicado" : "emprendimientos publicados";
      return `${n.toLocaleString("es-CL")} ${sufijo} en esta comuna`;
    }
    if (!effectiveComunaSlug && totalGlobal != null) {
      const n = totalGlobal;
      const sufijo = n === 1 ? "emprendimiento publicado" : "emprendimientos publicados";
      return `${n.toLocaleString("es-CL")} ${sufijo} en Rey del Dato`;
    }
    return null;
  }, [effectiveComunaSlug, totalComuna, totalGlobal]);

  /**
   * Selección de sugerencia desde autocomplete en home:
   * - intent_comuna estructurado → navegar a /[comuna]/[servicio] y dejar inputs limpios.
   * - resto → solo llenar q/comuna y dejar que el botón Buscar resuelva.
   */
  const handleSuggestionSelect = useCallback(
    (suggestion: AutocompleteSuggestion) => {
      setOpenQuery(false);
      setHighlightIndex(-1);

      if (suggestion.type === "intent_comuna" && suggestion.value && suggestion.comuna) {
        const servicio = suggestion.value.trim();
        const comunaSlug = suggestion.comuna;
        const comunaPretty = prettyComunaSlug(comunaSlug);

        // Inputs limpios
        setQ(servicio.charAt(0).toUpperCase() + servicio.slice(1));
        setSelectedComunaSlug(comunaSlug);
        setComunaInput(comunaPretty);

        // Ruta estructurada /[comuna]/[subcategoria]
        router.push(`/${encodeURIComponent(comunaSlug)}/${encodeURIComponent(servicio)}`);
        return;
      }

      // Comportamiento anterior para el resto de sugerencias
      setQ(suggestion.label);
      if ("comuna" in suggestion && suggestion.comuna) {
        setSelectedComunaSlug(suggestion.comuna);
        setComunaInput(prettyComunaSlug(suggestion.comuna));
      }
    },
    [router]
  );

  // Autocomplete V1: intent, intent_comuna, comuna, sector. Sin emprendimientos.
  const sugerenciasFiltradas = useMemo(() => {
    const query = norm(q);
    if (!query) return suggestions;

    if (suggestions.length) return suggestions;

    // Fallback: sugerencias estáticas como intents
    return sugerencias
      .filter((item) => norm(item).includes(query))
      .slice(0, 8)
      .map<AutocompleteSuggestion>((text) => ({
        type: "intent",
        label: text.charAt(0).toUpperCase() + text.slice(1).toLowerCase(),
        value: text.toLowerCase(),
        url: `/buscar?q=${encodeURIComponent(text.toLowerCase())}`,
      }));
  }, [q, suggestions, sugerencias]);

  // Autocomplete V1: /api/autocomplete (solo sugerencias, sin negocios)
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setSuggestions([]);
      return;
    }

    if (queryDebounceRef.current) clearTimeout(queryDebounceRef.current);
    queryDebounceRef.current = setTimeout(() => {
      const params = new URLSearchParams();
      params.set("q", term);
      params.set("limit", "8");
      if (selectedComunaSlug) params.set("comuna", selectedComunaSlug);
      fetch(`/api/autocomplete?${params.toString()}`)
        .then((res) => res.json())
        .then((data: { ok?: boolean; suggestions?: AutocompleteSuggestion[] }) => {
          if (data?.ok && Array.isArray(data.suggestions)) {
            setSuggestions(data.suggestions);
          } else {
            setSuggestions([]);
          }
        })
        .catch(() => setSuggestions([]));
    }, 200);

    return () => {
      if (queryDebounceRef.current) clearTimeout(queryDebounceRef.current);
    };
  }, [q, selectedComunaSlug]);

  // Autocomplete comuna: buscar por inicio y mostrar región
  useEffect(() => {
    const term = comunaInput.trim();
    if (term.length < 2) {
      setComunaSuggestions([]);
      return;
    }

    if (comunaDebounceRef.current) clearTimeout(comunaDebounceRef.current);
    comunaDebounceRef.current = setTimeout(() => {
      setLoadingComuna(true);
      fetch(`/api/suggest/comunas?q=${encodeURIComponent(term)}`)
        .then((res) => res.json())
        .then((data: { ok?: boolean; comunas?: ComunaSuggestion[] }) => {
          if (data?.ok && Array.isArray(data.comunas)) {
            setComunaSuggestions(data.comunas);
          } else {
            setComunaSuggestions([]);
          }
        })
        .catch(() => setComunaSuggestions([]))
        .finally(() => setLoadingComuna(false));
    }, 200);

    return () => {
      if (comunaDebounceRef.current) clearTimeout(comunaDebounceRef.current);
    };
  }, [comunaInput]);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    const target = e.target as Node;
    if (queryBoxRef.current && !queryBoxRef.current.contains(target)) setOpenQuery(false);
    if (comunaBoxRef.current && !comunaBoxRef.current.contains(target)) setOpenComuna(false);
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  function irABuscar() {
    const raw = q.trim();
    const parsed = parseSearchIntent(raw);

    const finalQ = parsed.finalQuery.trim();
    const finalComunaSlug =
      (selectedComunaSlug || parsed.comunaSlug || "").trim() ||
      (comunaInput.trim() ? initialComunaSlug || "" : "");

    // Si la intención reconoce un rubro/subcategoría y hay comuna, usar ruta estructurada
    if (finalComunaSlug && parsed.sectorSlug && finalQ) {
      const slug = finalQ.toLowerCase().replace(/\s+/g, "-");
      const prettyServicio =
        slug
          .split("-")
          .filter(Boolean)
          .map((w) => (w.length ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ""))
          .join(" ") || finalQ;
      const prettyComuna = prettyComunaSlug(finalComunaSlug);

      // Mantener inputs limpios y separados
      setQ(prettyServicio);
      setSelectedComunaSlug(finalComunaSlug);
      setComunaInput(prettyComuna);

      router.push(`/${encodeURIComponent(finalComunaSlug)}/${encodeURIComponent(slug)}`);
      return;
    }

    // Fallback: búsqueda libre en /buscar con parámetros
    const finalComuna = finalComunaSlug || comunaInput.trim() || "";
    const params = new URLSearchParams();
    if (finalQ) params.set("q", finalQ);
    if (parsed.sectorSlug) params.set("sector", parsed.sectorSlug);
    if (finalComuna) params.set("comuna", finalComuna);

    router.push(`/buscar?${params.toString()}`);
  }

  return (
    <section style={{ width: "100%", maxWidth: 980, margin: "0 auto" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) 260px 140px",
          gap: 12,
          alignItems: "stretch",
        }}
      >
        <div ref={queryBoxRef} style={{ position: "relative" }}>
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpenQuery(true);
              setHighlightIndex(-1);
            }}
            onFocus={() => setOpenQuery(true)}
            onBlur={() => setTimeout(() => setOpenQuery(false), 150)}
            onKeyDown={(e) => {
              if (!openQuery || sugerenciasFiltradas.length === 0) {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setOpenQuery(false);
                  irABuscar();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  setOpenQuery(false);
                  setHighlightIndex(-1);
                }
                return;
              }

              if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlightIndex((prev) =>
                  prev < sugerenciasFiltradas.length - 1 ? prev + 1 : 0
                );
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlightIndex((prev) =>
                  prev > 0 ? prev - 1 : sugerenciasFiltradas.length - 1
                );
              } else if (e.key === "Enter") {
                e.preventDefault();
                if (highlightIndex >= 0 && highlightIndex < sugerenciasFiltradas.length) {
                  router.push(sugerenciasFiltradas[highlightIndex].url);
                  setOpenQuery(false);
                  setHighlightIndex(-1);
                } else {
                  setOpenQuery(false);
                  irABuscar();
                }
              } else if (e.key === "Escape") {
                e.preventDefault();
                setOpenQuery(false);
                setHighlightIndex(-1);
              }
            }}
            placeholder={placeholderText}
            style={{
              width: "100%",
              height: 56,
              borderRadius: 16,
              border: "1px solid #d1d5db",
              padding: "0 16px",
              fontSize: 16,
              background: "#fff",
            }}
          />

          <SearchAutocompleteDropdown
            suggestions={sugerenciasFiltradas}
            open={openQuery && sugerenciasFiltradas.length > 0}
            highlightIndex={highlightIndex}
            onSelect={handleSuggestionSelect}
            onClose={() => {
              setOpenQuery(false);
              setHighlightIndex(-1);
            }}
            onHighlightChange={setHighlightIndex}
            containerRef={queryBoxRef}
          />
        </div>

        <div ref={comunaBoxRef} style={{ position: "relative" }}>
          <input
            value={comunaInput}
            onChange={(e) => {
              setComunaInput(e.target.value);
              setSelectedComunaSlug(null);
              setOpenComuna(true);
            }}
            onFocus={() => comunaInput.trim().length >= 2 && setOpenComuna(true)}
            onBlur={() => setTimeout(() => setOpenComuna(false), 150)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                setOpenComuna(false);
                irABuscar();
              }
            }}
            placeholder="Comuna"
            style={{
              width: "100%",
              height: 56,
              borderRadius: 16,
              border: "1px solid #d1d5db",
              padding: "0 16px",
              fontSize: 16,
              background: "#fff",
            }}
          />

          {openComuna && (comunaSuggestions.length > 0 || loadingComuna) && (
            <div
              style={{
                position: "absolute",
                top: 62,
                left: 0,
                right: 0,
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 16,
                boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
                overflow: "hidden",
                zIndex: 50,
                maxHeight: 320,
                overflowY: "auto",
              }}
            >
              {loadingComuna ? (
                <div style={{ padding: 16, color: "#6b7280", fontSize: 14 }}>
                  Buscando comunas...
                </div>
              ) : (
                comunaSuggestions.map((c) => (
                  <button
                    key={c.slug}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const short = getRegionShort(c.region_nombre);
                      setComunaInput(short ? `${c.nombre} — ${short}` : c.nombre);
                      setSelectedComunaSlug(c.slug);
                      setOpenComuna(false);
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 14px",
                      border: "none",
                      background: "#fff",
                      cursor: "pointer",
                      display: "block",
                    }}
                  >
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>
                      {getRegionShort(c.region_nombre)
                        ? `${c.nombre} — ${getRegionShort(c.region_nombre)}`
                        : c.nombre}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => irABuscar()}
          style={{
            height: 56,
            borderRadius: 16,
            border: "none",
            background: "#111827",
            color: "#fff",
            fontSize: 16,
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          {buttonLabel}
        </button>
      </div>

      {statsLabel && (
        <p className="mt-2 text-center text-xs sm:text-sm text-slate-500">
          {statsLabel}
        </p>
      )}

      {popularTags.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {popularTags.slice(0, 5).map((t) => {
            const params = new URLSearchParams();
            params.set("q", t.tag);
            if (effectiveComunaSlug) params.set("comuna", effectiveComunaSlug);
            return (
              <Link
                key={t.tagSlug}
                href={`/buscar?${params.toString()}`}
                className="px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-800 text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 transition shadow-sm"
              >
                {t.tag}
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
