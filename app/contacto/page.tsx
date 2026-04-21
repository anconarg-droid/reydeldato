import LegalLayout from "@/components/LegalLayout";
import LegalSection from "@/components/LegalSection";

/** Número en wa.me sin +; mensaje prellenado según copy acordado. */
const CONTACTO_WHATSAPP_WA_ME =
  "https://wa.me/56975949281?text=Hola%2C%20vengo%20de%20Rey%20del%20Dato%20y%20quiero%20hacer%20una%20consulta.";

function IconWhatsApp({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

const mailtoHref =
  "mailto:contacto@reydeldato.cl?subject=Consulta%20Rey%20del%20Dato";

export default function ContactoPage() {
  return (
    <LegalLayout title="Contacto" lastUpdated="Abril 2026">
      <p className="text-sm sm:text-[0.95rem] leading-relaxed text-slate-600">
        Si tienes dudas sobre publicaciones, fichas o cómo funciona Rey del Dato, escríbenos.
      </p>

      <LegalSection title="Correo">
        <p>
          <a
            className="font-medium text-slate-900 underline underline-offset-2 hover:text-slate-700"
            href="mailto:contacto@reydeldato.cl"
          >
            contacto@reydeldato.cl
          </a>
        </p>
      </LegalSection>

      <LegalSection title="WhatsApp">
        <p>+56 9 7594 9281</p>
      </LegalSection>

      <LegalSection title="Horario de respuesta">
        <p>Lunes a viernes · 9:00 a 18:00</p>
      </LegalSection>

      <LegalSection title="¿Sobre qué puedes escribirnos?">
        <ul className="list-disc pl-5 space-y-2">
          <li>Publicar tu emprendimiento</li>
          <li>Corregir datos de una ficha</li>
          <li>Dudas sobre la plataforma</li>
          <li>Privacidad, términos o información legal</li>
          <li>Recomendar un servicio</li>
        </ul>
      </LegalSection>

      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
        <a
          href={CONTACTO_WHATSAPP_WA_ME}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-6 text-sm font-semibold text-white shadow-md transition hover:bg-[#20BD5A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366]"
        >
          <IconWhatsApp className="h-5 w-5 shrink-0 text-white" />
          Escribir por WhatsApp
        </a>
        <a
          href={mailtoHref}
          className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
        >
          Enviar correo
        </a>
      </div>

      <div className="mt-12 pt-8 border-t border-slate-200/80">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">
          Datos de la empresa
        </p>
        <p className="text-sm text-slate-600">Rey del Dato SpA</p>
        <p className="text-sm text-slate-600">RUT: 78.403.835-1</p>
      </div>
    </LegalLayout>
  );
}
