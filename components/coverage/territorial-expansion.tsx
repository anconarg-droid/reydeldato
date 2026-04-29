import { SectionCard } from "@/components/ui/section-card";
import { SectionHeader } from "@/components/ui/section-header";
import { ProgressBar } from "@/components/ui/progress-bar";

type RegionItem = {
  name: string;
  active: number;
  total: number;
};

type TerritorialExpansionProps = {
  countryActive: number;
  countryTotal: number;
  regionName: string;
  regionActive: number;
  regionTotal: number;
  regions: RegionItem[];
};

function getPercentage(active: number, total: number): number {
  return total > 0 ? Math.round((active / total) * 100) : 0;
}

function progressVariant(pct: number): "progress" | "warning" | "muted" {
  if (pct === 0) return "muted";
  if (pct >= 100) return "progress";
  return "warning";
}

function cardBorderClass(pct: number): string {
  if (pct === 0) return "border-slate-200";
  if (pct >= 100) return "border-emerald-200";
  return "border-amber-200";
}

export function TerritorialExpansion({
  countryActive,
  countryTotal,
  regionName,
  regionActive,
  regionTotal,
  regions,
}: TerritorialExpansionProps) {
  const countryPct = getPercentage(countryActive, countryTotal);
  const regionPct = getPercentage(regionActive, regionTotal);

  return (
    <SectionCard variant="panel" className="rounded-2xl">
      <SectionHeader
        title="Expansión de Rey del Dato en Chile"
        subtitle="Estamos activando comunas paso a paso. Revisa el avance nacional, regional y de tu comuna."
      />

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className={`rounded-xl border-2 bg-white p-5 shadow-sm ${cardBorderClass(countryPct)}`}>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Nacional</p>
          <h3 className="mt-1 text-xl font-bold text-slate-900">Chile</h3>
          <p className="mt-2 text-sm text-slate-600 tabular-nums">
            {countryActive} de {countryTotal} comunas activas
          </p>
          <p className="mt-1 text-2xl font-extrabold tabular-nums text-slate-900">{countryPct}%</p>
          <div className="mt-4">
            <ProgressBar percentage={countryPct} variant={progressVariant(countryPct)} height="h-5" />
          </div>
        </div>

        <div className={`rounded-xl border-2 bg-white p-5 shadow-sm ${cardBorderClass(regionPct)}`}>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Tu región</p>
          <h3 className="mt-1 text-xl font-bold text-slate-900">{regionName || "—"}</h3>
          <p className="mt-2 text-sm text-slate-600 tabular-nums">
            {regionActive} de {regionTotal} comunas activas
          </p>
          <p className="mt-1 text-2xl font-extrabold tabular-nums text-slate-900">{regionPct}%</p>
          <div className="mt-4">
            <ProgressBar percentage={regionPct} variant={progressVariant(regionPct)} height="h-5" />
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h4 className="text-base font-semibold text-slate-800">Avance por región</h4>
        <ul className="mt-4 space-y-2">
          {regions.map((r) => {
            const pct = getPercentage(r.active, r.total);
            const isSelected = r.name === regionName;
            return (
              <li
                key={r.name}
                className={`flex items-center gap-3 rounded-xl border bg-white px-4 py-3 ${
                  isSelected ? "border-slate-300 ring-2 ring-slate-200" : "border-slate-100"
                }`}
              >
                <span className="w-40 shrink-0 text-sm font-medium text-slate-900 sm:w-52">
                  {r.name}
                  {isSelected && <span className="ml-1.5 text-xs text-slate-500">(actual)</span>}
                </span>
                <span className="w-10 shrink-0 text-right text-sm font-bold tabular-nums text-slate-700">
                  {pct}%
                </span>
                <div className="min-w-[80px] flex-1 sm:min-w-[120px]">
                  <ProgressBar percentage={pct} variant={progressVariant(pct)} height="h-2.5" />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </SectionCard>
  );
}
