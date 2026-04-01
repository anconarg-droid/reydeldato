"use client";

import algoliasearch from "algoliasearch/lite";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ItemSlug = { nombre: string; slug: string };
type ComunaSuggestion = { nombre: string; slug: string; region_nombre?: string };

type RubroSuggestion =
  | { type: "categoria"; slug: string; nombre: string; count?: number }
  | { type: "subcategoria"; slug: string; nombre: string; count?: number }
  | { type: "query"; slug: string; nombre: string };

function s(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function norm(v: string) {
  return v
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function env(name: string) {
  const v = process.env[name];
  return v && v.trim().length ? v.trim() : "";
}

const POPULAR_RUBROS: string[] = [
  "Gasfiter",
  "Electricista",
  "Mecánico",
  "Panadería",
  "Veterinaria",
];

export default function AlgoliaSearchAutocomplete({
  placeholder = "¿Qué estás buscando?",
}: {
  placeholder?: string;
}) {
  const router = useRouter();

  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const [loadingRubros, setLoadingRubros] = useState(false);
  const [loadingComunas, setLoadingComunas] = useState(false);

  const [categorias, setCategorias] = useState<ItemSlug[]>([]);
  const [subcategorias, setSubcategorias] = useState<ItemSlug[]>([]);

  const [rubros, setRubros] = useState<RubroSuggestion[]>([]);
  const [comunas, setComunas] = useState<ComunaSuggestion[]>([]);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const categoriaBySlug = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of categorias) m.set(c.slug, c.nombre);
    return m;
  }, [categorias]);

  const subcategoriaBySlug = useMemo(() => {
    const m = new Map<string, string>();
    for (const sc of subcategorias) m.set(sc.slug, sc.nombre);
    return m;
  }, [subcategorias]);

  // Cargar catálogo (nombres/slug) para mostrar en el dropdown
  useEffect(() => {
    let active = true;
    fetch("/api/catalogo/busqueda", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (!active) return;
        const cats = Array.isArray(json?.items?.categorias) ? json.items.categorias : [];
        const subs = Array.isArray(json?.items?.subcategorias) ? json.items.subcategorias : [];
        setCategorias(
          cats.map((x: any) => ({ nombre: s(x.nombre), slug: s(x.slug) })).filter((x: ItemSlug) => x.slug)
        );
        setSubcategorias(
          subs.map((x: any) => ({ nombre: s(x.nombre), slug: s(x.slug) })).filter((x: ItemSlug) => x.slug)
        );
      })
      .catch(() => {
        // si falla, igual funciona pero mostrará slugs
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (wrapperRef.current && !wrapperRef.current.contains(target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    const q = input.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (q.length < 2) {
        // Input vacío o muy corto: mostrar rubros populares, sin llamadas a Algolia
        setRubros(
          POPULAR_RUBROS.map((nombre) => ({
            type: "query" as const,
            slug: nombre.toLowerCase(),
            nombre,
          }))
        );
        setComunas([]);
        setLoadingRubros(false);
        setLoadingComunas(false);
        return;
      }

      // RUBROS (Algolia facet suggestions)
      const appId = env("NEXT_PUBLIC_ALGOLIA_APP_ID") || env("ALGOLIA_APP_ID");
      const searchKey = env("NEXT_PUBLIC_ALGOLIA_SEARCH_KEY") || env("ALGOLIA_SEARCH_KEY");
      const indexName =
        env("NEXT_PUBLIC_ALGOLIA_INDEX_EMPRENDEDORES") ||
        env("ALGOLIA_INDEX_EMPRENDEDORES") ||
        "emprendedores";

      if (!appId || !searchKey) {
        setRubros([]);
      } else {
        setLoadingRubros(true);
        try {
          const client = algoliasearch(appId, searchKey);
          const index = client.initIndex(indexName);

          const [catRes, subRes] = await Promise.all([
            index.searchForFacetValues("categoria_slug", q, { maxFacetHits: 6 }),
            index.searchForFacetValues("subcategorias_slugs_arr", q, { maxFacetHits: 6 }),
          ]);

          const cats: RubroSuggestion[] = (catRes.facetHits || []).map((fh: any) => ({
            type: "categoria",
            slug: s(fh.value),
            nombre: categoriaBySlug.get(s(fh.value)) || s(fh.value),
            count: fh.count,
          }));

          const subs: RubroSuggestion[] = (subRes.facetHits || []).map((fh: any) => ({
            type: "subcategoria",
            slug: s(fh.value),
            nombre: subcategoriaBySlug.get(s(fh.value)) || s(fh.value),
            count: fh.count,
          }));

          setRubros([...cats, ...subs].filter((x) => x.slug));
        } catch {
          setRubros([]);
        } finally {
          setLoadingRubros(false);
        }
      }

      // COMUNAS (usa tu endpoint existente con región)
      setLoadingComunas(true);
      try {
        const res = await fetch(`/api/suggest/comunas?q=${encodeURIComponent(q)}`, { cache: "no-store" });
        const json = await res.json();
        const items = Array.isArray(json?.comunas) ? json.comunas : [];
        setComunas(
          items.map((x: any) => ({ nombre: s(x.nombre), slug: s(x.slug), region_nombre: s(x.region_nombre) }))
            .filter((x: ComunaSuggestion) => x.slug)
            .slice(0, 8)
        );
      } catch {
        setComunas([]);
      } finally {
        setLoadingComunas(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [input, categoriaBySlug, subcategoriaBySlug]);

  const hasRubros = rubros.length > 0;
  const hasComunas = comunas.length > 0;
  const showPanel = open && (loadingRubros || loadingComunas || hasRubros || hasComunas);

  function goToRubro(item: RubroSuggestion) {
    if (item.type === "query") {
      router.push(`/buscar?q=${encodeURIComponent(item.nombre)}`);
      return;
    }
    if (item.type === "categoria") {
      router.push(`/buscar?categoria=${encodeURIComponent(item.slug)}`);
      return;
    }
    // subcategoría: endpoint /api/search soporta subcategoria, y /buscar ya lo preserva como query param
    router.push(`/buscar?subcategoria=${encodeURIComponent(item.slug)}`);
  }

  function goToComuna(slug: string) {
    router.push(`/buscar?comuna=${encodeURIComponent(slug)}`);
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className="w-full h-12 px-4 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
      />

      {showPanel && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          {/* RUBROS */}
          <div className="px-4 py-2 text-xs font-bold tracking-wide text-slate-500 bg-slate-50 border-b border-slate-200">
            RUBROS
          </div>
          {loadingRubros && (
            <div className="px-4 py-3 text-sm text-slate-500">Buscando rubros...</div>
          )}
          {!loadingRubros && !hasRubros && (
            <div className="px-4 py-3 text-sm text-slate-500">Sin sugerencias de rubros.</div>
          )}
          {!loadingRubros &&
            rubros.map((r) => (
              <button
                key={`${r.type}:${r.slug}`}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  goToRubro(r);
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-slate-50"
              >
                <div className="text-sm font-semibold text-slate-900">
                  {r.nombre}
                </div>
                <div className="text-xs text-slate-500">
                  {r.type === "query"
                    ? "Búsqueda libre"
                    : r.type === "categoria"
                      ? "Categoría"
                      : "Subcategoría"}
                  {r.type !== "query" && typeof r.count === "number"
                    ? ` · ${r.count}`
                    : ""}
                </div>
              </button>
            ))}

          {/* COMUNAS */}
          <div className="px-4 py-2 text-xs font-bold tracking-wide text-slate-500 bg-slate-50 border-t border-b border-slate-200">
            COMUNAS
          </div>
          {loadingComunas && (
            <div className="px-4 py-3 text-sm text-slate-500">Buscando comunas...</div>
          )}
          {!loadingComunas && !hasComunas && (
            <div className="px-4 py-3 text-sm text-slate-500">Sin sugerencias de comunas.</div>
          )}
          {!loadingComunas &&
            comunas.map((c) => (
              <button
                key={`comuna:${c.slug}`}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  goToComuna(c.slug);
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-slate-50"
              >
                <div className="text-sm font-semibold text-slate-900">
                  {c.nombre}
                </div>
                {c.region_nombre ? (
                  <div className="text-xs text-slate-500">{c.region_nombre}</div>
                ) : null}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

