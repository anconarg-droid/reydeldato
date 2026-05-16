"use client";

import {
  forwardRef,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { RubroTickerItem } from "@/lib/loadRubrosTickerHome";

const MIN_RUBROS = 5;
/** Ejemplos fijos (servicios típicos) al inicio del ticker: se mezclan con rubros reales del directorio. */
const EJEMPLOS_SERVICIOS_FIJOS: RubroTickerItem[] = [
  { slug: "_ej-gasfiter", label: "Gasfiter" },
  { slug: "_ej-electricista", label: "Electricista" },
];
/** Límite de ciclos del array base por mitad (evita bucle infinito si un ítem es más ancho que el clip). */
const MAX_REPEATS = 80;

function formatRubro(str: string): string {
  return str
    .replace(/_/g, " ")
    .trim()
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

function expandItems(items: RubroTickerItem[], repeats: number): RubroTickerItem[] {
  const out: RubroTickerItem[] = [];
  for (let r = 0; r < repeats; r++) {
    for (const it of items) out.push(it);
  }
  return out;
}

const TickerRow = forwardRef<
  HTMLDivElement,
  {
    rows: RubroTickerItem[];
    rowKey: string;
    ariaHidden?: boolean;
  }
>(function TickerRow({ rows, rowKey, ariaHidden }, ref) {
  return (
    <div
      ref={ref}
      className="flex shrink-0 flex-row flex-nowrap items-center gap-x-5"
      aria-hidden={ariaHidden ? true : undefined}
    >
      {rows.map((item, i) => (
        <span
          key={`${rowKey}-${i}-${item.slug}`}
          className="flex shrink-0 items-center gap-x-2"
        >
          {i > 0 ? (
            <span
              className="shrink-0 select-none text-[#0f766e]"
              aria-hidden
            >
              ·
            </span>
          ) : null}
          <span className="shrink-0 whitespace-nowrap text-[13px] text-slate-500 select-none">
            {formatRubro(item.label)}
          </span>
        </span>
      ))}
    </div>
  );
});

TickerRow.displayName = "TickerRow";

export default function HomeRubrosTicker({
  items,
}: {
  items: RubroTickerItem[];
}) {
  const clipRef = useRef<HTMLDivElement>(null);
  const segRef = useRef<HTMLDivElement>(null);
  const [repeats, setRepeats] = useState(1);

  const mergedItems = useMemo(
    () => [...EJEMPLOS_SERVICIOS_FIJOS, ...items],
    [items],
  );

  const segmentRows = useMemo(
    () => expandItems(mergedItems, repeats),
    [mergedItems, repeats],
  );

  useLayoutEffect(() => {
    const clip = clipRef.current;
    const seg = segRef.current;
    if (!clip || !seg) return;

    const measure = () => {
      const w = clip.clientWidth;
      const segW = seg.getBoundingClientRect().width;
      if (w <= 0 || segW <= 0) return;
      if (segW < w && repeats < MAX_REPEATS) {
        setRepeats((r) => r + 1);
      }
    };

    measure();
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(measure);
    });
    ro.observe(clip);
    return () => ro.disconnect();
  }, [mergedItems, repeats]);

  if (mergedItems.length < MIN_RUBROS) return null;

  return (
    <div
      className="rubros-ticker-wrapper mx-auto mt-1.5 w-full max-w-[680px] select-none px-3 sm:mt-2 sm:px-4"
      role="region"
      aria-label="Ejemplos de búsqueda: servicios y comercios publicados en el directorio"
    >
      <span className="sr-only">
        Ejemplos para buscar: incluye servicios como gasfiter o electricista, y comercios según rubros publicados.
      </span>
      <div
        ref={clipRef}
        className="rubros-ticker-clip pointer-events-none overflow-hidden px-1"
      >
        <div className="rubros-ticker-track flex w-max flex-nowrap items-center">
          <TickerRow ref={segRef} rows={segmentRows} rowKey="a" />
          <TickerRow rows={segmentRows} rowKey="b" ariaHidden />
        </div>
      </div>
    </div>
  );
}
