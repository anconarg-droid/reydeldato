"use client";

import { useRouter, useSearchParams } from "next/navigation";

type ComunaItem = {
  slug: string;
  name: string;
};

type ComunaSelectorProps = {
  comunas: ComunaItem[];
  currentComunaSlug: string | null;
  regionSlug: string;
};

export function ComunaSelector({
  comunas,
  currentComunaSlug,
  regionSlug,
}: ComunaSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const comunaSlug = e.target.value;
    if (!comunaSlug) {
      router.push(`/cobertura?region=${encodeURIComponent(regionSlug)}`);
      return;
    }
    router.push(
      `/cobertura?region=${encodeURIComponent(regionSlug)}&comuna=${encodeURIComponent(comunaSlug)}`
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor="coverage-comuna" className="text-sm font-medium text-slate-700">
        Comuna:
      </label>
      <select
        id="coverage-comuna"
        value={currentComunaSlug || ""}
        onChange={handleChange}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
      >
        <option value="">Todas las comunas</option>
        {comunas.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}
