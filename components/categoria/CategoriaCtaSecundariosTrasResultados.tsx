import Link from "next/link";

type Props = {
  className?: string;
  hrefPublicar: string;
  hrefRecomendar: string;
};

const btnRecomendar =
  "inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-center text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-300 sm:w-auto";

const btnPublicar =
  "inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-sky-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 sm:w-auto";

/**
 * Publicar + Recomendar debajo de los resultados (misma condición que la cinta simple superior).
 */
export default function CategoriaCtaSecundariosTrasResultados({
  className = "",
  hrefPublicar,
  hrefRecomendar,
}: Props) {
  return (
    <div
      className={`rounded-xl border border-slate-200/90 bg-slate-50/95 px-4 py-4 sm:px-5 sm:py-4 ${className}`}
      role="region"
      aria-label="Publicar o recomendar un emprendimiento"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Link href={hrefPublicar} className={btnPublicar}>
          Publicar mi emprendimiento
        </Link>
        <Link href={hrefRecomendar} className={btnRecomendar}>
          Recomendar un emprendimiento
        </Link>
      </div>
    </div>
  );
}
