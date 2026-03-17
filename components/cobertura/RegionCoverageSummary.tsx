type Props = {
  regionNombre: string;
  totalComunas: number;
  comunasActivas: number;
  compact?: boolean;
};

export default function RegionCoverageSummary({
  regionNombre,
  totalComunas,
  comunasActivas,
  compact = false,
}: Props) {
  if (totalComunas === 0) return null;
  const pct = Math.round((comunasActivas / totalComunas) * 100);
  if (compact) {
    return (
      <p className="text-xs text-slate-500">
        {regionNombre}: {comunasActivas} de {totalComunas} comunas activas ({pct}% de la región)
      </p>
    );
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-5 sm:px-6 sm:py-6">
      <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
        {regionNombre}
      </h2>
      <p className="text-slate-600 mt-1">
        {comunasActivas} de {totalComunas} comunas activas
      </p>
      <p className="text-4xl font-extrabold text-slate-900 tabular-nums mt-2">
        {pct}% cobertura regional
      </p>
      <div className="mt-4">
        <div className="h-4 w-full rounded-full bg-slate-200 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: "#22c55e" }}
          />
        </div>
      </div>
    </div>
  );
}
