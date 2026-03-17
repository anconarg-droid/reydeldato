import Link from "next/link";
import { SectionCard } from "@/components/ui/section-card";
import { SectionHeader } from "@/components/ui/section-header";
import { ProgressBar } from "@/components/ui/progress-bar";

type RankedCity = {
  name: string;
  percentage: number;
  slug?: string;
};

type CityRankingProps = {
  cities: RankedCity[];
  regionSlug?: string | null;
};

function comunaHref(comunaSlug: string, regionSlug?: string | null): string {
  const slug = encodeURIComponent(comunaSlug);
  if (regionSlug) return `/cobertura?region=${encodeURIComponent(regionSlug)}&comuna=${slug}`;
  return `/cobertura?comuna=${slug}`;
}

export function CityRanking({ cities, regionSlug }: CityRankingProps) {
  return (
    <SectionCard className="p-6">
      <SectionHeader
        title="Comunas más cerca de abrir"
        subtitle="Ordenadas por avance"
      />
      <ul className="mt-5 space-y-3">
        {cities.map((city, i) => (
          <li key={city.name}>
            <Link
              href={comunaHref(city.slug ?? city.name.toLowerCase().replace(/\s+/g, "-"), regionSlug)}
              className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50/50 p-3 transition-colors hover:bg-slate-100 hover:border-slate-200 sm:flex-row sm:items-center"
            >
              <div className="flex flex-1 items-center gap-2">
                <span className="w-5 text-xs font-medium tabular-nums text-slate-400">
                  {i + 1}
                </span>
                <span className="font-semibold text-slate-900">{city.name}</span>
              </div>
              <div className="flex flex-1 items-center gap-3">
                <span className="w-12 text-xl font-bold tabular-nums text-slate-900">
                  {city.percentage}%
                </span>
                <div className="min-w-0 flex-1">
                  <ProgressBar percentage={city.percentage} variant="progress" height="h-2.5" />
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
