import Link from "next/link";
import LegalPageTopNav from "@/components/LegalPageTopNav";

export const dynamic = "force-static";

export default function InformacionUtilPage() {
  return (
    <main className="min-h-screen bg-slate-50 pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <LegalPageTopNav />
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-2 tracking-tight">
            Cómo funciona Rey del Dato
          </h1>
          <p className="text-sm sm:text-base text-slate-500 max-w-2xl">
            Encuentra o publica negocios locales en tu comuna, sin intermediarios.
          </p>
        </header>

        <div className="space-y-12">
          {/* Bloque: para quienes buscan */}
          <section className="rounded-2xl border border-slate-200 bg-white px-5 py-7 shadow-sm sm:px-6 sm:py-8">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              🔍 Si estás buscando en tu comuna
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <article className="rd-card p-4">
                <h3 className="text-sm font-bold text-slate-950 mb-1">
                  Cómo encontrar negocios locales en tu comuna
                </h3>
                <p className="text-sm text-slate-600">
                  Escribe qué necesitas y tu comuna. Te mostramos primero negocios cercanos y luego
                  quienes atienden tu zona.
                </p>
              </article>
              <article className="rd-card p-4">
                <h3 className="text-sm font-bold text-slate-950 mb-1">
                  Cómo entender los resultados cercanos
                </h3>
                <p className="text-sm text-slate-600">
                  Si no hay muchos negocios en tu comuna, verás opciones de comunas cercanas que
                  pueden atender tu zona. Siempre indicamos desde dónde atienden.
                </p>
              </article>
              <article className="rd-card p-4">
                <h3 className="text-sm font-bold text-slate-950 mb-1">
                  Qué significa &quot;En tu comuna&quot;
                </h3>
                <p className="text-sm text-slate-600">
                  El badge &quot;En tu comuna&quot; indica que el negocio tiene su base en la
                  misma comuna que estás buscando. Son los negocios locales de tu zona.
                </p>
              </article>
              <article className="rd-card p-4">
                <h3 className="text-sm font-bold text-slate-950 mb-1">
                  Qué significa &quot;Atiende tu comuna&quot;
                </h3>
                <p className="text-sm text-slate-600">
                  El badge &quot;Atiende tu comuna&quot; indica que el negocio está en otra
                  comuna pero ofrece atención en la tuya (por ejemplo, fletes o negocios a
                  domicilio).
                </p>
              </article>
            </div>
          </section>

          <div className="h-px w-full bg-slate-200/70" aria-hidden />

          {/* Bloque: para emprendedores */}
          <section className="rounded-2xl border border-slate-200 bg-slate-50/70 px-5 py-7 shadow-sm sm:px-6 sm:py-8">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              🏪 Si quieres publicar tu negocio
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <article className="rd-card p-4">
                <h3 className="text-sm font-bold text-slate-950 mb-1">
                  Cómo publicar
                </h3>
                <p className="text-sm text-slate-600 mb-2">
                  Publicar toma menos de 2 minutos. Solo necesitas nombre, comuna y contacto.
                </p>
                <Link
                  href="/publicar"
                  className="mt-2 inline-flex items-center justify-center rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
                >
                  Publicar mi negocio ahora
                </Link>
              </article>
              <article className="rd-card p-4">
                <h3 className="text-sm font-bold text-slate-950 mb-1">
                  Qué datos necesitas
                </h3>
                <p className="text-sm text-slate-600">
                  WhatsApp, descripción clara y comuna. Con eso ya puedes aparecer.
                </p>
              </article>
              <article className="rd-card p-4">
                <h3 className="text-sm font-bold text-slate-950 mb-1">Tu panel</h3>
                <p className="text-sm text-slate-600">
                  Después de publicar, tendrás acceso a tu panel para editar tu información,
                  actualizar fotos, cambiar datos de contacto y ver estadísticas básicas de visitas y
                  clics.
                </p>
                <p className="text-sm text-slate-600 mt-2">
                  Siempre puedes mantener tu ficha actualizada.
                </p>
                <p className="text-sm text-slate-600 mt-2">
                  Podrás actualizar tu información en cualquier momento, sin depender de nadie.
                </p>
              </article>
              <article className="rd-card p-4">
                <h3 className="text-sm font-bold text-slate-950 mb-1">
                  Beneficios de una ficha completa
                </h3>
                <p className="text-sm text-slate-600">
                  La ficha completa agrega fotos, Instagram y más información de tu negocio. No
                  cambia tu posición en los resultados, pero mejora cómo te ven y puede generar más
                  confianza.
                </p>
              </article>
              <article className="rd-card p-4">
                <h3 className="text-sm font-bold text-slate-950 mb-1">
                  Cómo aparecer cuando te buscan
                </h3>
                <p className="text-sm text-slate-600">
                  Elige bien tu categoría, comuna base y cobertura. Si atiendes varias comunas o una
                  región completa, indícalo correctamente para aparecer cuando alguien busque en esas
                  zonas.
                </p>
              </article>
              <article className="rd-card p-4">
                <h3 className="text-sm font-bold text-slate-950 mb-1">Planes de lanzamiento</h3>
                <p className="text-sm text-slate-600">
                  Publicar tu negocio es gratis. Empiezas con 90 días de ficha completa sin costo.
                </p>
                <p className="text-sm text-slate-600 mt-2">
                  Después puedes seguir con un plan para mejorar cómo se ve tu negocio o quedarte con
                  la ficha básica.
                </p>
                <p className="text-sm text-slate-600 mt-2">
                  No cambias tu posición en los resultados. Solo mejoras tu presentación para generar
                  más confianza.
                </p>
                <Link
                  href="/publicar"
                  className="mt-3 inline-flex items-center justify-center rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
                >
                  Publicar mi negocio gratis
                </Link>
                <Link
                  href="/planes"
                  className="mt-3 inline-flex w-fit text-sm font-semibold text-teal-800 hover:text-teal-900"
                >
                  Ver planes y precios →
                </Link>
              </article>
            </div>
            <p className="text-sm text-slate-600">
              Impulsamos el comercio local, dando visibilidad a negocios reales de cada comuna.
            </p>
            <div className="max-w-2xl space-y-2 pt-1">
              <p className="text-sm text-slate-600">
                Mientras más completa tu ficha (fotos, descripción y contacto), más posibilidades
                tienes de recibir mensajes.
              </p>
              <p className="text-sm text-slate-600">
                Publicar toma menos de 2 minutos y puedes empezar a recibir contactos desde el primer
                día.
              </p>
            </div>
          </section>

          {/* Bloque: crecimiento de comunas */}
          <section className="rounded-2xl border border-slate-200 bg-white px-5 py-7 shadow-sm sm:px-6 sm:py-8 space-y-4">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              Cómo crecen las comunas
            </h2>
            <p className="text-sm text-slate-600 max-w-2xl">
              Rey del Dato crece comuna por comuna.
            </p>
            <p className="text-sm text-slate-600 max-w-2xl">
              Algunas comunas ya tienen negocios disponibles, pero todavía están completando su
              catálogo. Mientras más negocios se publican o se recomiendan, más útil se vuelve el
              directorio.
            </p>

            <div className="grid grid-cols-1 gap-4">
              <div className="rounded-xl border border-slate-200 border-l-2 border-l-teal-600 bg-white p-5 pl-4 shadow-sm">
                <p className="text-sm font-medium text-teal-900">
                  ¿Qué significa que una comuna está en crecimiento?
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Significa que ya puede tener algunos negocios disponibles, pero su catálogo aún no
                  está completo. Puedes buscar, explorar negocios disponibles y ayudar recomendando
                  negocios.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 border-l-2 border-l-teal-600 bg-white p-5 pl-4 shadow-sm">
                <p className="text-sm font-medium text-teal-900">
                  ¿Qué falta para completar una comuna?
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Faltan negocios reales en rubros clave, como gasfitería, electricidad, peluquería,
                  mecánica, comida preparada, fletes u otras necesidades importantes para la vida
                  diaria.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 border-l-2 border-l-teal-600 bg-white p-5 pl-4 shadow-sm">
                <p className="text-sm font-medium text-teal-900">
                  ¿Cómo puedo ayudar a completar mi comuna?
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Puedes publicar tu negocio gratis o recomendar un negocio que conozcas.
                  Mientras más datos reales tengamos, más útil será el directorio para todos.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 border-l-2 border-l-teal-600 bg-white p-5 pl-4 shadow-sm">
                <p className="text-sm font-medium text-teal-900">
                  ¿Puedo recomendar negocios aunque no sean míos?
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Sí. Puedes recomendar un negocio local dejando sus datos de contacto. Nosotros
                  podremos invitarlo a publicar.
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-600 max-w-2xl pt-2">
              ¿Quieres ayudar a completar tu comuna?{" "}
              <Link
                href="/publicar"
                className="font-semibold text-sky-700 underline underline-offset-2 hover:text-sky-800"
              >
                Publica tu negocio
              </Link>{" "}
              o recomienda uno.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

