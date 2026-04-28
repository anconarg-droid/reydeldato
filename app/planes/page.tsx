import Link from "next/link";
import LegalPageTopNav from "@/components/LegalPageTopNav";

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

type PlanCard = {
  key: "mensual" | "semestral" | "anual";
  title: string;
  price: string;
  priceNote: string;
  ahorroBadge?: string;
  recomendado?: boolean;
  ctaLabel: string;
  ctaVariant?: "primary";
};

const PLANES_FICHA_COMPLETA: PlanCard[] = [
  {
    key: "mensual",
    title: "Mensual",
    price: "$5.900",
    priceNote: "por mes",
    ctaLabel: "Elegir mensual",
  },
  {
    key: "semestral",
    title: "Semestral",
    price: "$24.900",
    priceNote: "$4.150 al mes",
    ahorroBadge: "Ahorra $10.500",
    ctaLabel: "Elegir semestral",
  },
  {
    key: "anual",
    title: "Anual",
    price: "$39.900",
    priceNote: "$3.325 al mes",
    ahorroBadge: "Ahorra $30.900",
    recomendado: true,
    ctaLabel: "Elegir anual",
    ctaVariant: "primary",
  },
] as const;

export default function PlanesPublicosPage() {
  return (
    <main className="min-h-screen bg-slate-50 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <LegalPageTopNav />

        <header className="mt-2">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Planes para emprendedores
          </h1>
          <div className="mt-3">
            <span className="inline-flex items-center rounded-full bg-teal-100 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-teal-900">
              Precio de lanzamiento
            </span>
          </div>
          <p className="mt-3 text-sm sm:text-base text-slate-600 max-w-2xl">
            Publicar tu negocio es gratis en esta etapa. Los planes son opcionales y sirven para mejorar cómo se ve tu
            ficha: fotos, galería, Instagram, sitio web, más información y estadísticas.
          </p>
          <p className="mt-3 text-sm font-semibold text-slate-800 max-w-2xl">
            No compras posición en los resultados.{" "}
            <span className="text-[#0f766e]">
              Mejoras tu presentación para generar más confianza.
            </span>
          </p>
        </header>

        <section className="mt-8">
          <div className="mx-auto max-w-[640px] text-center rounded-2xl border border-teal-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-extrabold text-teal-900">
              90 días gratis de ficha completa
            </p>
            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-700">
              Al publicar, partes con ficha completa real: puedes subir fotos, completar tu información, ver estadísticas y
              mejorar tu ficha cuando quieras.
            </p>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-black text-slate-900">Ficha completa</h2>
          <p className="mt-2 text-sm font-semibold text-slate-600 max-w-2xl">
            Para mostrar mejor tu trabajo y dar más confianza.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
            {/* Ficha básica */}
            <article className="flex flex-col h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Ficha básica</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-600">
                    Gratis en esta etapa
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs font-extrabold tracking-wide text-teal-800 uppercase">
                    Precio
                  </p>
                  <p className="mt-1 text-2xl font-black text-slate-900">Gratis</p>
                </div>
              </div>

              <p className="mt-4 text-sm font-semibold text-slate-700">
                Para aparecer con lo esencial.
              </p>

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

              <p className="mt-4 text-xs font-medium text-slate-600">
                Sin galería, sin Instagram y sin ficha completa.
              </p>

              <Link
                href="/publicar"
                className="mt-auto inline-flex min-h-[44px] items-center justify-center rounded-lg bg-teal-700 px-5 py-2 text-sm font-extrabold text-white hover:bg-teal-800"
              >
                Publicar gratis
              </Link>
            </article>

            {/* Planes ficha completa */}
            {PLANES_FICHA_COMPLETA.map((plan) => (
              <article
                key={plan.key}
                className={`flex flex-col h-full rounded-2xl border bg-white p-6 shadow-sm ${
                  plan.recomendado ? "border-teal-500 ring-1 ring-teal-200" : "border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-lg font-black text-slate-900">{plan.title}</h3>
                    <p className="mt-1 text-sm font-semibold text-slate-600">{plan.priceNote}</p>
                  </div>
                  {plan.recomendado ? (
                    <span className="shrink-0 text-[0.65rem] font-extrabold uppercase tracking-wider text-teal-900 bg-teal-100 px-2 py-1 rounded-md">
                      Recomendado
                    </span>
                  ) : null}
                </div>

                <p className="mt-4 text-3xl font-black text-slate-900 tabular-nums">{plan.price}</p>

                {plan.ahorroBadge ? (
                  <span className="mt-2 inline-flex w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-900">
                    {plan.ahorroBadge}
                  </span>
                ) : (
                  <span className="mt-2 text-xs text-transparent select-none">—</span>
                )}

                <div className="mt-5 rounded-xl bg-slate-50 p-4">
                  <p className="text-[11px] font-extrabold tracking-wide text-slate-700 uppercase">
                    Incluye
                  </p>
                  <ul className="mt-3 space-y-2 text-sm font-semibold text-slate-800">
                    {BENEFICIOS_COMPLETA.map((t) => (
                      <li key={t} className="flex gap-2">
                        <span className="text-teal-700" aria-hidden>
                          •
                        </span>
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Link
                  href="/publicar"
                  className={`mt-auto inline-flex min-h-[44px] items-center justify-center rounded-lg px-5 py-2 text-sm font-extrabold ${
                    plan.ctaVariant === "primary"
                      ? "bg-teal-700 text-white hover:bg-teal-800"
                      : "bg-slate-900 text-white hover:bg-slate-800"
                  }`}
                >
                  {plan.ctaLabel}
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-900">
            Orden y reglas justas
          </h2>
          <p className="mt-2 text-sm font-medium text-slate-700 leading-relaxed max-w-3xl">
            Las fichas completas se ven mejor porque muestran fotos, más información y formas de contacto. El orden de
            resultados sigue priorizando cercanía y reglas justas.
          </p>
        </section>

        <p className="mt-4 text-xs text-slate-500 max-w-2xl">
          Esta página es informativa. Para empezar, publica tu negocio gratis.
        </p>
      </div>
    </main>
  );
}

