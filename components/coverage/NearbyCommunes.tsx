import Link from "next/link";

export type NearbyComunaItem = {
  name: string;
  slug: string;
  registrados: number;
  meta: number;
  regionSlug: string;
};

type NearbyCommunesProps = {
  comunas: NearbyComunaItem[];
};

export function NearbyCommunes({ comunas }: NearbyCommunesProps) {
  if (comunas.length === 0) {
    return (
      <section className="mb-16 md:mb-20">
        <h2 className="text-2xl font-semibold text-[#111827] mb-2 text-center">
          Comunas más cerca de abrir
        </h2>
        <p className="text-[#6B7280] text-center mb-10">
          No hay otras comunas con avance en esta región por ahora.
        </p>
      </section>
    );
  }

  return (
    <section className="mb-16 md:mb-20">
      <h2 className="text-2xl font-semibold text-[#111827] mb-2 text-center">
        Comunas más cerca de abrir
      </h2>
      <p className="text-[#6B7280] text-center mb-10">
        Estas comunas están a punto de activarse
      </p>

      <div className="max-w-2xl mx-auto space-y-4">
        {comunas.map((comuna) => {
          const pct = comuna.meta > 0 ? Math.round((comuna.registrados / comuna.meta) * 100) : 0;
          const faltan = Math.max(0, comuna.meta - comuna.registrados);
          const href = `/cobertura?region=${encodeURIComponent(comuna.regionSlug)}&comuna=${encodeURIComponent(comuna.slug)}`;
          return (
            <Link
              key={comuna.slug}
              href={href}
              className="flex items-center gap-4 p-4 rounded-lg hover:bg-[#F9FAFB] transition-colors"
            >
              <span className="w-28 text-sm font-medium text-[#111827]">{comuna.name}</span>
              <div className="flex-1 min-w-0">
                <div className="h-2.5 bg-[#F3F4F6] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#16A34A] rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              <span className="w-32 text-sm font-semibold text-right shrink-0">
                faltan <span className="text-amber-500">{faltan}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
