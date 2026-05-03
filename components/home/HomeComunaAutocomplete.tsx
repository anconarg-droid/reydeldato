"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getRegionShort } from "@/utils/regionShort";

type ComunaSuggestion = {
  nombre: string;
  slug: string;
  region_nombre?: string;
};

/** Texto del input tras elegir una fila (misma lógica que el listado). */
function formatComunaPickLabel(c: ComunaSuggestion): string {
  const short = getRegionShort(c.region_nombre);
  if (short) return `${c.nombre} — ${short}`;
  const reg = c.region_nombre?.trim();
  if (reg) return `${c.nombre} — ${reg}`;
  return c.nombre;
}

function normalizeComunaTerm(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export default function HomeComunaAutocomplete({
  placeholder = "Buscar comuna…",
  containerClassName = "w-full max-w-[min(100%,28.5rem)] sm:max-w-[28.5rem]",
  inputClassName = "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400",
  confirmButtonLabel = "Buscar",
  /** `abrir-comuna` → `/abrir-comuna/[slug]` (activación); por defecto directorio `/${slug}`. */
  target = "directorio",
}: {
  placeholder?: string;
  containerClassName?: string;
  inputClassName?: string;
  confirmButtonLabel?: string;
  target?: "directorio" | "abrir-comuna";
}) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ComunaSuggestion[]>([]);
  /** Slug reservado al elegir una fila del listado; se limpia si el usuario edita el texto. */
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const pendingSlugRef = useRef<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (boxRef.current && !boxRef.current.contains(target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => {
    const term = value.trim();
    if (term.length < 2) {
      setItems([]);
      setLoading(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const requested = term;
      setLoading(true);
      fetch(`/api/suggest/comunas?q=${encodeURIComponent(requested)}`)
        .then((res) => res.json())
        .then((data: { ok?: boolean; comunas?: ComunaSuggestion[] }) => {
          if (valueRef.current.trim() !== requested) return;
          if (data?.ok && Array.isArray(data.comunas)) {
            // Tras elegir una fila, value se actualiza y este fetch se dispara de nuevo;
            // no reabrir ni dejar sugerencias colgadas.
            if (pendingSlugRef.current) {
              setItems([]);
              return;
            }
            setItems(data.comunas);
            setOpen(true);
          } else {
            setItems([]);
          }
        })
        .catch(() => {
          if (valueRef.current.trim() !== requested) return;
          setItems([]);
        })
        .finally(() => {
          if (valueRef.current.trim() !== requested) return;
          setLoading(false);
        });
    }, 180);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  const hrefForSlug = useCallback(
    (slug: string) =>
      target === "abrir-comuna"
        ? `/abrir-comuna/${encodeURIComponent(slug)}`
        : `/${encodeURIComponent(slug)}`,
    [target]
  );

  const pick = useCallback((c: ComunaSuggestion) => {
    setHint(null);
    pendingSlugRef.current = c.slug;
    setPendingSlug(c.slug);
    setItems([]);
    setOpen(false);
    setValue(formatComunaPickLabel(c));
  }, []);

  const resolveSlugForNavigate = useCallback((): string | null => {
    if (pendingSlug) return pendingSlug;
    const soloNombre = value.split(/\s*[—\-]\s*/)[0] ?? value;
    const term = normalizeComunaTerm(soloNombre);
    if (!term) return null;
    for (const c of items) {
      if (normalizeComunaTerm(c.nombre) === term) return c.slug;
      if (normalizeComunaTerm(c.slug.replace(/-/g, " ")) === term) return c.slug;
    }
    if (items.length === 1) return items[0].slug;
    return null;
  }, [pendingSlug, value, items]);

  const navigateToComuna = useCallback(() => {
    setHint(null);
    const slug = resolveSlugForNavigate();
    if (slug) {
      router.push(hrefForSlug(slug));
      return;
    }
    setHint("Elige una comuna de la lista o sigue escribiendo y vuelve a intentar.");
  }, [hrefForSlug, resolveSlugForNavigate, router]);

  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      <div className="flex items-stretch gap-2">
        <div ref={boxRef} className="relative min-w-0 flex-1">
          <input
            type="text"
            value={value}
            onChange={(e) => {
              pendingSlugRef.current = null;
              setPendingSlug(null);
              setHint(null);
              setValue(e.target.value);
              setOpen(true);
            }}
            onFocus={() => {
              if (value.trim().length >= 2 && !pendingSlugRef.current) setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                navigateToComuna();
              }
            }}
            placeholder={placeholder}
            aria-label={
              target === "abrir-comuna"
                ? "Buscar otra comuna para ver su activación"
                : "Buscar comuna"
            }
            autoComplete="off"
            className={inputClassName}
          />

          {open && (loading || items.length > 0) ? (
            <div className="absolute left-0 right-0 top-full z-[80] mt-1 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
              {loading ? (
                <div className="px-3 py-2 text-sm text-slate-500">Buscando comunas…</div>
              ) : (
                items.map((c) => {
                  const short = getRegionShort(c.region_nombre);
                  return (
                    <button
                      key={c.slug}
                      type="button"
                      className="flex w-full flex-col items-start border-b border-slate-100 px-3 py-2 text-left text-sm last:border-0 hover:bg-slate-50"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        pick(c);
                      }}
                    >
                      <span className="font-medium text-slate-900">
                        {short ? `${c.nombre} — ${short}` : c.nombre}
                      </span>
                      {c.region_nombre && !short ? (
                        <span className="mt-0.5 text-xs text-slate-500">
                          {c.region_nombre}
                        </span>
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={navigateToComuna}
          className="h-10 shrink-0 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
        >
          {confirmButtonLabel}
        </button>
      </div>
      {hint ? <p className="text-xs text-amber-800">{hint}</p> : null}
    </div>
  );
}

