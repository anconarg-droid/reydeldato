import Link from "next/link";

export const dynamic = "force-static";

export default function InformacionUtilPage() {
  return (
    <main className="min-h-screen bg-slate-50 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <header className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">
            Información útil
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl">
            Consejos, respuestas y ayuda para usar Rey del Dato mejor, tanto si buscas un servicio
            como si tienes un emprendimiento.
          </p>
        </header>

        <div className="space-y-10">
          {/* Bloque: para quienes buscan */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">Si estás buscando un servicio</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900 mb-1">
                  Cómo encontrar servicios en tu comuna
                </h3>
                <p className="text-sm text-slate-600">
                  Escribe qué necesitas (ej. gasfiter, panadería, clases de inglés) y elige tu
                  comuna. El buscador te mostrará primero los emprendimientos ubicados en tu comuna y
                  luego los que también la atienden.
                </p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900 mb-1">
                  Cómo entender los resultados cercanos
                </h3>
                <p className="text-sm text-slate-600">
                  Si no hay muchos negocios en tu comuna, verás servicios de comunas cercanas que
                  igual pueden atender tu zona. Siempre indicamos desde dónde atienden y si están o
                  no en tu comuna.
                </p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900 mb-1">
                  Qué significa &quot;En tu comuna&quot;
                </h3>
                <p className="text-sm text-slate-600">
                  El badge &quot;En tu comuna&quot; indica que el emprendimiento tiene su base en la
                  misma comuna que estás buscando. Son los negocios locales de tu zona.
                </p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
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
              <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900 mb-1">
                  Cómo publicar en Rey del Dato
                </h3>
                <p className="text-sm text-slate-600 mb-2">
                  Completa el formulario con los datos básicos de tu negocio: nombre, comuna, rubro,
                  descripción y contacto.
                </p>
                <Link
                  href="/publicar"
                  className="inline-flex items-center mt-1 rounded-full bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"
                >
                  Publicar mi emprendimiento
                </Link>
              </article>
              <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900 mb-1">
                  Qué datos necesitas
                </h3>
                <p className="text-sm text-slate-600">
                  Te pediremos datos de contacto (WhatsApp, correo), una descripción clara de tu
                  servicio, comuna base y las comunas que atiendes. Mientras más completo, mejor te
                  podrán encontrar.
                </p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900 mb-1">
                  Beneficios de una ficha completa
                </h3>
                <p className="text-sm text-slate-600">
                  Las fichas con foto, buena descripción y datos de contacto correctos aparecen
                  mejor posicionadas y generan más mensajes de clientes.
                </p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900 mb-1">
                  Cómo aparecer en más búsquedas
                </h3>
                <p className="text-sm text-slate-600">
                  Elige bien tus categorías y comunas de cobertura. Si atiendes varias comunas o
                  toda una región, indícalo en el formulario para aparecer cuando la gente busque en
                  esas zonas.
                </p>
              </article>
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
                  Significa que ya hay algunos emprendimientos registrados en esa comuna, pero
                  todavía no alcanzamos la meta para considerarla activa. Puedes ayudar
                  recomendando más negocios locales.
                </p>
              </details>

              <details className="group rounded-xl border border-slate-200 bg-white px-4 py-3">
                <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-slate-900">
                  <span>¿Cuántos emprendimientos se necesitan para abrir una comuna?</span>
                  <span className="ml-2 text-slate-400 group-open:hidden">+</span>
                  <span className="ml-2 text-slate-400 hidden group-open:inline">−</span>
                </summary>
                <p className="mt-2 text-sm text-slate-600">
                  Hoy usamos una meta de referencia (por ejemplo, 30 emprendimientos locales) para
                  considerar una comuna activa. Esta cifra puede ajustarse con el tiempo según el
                  tamaño y la realidad de cada zona.
                </p>
              </details>

              <details className="group rounded-xl border border-slate-200 bg-white px-4 py-3">
                <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-slate-900">
                  <span>¿Cómo puedo ayudar a abrir mi comuna?</span>
                  <span className="ml-2 text-slate-400 group-open:hidden">+</span>
                  <span className="ml-2 text-slate-400 hidden group-open:inline">−</span>
                </summary>
                <p className="mt-2 text-sm text-slate-600">
                  Puedes registrar tu propio emprendimiento o recomendarnos negocios locales que
                  deberían estar en Rey del Dato. Mientras más emprendimientos se sumen, más rápido
                  se abrirá tu comuna.
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
          </section>
        </div>
      </div>
    </main>
  );
}

