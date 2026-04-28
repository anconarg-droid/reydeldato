import Link from "next/link";
import LegalPageTopNav from "@/components/LegalPageTopNav";

export const dynamic = "force-static";

export default function InformacionUtilPage() {
  return (
    <main className="min-h-screen bg-slate-50 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <LegalPageTopNav />
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-2 tracking-tight">
            Información útil
          </h1>
          <p className="text-sm sm:text-base text-slate-500 max-w-2xl">
            Consejos, respuestas y ayuda para usar Rey del Dato mejor, tanto si buscas un servicio
            como si tienes un emprendimiento.
          </p>
        </header>

        <div className="space-y-10">
          {/* Bloque: para quienes buscan */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">Si estás buscando un servicio</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <article className="rd-card p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-1">
                  Cómo encontrar servicios en tu comuna
                </h3>
                <p className="text-sm text-slate-600">
                  Escribe qué necesitas (ej. gasfiter, panadería, clases de inglés) y elige tu
                  comuna. El buscador te mostrará primero los emprendimientos ubicados en tu comuna y
                  luego los que también la atienden.
                </p>
              </article>
              <article className="rd-card p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-1">
                  Cómo entender los resultados cercanos
                </h3>
                <p className="text-sm text-slate-600">
                  Si no hay muchos negocios en tu comuna, verás servicios de comunas cercanas que
                  igual pueden atender tu zona. Siempre indicamos desde dónde atienden y si están o
                  no en tu comuna.
                </p>
              </article>
              <article className="rd-card p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-1">
                  Qué significa &quot;En tu comuna&quot;
                </h3>
                <p className="text-sm text-slate-600">
                  El badge &quot;En tu comuna&quot; indica que el emprendimiento tiene su base en la
                  misma comuna que estás buscando. Son los negocios locales de tu zona.
                </p>
              </article>
              <article className="rd-card p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-1">
                  Qué significa &quot;Atiende tu comuna&quot;
                </h3>
                <p className="text-sm text-slate-600">
                  El badge &quot;Atiende tu comuna&quot; indica que el emprendimiento está en otra
                  comuna pero ofrece su servicio en la tuya (por ejemplo, fletes o servicios a
                  domicilio).
                </p>
              </article>
            </div>
          </section>

          {/* Bloque: para emprendedores */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">Si tienes un emprendimiento</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <article className="rd-card p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-1">
                  Cómo publicar en Rey del Dato
                </h3>
                <p className="text-sm text-slate-600 mb-2">
                  Completa el formulario con los datos básicos de tu negocio: nombre, comuna, rubro,
                  descripción y contacto.
                </p>
                <Link
                  href="/publicar"
                  className="rd-btn-primary mt-1 px-4 py-1.5 text-xs"
                >
                  Publicar mi negocio ahora
                </Link>
              </article>
              <article className="rd-card p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-1">
                  Qué datos necesitas
                </h3>
                <p className="text-sm text-slate-600">
                  Te pediremos datos básicos de tu negocio:
                  <br />
                  WhatsApp, descripción clara del servicio, comuna base y las comunas donde atiendes.
                </p>
                <p className="text-sm text-slate-600 mt-2">
                  Con esto ya puedes aparecer en las búsquedas.
                </p>
              </article>
              <article className="rd-card p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-1">Tu panel</h3>
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
                <h3 className="text-sm font-semibold text-slate-900 mb-1">
                  Beneficios de una ficha completa
                </h3>
                <p className="text-sm text-slate-600">
                  La ficha completa agrega fotos, Instagram, más descripción y datos de contacto. No
                  cambia tu posición en los resultados, pero mejora cómo te ven y puede generar más
                  confianza.
                </p>
              </article>
              <article className="rd-card p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-1">
                  Cómo aparecer cuando te buscan
                </h3>
                <p className="text-sm text-slate-600">
                  Elige bien tu categoría, comuna base y comunas de cobertura. Si atiendes varias
                  comunas o una región completa, indícalo correctamente para aparecer cuando alguien
                  busque en esas zonas.
                </p>
              </article>
              <article className="rd-card p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-1">Planes</h3>
                <p className="text-sm text-slate-600">
                  Publicar tu negocio es gratis y siempre puedes aparecer con ficha básica.
                </p>
                <p className="text-sm text-slate-600 mt-2">
                  La ficha completa es opcional y parte desde $3.500/mes. No cambia tu posición en
                  los resultados: mejora cómo se ve tu negocio, agrega más información y puede
                  ayudarte a generar más confianza y más contactos.
                </p>
                {/* TODO: crear página pública de planes cuando esté definida. */}
                <Link
                  href="/publicar"
                  className="rd-btn-primary mt-3 px-4 py-1.5 text-xs"
                >
                  Publicar mi negocio
                </Link>
              </article>
            </div>
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
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">
              Cómo crecen las comunas
            </h2>
            <p className="text-sm text-slate-600 max-w-2xl">
              Rey del Dato crece comuna por comuna. Algunas comunas ya muestran servicios disponibles,
              pero todavía están completando su catálogo. Mientras más negocios se publican o
              recomiendan, más útil se vuelve el directorio.
            </p>

            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">
                  ¿Qué significa que una comuna está en crecimiento?
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Significa que ya puede tener algunos servicios disponibles, pero su catálogo aún no
                  está completo. Puedes buscar, explorar negocios disponibles y ayudar recomendando
                  emprendimientos.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">
                  ¿Qué falta para completar una comuna?
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Faltan negocios reales en rubros clave, como gasfitería, electricidad, peluquería,
                  mecánica, comida preparada, fletes u otros servicios importantes para la vida
                  diaria.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">
                  ¿Cómo puedo ayudar a completar mi comuna?
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Puedes publicar tu emprendimiento gratis o recomendar un negocio que conozcas.
                  Mientras más datos reales tengamos, más útil será el directorio para todos.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">
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
                Publica tu emprendimiento
              </Link>{" "}
              o recomienda uno.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

