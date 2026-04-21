"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";

type Opcion = { slug: string; nombre: string; emoji?: string };

type Props = {
  opciones: Opcion[];
  categoriaSlugActual: string;
};

function Chevron({ abierto }: { abierto: boolean }) {
  return (
    <svg
      className={`ml-2 h-4 w-4 shrink-0 transition-transform duration-200 ease-out ${
        abierto ? "rotate-180" : ""
      }`}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function CategoriaCambiarSelect({ opciones, categoriaSlugActual }: Props) {
  const router = useRouter();
  const listId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [abierto, setAbierto] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const lista = opciones;
  const currentIndex = Math.max(
    0,
    lista.findIndex((c) => c.slug === categoriaSlugActual)
  );

  const close = useCallback(() => {
    setAbierto(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!abierto) return;
    setHighlight(currentIndex >= 0 ? currentIndex : 0);
  }, [abierto, currentIndex]);

  useEffect(() => {
    if (!abierto) return;
    const el = listboxRef.current;
    if (!el) return;
    const id = requestAnimationFrame(() => {
      el.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return;
    function onPointerDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        if (triggerRef.current?.contains(e.target as Node)) return;
        setAbierto(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [abierto, close]);

  const go = (slug: string) => {
    close();
    if (slug && slug !== categoriaSlugActual) {
      router.push(`/categoria/${encodeURIComponent(slug)}`);
    }
  };

  const onTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setAbierto(true);
    }
  };

  const onListKeyDown = (e: React.KeyboardEvent) => {
    if (lista.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((i) => (i + 1) % lista.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((i) => (i - 1 + lista.length) % lista.length);
    } else if (e.key === "Home") {
      e.preventDefault();
      setHighlight(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setHighlight(lista.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const c = lista[highlight];
      if (c) go(c.slug);
    }
  };

  if (lista.length === 0) return null;

  return (
    <div className="relative shrink-0" ref={panelRef}>
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex h-11 items-center rounded-xl border border-sky-600 bg-sky-600 px-4 text-sm font-bold text-white shadow-md ring-sky-500/40 transition hover:border-sky-700 hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 active:scale-[0.98]"
        aria-expanded={abierto}
        aria-haspopup="listbox"
        aria-controls={abierto ? listId : undefined}
        onClick={() => setAbierto((v) => !v)}
        onKeyDown={onTriggerKeyDown}
      >
        Cambiar categoría
        <Chevron abierto={abierto} />
      </button>

      {abierto ? (
        <div
          ref={listboxRef}
          id={listId}
          role="listbox"
          aria-label="Categorías con servicios publicados"
          aria-activedescendant={`${listId}-opt-${highlight}`}
          tabIndex={-1}
          className="absolute right-0 z-40 mt-2 w-[min(100vw-1.5rem,20rem)] origin-top overflow-hidden rounded-2xl border border-slate-200/90 bg-white py-1.5 shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/5 animate-in fade-in zoom-in-95 duration-150"
          onKeyDown={onListKeyDown}
        >
          <div className="max-h-[min(22rem,70vh)] overflow-y-auto overscroll-contain px-1">
            {lista.map((c, i) => {
              const selected = c.slug === categoriaSlugActual;
              const active = i === highlight;
              return (
                <button
                  key={c.slug}
                  id={`${listId}-opt-${i}`}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                    active
                      ? "bg-sky-50 text-slate-900"
                      : "text-slate-800 hover:bg-slate-50"
                  } ${selected ? "border-l-[3px] border-l-sky-600 pl-[calc(0.75rem-3px)]" : "border-l-[3px] border-l-transparent"}`}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => go(c.slug)}
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-lg leading-none"
                    aria-hidden
                  >
                    {c.emoji ?? "•"}
                  </span>
                  <span className="min-w-0 flex-1 leading-snug">{c.nombre}</span>
                  {selected ? (
                    <span className="shrink-0 text-xs font-bold text-sky-600">Actual</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
