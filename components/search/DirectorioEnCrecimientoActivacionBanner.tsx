import Link from "next/link";

type Props = {
  tituloComunaDisplay: string;
  comunaTituloConRegion: string;
  regionNombreActivacion?: string | null;
  paramsPublicar: URLSearchParams;
  paramsRecomendar: URLSearchParams;
  comunaSlug: string;
  qParaTodoChile: string;
  qNormTodoChile: string;
  qSnippetActivacion: string;
  regionSlugActivacion: string;
  regionNombreActivacionParaLink: string;
};

export default function DirectorioEnCrecimientoActivacionBanner({
  tituloComunaDisplay,
  comunaTituloConRegion,
  regionNombreActivacion,
  paramsPublicar,
  paramsRecomendar,
  comunaSlug,
  qParaTodoChile,
  qNormTodoChile,
  qSnippetActivacion,
  regionSlugActivacion,
  regionNombreActivacionParaLink,
}: Props) {
  return (
    <div
      role="region"
      aria-labelledby="resultados-comuna-cerrada-titulo"
      className="rounded-2xl border border-amber-200/90 bg-amber-50/90 px-4 py-5 sm:px-6"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-900/80">
        Directorio en crecimiento
      </p>
      <h1
        id="resultados-comuna-cerrada-titulo"
        className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900"
      >
        {tituloComunaDisplay} aún está creciendo en Rey del Dato
      </h1>
      {regionNombreActivacion ? (
        <p className="mt-1 text-sm font-medium text-slate-600">{regionNombreActivacion}</p>
      ) : null}
      <p className="mt-2 text-sm text-slate-700 leading-relaxed">
        Ya hay algunos servicios disponibles. Mientras más negocios se suman, más completo se vuelve
        el directorio.
      </p>
      <div className="mt-5 flex flex-wrap items-stretch gap-3">
        <Link
          href={`/publicar?${paramsPublicar.toString()}`}
          className="inline-flex h-11 min-h-[2.75rem] flex-1 basis-[min(100%,14rem)] items-center justify-center rounded-xl border-2 border-slate-900 bg-slate-900 px-4 text-center text-sm font-semibold leading-normal text-white box-border hover:bg-slate-800 sm:flex-none sm:basis-auto"
        >
          Publicar mi emprendimiento
        </Link>
        <Link
          href={`/recomendar?${paramsRecomendar.toString()}`}
          className="inline-flex h-11 min-h-[2.75rem] flex-1 basis-[min(100%,14rem)] items-center justify-center rounded-xl border-2 border-slate-300 bg-white px-4 text-center text-sm font-semibold leading-normal text-slate-900 box-border hover:bg-slate-50 sm:flex-none sm:basis-auto"
        >
          Recomendar emprendedor
        </Link>
      </div>
      <div className="mt-4 flex flex-wrap gap-3 border-t border-amber-200/80 pt-4">
        <Link
          href={`/abrir-comuna/${encodeURIComponent(comunaSlug)}`}
          className="text-sm font-semibold text-sky-800 underline underline-offset-2 hover:text-sky-950"
        >
          Cómo abrir el directorio en {comunaTituloConRegion}
        </Link>
        {qNormTodoChile && regionSlugActivacion ? (
          <Link
            href={`/resultados?q=${encodeURIComponent(qParaTodoChile)}&region=${encodeURIComponent(
              regionSlugActivacion
            )}`}
            className="text-sm font-semibold text-slate-700 underline underline-offset-2 hover:text-slate-900"
          >
            {regionNombreActivacionParaLink
              ? `Ver «${qSnippetActivacion}» en ${regionNombreActivacionParaLink}`
              : `Ver «${qSnippetActivacion}» en tu región`}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
