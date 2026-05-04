import Link from "next/link";

type Props = {
  qLabel: string;
  nombreComuna: string;
  paramsPublicar: URLSearchParams;
  paramsRecomendar: URLSearchParams;
  qParaTodoChile: string;
  qSnippetActivacion: string;
  regionSlugActivacion: string;
  regionNombreActivacionParaLink: string;
};

export default function BusquedaSinBaseTextualEnComunaPanel({
  qLabel,
  nombreComuna,
  paramsPublicar,
  paramsRecomendar,
  qParaTodoChile,
  qSnippetActivacion,
  regionSlugActivacion,
  regionNombreActivacionParaLink,
}: Props) {
  return (
    <div
      role="region"
      aria-labelledby="busqueda-sin-base-comuna-titulo"
      className="rounded-2xl border border-slate-200 bg-slate-50/95 px-4 py-5 sm:px-6"
    >
      <h1
        id="busqueda-sin-base-comuna-titulo"
        className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900"
      >
        Aún no tenemos {qLabel} en {nombreComuna}
      </h1>
      <p className="mt-3 text-sm text-slate-700 leading-relaxed">
        Puedes ser el primero en aparecer o recomendarnos a alguien. Mientras tanto, puedes ver
        otros emprendimientos disponibles en esta comuna.
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
      {regionSlugActivacion ? (
        <div className="mt-4 border-t border-slate-200/90 pt-4">
          <Link
            href={`/resultados?q=${encodeURIComponent(qParaTodoChile)}&region=${encodeURIComponent(
              regionSlugActivacion
            )}`}
            className="text-sm font-semibold text-sky-800 underline underline-offset-2 hover:text-sky-950"
          >
            {regionNombreActivacionParaLink
              ? `Ver «${qSnippetActivacion}» en ${regionNombreActivacionParaLink}`
              : `Ver «${qSnippetActivacion}» en tu región`}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
