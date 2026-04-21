"use client";

import Link from "next/link";
import { postClientAnalyticsEvent } from "@/lib/postClientAnalyticsEvent";

export default function HomeHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-h-14 sm:min-h-16 py-3 sm:py-4">
          <Link
            href="/"
            className="font-black text-xl text-slate-900 tracking-tight hover:text-emerald-700 transition shrink-0"
          >
            Rey del Dato
          </Link>
          <nav className="flex flex-wrap items-center justify-end gap-2 sm:gap-6 text-sm">
            <Link
              href="/"
              className="text-slate-600 hover:text-slate-900 font-medium"
            >
              Inicio
            </Link>
            <Link
              href="/#home-como-funciona"
              className="text-slate-600 hover:text-slate-900 font-medium"
            >
              Cómo funciona
            </Link>
            <Link
              href="/informacion-util"
              className="text-slate-600 hover:text-slate-900 font-medium"
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
              className="rd-btn-primary sm:ml-2 h-9 min-h-9 shrink-0 px-4 !py-0 text-sm"
            >
              Publica tu emprendimiento
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
