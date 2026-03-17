import { SectionCard } from "@/components/ui/section-card";
import { SectionHeader } from "@/components/ui/section-header";
import { ProgressBar } from "@/components/ui/progress-bar";

type ComunaRow = {
  name: string;
  percentage: number;
  isCurrent?: boolean;
};

type ComunaComparisonProps = {
  currentComuna: { name: string; percentage: number };
  otherComunas: { name: string; percentage: number }[];
};

export function ComunaComparison({ currentComuna, otherComunas }: ComunaComparisonProps) {
  const rows: ComunaRow[] = [
    { ...currentComuna, isCurrent: true },
    ...otherComunas.slice(0, 4).map((c) => ({ ...c, isCurrent: false })),
  ].sort((a, b) => b.percentage - a.percentage);

  return (
    <SectionCard className="rounded-2xl">
      <SectionHeader
        title="Así va tu comuna frente a otras"
        subtitle="Cada negocio registrado puede subir a tu comuna en este ranking y acercarla a su apertura."
      />
      <ul className="mt-6 space-y-3">
        {rows.map((row, i) => (
          <li
            key={row.name}
            className={`flex flex-col gap-2 rounded-xl border p-4 sm:flex-row sm:items-center ${
              row.isCurrent
                ? "border-sky-300 bg-sky-50/80 ring-2 ring-sky-200"
                : "border-slate-200 bg-slate-50/50"
            }`}
          >
            <div className="flex flex-1 items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-700">
                {i + 1}
              </span>
              <span className="font-semibold text-slate-900">{row.name}</span>
              {row.isCurrent && (
                <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-800 border border-sky-200">
                  Tu comuna
                </span>
              )}
            </div>
            <div className="flex min-w-0 flex-1 items-center gap-3 sm:w-56">
              <span className="w-12 shrink-0 text-right text-xl font-bold tabular-nums text-slate-900">
                {row.percentage}%
              </span>
              <div className="min-w-0 flex-1">
                <ProgressBar percentage={row.percentage} variant="progress" height="h-4" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
