"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { postClientAnalyticsEvent } from "@/lib/postClientAnalyticsEvent";
import {
  isResolvedQueryExactGas,
  suggestionMentionsGasfiteria,
} from "@/lib/gasQueryExcludeGasfiteria";
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

type Props = {
  sugerencias: string[];
  initialComunaSlug?: string | null;
};

function norm(v: string) {
  return v
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

const SEARCH_QUERY_PLACEHOLDER =
  "Ej: gasfiter, peluquera, mecánico, clases, comida";

function prettyComunaSlug(raw: string) {
  const v = String(raw ?? "").trim();
  if (!v) return "";
  if (v.includes(" ")) return v;
  return v
    .replace(/-/g, " ")
    .split(" ")
    .map((w) => (w.length ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ""))
    .join(" ");
}

export default function HomeSearchClient({
  sugerencias,
  initialComunaSlug,
}: Props) {
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
  const [searchSubmitting, setSearchSubmitting] = useState(false);

  const queryBoxRef = useRef<HTMLDivElement>(null);
  const queryInputRef = useRef<HTMLInputElement>(null);
  const comunaBoxRef = useRef<HTMLDivElement>(null);
  const searchSubmittingRef = useRef(false);
  const queryDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const comunaDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const effectiveComunaSlug = selectedComunaSlug || initialComunaSlug || null;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 768px)");
    if (!mq.matches) return;
    const id = window.requestAnimationFrame(() => {
      queryInputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, []);

  const handleSuggestionSelect = useCallback(
    (suggestion: AutocompleteSuggestion) => {
      setOpenQuery(false);
      setHighlightIndex(-1);

      if (suggestion.type === "comuna" && suggestion.comuna) {
        setSelectedComunaSlug(suggestion.comuna);
        setComunaInput(prettyComunaSlug(suggestion.comuna));
        router.push(`/${encodeURIComponent(suggestion.comuna)}`);
        return;
      }

      if (suggestion.type === "intent_comuna" && suggestion.value && suggestion.comuna) {
        const comunaSlug = suggestion.comuna;

        setQ(
          suggestion.value
            .split("-")
            .filter(Boolean)
            .map((w) => (w.length ? w.charAt(0).toUpperCase() + w.slice(1) : ""))
            .join(" ")
        );
        setSelectedComunaSlug(comunaSlug);
        setComunaInput(prettyComunaSlug(comunaSlug));

        const sp = new URLSearchParams();
        sp.set("q", suggestion.value);
        sp.set("comuna", comunaSlug);
        router.push(`/resultados?${sp.toString()}`);
        return;
      }

      if (suggestion.type === "intent" && selectedComunaSlug && suggestion.value) {
        setQ(suggestion.label);
        const sp = new URLSearchParams();
        sp.set("q", suggestion.value);
        sp.set("comuna", selectedComunaSlug);
        router.push(`/resultados?${sp.toString()}`);
        return;
      }

      setQ(suggestion.label);
      if ("comuna" in suggestion && suggestion.comuna) {
        setSelectedComunaSlug(suggestion.comuna);
        setComunaInput(prettyComunaSlug(suggestion.comuna));
      }
    },
    [router, selectedComunaSlug]
  );

  const sugerenciasFiltradas = useMemo(() => {
    const query = norm(q);
    if (!query) return suggestions;

    let list: AutocompleteSuggestion[];
    if (suggestions.length) {
      list = suggestions;
    } else {
      list = sugerencias
        .filter((item) => norm(item).includes(query))
        .slice(0, 8)
        .map<AutocompleteSuggestion>((text) => ({
          type: "intent",
          label: text.charAt(0).toUpperCase() + text.slice(1).toLowerCase(),
          value: text.toLowerCase(),
          url: `/resultados?q=${encodeURIComponent(text.toLowerCase())}`,
        }));
    }

    if (isResolvedQueryExactGas(q)) {
      list = list.filter((s) => !suggestionMentionsGasfiteria(s));
    }

    return list;
  }, [q, suggestions, sugerencias]);

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

  const irABuscar = useCallback(() => {
    if (searchSubmittingRef.current) return;
    searchSubmittingRef.current = true;
    setSearchSubmitting(true);

    const raw = q.trim();
    const parsed = parseSearchIntent(raw);

    const detected =
      raw.toLowerCase().includes(" en ") || !selectedComunaSlug
        ? detectComunaFromQuery(raw)
        : { q: raw, comunaSlug: null };

    const finalComunaSlug = (
      selectedComunaSlug ||
      parsed.comunaSlug ||
      detected.comunaSlug ||
      ""
    ).trim();

    // Si detectamos comuna dentro del texto, usamos la query limpia
    const cleanedFromDetect = detected.q.trim();
    const finalQ = (parsed.finalQuery.trim() || cleanedFromDetect || "").trim();

    const params = new URLSearchParams();
    if (finalQ) params.set("q", finalQ);
    if (finalComunaSlug) params.set("comuna", finalComunaSlug);

    try {
      if (finalQ || finalComunaSlug) {
        postClientAnalyticsEvent({
          event_type: "search",
          q: finalQ || null,
          comuna_slug: finalComunaSlug || null,
          metadata: {
            source: "home",
            query: finalQ || null,
            comuna: finalComunaSlug || null,
          },
        });
        router.push(`/resultados?${params.toString()}#resultados`);
      } else {
        router.push("/");
      }
    } finally {
      window.setTimeout(() => {
        searchSubmittingRef.current = false;
        setSearchSubmitting(false);
      }, 500);
    }
  }, [q, router, selectedComunaSlug]);

  return (
    <section className="w-full mx-auto">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
        <div className="flex w-full flex-row items-center gap-2">
          <div ref={queryBoxRef} className="relative min-w-0 flex-[2]">
            <input
            ref={queryInputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpenQuery(true);
              setHighlightIndex(-1);
            }}
            onFocus={() => setOpenQuery(true)}
            onBlur={() => setTimeout(() => setOpenQuery(false), 150)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                setOpenQuery(false);
                setHighlightIndex(-1);
                return;
              }
              if (openQuery && sugerenciasFiltradas.length > 0 && e.key === "ArrowDown") {
                e.preventDefault();
                setHighlightIndex((prev) =>
                  prev < sugerenciasFiltradas.length - 1 ? prev + 1 : 0
                );
                return;
              }
              if (openQuery && sugerenciasFiltradas.length > 0 && e.key === "ArrowUp") {
                e.preventDefault();
                setHighlightIndex((prev) =>
                  prev > 0 ? prev - 1 : sugerenciasFiltradas.length - 1
                );
                return;
              }
              if (e.key === "Enter") {
                e.preventDefault();
                setOpenQuery(false);
                setHighlightIndex(-1);
                irABuscar();
              }
            }}
            placeholder={SEARCH_QUERY_PLACEHOLDER}
            className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-4 text-base text-slate-900 placeholder:text-slate-400 shadow-md shadow-slate-900/5 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-600/15"
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

        <div ref={comunaBoxRef} className="relative min-w-[110px] flex-1 max-w-[180px]">
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
            aria-autocomplete="list"
            aria-label="Comuna: escribe al menos 2 letras para ver sugerencias"
            className="w-full min-w-[110px] rounded-xl border border-slate-200 bg-white px-4 py-4 text-base text-slate-900 placeholder:text-slate-400 shadow-md shadow-slate-900/5 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-600/15"
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
          onClick={irABuscar}
          disabled={searchSubmitting}
          aria-busy={searchSubmitting}
          className="inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-7 py-4 text-base font-bold text-white shadow-lg shadow-teal-900/15 transition-all duration-200 active:scale-95 enabled:cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
          style={{ background: "#0f766e" }}
        >
          {searchSubmitting ? (
            <svg
              className="h-5 w-5 animate-spin text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : null}
          <span>Buscar servicios</span>
        </button>
      </div>
      </div>

      <p className="mt-3 text-center text-sm font-medium text-slate-700">
        Deja los grupos de WhatsApp y Facebook.
      </p>
    </section>
  );
}
