"use client";

import Link from "next/link";

export type ComunaPreparacionItem = {
  slug: string;
  /** Nombre legible desde API; si falta, se usa el slug. */
  nombre: string;
  porcentaje: number;
  /** Meta: servicios clave requeridos (vista); misma noción que /abrir-comuna. */
  total_requerido?: number | null;
  total_cumplido?: number | null;
  faltantesTop: Array<{ subcategoria: string; faltan: number }>;
};

function prettySlug(slug: string) {
  return slug
    .replace(/-/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function HomeComunasPreparacion({
  items,
}: {
  items: ComunaPreparacionItem[];
}) {
  if (!items.length) return null;

  return (
    <section
      className="mt-14 sm:mt-16 border-t border-slate-100 pt-10 sm:pt-12"
      aria-labelledby="comunas-preparacion-heading"
    >
      <h2
        id="comunas-preparacion-heading"
        className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl"
      >
        Comunas en preparación
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-slate-600">
        Completa los servicios clave y abre la comuna más rápido.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
        {items.map((c) => {
          const meta = c.total_requerido;
          let cumplido =
            c.total_cumplido != null && Number.isFinite(c.total_cumplido)
              ? Math.max(0, Math.floor(c.total_cumplido))
              : null;
          if (meta != null && meta > 0 && cumplido == null && Number.isFinite(c.porcentaje)) {
            cumplido = Math.min(meta, Math.round((meta * Math.max(0, Math.min(100, c.porcentaje))) / 100));
          }

          let faltanLine: string;
          if (meta != null && meta > 0 && cumplido != null) {
            const faltan = Math.max(0, meta - cumplido);
            faltanLine =
              faltan === 1
                ? "Falta 1 servicio clave para abrir la comuna"
                : `Faltan ${faltan} servicios clave para abrir la comuna`;
          } else {
            const totalFaltanRubros = c.faltantesTop.reduce(
              (acc, f) => acc + Math.max(0, f.faltan),
              0
            );
            faltanLine =
              totalFaltanRubros > 0
                ? totalFaltanRubros === 1
                  ? "Falta 1 servicio clave por cubrir"
                  : `Faltan ${totalFaltanRubros} servicios clave por cubrir`
                : "Seguimos sumando oferta para completar los servicios clave necesarios.";
          }

          return (
            <Link
              key={c.slug}
              href={`/abrir-comuna/${encodeURIComponent(c.slug)}`}
              className="group block rounded-2xl border-2 border-slate-200 bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 sm:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-semibold leading-tight text-slate-900">
                  {c.nombre || prettySlug(c.slug)}
                </h3>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-600">
                  {c.porcentaje}%
                </span>
              </div>

              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-slate-800 transition-[width] duration-300"
                  style={{ width: `${Math.max(0, Math.min(100, c.porcentaje))}%` }}
                />
              </div>

              {meta != null && meta > 0 && cumplido != null ? (
                <p className="mt-3 text-sm font-medium tabular-nums text-slate-800">
                  {cumplido} de {meta} servicios clave completos
                </p>
              ) : null}

              <p className="mt-4 text-sm font-semibold text-slate-900">{faltanLine}</p>
              <p className="mt-2 text-sm leading-snug text-slate-600">
                <span aria-hidden>✨ </span>Sé uno de los primeros en aparecer
              </p>

              <span className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 group-hover:bg-zinc-900 sm:w-auto">
                Ver avance →
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

