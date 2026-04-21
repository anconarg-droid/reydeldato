"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import EmprendedorSearchCard from "@/components/search/EmprendedorSearchCard";
import {
  buscarApiItemToEmprendedorCardProps,
  type BuscarApiItem,
} from "@/lib/mapBuscarItemToEmprendedorCard";

type ComunaSuggestion = { nombre: string; slug: string; region_nombre?: string };

type CategoriaConSubs = {
  id: string;
  nombre: string;
  slug: string;
  subcategorias: Array<{ nombre: string; slug: string }>;
};

type SearchResponse = {
  ok: boolean;
  total?: number;
  nbHits?: number;
  meta?: {
    comuna?: string;
    total?: number;
    comunaSlug?: string;
    comunaNombre?: string;
  };
  items?: BuscarApiItem[];
  hits?: BuscarApiItem[];
  deTuComuna?: BuscarApiItem[];
  otrasComunas?: BuscarApiItem[];
  page?: number;
  nbPages?: number;
};

type Props = {
  sugerencias: string[];
  categorias: CategoriaConSubs[];
};

function norm(v: string) {
  return v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

export default function HomeWithSearch({ sugerencias, categorias }: Props) {
  const [q, setQ] = useState("");
  const [comunaInput, setComunaInput] = useState("");
  const [selectedComunaSlug, setSelectedComunaSlug] = useState<string | null>(null);
  const [openQuery, setOpenQuery] = useState(false);
  const [openComuna, setOpenComuna] = useState(false);
  const [comunaSuggestions, setComunaSuggestions] = useState<ComunaSuggestion[]>([]);
  const [loadingComuna, setLoadingComuna] = useState(false);
  const [categoriaSlug, setCategoriaSlug] = useState("");
  const [subcategoriaSlug, setSubcategoriaSlug] = useState("");

  const [hits, setHits] = useState<BuscarApiItem[]>([]);
  const [searchMeta, setSearchMeta] = useState<{
    comunaSlug: string;
    comunaNombre: string;
  } | null>(null);
  const [totalHits, setTotalHits] = useState(0);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const queryBoxRef = useRef<HTMLDivElement>(null);
  const comunaBoxRef = useRef<HTMLDivElement>(null);
  const comunaDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sugerenciasFiltradas = sugerencias
    .filter((item) => norm(item).includes(norm(q)))
    .slice(0, 8);

  // Autocomplete comuna
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
          if (data?.ok && Array.isArray(data.comunas)) setComunaSuggestions(data.comunas);
          else setComunaSuggestions([]);
        })
        .catch(() => setComunaSuggestions([]))
        .finally(() => setLoadingComuna(false));
    }, 200);
    return () => {
      if (comunaDebounceRef.current) clearTimeout(comunaDebounceRef.current);
    };
  }, [comunaInput]);

  const runSearch = useCallback(() => {
    const comuna = selectedComunaSlug || comunaInput.trim();
    if (!q.trim() && !comuna) {
      setHits([]);
      setTotalHits(0);
      setHasSearched(false);
      return;
    }
    setLoadingSearch(true);
    setHasSearched(true);
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (comuna) params.set("comuna", comuna);
    if (categoriaSlug) params.set("categoria", categoriaSlug);
    if (subcategoriaSlug) params.set("subcategoria", subcategoriaSlug);
    params.set("limit", "24");
    fetch(`/api/buscar?${params.toString()}`)
      .then((res) => res.json())
      .then((data: SearchResponse) => {
        if (data && typeof data === "object") {
          const ok = data.ok ?? false;
          const hasItemsKey = Array.isArray(data.items);
          const usedLegacyHits = !hasItemsKey && Array.isArray(data.hits);
          const usedLegacySplit =
            !hasItemsKey &&
            (Array.isArray(data.deTuComuna) || Array.isArray(data.otrasComunas));

          if (
            process.env.NODE_ENV !== "production" &&
            ok &&
            !hasItemsKey &&
            (usedLegacyHits || usedLegacySplit)
          ) {
            console.warn(
              "[/api/buscar] respuesta sin `items`; usando fallback legacy",
              {
                usedLegacyHits,
                usedLegacySplit,
              }
            );
          }

          const items = Array.isArray(data.items)
            ? data.items
            : Array.isArray(data.hits)
              ? data.hits
              : Array.isArray(data.deTuComuna) || Array.isArray(data.otrasComunas)
                ? [...(data.deTuComuna ?? []), ...(data.otrasComunas ?? [])]
                : [];
          const total =
            typeof data.meta?.total === "number"
              ? data.meta.total
              : typeof data.total === "number"
                ? data.total
                : typeof data.nbHits === "number"
                  ? data.nbHits
                  : items.length;

          if (ok) {
            setHits(items as BuscarApiItem[]);
            setTotalHits(total);
            const m = data.meta;
            if (m && typeof m.comunaSlug === "string") {
              setSearchMeta({
                comunaSlug: m.comunaSlug,
                comunaNombre: String(m.comunaNombre ?? ""),
              });
            } else {
              setSearchMeta(null);
            }
          } else {
            setHits([]);
            setTotalHits(0);
            setSearchMeta(null);
          }
        } else {
          setHits([]);
          setTotalHits(0);
        }
      })
      .catch(() => {
        setHits([]);
        setTotalHits(0);
        setSearchMeta(null);
      })
      .finally(() => setLoadingSearch(false));
  }, [q, comunaInput, selectedComunaSlug, categoriaSlug, subcategoriaSlug]);

  // Búsqueda en tiempo real (debounce al cambiar query o comuna)
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(runSearch, 350);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [runSearch]);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    const target = e.target as Node;
    if (queryBoxRef.current && !queryBoxRef.current.contains(target)) setOpenQuery(false);
    if (comunaBoxRef.current && !comunaBoxRef.current.contains(target)) setOpenComuna(false);
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  const subcategoriasActivas = categorias.find((c) => c.slug === categoriaSlug)?.subcategorias ?? [];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero + buscador grande */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-8 sm:py-10">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-2 tracking-tight">
            Encuentra servicios y datos en tu comuna
          </h1>
          <p className="text-slate-600 mb-6 text-lg">
            Busca oficios, productos o servicios cercanos. Escribe y elige comuna para ver resultados al instante.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 max-w-3xl">
            <div ref={queryBoxRef} className="relative flex-1">
              <input
                type="text"
                value={q}
                onChange={(e) => { setQ(e.target.value); setOpenQuery(true); }}
                onFocus={() => setOpenQuery(true)}
                onBlur={() => setTimeout(() => setOpenQuery(false), 150)}
                placeholder="¿Qué estás buscando? (ej. gasfiter, electricista)"
                className="w-full h-12 sm:h-14 pl-4 pr-4 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 text-base"
              />
              {openQuery && sugerenciasFiltradas.length > 0 && (
                <ul className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50 max-h-64 overflow-y-auto">
                  {sugerenciasFiltradas.map((item) => (
                    <li key={item}>
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); setQ(item); setOpenQuery(false); }}
                        className="w-full text-left px-4 py-3 hover:bg-slate-100 text-slate-800"
                      >
                        {item}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div ref={comunaBoxRef} className="relative sm:w-64">
              <input
                type="text"
                value={comunaInput}
                onChange={(e) => {
                  setComunaInput(e.target.value);
                  setSelectedComunaSlug(null);
                  setOpenComuna(true);
                }}
                onFocus={() => comunaInput.trim().length >= 2 && setOpenComuna(true)}
                onBlur={() => setTimeout(() => setOpenComuna(false), 150)}
                placeholder="Comuna"
                className="w-full h-12 sm:h-14 pl-4 pr-4 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 text-base"
              />
              {openComuna && (comunaSuggestions.length > 0 || loadingComuna) && (
                <ul className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50 max-h-72 overflow-y-auto">
                  {loadingComuna ? (
                    <li className="px-4 py-3 text-slate-500 text-sm">Buscando comunas...</li>
                  ) : (
                    comunaSuggestions.map((c) => (
                      <li key={c.slug}>
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setComunaInput(c.nombre);
                            setSelectedComunaSlug(c.slug);
                            setOpenComuna(false);
                          }}
                          className="w-full text-left px-4 py-2.5 hover:bg-slate-100 block"
                        >
                          <span className="font-semibold text-slate-900">{c.nombre}</span>
                          {c.region_nombre && (
                            <span className="block text-xs text-slate-500 mt-0.5">{c.region_nombre}</span>
                          )}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {sugerencias.length} palabras de ayuda disponibles. Los resultados se actualizan al escribir.
          </p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">
        {/* Filtros laterales */}
        <aside className="lg:w-56 shrink-0 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-3">Categoría</h3>
            <select
              value={categoriaSlug}
              onChange={(e) => { setCategoriaSlug(e.target.value); setSubcategoriaSlug(""); }}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="">Todas</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.slug}>{c.nombre}</option>
              ))}
            </select>
          </div>
          {subcategoriasActivas.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-3">Subcategoría</h3>
              <select
                value={subcategoriaSlug}
                onChange={(e) => setSubcategoriaSlug(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <option value="">Todas</option>
                {subcategoriasActivas.map((s) => (
                  <option key={s.slug} value={s.slug}>{s.nombre}</option>
                ))}
              </select>
            </div>
          )}
        </aside>

        {/* Grid de resultados */}
        <main className="flex-1 min-w-0">
          {loadingSearch && (
            <div className="flex items-center gap-2 text-slate-600 mb-4">
              <span className="inline-block w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              Buscando...
            </div>
          )}
          {hasSearched && !loadingSearch && (
            <p className="text-slate-600 mb-4">
              {totalHits === 0 ? "No hay resultados." : `${totalHits} resultado${totalHits !== 1 ? "s" : ""}`}
            </p>
          )}
          {!hasSearched && !loadingSearch && (
            <p className="text-slate-500 mb-4">
              Escribe algo en el buscador y elige una comuna para ver resultados en tiempo real.
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch">
            {hits.map((item) => (
              <EmprendedorSearchCard
                key={item.id || item.slug}
                {...buscarApiItemToEmprendedorCardProps(
                  item,
                  searchMeta,
                  "search"
                )}
              />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
