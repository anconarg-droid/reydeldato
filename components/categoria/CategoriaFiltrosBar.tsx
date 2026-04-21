"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { comunaLabelNombreYRegion } from "@/lib/comunaDisplayLabel";
import { prettyComunaSlug } from "@/lib/homeConstants";
import { slugify } from "@/lib/slugify";

export type SubOpcionFiltro = { slug: string; count: number; label: string };

type ComunaSuggestion = {
  nombre: string;
  slug: string;
  region_nombre?: string;
};

function comunaInputLabelFromProps(
  slug: string | null,
  nombrePreferido: string | null | undefined
) {
  const s = (slug ?? "").trim();
  if (!s) return "";
  const n = (nombrePreferido ?? "").trim();
  return n || prettyComunaSlug(s);
}

type Props = {
  categoriaSlug: string;
  subopciones: SubOpcionFiltro[];
  initialSubcategoria: string;
  /** Slug canónico si la URL trae `?comuna=` */
  initialComunaSlug: string;
  /** Nombre legible (p. ej. con tildes) cuando hay slug inicial */
  fixedComunaNombre?: string | null;
};

export default function CategoriaFiltrosBar({
  categoriaSlug,
  subopciones,
  initialSubcategoria,
  initialComunaSlug,
  fixedComunaNombre = null,
}: Props) {
  const router = useRouter();
  const [sub, setSub] = useState(initialSubcategoria);
  const [comunaInput, setComunaInput] = useState(() =>
    comunaInputLabelFromProps(initialComunaSlug, fixedComunaNombre)
  );
  const [selectedComunaSlug, setSelectedComunaSlug] = useState<string | null>(
    initialComunaSlug.trim() ? initialComunaSlug.trim() : null
  );
  const [openComuna, setOpenComuna] = useState(false);
  const [comunaSuggestions, setComunaSuggestions] = useState<ComunaSuggestion[]>([]);
  const [loadingComuna, setLoadingComuna] = useState(false);

  const comunaBoxRef = useRef<HTMLDivElement>(null);
  const comunaDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const comunaInputRef = useRef(comunaInput);
  comunaInputRef.current = comunaInput;

  useEffect(() => {
    setSub(initialSubcategoria);
  }, [initialSubcategoria]);

  useEffect(() => {
    const slug = initialComunaSlug.trim();
    setSelectedComunaSlug(slug || null);
    setComunaInput(comunaInputLabelFromProps(initialComunaSlug, fixedComunaNombre));
  }, [initialComunaSlug, fixedComunaNombre]);

  useEffect(() => {
    const term = comunaInput.trim();
    if (term.length < 2) {
      setComunaSuggestions([]);
      return;
    }

    if (comunaDebounceRef.current) clearTimeout(comunaDebounceRef.current);
    comunaDebounceRef.current = setTimeout(() => {
      const requested = term;
      setLoadingComuna(true);
      fetch(`/api/suggest/comunas?q=${encodeURIComponent(requested)}`)
        .then((res) => res.json())
        .then((data: { ok?: boolean; comunas?: ComunaSuggestion[] }) => {
          if (comunaInputRef.current.trim() !== requested) return;
          if (data?.ok && Array.isArray(data.comunas)) {
            setComunaSuggestions(data.comunas);
          } else {
            setComunaSuggestions([]);
          }
        })
        .catch(() => {
          if (comunaInputRef.current.trim() !== requested) return;
          setComunaSuggestions([]);
        })
        .finally(() => {
          if (comunaInputRef.current.trim() !== requested) return;
          setLoadingComuna(false);
        });
    }, 200);

    return () => {
      if (comunaDebounceRef.current) clearTimeout(comunaDebounceRef.current);
    };
  }, [comunaInput]);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    const target = e.target as Node;
    if (comunaBoxRef.current && !comunaBoxRef.current.contains(target)) {
      setOpenComuna(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  const pushFilters = useCallback(
    (opts?: { sub?: string; pickedComunaSlug?: string | null; inputText?: string }) => {
      const subVal = opts?.sub ?? sub;
      let comuna = "";
      if (opts != null && Object.hasOwn(opts, "pickedComunaSlug")) {
        const p = (opts.pickedComunaSlug ?? "").trim();
        comuna = p ? slugify(p) : "";
      } else if (opts != null && Object.hasOwn(opts, "inputText")) {
        const t = (opts.inputText ?? "").trim();
        comuna = t ? slugify(t) : "";
      } else {
        const pick = (selectedComunaSlug ?? "").trim();
        comuna = pick
          ? slugify(pick)
          : comunaInput.trim()
            ? slugify(comunaInput.trim())
            : "";
      }
      const sp = new URLSearchParams();
      if (comuna) sp.set("comuna", comuna);
      if (subVal.trim()) sp.set("subcategoria", subVal.trim().toLowerCase());
      sp.set("page", "1");
      const qs = sp.toString();
      router.push(`/categoria/${encodeURIComponent(categoriaSlug)}${qs ? `?${qs}` : ""}`);
    },
    [sub, selectedComunaSlug, comunaInput, categoriaSlug, router]
  );

  function apply(e: FormEvent) {
    e.preventDefault();
    pushFilters();
  }

  const clearComuna = useCallback(() => {
    setSelectedComunaSlug(null);
    setComunaInput("");
    setOpenComuna(false);
    setComunaSuggestions([]);
    pushFilters({ pickedComunaSlug: "" });
  }, [pushFilters]);

  const showQuitarComuna = Boolean(selectedComunaSlug || comunaInput.trim());

  return (
    <form onSubmit={apply} className="mt-6 flex flex-col gap-2">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.1fr_1fr_auto] md:items-end">
        <div>
          <label htmlFor="cat-sub" className="mb-1 block text-xs font-semibold text-slate-600">
            Elige un servicio dentro de esta categoría
          </label>
          <select
            id="cat-sub"
            value={sub}
            onChange={(e) => {
              const v = e.target.value;
              setSub(v);
              pushFilters({ sub: v });
            }}
            className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base outline-none focus:border-sky-500"
          >
            <option value="">Todas las subcategorías</option>
            {subopciones.map((o) => (
              <option key={o.slug} value={o.slug}>
                {o.label} ({o.count})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="cat-comuna" className="mb-1 block text-xs font-semibold text-slate-600">
            Comuna
          </label>
          <div ref={comunaBoxRef} className="relative">
            <input
              id="cat-comuna"
              type="text"
              value={comunaInput}
              onChange={(e) => {
                setComunaInput(e.target.value);
                setSelectedComunaSlug(null);
                setOpenComuna(true);
              }}
              onFocus={() => {
                if (selectedComunaSlug) return;
                if (comunaInput.trim().length >= 2) setOpenComuna(true);
              }}
              placeholder="Ej. Calera de Tango RM"
              aria-label="Comuna (todo Chile): escribe al menos 2 letras, elige una comuna de la lista (verás la región) y pulsa Aplicar para buscar."
              autoComplete="off"
              className="h-12 w-full rounded-xl border border-slate-300 px-4 text-base outline-none focus:border-sky-500"
            />
            {openComuna && (comunaSuggestions.length > 0 || loadingComuna) ? (
              <div className="absolute left-0 right-0 top-full z-[100] mt-1 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                {loadingComuna ? (
                  <div className="px-3 py-2 text-sm text-slate-500">Buscando comunas…</div>
                ) : (
                  comunaSuggestions.map((c) => {
                    const label = comunaLabelNombreYRegion(c.nombre, c.region_nombre);
                    return (
                      <button
                        key={c.slug}
                        type="button"
                        className="flex w-full flex-col items-start border-b border-slate-100 px-3 py-2 text-left text-sm last:border-0 hover:bg-slate-50"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setComunaInput(label);
                          setSelectedComunaSlug(c.slug);
                          setComunaSuggestions([]);
                          setOpenComuna(false);
                        }}
                      >
                        <span className="font-medium text-slate-900">{label}</span>
                      </button>
                    );
                  })
                )}
              </div>
            ) : null}
          </div>
        </div>
        <div>
          <span className="mb-1 hidden text-xs font-semibold md:block md:min-h-[1.25rem]" aria-hidden>
            &nbsp;
          </span>
          <button
            type="submit"
            className="h-12 w-full rounded-xl bg-slate-900 px-6 font-semibold text-white hover:bg-slate-800 md:w-auto"
            title="Aplica la comuna elegida o escrita, junto con la subcategoría"
          >
            Aplicar
          </button>
        </div>
      </div>
      {showQuitarComuna ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.1fr_1fr_auto]">
          <div className="hidden md:block" aria-hidden />
          <div>
            <button
              type="button"
              onClick={clearComuna}
              className="text-left text-xs font-semibold text-sky-700 hover:text-sky-800"
            >
              Quitar comuna
            </button>
          </div>
          <div className="hidden md:block" aria-hidden />
        </div>
      ) : null}
    </form>
  );
}
