import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-14 md:h-16 items-center justify-between">
        <Link href="/" className="text-lg font-bold text-slate-900 hover:text-slate-700">
          Rey del Dato
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/cobertura"
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Cobertura
          </Link>
          <Link
            href="/publicar"
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
          >
            Publicar emprendimiento
          </Link>
        </nav>
      </div>
    </header>
  );
}
