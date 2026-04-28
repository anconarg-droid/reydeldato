import Link from "next/link";
import LegalPageTopNav from "@/components/LegalPageTopNav";

export const dynamic = "force-static";

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
            Publicar tu negocio es gratis. La ficha completa es opcional y mejora
            cómo te ven.
          </p>
        </header>

        <section className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
          {/* Ficha básica */}
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">Ficha básica</h2>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  Para empezar y aparecer cuando te buscan
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs font-extrabold tracking-wide text-teal-800 uppercase">
                  Gratis
                </p>
                <p className="mt-1 text-2xl font-black text-slate-900">0</p>
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-slate-50 p-4">
              <p className="text-[11px] font-extrabold tracking-wide text-slate-700 uppercase">
                Incluye
              </p>
              <ul className="mt-3 space-y-2 text-sm font-semibold text-slate-800">
                <li className="flex gap-2">
                  <span className="text-teal-700" aria-hidden>
                    •
                  </span>
                  <span>Apareces en búsquedas de tu comuna</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-teal-700" aria-hidden>
                    •
                  </span>
                  <span>Contacto directo por WhatsApp</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-teal-700" aria-hidden>
                    •
                  </span>
                  <span>Datos básicos del negocio</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-teal-700" aria-hidden>
                    •
                  </span>
                  <span>Sin comisiones</span>
                </li>
              </ul>
            </div>
          </article>

          {/* Ficha completa */}
          <article className="rounded-2xl border-2 border-teal-500 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">Ficha completa</h2>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  Opcional, para mejorar presentación y confianza
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs font-extrabold tracking-wide text-teal-800 uppercase">
                  Desde
                </p>
                <p className="mt-1 text-2xl font-black text-slate-900 tabular-nums">
                  $3.500<span className="text-sm font-extrabold text-slate-700">/mes</span>
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-teal-200 bg-teal-50/70 px-4 py-3">
              <p className="text-sm font-extrabold text-slate-900">
                No cambia tu posición en los resultados.{" "}
                <span className="text-[#0f766e]">Mejora cómo se ve tu negocio.</span>
              </p>
            </div>

            <div className="mt-5 rounded-xl bg-white p-0">
              <p className="text-[11px] font-extrabold tracking-wide text-slate-700 uppercase">
                Incluye
              </p>
              <ul className="mt-3 space-y-2 text-sm font-semibold text-slate-800">
                <li className="flex gap-2">
                  <span className="text-teal-700" aria-hidden>
                    •
                  </span>
                  <span>Galería de fotos</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-teal-700" aria-hidden>
                    •
                  </span>
                  <span>Instagram y sitio web</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-teal-700" aria-hidden>
                    •
                  </span>
                  <span>Descripción más completa</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-teal-700" aria-hidden>
                    •
                  </span>
                  <span>Más información para que te elijan</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-teal-700" aria-hidden>
                    •
                  </span>
                  <span>Estadísticas de tu ficha</span>
                </li>
              </ul>
            </div>
          </article>
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
          Nota: el pago se gestiona solo desde el panel del emprendedor con acceso
          válido. Esta página es informativa.
        </p>
      </div>
    </main>
  );
}

