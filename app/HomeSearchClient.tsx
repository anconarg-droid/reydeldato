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
import HomeMasBuscado from "@/components/home/HomeMasBuscado";

type ComunaSuggestion = {
  nombre: string;
  slug: string;
  region_nombre?: string;
};

type TagPopular = { tag: string; tagSlug: string; count: number };

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

function slugify(v: string) {
  return norm(v).replace(/\s+/g, "-");
}

const SEARCH_QUERY_PLACEHOLDER =
  "¿Qué necesitas? Ej: gasfiter, peluquera, mecánico";

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
  const [popularTags, setPopularTags] = useState<TagPopular[]>([]);

  const queryBoxRef = useRef<HTMLDivElement>(null);
  const comunaBoxRef = useRef<HTMLDivElement>(null);
  const queryDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const comunaDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const effectiveComunaSlug = selectedComunaSlug || initialComunaSlug || null;

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
        const servicio = slugify(suggestion.value);
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

        router.push(`/${encodeURIComponent(comunaSlug)}/${encodeURIComponent(servicio)}`);
        return;
      }

      if (suggestion.type === "intent" && selectedComunaSlug && suggestion.value) {
        const servicio = slugify(suggestion.value);
        setQ(suggestion.label);
        router.push(`/${encodeURIComponent(selectedComunaSlug)}/${encodeURIComponent(servicio)}`);
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

    if (suggestions.length) return suggestions;

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

    // Caso 1: comuna + rubro/subcategoría reconocida => ruta estructurada
    if (finalComunaSlug && parsed.sectorSlug && finalQ) {
      const subcategoriaSlug = slugify(finalQ);

      const prettyServicio =
        finalQ
          .split(" ")
          .filter(Boolean)
          .map((w) =>
            w.length
              ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
              : ""
          )
          .join(" ") || finalQ;

      setQ(prettyServicio);
      setSelectedComunaSlug(finalComunaSlug);
      setComunaInput(prettyComunaSlug(finalComunaSlug));

      router.push(
        `/${encodeURIComponent(finalComunaSlug)}/${encodeURIComponent(subcategoriaSlug)}`
      );
      return;
    }

    // Caso 2: solo comuna
    if (finalComunaSlug && !finalQ && !parsed.sectorSlug) {
      setSelectedComunaSlug(finalComunaSlug);
      setComunaInput(prettyComunaSlug(finalComunaSlug));
      router.push(`/${encodeURIComponent(finalComunaSlug)}`);
      return;
    }

    // Caso 3: comuna + texto, pero parseSearchIntent no reconoció sector
    if (finalComunaSlug && finalQ) {
      const subcategoriaSlug = slugify(finalQ);

      setSelectedComunaSlug(finalComunaSlug);
      setComunaInput(prettyComunaSlug(finalComunaSlug));

      router.push(
        `/${encodeURIComponent(finalComunaSlug)}/${encodeURIComponent(subcategoriaSlug)}`
      );
      return;
    }

    // Caso 4: búsqueda libre
    if (finalQ) {
      const params = new URLSearchParams();
      params.set("q", finalQ);
      router.push(`/buscar?${params.toString()}`);
      return;
    }

    router.push("/");
  }, [q, router, selectedComunaSlug]);

  return (
    <section className="w-full mx-auto">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
        <div className="grid w-full grid-cols-1 gap-3 items-stretch sm:grid-cols-[minmax(0,7fr)_minmax(0,3fr)_auto] sm:items-center">
        <div ref={queryBoxRef} className="relative min-w-0">
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
                  handleSuggestionSelect(sugerenciasFiltradas[highlightIndex]);
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
            placeholder={SEARCH_QUERY_PLACEHOLDER}
            className="h-14 w-full rounded-xl border border-slate-200 bg-white px-4 text-base text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10"
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

        <div ref={comunaBoxRef} className="relative min-w-0">
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
            placeholder="¿En qué comuna?"
            aria-autocomplete="list"
            aria-label="Comuna: escribe al menos 2 letras para ver sugerencias"
            className="h-14 w-full rounded-xl border border-slate-200 bg-white px-4 text-base text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10"
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
          className="h-14 w-full shrink-0 whitespace-nowrap rounded-lg bg-black px-6 text-base font-medium text-white shadow-md transition-all duration-200 hover:bg-zinc-900 active:scale-95 sm:h-[56px] sm:w-auto"
        >
          Buscar ahora
        </button>
      </div>
      </div>

      <p className="mt-5 text-center text-sm leading-relaxed text-slate-600 px-1 sm:px-2">
        <span className="font-semibold text-slate-800">Prueba con:</span>{" "}
        <span className="text-slate-600">
          Gasfiter en Maipú · Clases de matemáticas · Fletes
        </span>
      </p>

      <HomeMasBuscado comunaSlug={effectiveComunaSlug} className="mt-8 sm:mt-10" />

      {popularTags.length > 0 && (
        <div className="mt-6 sm:mt-8 flex flex-wrap justify-center gap-2">
          {popularTags.slice(0, 5).map((t) => {
            const href = effectiveComunaSlug
              ? `/${encodeURIComponent(effectiveComunaSlug)}/${encodeURIComponent(t.tagSlug)}`
              : `/buscar?q=${encodeURIComponent(t.tag)}`;

            return (
              <Link
                key={t.tagSlug}
                href={href}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md active:scale-95"
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