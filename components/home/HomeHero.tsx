"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Sora } from "next/font/google";
import HomeSearchClient from "@/app/HomeSearchClient";
import HomeRubrosTicker from "@/components/home/HomeRubrosTicker";
import type { RubroTickerItem } from "@/lib/loadRubrosTickerHome";
import { CHIPS_HERO } from "@/lib/homeConstants";
import { capturePosthogEvent } from "@/lib/posthog";
import { useSearchParams } from "next/navigation";

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  display: "swap",
  variable: "--font-sora",
});

type Props = {
  children?: ReactNode;
  /** Subcategorías con al menos un publicado; con menos de 5 no se muestra ticker. */
  rubrosTicker?: RubroTickerItem[];
};

const BENEFIT_PILLS = [
  "Publicación básica gratis",
  "WhatsApp directo",
  "Visible en búsquedas locales",
] as const;

export default function HomeHero({
  children,
  rubrosTicker = [],
}: Props) {
  const searchParams = useSearchParams();
  const initialComunaSlug = searchParams.get("comuna") ?? null;

  return (
    <div className={sora.variable}>
      {/* Hero */}
      <section
        className="w-full text-center"
        style={{
          background: "linear-gradient(160deg, #eaf6f2 0%, #f7f8f6 55%)",
          paddingTop: "clamp(28px, 5vw, 72px)",
          paddingBottom: "clamp(22px, 3.5vw, 56px)",
        }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6">

          {/* Eyebrow pill */}
          <div className="inline-flex items-center gap-2 mb-4 sm:mb-5">
            <span
              style={{
                background: "#ccfbf1",
                color: "#0f5c55",
                fontSize: 11,
                fontWeight: 700,
                padding: "5px 14px",
                borderRadius: 999,
                letterSpacing: "0.05em",
                fontFamily: "var(--font-sora, sans-serif)",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  background: "#0f766e",
                  borderRadius: "50%",
                  display: "inline-block",
                  flexShrink: 0,
                }}
              />
              Servicios y comercios locales · Chile
            </span>
          </div>

          {/* Título + subtítulo (beneficios) + línea de diferenciación */}
          <h1
            style={{
              fontFamily: "var(--font-sora, sans-serif)",
              fontSize: "clamp(28px, 5vw, 52px)",
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-0.035em",
              color: "#0f172a",
              margin: "0 auto",
              maxWidth: 720,
            }}
          >
            Encuentra servicios y comercios
            <br />
            <span style={{ color: "#0f766e" }}>en tu comuna</span>
          </h1>

          <div
            className="mx-auto mt-3 max-w-md space-y-0.5 px-1 text-center sm:mt-3.5"
            style={{
              fontFamily: "var(--font-sora, sans-serif)",
              fontSize: "clamp(14px, 2vw, 17px)",
              color: "#334155",
              fontWeight: 650,
              lineHeight: 1.25,
            }}
          >
            <p className="m-0">Contacto directo por WhatsApp.</p>
            <p className="m-0">Sin intermediarios.</p>
            <p className="m-0">Negocios reales de tu comuna.</p>
          </div>

          {/* Search box */}
          <div
            style={{
              marginTop: "clamp(20px, 4vw, 44px)",
              maxWidth: 680,
              marginLeft: "auto",
              marginRight: "auto",
              background: "#fff",
              border: "1.5px solid #99f6e4",
              borderRadius: 18,
              padding: "clamp(14px, 2vw, 20px)",
              boxShadow: "0 6px 28px rgba(15,118,110,0.10)",
            }}
          >
            <HomeSearchClient
              sugerencias={[...CHIPS_HERO]}
              initialComunaSlug={initialComunaSlug}
            />
          </div>

          <HomeRubrosTicker
            key={rubrosTicker.map((r) => r.slug).join("|")}
            items={rubrosTicker}
          />

          {children ? (
            <div className="mt-6 text-left md:mt-8">{children}</div>
          ) : null}
        </div>
      </section>

      {/* Comparación: publicidad vs intención */}
      <section className="w-full border-t border-slate-100 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-11 md:py-14">
          <div className="grid grid-cols-1 items-start gap-6 sm:gap-7 lg:grid-cols-2 lg:gap-14">
            {/* Izquierda: texto */}
            <div className="text-left">
              <p className="hidden text-sm font-semibold text-slate-700 md:block">
                Tu negocio aparece cuando alguien cerca te busca.
              </p>
              <h2 className="mt-2 text-balance text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl md:mt-2">
                Tu negocio aparece
                <br />
                cuando alguien te busca.
              </h2>
              <div className="mt-4 max-w-xl space-y-2 text-sm font-semibold leading-snug text-slate-800 sm:text-base">
                <p className="m-0">Publica gratis y recibe contactos directos.</p>
                <p className="m-0">WhatsApp, Instagram o llamada.</p>
              </div>
              <div className="mt-4 flex max-w-xl flex-wrap gap-2">
                {BENEFIT_PILLS.map((label) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1 rounded-full border border-teal-100/90 bg-[#ecfdf5] px-3 py-1.5 text-[11px] font-semibold leading-tight text-teal-900 sm:text-xs"
                  >
                    <span aria-hidden>✔</span>
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* Derecha: card planes (gratis / ficha completa) + CTA — solo desktop */}
            <div className="hidden w-full md:block">
              <div className="overflow-hidden rounded-2xl border border-teal-200 bg-white text-center shadow-sm ring-1 ring-teal-100">
                <div className="bg-white px-5 pt-3 pb-0.5 text-center sm:px-6">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-teal-800">
                    PARA EMPRENDEDORES
                  </p>
                </div>
                <div className="bg-[#0f766e] px-5 py-4 text-white sm:px-6 sm:py-4">
                  <h3 className="text-xl font-black leading-tight tracking-tight sm:text-2xl">
                    Aparece cuando te buscan.
                  </h3>
                  <p className="mx-auto mt-1.5 max-w-md text-sm font-semibold leading-snug text-white/95">
                    Contacto directo, sin intermediarios.
                  </p>
                </div>

                <div className="space-y-3 px-4 pb-4 pt-3 text-left sm:px-5 sm:pb-4">
                  <div className="rounded-xl bg-slate-50 px-3.5 py-3 sm:px-4 sm:py-3.5">
                    <p className="text-[11px] font-extrabold tracking-wide text-teal-900">
                      ✓ Incluido gratis
                    </p>
                    <ul className="mt-2 space-y-1.5 text-sm font-semibold text-slate-800">
                      <li className="flex gap-2">
                        <span className="text-teal-700" aria-hidden>
                          •
                        </span>
                        <span>Apareces en búsquedas por comuna</span>
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
                        <span>Sin intermediarios</span>
                      </li>
                    </ul>
                  </div>

                  <div className="rounded-xl border-2 border-teal-500 bg-white px-3.5 py-3 shadow-md shadow-teal-900/10 sm:px-4 sm:py-3.5">
                    <p className="text-base font-extrabold leading-snug text-teal-900 sm:text-lg">
                      Ficha completa desde $3.500 /mes
                    </p>
                    <ul className="mt-2 space-y-1.5 text-sm font-semibold text-slate-800">
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
                        <span>Instagram o sitio web</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-teal-700" aria-hidden>
                          •
                        </span>
                        <span>Más detalles para generar confianza</span>
                      </li>
                    </ul>
                    <Link
                      href="/planes"
                      className="mt-2.5 inline-flex items-center gap-0.5 text-sm font-semibold text-[#0F6E56] underline-offset-2 hover:underline"
                    >
                      Ver ficha completa →
                    </Link>
                  </div>

                  <div className="flex flex-col items-center gap-1.5 pt-0.5 text-center">
                    <Link
                      href="/publicar"
                      onClick={() =>
                        capturePosthogEvent("click_publicar_home", {
                          origen: "home_hero",
                        })
                      }
                      className="inline-flex h-12 min-h-12 w-full items-center justify-center rounded-xl bg-teal-700 px-8 text-base font-extrabold text-white shadow-md transition hover:bg-teal-800 sm:w-auto"
                    >
                      Publicar mi negocio
                    </Link>
                    <p className="text-[11px] font-medium text-slate-500">
                      Sin tarjeta · Sin compromiso · 2 minutos
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
