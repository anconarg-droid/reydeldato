import type { RubroTickerItem } from "@/lib/loadRubrosTickerHome";

const MIN_RUBROS = 5;

/** Copias del listado en el track; sincronizar con `@keyframes ticker` en globals.css (-100%/copies). */
const TICKER_COPIES = 4 as const;

function TickerSegment({
  items,
  segmentKey,
  ariaHidden,
}: {
  items: RubroTickerItem[];
  segmentKey: string;
  /** Copias extra del marquee: ocultas en AT para no repetir el listado. */
  ariaHidden?: boolean;
}) {
  return (
    <div
      className="flex shrink-0 cursor-default items-center gap-0 pr-14"
      aria-hidden={ariaHidden ? true : undefined}
    >
      {items.map((item, i) => (
        <span
          key={`${segmentKey}-${item.slug}`}
          className="flex shrink-0 cursor-default items-center"
        >
          {i > 0 ? (
            <span
              className="mx-2 shrink-0 select-none text-[#0f766e]"
              aria-hidden
            >
              ·
            </span>
          ) : null}
          <span className="shrink-0 cursor-default whitespace-nowrap text-[13px] text-slate-500">
            {item.label}
          </span>
        </span>
      ))}
    </div>
  );
}

export default function HomeRubrosTicker({
  items,
}: {
  items: RubroTickerItem[];
}) {
  if (items.length < MIN_RUBROS) return null;

  return (
    <div
      className="home-rubros-ticker mx-auto mt-3 w-full max-w-[680px] cursor-default"
      role="region"
      aria-labelledby="home-rubros-ticker-heading"
    >
      <p
        id="home-rubros-ticker-heading"
        className="mb-1.5 text-center text-[11px] font-medium leading-snug text-slate-500"
      >
        Ejemplos de servicios que puedes buscar
      </p>
      <div className="home-rubros-ticker-track cursor-default">
        {Array.from({ length: TICKER_COPIES }, (_, i) => (
          <TickerSegment
            key={i}
            items={items}
            segmentKey={`s${i}`}
            ariaHidden={i > 0}
          />
        ))}
      </div>
    </div>
  );
}
