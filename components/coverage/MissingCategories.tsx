"use client";

import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/Card";

const SITE_URL = "https://reydeldato.cl";

function StoreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
    </svg>
  );
}

export type MissingCategoryItem = {
  name: string;
  registered?: number;
  goal?: number;
};

type MissingCategoriesProps = {
  cityName: string;
  citySlug: string;
  categories: MissingCategoryItem[];
};

function buildShareMessage(comunaNombre: string, rubroNombre: string, comunaSlug: string): string {
  const url = `${SITE_URL}/cobertura?comuna=${encodeURIComponent(comunaSlug)}`;
  return `Hola, estamos ayudando a abrir ${comunaNombre} en Rey del Dato.\nTodavía faltan emprendimientos del rubro ${rubroNombre}.\nSi conoces a alguien o tienes este negocio, regístralo aquí:\n${url}`;
}

function ShareRubroMenu({
  comunaNombre,
  comunaSlug,
  rubroNombre,
  onClose,
  anchorRef,
}: {
  comunaNombre: string;
  comunaSlug: string;
  rubroNombre: string;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [copied, setCopied] = useState<"message" | "link" | null>(null);
  const message = buildShareMessage(comunaNombre, rubroNombre, comunaSlug);
  const url = `${SITE_URL}/cobertura?comuna=${encodeURIComponent(comunaSlug)}`;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(message)}`;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose, anchorRef]);

  async function handleCopyMessage() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied("message");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // ignore
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied("link");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <div className="absolute left-0 right-0 top-full z-10 mt-1 min-w-[180px] rounded-lg border border-[#E5E7EB] bg-white py-1 shadow-md">
      <a
        href={whatsappHref}
        target="_blank"
        rel="noreferrer noopener"
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#111827] hover:bg-[#F9FAFB]"
      >
        Compartir en WhatsApp
      </a>
      <button
        type="button"
        onClick={handleCopyMessage}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#111827] hover:bg-[#F9FAFB]"
      >
        {copied === "message" ? "¡Copiado!" : "Copiar mensaje"}
      </button>
      <button
        type="button"
        onClick={handleCopyLink}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#111827] hover:bg-[#F9FAFB]"
      >
        {copied === "link" ? "¡Copiado!" : "Copiar link"}
      </button>
    </div>
  );
}

export function MissingCategories({ cityName, citySlug, categories }: MissingCategoriesProps) {
  const [openMenuIndex, setOpenMenuIndex] = useState<number | null>(null);
  const buttonRefs = useRef<(HTMLDivElement | null)[]>([]);

  const comunaDisplay = cityName.charAt(0).toUpperCase() + cityName.slice(1).toLowerCase();

  if (categories.length === 0) {
    return (
      <section className="mb-16 md:mb-20">
        <h2 className="text-2xl font-semibold text-[#111827] mb-2 text-center">
          ¿Qué rubros faltan en tu comuna?
        </h2>
        <p className="text-[#6B7280] text-center mb-10 max-w-lg mx-auto">
          Aún no hay rubros cargados para esta comuna.
        </p>
      </section>
    );
  }

  return (
    <section className="mb-16 md:mb-20">
      <div className="text-center mb-8">
        <p className="text-2xl md:text-3xl font-bold text-[#111827] mb-2">
          <span className="text-amber-500">{categories.length}</span> rubros aún faltan en {comunaDisplay}
        </p>
      </div>
      <h2 className="text-2xl font-semibold text-[#111827] mb-2 text-center">
        ¿Qué rubros faltan en tu comuna?
      </h2>
      <p className="text-[#6B7280] text-center mb-10 max-w-lg mx-auto">
        Si conoces a alguien que tenga uno de estos negocios, invítalo a registrarse.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
        {categories.map((rubro, index) => {
          const registered = Number(rubro.registered ?? 0);
          const goal = Number(rubro.goal ?? 0);
          const faltan = Math.max(0, goal - registered);
          const isComplete = faltan <= 0;

          return (
            <Card
              key={rubro.name}
              className="group cursor-default rounded-xl border-[#E5E7EB] hover:border-[#111827]/20 transition-all hover:shadow-md p-4 flex flex-col items-center text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-[#F9FAFB] flex items-center justify-center mb-3 group-hover:bg-amber-100 transition-colors">
                <StoreIcon className="w-6 h-6 text-[#111827] group-hover:text-amber-600 transition-colors" />
              </div>
              <span className="text-sm font-medium text-[#111827]">{rubro.name}</span>
              <p className="mt-1.5 text-xs text-[#6B7280]">
                {registered} / {goal}
              </p>
              {isComplete ? (
                <p className="mt-1 text-xs font-medium text-[#16A34A]">Meta cumplida</p>
              ) : (
                <>
                  <p className="mt-0.5 text-xs text-[#6B7280]">
                    Faltan {faltan} {faltan === 1 ? "negocio" : "negocios"}
                  </p>
                  <div className="mt-3 relative" ref={(el) => { buttonRefs.current[index] = el; }}>
                    <button
                      type="button"
                      onClick={() => setOpenMenuIndex(openMenuIndex === index ? null : index)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-xs font-medium text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#111827] transition-colors"
                    >
                      <ShareIcon className="w-3.5 h-3.5" />
                      Invitar a alguien
                    </button>
                    {openMenuIndex === index && (
                      <ShareRubroMenu
                        comunaNombre={comunaDisplay}
                        comunaSlug={citySlug}
                        rubroNombre={rubro.name}
                        onClose={() => setOpenMenuIndex(null)}
                        anchorRef={{ current: buttonRefs.current[index] }}
                      />
                    )}
                  </div>
                </>
              )}
            </Card>
          );
        })}
      </div>

      <div className="text-center mt-8">
        <a
          href="#ayuda-abrir"
          className="inline-flex items-center justify-center gap-2 rounded-[10px] border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm font-semibold text-[#111827] hover:bg-[#F9FAFB] transition-colors"
        >
          Invitar a alguien que tenga este rubro
        </a>
      </div>
    </section>
  );
}
