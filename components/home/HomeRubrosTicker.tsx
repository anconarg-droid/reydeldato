import type { RubroTickerItem } from "@/lib/loadRubrosTickerHome";

const MIN_RUBROS = 5;

function TickerSegment({
  items,
  segmentKey,
}: {
  items: RubroTickerItem[];
  segmentKey: string;
}) {
  return (
    <div className="flex shrink-0 items-center gap-0 pr-10">
      {items.map((item, i) => (
        <span key={`${segmentKey}-${item.slug}`} className="flex shrink-0 items-center">
          {i > 0 ? (
            <span
              className="mx-2 shrink-0 select-none text-[#0f766e]"
              aria-hidden
            >
              ·
            </span>
          ) : null}
          <span className="shrink-0 whitespace-nowrap text-[13px] text-slate-600">
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
      className="home-rubros-ticker mx-auto mt-3 w-full max-w-[680px]"
      role="region"
      aria-label="Rubros con negocios publicados"
    >
      <div className="home-rubros-ticker__track">
        <TickerSegment items={items} segmentKey="a" />
        <TickerSegment items={items} segmentKey="b" />
      </div>
    </div>
  );
}
