"use client";

import Link from "next/link";
import { Sora } from "next/font/google";
import { postClientAnalyticsEvent } from "@/lib/postClientAnalyticsEvent";
import { capturePosthogEvent } from "@/lib/posthog";
import ReyDelDatoLogo from "@/components/brand/ReyDelDatoLogo";

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  display: "swap",
  variable: "--font-sora",
});

export default function GlobalHeader() {
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
        <div
          className="flex items-center justify-between"
          style={{ minHeight: 56, paddingTop: 10, paddingBottom: 10 }}
        >
          {/* Logo */}
          <div style={{ flexShrink: 0 }}>
            <ReyDelDatoLogo tagline="dato" />
          </div>

          {/* Nav */}
          <nav className="flex flex-wrap items-center justify-end gap-2 sm:gap-5">
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
              onClick={() => {
                postClientAnalyticsEvent({
                  event_type: "cta_publicar_click",
                  metadata: { source: "header_global" },
                });
                capturePosthogEvent("click_publicar_home", {
                  origen: "nav_global",
                });
              }}
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
