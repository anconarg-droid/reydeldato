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
                  Las fichas con fotos, buena descripción y datos de contacto completos reciben más
                  visitas y generan más mensajes.
                </p>
              </article>
              <article className="rd-card p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-1">
                  Cómo aparecer en más búsquedas
                </h3>
                <p className="text-sm text-slate-600">
                  Elige bien tus categorías y comunas de cobertura.
                </p>
                <p className="text-sm text-slate-600 mt-2">
                  Si atiendes varias comunas o una región completa, indícalo correctamente para
                  aparecer cuando la gente busque en esas zonas.
                </p>
              </article>
              <article className="rd-card p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-1">Planes</h3>
                <p className="text-sm text-slate-600">Publicar es gratis en esta etapa.</p>
                <p className="text-sm text-slate-600 mt-2">
                  Más adelante existirán planes opcionales para mejorar tu ficha (más fotos, mejor
                  presentación y otras mejoras), pero la visibilidad seguirá dependiendo de la
                  búsqueda y la comuna, no de pagar.
                </p>
                <p className="text-sm text-slate-600 mt-2">
                  Todos los emprendimientos tienen las mismas oportunidades de aparecer.
                </p>
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

          {/* Bloque: cobertura y apertura de comunas */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">
              Cómo abrimos nuevas comunas
            </h2>
            <p className="text-sm text-slate-600 max-w-2xl">
              Rey del Dato se expande comuna por comuna. Cuando una zona reúne suficientes
              emprendimientos locales, pasa a estar activa y puede comenzar a recibir búsquedas y
              contactos desde el buscador.
            </p>

            <div className="space-y-2">
              <details className="group rounded-xl border border-slate-200 bg-white px-4 py-3">
                <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-slate-900">
                  <span>¿Qué significa que una comuna esté &quot;en apertura&quot;?</span>
                  <span className="ml-2 text-slate-400 group-open:hidden">+</span>
                  <span className="ml-2 text-slate-400 hidden group-open:inline">−</span>
                </summary>
                <p className="mt-2 text-sm text-slate-600">
                  Significa que la comuna aún no cumple todos los tipos de servicios necesarios (cada uno con el
                  mínimo de oferta requerido), aunque ya pueda haber fichas publicadas. Puedes ayudar
                  recomendando negocios que cubran lo que falta.
                </p>
              </details>

              <details className="group rounded-xl border border-slate-200 bg-white px-4 py-3">
                <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-slate-900">
                  <span>¿Qué se necesita para abrir una comuna?</span>
                  <span className="ml-2 text-slate-400 group-open:hidden">+</span>
                  <span className="ml-2 text-slate-400 hidden group-open:inline">−</span>
                </summary>
                <p className="mt-2 text-sm text-slate-600">
                  Hay que completar una lista de tipos de servicios: cada uno debe alcanzar un mínimo de oferta
                  en la comuna. Cuando todos cumplen, el directorio público se considera listo para esa
                  comuna. La lista puede actualizarse con el tiempo.
                </p>
              </details>

              <details className="group rounded-xl border border-slate-200 bg-white px-4 py-3">
                <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-slate-900">
                  <span>¿Cómo puedo ayudar a abrir mi comuna?</span>
                  <span className="ml-2 text-slate-400 group-open:hidden">+</span>
                  <span className="ml-2 text-slate-400 hidden group-open:inline">−</span>
                </summary>
                <p className="mt-2 text-sm text-slate-600">
                  Puedes registrar tu propio negocio o servicio o recomendarnos negocios locales que deberían
                  estar en Rey del Dato. Cada publicación suma oferta y ayuda a completar los tipos de servicios
                  que faltan.
                </p>
              </details>

              <details className="group rounded-xl border border-slate-200 bg-white px-4 py-3">
                <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-slate-900">
                  <span>¿Puedo recomendar negocios aunque no sean míos?</span>
                  <span className="ml-2 text-slate-400 group-open:hidden">+</span>
                  <span className="ml-2 text-slate-400 hidden group-open:inline">−</span>
                </summary>
                <p className="mt-2 text-sm text-slate-600">
                  Sí. De hecho, es una de las mejores formas de apoyar el proyecto. Cuéntanos de
                  negocios que confíes en tu comuna y los invitaremos a sumarse.
                </p>
              </details>
            </div>

            <p className="text-sm text-slate-600 max-w-2xl pt-2">
              ¿Quieres ayudar a abrir tu comuna?{" "}
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

