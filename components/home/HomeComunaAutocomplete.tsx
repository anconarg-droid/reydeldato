"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getRegionShort } from "@/utils/regionShort";

type ComunaSuggestion = {
  nombre: string;
  slug: string;
  region_nombre?: string;
};

export default function HomeComunaAutocomplete({
  placeholder = "Buscar comuna…",
  containerClassName = "relative w-40 sm:w-56",
  inputClassName = "h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400",
}: {
  placeholder?: string;
  containerClassName?: string;
  inputClassName?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ComunaSuggestion[]>([]);
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

  const pick = useCallback(
    (c: ComunaSuggestion) => {
      setOpen(false);
      setItems([]);
      setValue("");
      router.push(`/${encodeURIComponent(c.slug)}`);
    },
    [router]
  );

  return (
    <div ref={boxRef} className={containerClassName}>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (value.trim().length >= 2) setOpen(true);
        }}
        placeholder={placeholder}
        aria-label="Buscar comuna"
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
                    // onMouseDown evita que el blur cierre antes de seleccionar
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
  );
}

