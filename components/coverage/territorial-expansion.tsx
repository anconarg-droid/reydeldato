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

/**
 * Calcula el porcentaje de avance (active / total * 100) redondeado.
 */
function getPercentage(active: number, total: number): number {
  return total > 0 ? Math.round((active / total) * 100) : 0;
}

/**
 * Devuelve la clase de color de la barra según estado:
 * 0% => gris, 1-99% => ámbar, 100% => verde.
 */
function barColor(pct: number): string {
  if (pct === 0) return "bg-slate-300";
  if (pct >= 100) return "bg-emerald-500";
  return "bg-amber-500";
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
    <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-6 shadow-sm sm:p-8">
      <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
        Expansión de Rey del Dato en Chile
      </h2>
      <p className="mt-2 text-slate-600 max-w-2xl">
        Estamos activando comunas paso a paso. Revisa el avance nacional, regional y de tu comuna.
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {/* Tarjeta país */}
        <div
          className={`rounded-xl border-2 bg-white p-5 shadow-sm ${cardBorderClass(countryPct)}`}
        >
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Nacional
          </p>
          <h3 className="mt-1 text-xl font-bold text-slate-900">Chile</h3>
          <p className="mt-2 text-sm text-slate-600 tabular-nums">
            {countryActive} de {countryTotal} comunas activas
          </p>
          <p className="mt-1 text-2xl font-extrabold tabular-nums text-slate-900">
            {countryPct}%
          </p>
          <div className="mt-4">
            <div className="h-5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all ${barColor(countryPct)}`}
                style={{ width: `${Math.min(countryPct, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tarjeta región seleccionada */}
        <div
          className={`rounded-xl border-2 bg-white p-5 shadow-sm ${cardBorderClass(regionPct)}`}
        >
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Tu región
          </p>
          <h3 className="mt-1 text-xl font-bold text-slate-900">{regionName}</h3>
          <p className="mt-2 text-sm text-slate-600 tabular-nums">
            {regionActive} de {regionTotal} comunas activas
          </p>
          <p className="mt-1 text-2xl font-extrabold tabular-nums text-slate-900">
            {regionPct}%
          </p>
          <div className="mt-4">
            <div className="h-5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all ${barColor(regionPct)}`}
                style={{ width: `${Math.min(regionPct, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Lista de regiones */}
      <div className="mt-8">
        <h4 className="text-base font-semibold text-slate-800">
          Avance por región
        </h4>
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
                  {isSelected && (
                    <span className="ml-1.5 text-xs text-slate-500">(actual)</span>
                  )}
                </span>
                <span className="w-10 shrink-0 text-right text-sm font-bold tabular-nums text-slate-700">
                  {pct}%
                </span>
                <div className="min-w-[80px] flex-1 sm:min-w-[120px]">
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all ${barColor(pct)}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
