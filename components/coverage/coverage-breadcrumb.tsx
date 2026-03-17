import Link from "next/link";

type CoverageBreadcrumbProps = {
  regionSlug: string | null;
  regionName: string | null;
  comunaSlug: string | null;
  comunaName: string | null;
};

export function CoverageBreadcrumb({
  regionSlug,
  regionName,
  comunaSlug,
  comunaName,
}: CoverageBreadcrumbProps) {
  const hasRegion = regionName != null && regionName !== "";
  const hasComuna = comunaName != null && comunaName !== "";
  const regionHref = regionSlug ? `/cobertura?region=${encodeURIComponent(regionSlug)}` : "/cobertura";

  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-slate-600">
        <li>
          <Link href="/" className="hover:text-slate-900 transition-colors">
            Inicio
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <Link href="/cobertura" className="hover:text-slate-900 transition-colors">
            Cobertura
          </Link>
        </li>
        {hasRegion && (
          <>
            <li aria-hidden="true">/</li>
            <li>
              {comunaSlug ? (
                <Link href={regionHref} className="hover:text-slate-900 transition-colors">
                  {regionName}
                </Link>
              ) : (
                <span className="font-medium text-slate-900">{regionName}</span>
              )}
            </li>
          </>
        )}
        {hasComuna && (
          <>
            <li aria-hidden="true">/</li>
            <li>
              <span className="font-medium text-slate-900">{comunaName}</span>
            </li>
          </>
        )}
      </ol>
    </nav>
  );
}
