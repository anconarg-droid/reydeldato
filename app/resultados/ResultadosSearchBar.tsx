"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeText } from "@/lib/search/normalizeText";
import { slugify } from "@/lib/slugify";

type ResolverSubJson = { ok?: boolean; slug?: string | null };
import { getRegionShort } from "@/utils/regionShort";

type ComunaSuggestion = {
  nombre: string;
  slug: string;
  region_nombre?: string;
};

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

type Props = {
  initialQDisplay: string;
  initialComunaSlug: string | null;
  /**
   * Si true, oculta el autocomplete de comuna (solo búsqueda global).
   * En `/[comuna]` siempre debe ser false para poder cambiar de comuna en el mismo formulario.
   */
  hideComunaInput?: boolean;
  /** Nombre visible (p. ej. con tildes) para precargar el input cuando `initialComunaSlug` viene de la URL. */
  fixedComunaNombre?: string | null;
  /** Sin comuna seleccionada: borde/ring teal para invitar a filtrar por comuna. */
  resaltarCampoComuna?: boolean;
  /**
   * Solo `/[comuna]` sin búsqueda en URL: borde pulsante en “Qué buscas” vacío + texto de ayuda.
   */
  comunaInvitacionActiva?: boolean;
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

/**
 * Misma fuente de sugerencias que el home: GET /api/suggest/comunas?q=
 */
export default function ResultadosSearchBar({
  initialQDisplay,
  initialComunaSlug,
  hideComunaInput = false,
  fixedComunaNombre = null,
  resaltarCampoComuna = false,
  comunaInvitacionActiva = false,
}: Props) {
  const router = useRouter();
  const [q, setQ] = useState(initialQDisplay);
  const [comunaInput, setComunaInput] = useState(() =>
    comunaInputLabelFromProps(initialComunaSlug, fixedComunaNombre)
  );
  const [selectedComunaSlug, setSelectedComunaSlug] = useState<string | null>(initialComunaSlug);
  const [openComuna, setOpenComuna] = useState(false);
  const [comunaSuggestions, setComunaSuggestions] = useState<ComunaSuggestion[]>([]);
  const [loadingComuna, setLoadingComuna] = useState(false);

  const comunaBoxRef = useRef<HTMLDivElement>(null);
  const comunaDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const comunaInputRef = useRef(comunaInput);
  comunaInputRef.current = comunaInput;

  useEffect(() => {
    setQ(initialQDisplay);
  }, [initialQDisplay]);

  useEffect(() => {
    setSelectedComunaSlug(initialComunaSlug);
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

  const buscar = useCallback(async () => {
    const qNorm = normalizeText(q);
    const comSlugRaw = (selectedComunaSlug ?? "").trim();
    const canonicalComuna = comSlugRaw ? slugify(comSlugRaw) : "";

    if (!qNorm && !canonicalComuna) {
      return;
    }

    if (!qNorm && canonicalComuna) {
      router.push(`/${encodeURIComponent(canonicalComuna)}`);
      return;
    }

    if (canonicalComuna) {
      const slugTry = slugify(q.trim());
      if (slugTry) {
        try {
          const res = await fetch(
            `/api/catalogo/resolver-subcategoria-slug?slug=${encodeURIComponent(slugTry)}`,
            { cache: "no-store" }
          );
          const data = (await res.json()) as ResolverSubJson;
          if (res.ok && data?.ok && data.slug) {
            router.push(
              `/${encodeURIComponent(canonicalComuna)}?subcategoria=${encodeURIComponent(data.slug)}`
            );
            return;
          }
        } catch {
          /* cae a búsqueda libre */
        }
      }
      router.push(
        `/${encodeURIComponent(canonicalComuna)}?q=${encodeURIComponent(qNorm)}`
      );
      return;
    }

    router.push(`/resultados?q=${encodeURIComponent(qNorm)}`);
  }, [q, selectedComunaSlug, router]);

  const clearComuna = useCallback(() => {
    const qNorm = normalizeText(q);
    setSelectedComunaSlug(null);
    setComunaInput("");
    setOpenComuna(false);
    setComunaSuggestions([]);

    if (!qNorm) {
      router.push("/");
      return;
    }
    router.push(`/resultados?q=${encodeURIComponent(qNorm)}`);
  }, [q, router]);

  /** Limpia término `q` y mantiene la comuna si existe. */
  const clearQ = useCallback(() => {
    setQ("");
    const comSlugRaw = (selectedComunaSlug ?? "").trim();
    const canonicalComuna = comSlugRaw ? slugify(comSlugRaw) : "";

    if (canonicalComuna) {
      router.push(`/${encodeURIComponent(canonicalComuna)}`);
      return;
    }
    router.push("/resultados");
  }, [selectedComunaSlug, router]);

  const hasQToClear = normalizeText(q).length > 0;
  const qEmpty = normalizeText(q).length === 0;
  const invitarAlInputQ =
    Boolean(comunaInvitacionActiva) && qEmpty && !hideComunaInput;

  const qInputClassName = invitarAlInputQ
    ? "order-2 h-11 w-full min-w-0 rounded-lg bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0d7a5f]/40 sm:order-none sm:col-start-1 sm:row-start-2 resultados-q-input-invite"
    : "order-2 h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 transition-[border-color,box-shadow] duration-300 focus:outline-none focus:ring-2 focus:ring-slate-400 sm:order-none sm:col-start-1 sm:row-start-2";

  const qPlaceholder = selectedComunaSlug
    ? `¿Qué buscas en ${
        (comunaInput.split(" —")[0] ?? "").trim() ||
        prettyComunaSlug(selectedComunaSlug)
      }?`
    : "Ej: gasfiter, peluquero, clases de inglés";

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
      {/*
        sm+: 3 filas — etiquetas | inputs+Botón | (vacío | Quitar comuna | vacío)
        así los dos inputs y Buscar comparten fila y quedan alineados; "Quitar comuna" no sube la columna.
        Móvil: order-* mantiene q → comuna → quitar → buscar.
      */}
      <div
        className={
          hideComunaInput
            ? "grid w-full grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:grid-rows-[auto_auto_auto]"
            : "grid w-full grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-[minmax(0,7fr)_minmax(0,3fr)_auto] sm:grid-rows-[auto_auto_auto]"
        }
      >
        <label
          htmlFor="resultados-q"
          className="order-1 block text-xs font-semibold text-slate-600 sm:order-none sm:col-start-1 sm:row-start-1"
        >
          Qué buscas
        </label>
        {!hideComunaInput ? (
          <>
            <label
              htmlFor="resultados-comuna"
              className="order-3 block text-xs font-semibold text-slate-600 sm:order-none sm:col-start-2 sm:row-start-1"
            >
              Comuna
            </label>
            <span
              className="order-0 hidden sm:order-none sm:col-start-3 sm:row-start-1 sm:block sm:text-xs sm:leading-4 sm:text-transparent sm:select-none"
              aria-hidden="true"
            >
              .
            </span>
          </>
        ) : (
          <span
            className="order-0 hidden sm:order-none sm:col-start-2 sm:row-start-1 sm:block sm:text-xs sm:leading-4 sm:text-transparent sm:select-none"
            aria-hidden="true"
          >
            .
          </span>
        )}

        <input
          id="resultados-q"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              buscar();
            }
          }}
          placeholder={hideComunaInput && fixedComunaNombre
            ? `¿Qué buscas en ${fixedComunaNombre}?`
            : qPlaceholder}
          className={qInputClassName}
        />

        {!hideComunaInput ? (
          <div
            ref={comunaBoxRef}
            className="relative order-4 min-w-0 sm:order-none sm:col-start-2 sm:row-start-2"
          >
            <input
              id="resultados-comuna"
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
              aria-autocomplete="list"
              aria-label="Comuna: escribe al menos 2 letras para ver sugerencias"
              placeholder="Ej: Maipú"
              autoComplete="off"
              className={
                resaltarCampoComuna && !selectedComunaSlug
                  ? "h-11 w-full rounded-lg border border-teal-600/50 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 ring-2 ring-teal-600/35 focus:outline-none focus:ring-2 focus:ring-teal-600/45"
                  : "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setOpenComuna(false);
                  setComunaSuggestions([]);
                  buscar();
                }
              }}
            />
            {openComuna && (comunaSuggestions.length > 0 || loadingComuna) ? (
              <div className="absolute left-0 right-0 top-full z-[100] mt-1 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                {loadingComuna ? (
                  <div className="px-3 py-2 text-sm text-slate-500">Buscando comunas...</div>
                ) : (
                  comunaSuggestions.map((c) => (
                    <button
                      key={c.slug}
                      type="button"
                      className="flex w-full flex-col items-start border-b border-slate-100 px-3 py-2 text-left text-sm last:border-0 hover:bg-slate-50"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        const short = getRegionShort(c.region_nombre);
                        setComunaInput(short ? `${c.nombre} — ${short}` : c.nombre);
                        setSelectedComunaSlug(c.slug);
                        setComunaSuggestions([]);
                        setOpenComuna(false);
                      }}
                    >
                      <span className="font-medium text-slate-900">
                        {getRegionShort(c.region_nombre)
                          ? `${c.nombre} — ${getRegionShort(c.region_nombre)}`
                          : c.nombre}
                      </span>
                      {c.region_nombre && !getRegionShort(c.region_nombre) ? (
                        <span className="mt-0.5 text-xs text-slate-500">{c.region_nombre}</span>
                      ) : null}
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        <button
          type="button"
          onClick={buscar}
          className={
            hideComunaInput
              ? "order-6 h-11 w-full shrink-0 whitespace-nowrap rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800 sm:order-none sm:col-start-2 sm:row-start-2 sm:w-auto sm:self-stretch"
              : "order-6 h-11 w-full shrink-0 whitespace-nowrap rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800 sm:order-none sm:col-start-3 sm:row-start-2 sm:w-auto sm:self-stretch"
          }
        >
          Buscar
        </button>

        <div className="order-0 min-h-[1.25rem] sm:order-none sm:col-start-1 sm:row-start-3">
          {hasQToClear ? (
            <button
              type="button"
              onClick={clearQ}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Limpiar búsqueda
            </button>
          ) : null}
        </div>

        <div className="order-5 min-h-[1.25rem] sm:order-none sm:col-start-2 sm:row-start-3">
          {selectedComunaSlug ? (
            <button
              type="button"
              onClick={clearComuna}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Quitar comuna
            </button>
          ) : null}
        </div>

        <div
          className={
            hideComunaInput
              ? "order-0 hidden sm:order-none sm:col-start-2 sm:row-start-3 sm:block"
              : "order-0 hidden sm:order-none sm:col-start-3 sm:row-start-3 sm:block"
          }
          aria-hidden="true"
        />
      </div>

      {comunaInvitacionActiva ? (
        <p
          role="note"
          className={`mt-3 overflow-hidden text-center text-[13px] text-[#0d7a5f] transition-[opacity,margin-bottom,max-height] duration-300 ease-out ${
            qEmpty
              ? "mb-5 max-h-16 opacity-100"
              : "pointer-events-none mb-0 max-h-0 opacity-0"
          }`}
        >
          Escribe qué necesitas para encontrar algo específico
        </p>
      ) : null}
    </div>
  );
}
