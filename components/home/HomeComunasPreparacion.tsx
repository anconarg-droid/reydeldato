"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

export type ComunaPreparacionItem = {
  slug: string;
  /** Nombre legible desde API; si falta, se usa el slug. */
  nombre: string;
  porcentaje: number;
  /** Meta: servicios clave requeridos (vista); misma noción que /abrir-comuna. */
  total_requerido?: number | null;
  total_cumplido?: number | null;
  faltantesTop: Array<{ subcategoria: string; faltan: number }>;
};

const CAROUSEL_STRIDE = 272;

function prettySlug(slug: string) {
  return slug
    .replace(/-/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function getPreparacionCardMeta(c: ComunaPreparacionItem) {
  const meta = c.total_requerido;
  let cumplido =
    c.total_cumplido != null && Number.isFinite(c.total_cumplido)
      ? Math.max(0, Math.floor(c.total_cumplido))
      : null;
  if (meta != null && meta > 0 && cumplido == null && Number.isFinite(c.porcentaje)) {
    cumplido = Math.min(meta, Math.round((meta * Math.max(0, Math.min(100, c.porcentaje))) / 100));
  }

  let faltanLine: string;
  if (meta != null && meta > 0 && cumplido != null) {
    const faltan = Math.max(0, meta - cumplido);
    faltanLine =
      faltan === 1
        ? "Falta 1 negocio clave para completar mejor el catálogo"
        : `Faltan ${faltan} negocios clave para completar mejor el catálogo`;
  } else {
    const totalFaltanRubros = c.faltantesTop.reduce((acc, f) => acc + Math.max(0, f.faltan), 0);
    faltanLine =
      totalFaltanRubros > 0
        ? totalFaltanRubros === 1
          ? "Falta 1 negocio clave por cubrir"
          : `Faltan ${totalFaltanRubros} negocios clave por cubrir`
        : "Seguimos sumando oferta para completar mejor el catálogo.";
  }

  return { meta, cumplido, faltanLine };
}

function usePreparacionCarouselDots(itemCount: number) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const scroll = useCallback((dir: number) => {
    trackRef.current?.scrollBy({ left: dir * 280, behavior: "smooth" });
  }, []);
  useEffect(() => {
    const el = trackRef.current;
    if (!el || itemCount <= 0) return;
    const onScroll = () => {
      const max = Math.max(0, el.scrollWidth - el.clientWidth);
      let idx = Math.round(el.scrollLeft / CAROUSEL_STRIDE);
      if (max > 0 && el.scrollLeft >= max - 8) idx = itemCount - 1;
      setActiveIndex(Math.max(0, Math.min(itemCount - 1, idx)));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, [itemCount]);
  return { trackRef, activeIndex, scroll };
}

function HomeComunasPreparacionMobile({ items }: { items: ComunaPreparacionItem[] }) {
  const { trackRef, activeIndex, scroll } = usePreparacionCarouselDots(items.length);

  return (
    <div className="md:hidden">
      <div className="flex justify-between items-end mb-2">
        <div>
          <h2 id="comunas-preparacion-heading" className="text-lg font-medium text-gray-900">
            Comunas en crecimiento
          </h2>
          <p className="text-[11px] text-gray-500 mt-0.5">Desliza para ver más →</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => scroll(-1)}
            className="w-9 h-9 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-700"
            aria-label="Anterior"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            className="w-9 h-9 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-700"
            aria-label="Siguiente"
          >
            ›
          </button>
        </div>
      </div>
      <div
        ref={trackRef}
        className="flex gap-2 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-1.5"
      >
        {items.map((c) => {
          const { meta, cumplido, faltanLine } = getPreparacionCardMeta(c);
          const href = `/abrir-comuna/${encodeURIComponent(c.slug)}`;
          return (
            <div
              key={c.slug}
              className="flex-shrink-0 w-[250px] snap-start bg-white border border-gray-200 rounded-lg p-3 flex flex-col"
            >
              <div className="flex items-start justify-between gap-1.5">
                <h3 className="text-sm font-semibold leading-tight text-gray-900">
                  {c.nombre || prettySlug(c.slug)}
                </h3>
                <span className="shrink-0 text-[11px] font-semibold tabular-nums text-gray-600">
                  {c.porcentaje}%
                </span>
              </div>
              <div className="mt-1.5 h-0.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-[#0F6E56] transition-[width] duration-300"
                  style={{ width: `${Math.max(0, Math.min(100, c.porcentaje))}%` }}
                />
              </div>
              {meta != null && meta > 0 && cumplido != null ? (
                <p className="mt-1.5 text-[11px] font-medium tabular-nums text-gray-700">
                  {cumplido}/{meta} clave{meta === 1 ? "" : "s"}
                </p>
              ) : null}
              <p className="mt-1.5 text-[11px] text-gray-600 leading-snug line-clamp-2">{faltanLine}</p>
              <Link
                href={href}
                className="mt-2.5 inline-flex w-full items-center justify-center rounded-md border border-[#0F6E56] px-3 py-1.5 text-xs font-medium text-[#0F6E56]"
              >
                Ver avance →
              </Link>
            </div>
          );
        })}
      </div>
      <div className="flex gap-1.5 mt-2">
        {items.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              activeIndex === i ? "w-5 bg-[#0F6E56]" : "w-1.5 bg-gray-200"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

const PREPARACION_DESKTOP_INITIAL = 4;

export default function HomeComunasPreparacion({
  items,
  flush = false,
}: {
  items: ComunaPreparacionItem[];
  /** Sin margen/borde propios: útil cuando el bloque va dentro de otra `<section>` de página. */
  flush?: boolean;
}) {
  const [desktopPrepExpanded, setDesktopPrepExpanded] = useState(false);

  if (!items.length) return null;

  const desktopItems =
    desktopPrepExpanded || items.length <= PREPARACION_DESKTOP_INITIAL
      ? items
      : items.slice(0, PREPARACION_DESKTOP_INITIAL);
  const showVerMasDesktop =
    items.length > PREPARACION_DESKTOP_INITIAL && !desktopPrepExpanded;

  return (
    <section
      className={
        flush ? "" : "mt-8 sm:mt-10 border-t border-slate-100 pt-6 sm:pt-8"
      }
      aria-labelledby="comunas-preparacion-heading"
    >
      <HomeComunasPreparacionMobile items={items} />
      <div className="hidden md:block">
        <p className="max-w-2xl text-[15px] leading-snug text-slate-900">
          Estamos completando el catálogo comuna por comuna. Algunas comunas ya muestran resultados, pero todavía
          necesitan más negocios clave para que el directorio sea más útil.
        </p>
        <h2 className="mt-2.5 text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
          Comunas en crecimiento
        </h2>
        <p className="mt-1 max-w-2xl text-xs leading-snug text-slate-600">
          Mientras más negocios reales se suman, mejores resultados muestra cada comuna.
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2 max-w-3xl">
          {desktopItems.map((c) => {
            const { meta, cumplido, faltanLine } = getPreparacionCardMeta(c);

            return (
              <Link
                key={c.slug}
                href={`/abrir-comuna/${encodeURIComponent(c.slug)}`}
                className="group flex h-full min-h-0 flex-col rounded-lg border border-slate-200/90 bg-white p-3 transition-all duration-200 hover:border-slate-300 hover:shadow-sm active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
              >
                <div className="flex items-start justify-between gap-1.5">
                  <h3 className="text-sm font-semibold leading-tight text-slate-900">
                    {c.nombre || prettySlug(c.slug)}
                  </h3>
                  <span className="shrink-0 text-[11px] font-semibold tabular-nums text-slate-500">
                    {c.porcentaje}%
                  </span>
                </div>

                <div className="mt-1.5 h-0.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-[#0f766e] transition-[width] duration-300"
                    style={{ width: `${Math.max(0, Math.min(100, c.porcentaje))}%` }}
                  />
                </div>

                {meta != null && meta > 0 && cumplido != null ? (
                  <p className="mt-1.5 text-[11px] font-medium tabular-nums text-slate-700">
                    {cumplido}/{meta} clave{meta === 1 ? "" : "s"}
                  </p>
                ) : null}

                <p className="mt-1.5 line-clamp-2 text-xs font-medium leading-snug text-slate-800">
                  {faltanLine}
                </p>

                <span className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-[#0f766e] px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-all duration-200 sm:w-auto">
                  Ver avance →
                </span>
              </Link>
            );
          })}
        </div>
        {showVerMasDesktop ? (
          <div className="mt-2.5 flex justify-center sm:justify-start">
            <button
              type="button"
              onClick={() => setDesktopPrepExpanded(true)}
              className="text-xs font-semibold text-[#0f766e] underline-offset-2 hover:underline"
            >
              Ver más comunas →
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
