import Link from "next/link";

export type RegionSidebarItem = {
  name: string;
  slug: string;
  active: number;
  total: number;
};

type RegionSidebarProps = {
  title?: string;
  regions: RegionSidebarItem[];
  currentRegionSlug: string | null;
};

export function RegionSidebar({
  title = "Todas las regiones",
  regions,
  currentRegionSlug,
}: RegionSidebarProps) {
  return (
    <section className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-[#6B7280]">{title}</h2>
      <p className="mt-0.5 text-xs text-[#9CA3AF]">
        Haz clic en una región para ver su mapa.
      </p>
      <ul className="mt-3 space-y-1">
        {regions.map((r) => {
          const pct = r.total > 0 ? Math.round((r.active / r.total) * 100) : 0;
          const isCurrent = currentRegionSlug !== null && r.slug === currentRegionSlug;
          const href = `/cobertura?region=${encodeURIComponent(r.slug)}`;
          return (
            <li key={r.slug}>
              <Link
                href={href}
                className={`flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                  isCurrent
                    ? "bg-[#16A34A]/10 font-medium text-[#111827]"
                    : "text-[#6B7280] hover:bg-white hover:text-[#374151]"
                }`}
              >
                <span className="min-w-0 truncate">{r.name}</span>
                <span className="shrink-0 tabular-nums text-[#9CA3AF]">{pct}%</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
