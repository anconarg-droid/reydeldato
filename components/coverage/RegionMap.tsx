import Link from "next/link";

export type ComunaMapItem = {
  slug: string;
  name: string;
  percentage: number;
};

type RegionMapProps = {
  title?: string;
  comunas: ComunaMapItem[];
  currentComunaSlug: string | null;
  regionSlug: string | null;
};

function comunaHref(slug: string, regionSlug: string | null): string {
  if (regionSlug) {
    return `/cobertura?region=${encodeURIComponent(regionSlug)}&comuna=${encodeURIComponent(slug)}`;
  }
  return `/cobertura?comuna=${encodeURIComponent(slug)}`;
}

function colorClass(pct: number, isCurrent: boolean): string {
  if (isCurrent) return "ring-2 ring-[#16A34A] ring-offset-2 bg-[#16A34A] text-white border-[#16A34A]";
  if (pct >= 50) return "bg-[#16A34A] text-white border-[#D1D5DB]";
  if (pct > 0) return "bg-amber-400 text-amber-900 border-amber-400";
  return "bg-gray-100 text-gray-600 border-[#E5E7EB]";
}

export function RegionMap({
  title = "Mapa de avance de la región",
  comunas,
  currentComunaSlug,
  regionSlug,
}: RegionMapProps) {
  if (comunas.length === 0) {
    return (
      <section className="rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] p-8 shadow-sm">
        <h2 className="text-xl font-bold text-[#111827]">{title}</h2>
        <p className="mt-2 text-[#6B7280]">No hay comunas en esta región.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border-2 border-[#E5E7EB] bg-[#FFFFFF] p-6 shadow-md sm:p-8">
      <h2 className="text-xl font-bold text-[#111827] sm:text-2xl">{title}</h2>
      <p className="mt-1 text-sm text-[#6B7280]">
        Tu comuna destacada. Haz clic en otra para ver su avance.
      </p>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4">
        {comunas.map((c) => {
          const isCurrent = currentComunaSlug !== null && c.slug === currentComunaSlug;
          return (
            <Link
              key={c.slug}
              href={comunaHref(c.slug, regionSlug)}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 px-4 py-3 text-center text-sm font-medium transition-colors hover:opacity-95 sm:py-4 ${colorClass(c.percentage, isCurrent)} ${isCurrent ? "shadow-md" : ""}`}
            >
              <span className="line-clamp-1 w-full">{c.name}</span>
              <span className="tabular-nums text-xs opacity-90">{c.percentage}%</span>
              {isCurrent && (
                <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide opacity-90">
                  Tu comuna
                </span>
              )}
            </Link>
          );
        })}
      </div>
      <p className="mt-5 flex flex-wrap items-center gap-4 text-xs text-[#6B7280]">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#16A34A]" /> Avance alto
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Avance medio
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-gray-200" /> Sin avance
        </span>
      </p>
    </section>
  );
}
