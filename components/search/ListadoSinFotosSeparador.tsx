"use client";

/**
 * Separador entre resultados con foto de listado y sin foto (misma comuna / cobertura).
 * Ocupa todo el ancho de la grilla (`col-span-full`).
 */
export default function ListadoSinFotosSeparador() {
  return (
    <div
      data-grid-row="banner"
      className="col-span-full w-full"
      role="region"
      aria-label="Otros negocios sin fotos en el listado"
    >
      <div className="mt-10 w-full border-t border-slate-200/90 pt-8">
        <div className="mx-auto max-w-2xl text-center">
          <h3 className="m-0 text-base font-bold tracking-tight text-slate-900 sm:text-lg">
            Otros negocios (aún sin fotos)
          </h3>
          <p className="m-0 mt-2 text-sm leading-relaxed text-slate-600">
            Estos negocios ya están disponibles, pero aún no han subido fotos
          </p>
        </div>
        <div
          className="mx-auto mt-6 h-px max-w-md bg-gradient-to-r from-transparent via-slate-200/90 to-transparent"
          aria-hidden
        />
      </div>
    </div>
  );
}
