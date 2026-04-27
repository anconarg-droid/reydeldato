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
          background: "linear-gradient(160deg, #f0fdfa 0%, #ffffff 55%, #f8fafc 100%)",
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
              Directorio local · Chile
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
            Encuentra servicios reales{" "}
            <span style={{ color: "#0f766e" }}>en tu comuna</span>
          </h1>

          <p
            style={{
              fontFamily: "var(--font-sora, sans-serif)",
              marginTop: 18,
              fontSize: "clamp(15px, 2.1vw, 18px)",
              color: "#0f172a",
              fontWeight: 700,
              lineHeight: 1.45,
              maxWidth: 640,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Sin pagar publicidad. Gana el que está cerca.
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
            Si no estás aquí, no te encuentran.
          </p>

          {children ? (
            <div style={{ marginTop: 32, textAlign: "left" }}>{children}</div>
          ) : null}
        </div>
      </section>

      {/* Comparación: publicidad vs intención */}
      <section className="w-full border-t border-slate-100 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-16">
          <p className="text-center text-sm font-semibold text-slate-700">
            Tu negocio deja de perderse en grupos de WhatsApp.
          </p>
          <h2 className="text-balance text-center text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Aparece en tu comuna cuando te buscan
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-center text-sm font-semibold leading-relaxed text-slate-700 sm:text-base">
            Sin pagar publicidad. Sin intermediarios.
          </p>

          <div className="mx-auto mt-10 max-w-xl">
            <div className="rounded-2xl border border-teal-200 bg-white p-6 text-center shadow-sm ring-1 ring-teal-100">
              <div className="mt-2 text-2xl font-black tracking-tight text-teal-900">
                Empieza gratis por 90 días
              </div>
              <ul className="mx-auto mt-4 max-w-sm text-left text-sm font-semibold text-slate-800">
                <li className="flex gap-2">
                  <span className="text-teal-700" aria-hidden>
                    •
                  </span>
                  <span>Te encuentran cuando te buscan</span>
                </li>
                <li className="mt-2 flex gap-2">
                  <span className="text-teal-700" aria-hidden>
                    •
                  </span>
                  <span>Contacto directo por WhatsApp</span>
                </li>
                <li className="mt-2 flex gap-2">
                  <span className="text-teal-700" aria-hidden>
                    •
                  </span>
                  <span>Sin comisiones</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 flex flex-col items-center gap-2 text-center">
              <Link
                href="/publicar"
                onClick={() =>
                  capturePosthogEvent("click_publicar_home", {
                    origen: "home_hero",
                  })
                }
                className="inline-flex h-12 min-h-12 w-full items-center justify-center rounded-xl bg-teal-700 px-8 text-base font-extrabold text-white shadow-md transition hover:bg-teal-800 sm:w-auto"
              >
                Publica tu negocio gratis
              </Link>
              <p className="text-xs font-semibold text-slate-500">
                Sin tarjeta. Sin compromiso. Te toma menos de 2 minutos.
              </p>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center gap-4 text-center sm:mt-12">
            <p className="text-sm font-semibold text-slate-800 sm:text-base">
              No necesitas ser experto en marketing. Solo hacer bien tu trabajo.
            </p>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <div
        style={{
          borderTop: "1px solid #f0fdfa",
          borderBottom: "1px solid #f1f5f9",
          background: "#fff",
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: "clamp(16px, 4vw, 48px)",
          padding: "clamp(16px, 2.5vw, 24px) 24px",
        }}
      >
        {STATS.map((s) => (
          <div key={`${s.n}-${s.l}`} style={{ textAlign: "center", minWidth: 80 }}>
            <div
              style={{
                fontFamily: "var(--font-sora, sans-serif)",
                fontSize: "clamp(18px, 3vw, 24px)",
                fontWeight: 800,
                color: "#0f766e",
                letterSpacing: "-0.03em",
                lineHeight: 1,
              }}
            >
              {s.n}
            </div>
            <div
              style={{
                fontFamily: "var(--font-sora, sans-serif)",
                fontSize: 11,
                color: "#64748b",
                fontWeight: 500,
                marginTop: 4,
              }}
            >
              {s.l}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
