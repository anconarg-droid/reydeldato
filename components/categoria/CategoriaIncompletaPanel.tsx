import Link from "next/link";

type Props = {
  className?: string;
  comunaLinea: string;
  /** Si no hay comuna en URL, se omite el botón (solo título + subtexto). */
  hrefAvance?: string | null;
};

const btnCompact =
  "inline-flex items-center justify-center rounded-lg bg-sky-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500";

/**
 * Aviso secundario antes de resultados (categoría en construcción / pocos resultados).
 */
export default function CategoriaIncompletaPanel({
  className = "",
  comunaLinea,
  hrefAvance,
}: Props) {
  return (
    <div
      className={`rounded-lg border border-slate-200/90 bg-slate-50/70 px-3 py-2.5 sm:px-4 sm:py-3 ${className}`}
      role="region"
      aria-label="Categoría en proceso de completarse"
    >
      <h2 className="text-sm font-semibold tracking-tight text-slate-800 sm:text-[0.9375rem]">
        Esta categoría aún se está completando en {comunaLinea}.
      </h2>
      <p className="mt-1 text-xs leading-snug text-slate-600 sm:text-sm">
        El avance de la comuna incluye todos los servicios que ya se han sumado.
      </p>
      <p className="mt-1.5 text-xs leading-snug text-slate-600 sm:text-sm">
        El avance de la comuna considera distintos tipos de servicios necesarios para que funcione
        correctamente.
      </p>
      {hrefAvance ? (
        <div className="mt-2.5 text-left">
          <Link href={hrefAvance} className={btnCompact}>
            Ver qué servicios faltan
          </Link>
        </div>
      ) : null}
    </div>
  );
}
