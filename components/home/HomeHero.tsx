"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Sora } from "next/font/google";
import HomeSearchClient from "@/app/HomeSearchClient";
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
};

const STATS = [
  { n: "Local", l: "Tu comuna primero" },
  { n: "0", l: "Sin intermediarios" },
  { n: "Directo", l: "WhatsApp directo" },
  { n: "Gratis", l: "Publicar es gratis" },
];

export default function HomeHero({ children }: Props) {
  const searchParams = useSearchParams();
  const initialComunaSlug = searchParams.get("comuna") ?? null;

  return (
    <div className={sora.variable}>
      {/* Hero */}
      <section
        className="w-full text-center"
        style={{
          background: "linear-gradient(160deg, #eaf6f2 0%, #f7f8f6 55%)",
          paddingTop: "clamp(40px, 6vw, 72px)",
          paddingBottom: "clamp(32px, 4vw, 56px)",
        }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6">

          {/* Eyebrow pill */}
          <div className="inline-flex items-center gap-2 mb-5">
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
            Encuentra servicios y comercios reales
            <br />
            <span style={{ color: "#0f766e" }}>en tu comuna</span>
          </h1>

          <p
            style={{
              fontFamily: "var(--font-sora, sans-serif)",
              marginTop: 18,
              fontSize: "clamp(15px, 2.1vw, 18px)",
              color: "#334155",
              fontWeight: 650,
              lineHeight: 1.45,
              maxWidth: 640,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Hay mucha gente de tu comuna que ofrece lo que buscas. Priorizamos lo cercano y quienes atienden tu zona.
          </p>

          {/* Search box */}
          <div
            style={{
              marginTop: "clamp(28px, 4.5vw, 44px)",
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

          <p className="mt-4 text-center text-sm font-semibold text-slate-700">
            Primero lo local. Contacto directo por WhatsApp.
          </p>

          {children ? (
            <div style={{ marginTop: 32, textAlign: "left" }}>{children}</div>
          ) : null}
        </div>
      </section>

      {/* Comparación: publicidad vs intención */}
      <section className="w-full border-t border-slate-100 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-16">
          <div className="grid items-start gap-10 md:grid-cols-2 md:gap-14">
            {/* Izquierda: texto */}
            <div className="text-left">
              <p className="text-sm font-semibold text-slate-700">Tu negocio aparece cuando alguien cerca te busca.</p>
              <h2 className="mt-2 text-balance text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                Te encuentran cuando te necesitan
              </h2>
              <p className="mt-4 max-w-xl text-sm font-semibold leading-relaxed text-slate-700 sm:text-base">
                Tus próximos clientes pueden estar cerca, pero no saben que existes.
              </p>
              <p className="mt-4 max-w-xl text-sm font-semibold leading-relaxed text-slate-700 sm:text-base">
                En Rey del Dato apareces cuando alguien busca en tu comuna. Sin pagar publicidad. Sin intermediarios.
              </p>
              <p className="mt-4 max-w-xl text-sm font-semibold leading-relaxed text-slate-800 sm:text-base">
                Todos tienen la misma oportunidad de aparecer.
                <br />
                Aquí no gana el que paga, gana el que está cerca.
              </p>

              {/* Stats (balance visual vs card derecha) */}
              <div className="mt-8 grid grid-cols-2 gap-4 max-w-md">
                {STATS.map((s) => (
                  <div key={`${s.n}-${s.l}`} className="min-w-0">
                    <div className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#0f766e] leading-none">
                      {s.n}
                    </div>
                    <div className="mt-1 text-xs sm:text-sm font-medium text-slate-500 leading-snug">
                      {s.l}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Derecha: card planes (gratis / ficha completa) + CTA */}
            <div className="w-full">
              <div className="overflow-hidden rounded-2xl border border-teal-200 bg-white text-center shadow-sm ring-1 ring-teal-100">
                <div className="bg-[#0f766e] px-5 py-5 text-white sm:px-6">
                  <h3 className="text-xl font-black leading-tight tracking-tight sm:text-2xl">
                    Empieza gratis. Aparece cuando te buscan.
                  </h3>
                  <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-relaxed text-white/95">
                    En WhatsApp o Facebook te ven algunos.
                    <br />
                    Aquí te encuentran cuando te buscan.
                  </p>
                </div>

                <div className="space-y-4 px-4 pb-5 pt-4 text-left sm:px-5">
                  <div className="rounded-xl bg-slate-50 px-4 py-4">
                    <p className="text-[11px] font-extrabold tracking-wide text-teal-900">
                      ✓ INCLUIDO GRATIS
                    </p>
                    <ul className="mt-3 space-y-2 text-sm font-semibold text-slate-800">
                      <li className="flex gap-2">
                        <span className="text-teal-700" aria-hidden>
                          •
                        </span>
                        <span>Apareces cuando te buscan en tu comuna</span>
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
                        <span>Sin comisiones</span>
                      </li>
                    </ul>
                  </div>

                  <div className="rounded-xl border-2 border-teal-500 bg-white px-4 py-4 shadow-md shadow-teal-900/10">
                    <p className="text-[11px] font-extrabold tracking-wide text-teal-800">
                      ⭐ FICHA COMPLETA
                    </p>
                    <p className="mt-2 text-2xl font-black tabular-nums text-teal-900">
                      Desde $3.500/mes
                    </p>
                    <Link
                      href="/planes"
                      className="mt-2 inline-flex w-fit text-sm font-semibold text-teal-800 hover:text-teal-900"
                    >
                      Ver planes →
                    </Link>
                    <p className="mt-2 text-sm font-extrabold leading-snug text-slate-900">
                      No cambia tu posición,{" "}
                      <span className="font-black text-[#0f766e]">mejora cómo te ven.</span>
                    </p>
                    <p className="mt-2 text-xs font-medium leading-snug text-slate-600">
                      Opcional. Puedes seguir gratis con tu ficha básica.
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
                        <span>Link a Instagram</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-teal-700" aria-hidden>
                          •
                        </span>
                        <span>Más información para generar confianza</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-teal-700" aria-hidden>
                          •
                        </span>
                        <span>Más claridad para que te contacten directo</span>
                      </li>
                    </ul>
                  </div>

                  <div className="flex flex-col items-center gap-2 pt-1 text-center">
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
