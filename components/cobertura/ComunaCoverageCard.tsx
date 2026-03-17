import Link from "next/link";

export type ComunaRow = {
  comuna_slug: string;
  comuna_nombre: string;
  region_nombre: string | null;
  estado: "Activo" | "En apertura" | "Sin cobertura";
  total: number;
  meta: number;
  avance: number;
};

type Props = {
  comuna: ComunaRow;
  regionSlug: string;
  qComuna: string;
  isSelected: boolean;
};

function buildComunaUrl(regionSlug: string, comunaSlug: string, qComuna: string): string {
  const params = new URLSearchParams();
  params.set("region", regionSlug);
  params.set("comuna", comunaSlug);
  if (qComuna) params.set("q", qComuna);
  return `/cobertura?${params.toString()}`;
}

export default function ComunaCoverageCard({ comuna, regionSlug, qComuna, isSelected }: Props) {
  const comunaHref = buildComunaUrl(regionSlug, comuna.comuna_slug, qComuna);

  return (
    <article
      className={`rounded-xl border shadow-sm px-4 py-4 flex flex-col gap-2 ${
        isSelected
          ? "border-sky-300 bg-sky-50/50"
          : comuna.estado === "Activo"
            ? "border-slate-200 bg-slate-50"
            : comuna.estado === "En apertura"
              ? "border-yellow-300 bg-yellow-50"
              : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <Link href={comunaHref} className="text-left block">
            <span className="text-base font-bold text-slate-900 hover:text-sky-700 block">
              {comuna.comuna_nombre}
            </span>
            {comuna.region_nombre && (
              <span className="text-xs text-slate-500 mt-0.5 block">
                {comuna.region_nombre}
              </span>
            )}
          </Link>
        </div>
        {comuna.estado === "En apertura" && (
          <span className="text-2xl sm:text-3xl font-extrabold tabular-nums text-slate-900">
            {comuna.avance.toFixed(0)}%
          </span>
        )}
        {comuna.estado !== "En apertura" && (
          <span
            className={
              comuna.estado === "Activo"
                ? "inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200"
                : "inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200"
            }
          >
            {comuna.estado === "Activo" ? "Activo" : "Sin cobertura"}
          </span>
        )}
      </div>

      {comuna.estado === "Activo" && (
        <p className="text-sm text-slate-600">
          {comuna.total} emprendimiento{comuna.total === 1 ? "" : "s"} publicados.
        </p>
      )}
      {comuna.estado === "En apertura" && (
        <>
          <p className="text-sm text-slate-600 tabular-nums">
            {comuna.total} de {comuna.meta} emprendimientos
          </p>
          <div className="mt-1">
            <div className="h-3 w-full rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.max(0, Math.min(comuna.avance, 100))}%`,
                  backgroundColor: "#22c55e",
                }}
              />
            </div>
          </div>
        </>
      )}
      {comuna.estado === "Sin cobertura" && (
        <p className="text-sm text-slate-600">
          0 de {comuna.meta} emprendimientos necesarios.
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-2">
        {comuna.estado === "Activo" && (
          <>
            <Link
              href={`/${encodeURIComponent(comuna.comuna_slug)}`}
              className="inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
              style={{ backgroundColor: "#2563eb" }}
            >
              Explorar comuna
            </Link>
            <Link
              href={comunaHref}
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Ver detalle
            </Link>
          </>
        )}
        {comuna.estado === "En apertura" && (
          <>
            <Link
              href={comunaHref}
              className="inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
              style={{ backgroundColor: "#2563eb" }}
            >
              Ayudar a abrir esta comuna
            </Link>
            <Link
              href={`/abrir-comuna/${encodeURIComponent(comuna.comuna_slug)}`}
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Recomendar un negocio de esta comuna
            </Link>
          </>
        )}
        {comuna.estado === "Sin cobertura" && (
          <>
            <Link
              href={`/publicar?comuna=${encodeURIComponent(comuna.comuna_slug)}`}
              className="inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
              style={{ backgroundColor: "#2563eb" }}
            >
              Publicar mi emprendimiento
            </Link>
            <Link
              href={`/abrir-comuna/${encodeURIComponent(comuna.comuna_slug)}`}
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Recomendar un negocio de esta comuna
            </Link>
            <Link
              href={comunaHref}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Ver detalle
            </Link>
          </>
        )}
      </div>
    </article>
  );
}
