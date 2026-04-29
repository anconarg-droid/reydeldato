import Link from "next/link";
import LegalLayout from "@/components/LegalLayout";

export default function QueEsPage() {
  return (
    <LegalLayout title="Qué es Rey del Dato" lastUpdated="Abril 2026">
      <div className="max-w-[640px] text-sm text-slate-700 sm:text-[0.95rem] leading-7">
        <p className="mb-5 leading-relaxed">
          Rey del Dato es un directorio local donde puedes encontrar servicios y comercios reales en tu comuna y
          contactarlos directamente por WhatsApp.
        </p>
        <p className="mb-5 leading-relaxed">
          No hay intermediarios ni rankings pagados. Esto no es publicidad: es un directorio local basado
          en tu búsqueda y tu comuna.
        </p>
        <p className="mb-0 leading-relaxed">
          Hoy encontrar negocios locales suele ser desordenado: grupos de WhatsApp, publicaciones que se pierden,
          datos viejos o resultados dominados por publicidad. Rey del Dato busca ordenar esa información y
          hacerla útil.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-[15px] font-medium text-slate-900 sm:text-base">Cómo funciona</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-2 text-3xl font-medium leading-none text-[#0d7a5f]">01</div>
            <h3 className="text-sm font-medium text-slate-900">Buscas en tu comuna</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
              Escribe qué necesitas y elige tu comuna.
            </p>
          </article>
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-2 text-3xl font-medium leading-none text-[#0d7a5f]">02</div>
            <h3 className="text-sm font-medium text-slate-900">Comparas opciones reales</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
              Ves negocios cercanos con descripción y contacto.
            </p>
          </article>
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-2 text-3xl font-medium leading-none text-[#0d7a5f]">03</div>
            <h3 className="text-sm font-medium text-slate-900">Contactas directo</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
              Hablas por WhatsApp, sin formularios ni intermediarios.
            </p>
          </article>
        </div>
      </section>

      <section className="mt-10 max-w-[640px] text-sm text-slate-700 sm:text-[0.95rem] leading-7">
        <h2 className="text-[15px] font-medium text-slate-900 sm:text-base">
          Por qué existe Rey del Dato
        </h2>
        <p className="mt-4 leading-relaxed">
          Encontrar negocios locales suele ser desordenado: grupos de WhatsApp donde nadie responde,
          búsquedas en Google que muestran negocios de otra ciudad o resultados pagados que no son los más
          cercanos.
        </p>
        <p className="mt-5 leading-relaxed">
          Rey del Dato ordena esa información por comuna para que encuentres opciones reales cerca de ti, con
          contacto directo y sin intermediarios.
        </p>
      </section>

      <nav
        className="flex flex-wrap items-center justify-start gap-x-1 gap-y-1 text-sm text-[#0d7a5f]"
        aria-label="Acciones"
      >
        <Link href="/" className="underline decoration-[#0d7a5f] underline-offset-2 hover:text-[#0a5c48]">
          Buscar en mi comuna
        </Link>
        <span className="select-none text-slate-400" aria-hidden>
          {" "}
          ·{" "}
        </span>
        <Link
          href="/publicar"
          className="underline decoration-[#0d7a5f] underline-offset-2 hover:text-[#0a5c48]"
        >
          Publicar mi negocio
        </Link>
      </nav>
    </LegalLayout>
  );
}
