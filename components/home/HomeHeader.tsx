"use client";

import Link from "next/link";

export default function HomeHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-h-14 sm:min-h-16 py-3 sm:py-4">
          <Link
            href="/"
            className="font-black text-xl text-slate-900 tracking-tight hover:text-sky-700 transition shrink-0"
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
            <Link href="/comunas" className="text-slate-600 hover:text-slate-900 font-medium">
              Comunas
            </Link>
            <Link
              href="/informacion-util"
              className="text-slate-600 hover:text-slate-900 font-medium hidden sm:inline"
            >
              Información útil
            </Link>
            <Link
              href="/publicar"
              className="sm:ml-2 h-9 px-4 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition inline-flex items-center justify-center shrink-0"
            >
              Publica tu emprendimiento
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
