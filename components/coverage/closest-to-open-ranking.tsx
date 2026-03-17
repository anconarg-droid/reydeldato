import Link from "next/link";
import { SectionCard } from "@/components/ui/section-card";
import { SectionHeader } from "@/components/ui/section-header";
import { ProgressBar } from "@/components/ui/progress-bar";

type RankedCity = {
  name: string;
  percentage: number;
  slug?: string;
};

type ClosestToOpenRankingProps = {
  cities: RankedCity[];
  regionSlug?: string | null;
};

function comunaHref(comunaSlug: string, regionSlug?: string | null): string {
  const slug = encodeURIComponent(comunaSlug);
  if (regionSlug) return `/cobertura?region=${encodeURIComponent(regionSlug)}&comuna=${slug}`;
  return `/cobertura?comuna=${slug}`;
}

function getStatusLabel(pct: number): string {
  if (pct >= 70) return "Muy cerca de abrir";
  if (pct >= 40) return "En avance";
  if (pct > 0) return "En construcción";
  return "Sin avance";
}

function getStatusClass(pct: number): string {
  if (pct >= 70) return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (pct >= 40) return "bg-amber-100 text-amber-800 border-amber-200";
  if (pct > 0) return "bg-sky-100 text-sky-800 border-sky-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

export function ClosestToOpenRanking({ cities, regionSlug }: ClosestToOpenRankingProps) {
  const top5 = cities.slice(0, 5);

  return (
    <SectionCard className="rounded-2xl">
      <SectionHeader
        title="Comunas más cerca de abrir"
        subtitle="Estas comunas ya tienen avance. Si más emprendedores se registran, pueden abrir antes."
      />
      <ul className="mt-6 space-y-3">
        {top5.map((city, i) => {
          const status = getStatusLabel(city.percentage);
          const statusClass = getStatusClass(city.percentage);
          return (
            <li key={city.name}>
              <Link
                href={comunaHref(city.slug ?? city.name.toLowerCase().replace(/\s+/g, "-"), regionSlug)}
                className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition-colors hover:bg-slate-100 hover:border-slate-300 sm:flex-row sm:items-center"
              >
                <div className="flex flex-1 items-center gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-700">
                    {i + 1}
                  </span>
                  <span className="font-semibold text-slate-900">{city.name}</span>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusClass}`}
                  >
                    {status}
                  </span>
                </div>
                <div className="flex flex-1 items-center gap-3 sm:flex-initial">
                  <span className="w-12 text-right text-xl font-bold tabular-nums text-slate-900">
                    {city.percentage}%
                  </span>
                  <div className="min-w-[100px] flex-1 sm:min-w-[140px] sm:w-40">
                    <ProgressBar percentage={city.percentage} variant="progress" height="h-4" />
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}
