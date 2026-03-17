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

type RegionOption = { slug: string; nombre: string };

type Props = {
  selectedComuna: ComunaRow | null;
  regionNombre: string;
  regionSlug: string;
  regiones: RegionOption[];
  qComuna: string;
  cambiarComunaHref: string;
};

export default function CoberturaHero({
  selectedComuna,
  regionNombre,
  regionSlug,
  regiones,
  qComuna,
  cambiarComunaHref,
}: Props) {
  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 shadow-sm overflow-hidden">
      <div className="px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center text-xs font-semibold text-sky-700 hover:text-sky-800"
          >
            ← Volver al inicio
          </Link>
        </div>

        {selectedComuna ? (
          <>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Tu comuna · Cobertura en {regionNombre}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mt-1">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                  {selectedComuna.estado === "Activo"
                    ? `${selectedComuna.comuna_nombre} ya está activa en Rey del Dato`
                    : selectedComuna.estado === "En apertura"
                      ? `${selectedComuna.comuna_nombre} aún no está activa en Rey del Dato`
                      : `${selectedComuna.comuna_nombre} todavía no tiene cobertura en Rey del Dato`}
                </h1>
              </div>
              <Link
                href={cambiarComunaHref}
                className="inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shrink-0"
              >
                Cambiar comuna
              </Link>
            </div>

            {selectedComuna.estado === "Activo" && (
              <p className="mt-3 text-sm text-slate-600">
                Esta comuna ya forma parte de la plataforma y sus emprendimientos ya pueden aparecer en el buscador.
              </p>
            )}

            {selectedComuna.estado === "En apertura" && (
              <p className="mt-3 text-sm text-slate-600">
                Estamos abriendo esta comuna. Cuando lleguemos a {selectedComuna.meta} emprendimientos registrados, se activará automáticamente.
              </p>
            )}

            {selectedComuna.estado === "Sin cobertura" && (
              <p className="mt-3 text-sm text-slate-600">
                Queremos abrir esta comuna. Para lograrlo, necesitamos reunir los primeros emprendimientos locales y validar su información.
              </p>
            )}

            {(selectedComuna.estado === "En apertura" || selectedComuna.estado === "Sin cobertura") && (
              <>
                <div className="mt-6 p-5 rounded-xl bg-white border border-slate-200">
                  <p className="text-slate-600 text-sm">Avance</p>
                  <p className="text-4xl font-extrabold text-slate-900 tabular-nums mt-1">
                    {selectedComuna.avance.toFixed(0)}%
                  </p>
                  <p className="text-slate-600 text-sm mt-2 tabular-nums">
                    {selectedComuna.total} de {selectedComuna.meta} emprendimientos necesarios
                  </p>
                  <div className="mt-4">
                    <div className="h-4 w-full rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.max(0, Math.min(selectedComuna.avance, 100))}%`,
                          backgroundColor: "#22c55e",
                        }}
                      />
                    </div>
                  </div>
                </div>

                {selectedComuna.estado === "En apertura" && (
                  <p className="mt-4 text-sm text-slate-600">
                    Hoy faltan rubros clave para abrir {selectedComuna.comuna_nombre}. Si conoces negocios locales, recomiéndalos y ayúdanos a abrir esta comuna más rápido.
                  </p>
                )}

                {selectedComuna.estado === "Sin cobertura" && (
                  <p className="mt-4 text-sm text-slate-600">
                    Si tienes un emprendimiento en esta comuna o conoces negocios locales, puedes ayudar a abrirla más rápido.
                  </p>
                )}

                <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
                  <Link
                    href={`/publicar?comuna=${encodeURIComponent(selectedComuna.comuna_slug)}`}
                    className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
                    style={{ backgroundColor: "#2563eb" }}
                  >
                    Publicar mi emprendimiento
                  </Link>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/abrir-comuna/${encodeURIComponent(selectedComuna.comuna_slug)}`}
                      className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Recomendar un negocio de esta comuna
                    </Link>
                    <Link
                      href={cambiarComunaHref}
                      className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      Cambiar comuna
                    </Link>
                  </div>
                </div>
              </>
            )}

            {selectedComuna.estado === "Activo" && (
              <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
                <Link
                  href={`/${encodeURIComponent(selectedComuna.comuna_slug)}`}
                  className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
                  style={{ backgroundColor: "#2563eb" }}
                >
                  Explorar comuna
                </Link>
                <Link
                  href={cambiarComunaHref}
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cambiar comuna
                </Link>
              </div>
            )}
          </>
        ) : (
          <>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              ¿Tu comuna ya abre en Rey del Dato?
            </h1>
            <p className="mt-2 text-sm text-slate-600 max-w-2xl">
              Busca tu comuna y te diremos por qué aún no abre, cuánto falta, qué rubros faltan y cómo puedes ayudar a abrirla.
            </p>
          </>
        )}

        {/* Selector de región y buscador - siempre visible */}
        <div className="mt-6 pt-4 border-t border-slate-100">
          <form
            method="get"
            action="/cobertura"
            className="flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap"
          >
            {selectedComuna && (
              <input type="hidden" name="comuna" value={selectedComuna.comuna_slug} />
            )}
            <label className="block">
              <span className="text-xs font-semibold text-slate-600">Región</span>
              <select
                name="region"
                defaultValue={regionSlug}
                className="mt-1 block h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                {regiones.map((r) => (
                  <option key={r.slug} value={r.slug}>
                    {r.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="block sm:ml-4">
              <span className="text-xs font-semibold text-slate-600">Buscar mi comuna</span>
              <input
                type="text"
                name="q"
                defaultValue={qComuna}
                placeholder="Ej: Quilicura, Talagante..."
                className="mt-1 block h-9 w-56 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 placeholder:text-slate-400"
              />
            </label>
            <button
              type="submit"
              className="h-9 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Ver estado de mi comuna
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
