import Link from "next/link";
import LegalPageTopNav from "@/components/LegalPageTopNav";
import {
  ORDEN_TARJETAS_PLANES,
  PRECIO_PLAN_CLP,
  precioPlanesDisplaySimple,
} from "@/lib/panelPlanesPrecios";

export const dynamic = "force-static";

const BENEFICIOS_BASICA = [
  "Apareces en búsquedas de tu comuna",
  "Contacto directo por WhatsApp",
  "Datos básicos del negocio",
  "Sin comisiones",
] as const;

const BENEFICIOS_COMPLETA = [
  "Galería de fotos",
  "Instagram y sitio web",
  "Descripción más completa",
  "Más información para que te elijan",
  "Estadísticas de tu ficha",
] as const;

function labelPeriodicidad(p: (typeof ORDEN_TARJETAS_PLANES)[number]): string {
  if (p === "mensual") return "Mensual";
  if (p === "semestral") return "Semestral";
  return "Anual";
}

function subtituloPeriodicidad(p: (typeof ORDEN_TARJETAS_PLANES)[number]): string {
  if (p === "mensual") return "1 mes";
  if (p === "semestral") return "6 meses";
  return "12 meses";
}

function ahorroVsMensual(p: (typeof ORDEN_TARJETAS_PLANES)[number]): number {
  const mensual = PRECIO_PLAN_CLP.mensual;
  if (p === "semestral") return mensual * 6 - PRECIO_PLAN_CLP.semestral;
  if (p === "anual") return mensual * 12 - PRECIO_PLAN_CLP.anual;
  return 0;
}

export default function PlanesPublicosPage() {
  return (
    <main className="min-h-screen bg-slate-50 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <LegalPageTopNav />

        <header className="mt-2">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Planes para emprendedores
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-600 max-w-2xl">
            Publicar es gratis. La ficha básica es gratis siempre. La ficha completa es opcional y mejora la presentación
            y la confianza.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2 max-w-2xl">
            <span className="text-[0.65rem] font-extrabold uppercase tracking-wider text-teal-900 bg-teal-100 px-2 py-1 rounded-md">
              90 días gratis
            </span>
            <p className="text-sm font-semibold text-slate-700">
              Al publicar, partes con 90 días gratis en ficha completa. Luego puedes continuar con un plan.
            </p>
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-700 max-w-2xl">
            Precio de lanzamiento por 6 meses antes del valor normal.
          </p>
          <p className="mt-3 text-sm font-semibold text-slate-800 max-w-2xl">
            No cambia tu posición en los resultados.{" "}
            <span className="text-[#0f766e]">Mejora cómo te ven.</span>
          </p>
        </header>

        <section className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-6 items-start">
          {/* Ficha básica */}
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">Ficha básica</h2>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  Gratis (siempre)
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs font-extrabold tracking-wide text-teal-800 uppercase">
                  Precio
                </p>
                <p className="mt-1 text-2xl font-black text-slate-900">Gratis</p>
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-slate-50 p-4">
              <p className="text-[11px] font-extrabold tracking-wide text-slate-700 uppercase">
                Incluye
              </p>
              <ul className="mt-3 space-y-2 text-sm font-semibold text-slate-800">
                {BENEFICIOS_BASICA.map((t) => (
                  <li key={t} className="flex gap-2">
                    <span className="text-teal-700" aria-hidden>
                      •
                    </span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </article>

          {/* Planes de ficha completa */}
          <div className="space-y-4">
            <h2 className="text-xl font-black text-slate-900">Ficha completa</h2>
            <p className="text-sm font-semibold text-slate-600">
              Opcional. No cambia tu posición: mejora cómo se ve tu negocio.
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {ORDEN_TARJETAS_PLANES.map((p) => {
                const precio = PRECIO_PLAN_CLP[p];
                const ahorro = ahorroVsMensual(p);
                const recomendado = p === "anual";
                return (
                  <article
                    key={p}
                    className={`rounded-2xl border bg-white p-5 shadow-sm ${
                      recomendado
                        ? "border-teal-500 ring-1 ring-teal-200"
                        : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold tracking-wide text-teal-800 uppercase">
                          {labelPeriodicidad(p)}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-600">
                          {subtituloPeriodicidad(p)}
                        </p>
                      </div>
                      {recomendado ? (
                        <span className="shrink-0 text-[0.65rem] font-extrabold uppercase tracking-wider text-teal-900 bg-teal-100 px-2 py-1 rounded-md">
                          Recomendado
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-3 text-2xl font-black text-slate-900 tabular-nums">
                      {precioPlanesDisplaySimple(precio)}
                    </p>

                    {ahorro > 0 ? (
                      <p className="mt-1 text-xs font-semibold text-slate-600">
                        Ahorra {precioPlanesDisplaySimple(ahorro)} vs mensual
                      </p>
                    ) : (
                      <p className="mt-1 text-xs font-semibold text-slate-600">&nbsp;</p>
                    )}

                    <ul className="mt-4 space-y-2 text-sm font-semibold text-slate-800">
                      {BENEFICIOS_COMPLETA.map((t) => (
                        <li key={t} className="flex gap-2">
                          <span className="text-teal-700" aria-hidden>
                            •
                          </span>
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="min-w-0">
              <h2 className="text-lg font-black text-slate-900">
                Publicar es gratis
              </h2>
              <p className="mt-1 text-sm font-semibold text-slate-600">
                Empieza con ficha básica y mejora tu presentación cuando lo
                necesites.
              </p>
            </div>
            <Link
              href="/publicar"
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-teal-700 px-5 py-2 text-sm font-medium text-white hover:bg-teal-800"
            >
              Publicar mi negocio gratis
            </Link>
          </div>
        </section>

        <p className="mt-4 text-xs text-slate-500 max-w-2xl">
          Nota: el pago de ficha completa se gestiona solo desde el panel del
          emprendedor con acceso válido. Esta página es informativa.
        </p>
      </div>
    </main>
  );
}

