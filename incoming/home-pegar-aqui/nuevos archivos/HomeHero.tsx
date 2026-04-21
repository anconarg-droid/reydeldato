"use client";

import type { ReactNode } from "react";
import { Sora } from "next/font/google";
import HomeSearchClient from "@/app/HomeSearchClient";
import { CHIPS_HERO } from "@/lib/homeConstants";
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
  { n: "0", l: "Intermediarios" },
  { n: "Directo", l: "Contacto por WhatsApp" },
  { n: "Gratis", l: "Para publicar" },
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

          {/* Title */}
          <h1
            style={{
              fontFamily: "var(--font-sora, sans-serif)",
              fontSize: "clamp(32px, 5.5vw, 58px)",
              fontWeight: 800,
              lineHeight: 1.08,
              letterSpacing: "-0.035em",
              color: "#0f172a",
              margin: "0 auto",
              maxWidth: 680,
            }}
          >
            Encuentra servicios reales{" "}
            <em style={{ color: "#0f766e", fontStyle: "normal" }}>
              en tu comuna
            </em>
          </h1>

          {/* Subtitle */}
          <p
            style={{
              fontFamily: "var(--font-sora, sans-serif)",
              marginTop: 16,
              fontSize: "clamp(14px, 2vw, 17px)",
              color: "#64748b",
              fontWeight: 400,
              lineHeight: 1.6,
              maxWidth: 440,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Sin datos falsos. Sin perder tiempo. Sin pagar por visibilidad.
          </p>

          {/* Search box */}
          <div
            style={{
              marginTop: "clamp(24px, 4vw, 40px)",
              maxWidth: 680,
              marginLeft: "auto",
              marginRight: "auto",
              background: "#fff",
              border: "1.5px solid #99f6e4",
              borderRadius: 18,
              padding: "clamp(14px, 2vw, 20px)",
              boxShadow: "0 4px 24px rgba(15,118,110,0.08)",
            }}
          >
            <HomeSearchClient
              sugerencias={[...CHIPS_HERO]}
              initialComunaSlug={initialComunaSlug}
            />
          </div>

          {/* Trust line */}
          <p
            style={{
              marginTop: 16,
              fontSize: 12,
              color: "#94a3b8",
              fontFamily: "var(--font-sora, sans-serif)",
            }}
          >
            Resultados reales en tu comuna · contacto directo · sin intermediarios
          </p>

          {children ? (
            <div style={{ marginTop: 32, textAlign: "left" }}>{children}</div>
          ) : null}
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
          <div key={s.l} style={{ textAlign: "center", minWidth: 80 }}>
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
