"use client";

import { SectionCard } from "@/components/ui/section-card";

const SITE_URL = "https://reydeldato.cl";

function IconWhatsApp() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function IconFacebook() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function IconCopy() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

type InviteBusinessSectionProps = {
  cityName: string;
  citySlug: string;
};

export function InviteBusinessSection({ cityName, citySlug }: InviteBusinessSectionProps) {
  const comunaUrl = `${SITE_URL}/cobertura?comuna=${encodeURIComponent(citySlug)}`;
  const whatsappText = `Estamos abriendo ${cityName} en Rey del Dato. Si tienes un emprendimiento regístralo aquí: ${comunaUrl}`;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;
  const facebookHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(comunaUrl)}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(comunaUrl);
    } catch {
      // fallback por si no hay clipboard
    }
  }

  return (
    <SectionCard className="rounded-2xl">
      <h2 className="text-xl font-bold text-[#111827] sm:text-2xl">
        Ayuda a abrir esta comuna
      </h2>
      <p className="mt-2 text-[#6B7280]">
        Invita emprendedores locales a registrarse. Cuando lleguemos a la meta, esta comuna se activará automáticamente en Rey del Dato.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <a
          href={whatsappHref}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#25D366] bg-[#25D366] px-5 py-3 text-base font-semibold text-white shadow-sm hover:bg-[#20bd5a] transition-colors"
        >
          <IconWhatsApp />
          Compartir en WhatsApp
        </a>
        <a
          href={facebookHref}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-5 py-3 text-base font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <IconFacebook />
          Compartir en Facebook
        </a>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-5 py-3 text-base font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <IconCopy />
          Copiar enlace
        </button>
      </div>
    </SectionCard>
  );
}
