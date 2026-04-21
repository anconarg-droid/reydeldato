"use client";

import Link from "next/link";
import { Sora } from "next/font/google";
import { postClientAnalyticsEvent } from "@/lib/postClientAnalyticsEvent";

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  display: "swap",
  variable: "--font-sora",
});

export default function HomeHeader() {
  return (
    <header
      className={`${sora.variable} sticky top-0 z-40 w-full`}
      style={{
        borderBottom: "1px solid #e8f5f0",
        background: "rgba(255,255,255,0.97)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between" style={{ minHeight: 56, paddingTop: 10, paddingBottom: 10 }}>

          {/* Logo */}
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            {/* Logo mark */}
            <div
              style={{
                width: 30,
                height: 30,
                background: "#0f766e",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="9" r="3.5" fill="white" />
                <circle cx="9" cy="9" r="1.8" fill="#0f766e" />
                <line x1="9" y1="1.5" x2="9" y2="5" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <line x1="9" y1="13" x2="9" y2="16.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <line x1="1.5" y1="9" x2="5" y2="9" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <line x1="13" y1="9" x2="16.5" y2="9" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            {/* Logo text */}
            <span
              style={{
                fontFamily: "var(--font-sora, sans-serif)",
                fontSize: 16,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: "#0f172a",
              }}
            >
              Rey del{" "}
              <span style={{ color: "#0f766e" }}>Dato</span>
            </span>
          </Link>

          {/* Nav */}
          <nav className="flex flex-wrap items-center justify-end gap-2 sm:gap-5 text-sm">
            <Link
              href="/"
              style={{
                fontFamily: "var(--font-sora, sans-serif)",
                color: "#475569",
                fontWeight: 500,
                fontSize: 13,
                textDecoration: "none",
              }}
              className="hidden sm:block hover:text-slate-900 transition"
            >
              Inicio
            </Link>
            <Link
              href="/#home-como-funciona"
              style={{
                fontFamily: "var(--font-sora, sans-serif)",
                color: "#475569",
                fontWeight: 500,
                fontSize: 13,
                textDecoration: "none",
              }}
              className="hidden sm:block hover:text-slate-900 transition"
            >
              Cómo funciona
            </Link>
            <Link
              href="/informacion-util"
              style={{
                fontFamily: "var(--font-sora, sans-serif)",
                color: "#475569",
                fontWeight: 500,
                fontSize: 13,
                textDecoration: "none",
              }}
              className="hidden md:block hover:text-slate-900 transition"
            >
              Información útil
            </Link>
            <Link
              href="/publicar"
              onClick={() =>
                postClientAnalyticsEvent({
                  event_type: "cta_publicar_click",
                  metadata: { source: "home" },
                })
              }
              style={{
                fontFamily: "var(--font-sora, sans-serif)",
                background: "#0f766e",
                color: "#fff",
                fontWeight: 700,
                fontSize: 13,
                padding: "8px 16px",
                borderRadius: 10,
                textDecoration: "none",
                flexShrink: 0,
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              Publica tu emprendimiento
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
