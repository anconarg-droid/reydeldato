"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Region = {
  name: string;
  slug: string;
  active: number;
  total: number;
};

type RegionSelectorProps = {
  regions: Region[];
  currentRegionSlug: string;
};

export function RegionSelector({ regions, currentRegionSlug }: RegionSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const slug = e.target.value;
    if (!slug) {
      router.push("/cobertura");
      return;
    }
    const comuna = searchParams.get("comuna");
    const url = comuna
      ? `/cobertura?region=${encodeURIComponent(slug)}&comuna=${encodeURIComponent(comuna)}`
      : `/cobertura?region=${encodeURIComponent(slug)}`;
    router.push(url);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor="coverage-region" className="text-sm font-medium text-slate-700">
        Región:
      </label>
      <select
        id="coverage-region"
        value={currentRegionSlug || ""}
        onChange={handleChange}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
      >
        <option value="">Todas las regiones</option>
        {regions.map((r) => (
          <option key={r.slug} value={r.slug}>
            {r.name}
          </option>
        ))}
      </select>
    </div>
  );
}
