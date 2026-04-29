import type { RubroTickerItem } from "@/lib/loadRubrosTickerHome";

const MIN_RUBROS = 5;

function formatRubro(str: string): string {
  return str
    .replace(/_/g, " ")
    .trim()
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

function RubrosTickerHalf({
  items,
  segmentKey,
  ariaHidden,
}: {
  items: RubroTickerItem[];
  segmentKey: string;
  /** Segunda copia: oculta en AT para no repetir el listado. */
  ariaHidden?: boolean;
}) {
  return (
    <div
      className="flex shrink-0 cursor-default flex-row flex-nowrap items-center"
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
            {formatRubro(item.label)}
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
      className="ticker-wrap mx-auto mt-3 w-full max-w-[680px] cursor-default"
      role="region"
      aria-labelledby="home-rubros-ticker-heading"
    >
      <p
        id="home-rubros-ticker-heading"
        className="mb-1.5 text-center text-[11px] font-medium leading-snug text-slate-500"
      >
        Ejemplos de servicios que puedes buscar
      </p>
      <div className="ticker-track cursor-default">
        <RubrosTickerHalf items={items} segmentKey="a" />
        <RubrosTickerHalf items={items} segmentKey="b" ariaHidden />
      </div>
    </div>
  );
}
