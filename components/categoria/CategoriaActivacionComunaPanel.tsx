import Link from "next/link";

type Props = {
  className?: string;
  /** Nombre para titular y microcopy ("Valdivia — Los Ríos" o "tu comuna"). */
  comunaLinea: string;
  /** Nombre corto para el botón secundario (ej. "Valdivia"). */
  comunaNombreBoton: string;
  subPlural: string | null;
  subSingular: string | null;
  hrefAvance: string | null;
  hrefPublicar: string;
  hrefRecomendar: string;
};

const btnBase =
  "inline-flex min-h-12 items-center justify-center rounded-xl px-4 py-3 text-center text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

export default function CategoriaActivacionComunaPanel({
  className = "mb-4",
  comunaLinea,
  comunaNombreBoton,
  subPlural,
  subSingular,
  hrefAvance,
  hrefPublicar,
  hrefRecomendar,
}: Props) {
  const titulo = subPlural
    ? `Aún no hay suficientes ${subPlural} en ${comunaLinea}`
    : `Aún no hay suficientes opciones locales en ${comunaLinea}`;

  const cuerpo = subPlural
    ? `Ya encontramos algunos negocios que atienden tu comuna, pero todavía faltan ${subPlural} locales para abrir bien esta categoría.`
    : `Ya encontramos algunos negocios que atienden tu comuna, pero todavía faltan más ofertas locales para abrir bien esta categoría.`;

  const micro = subSingular
    ? `¿Conoces un buen ${subSingular} en ${comunaLinea}? Ayúdanos a sumarlo.`
    : `¿Conoces un buen negocio en ${comunaLinea}? Ayúdanos a sumarlo.`;

  return (
    <div
      className={`${className} rounded-2xl border border-amber-200 bg-amber-50/95 px-5 py-4 shadow-sm`}
      role="region"
      aria-label="Completa esta categoría en tu comuna"
    >
      <h2 className="text-base font-bold tracking-tight text-amber-950">{titulo}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-amber-950/95">{cuerpo}</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Link
          href={hrefPublicar}
          className={`${btnBase} bg-sky-600 text-white hover:bg-sky-700 focus-visible:outline-sky-500`}
        >
          Publicar mi emprendimiento
        </Link>
        {hrefAvance ? (
          <Link
            href={hrefAvance}
            className={`${btnBase} border-2 border-sky-600 bg-white text-sky-800 hover:bg-sky-50 focus-visible:outline-sky-500`}
          >
            Ver avance de {comunaNombreBoton}
          </Link>
        ) : null}
        <Link
          href={hrefRecomendar}
          className={`${btnBase} border border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-slate-400`}
        >
          Recomendar un emprendedor
        </Link>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-amber-900/85 sm:text-sm">{micro}</p>
    </div>
  );
}
