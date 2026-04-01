import Link from "next/link";

export default function HomeFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-wrap gap-6 text-sm">
          <Link href="/" className="text-slate-600 hover:text-slate-900">
            Qué es Rey del Dato
          </Link>
          <Link href="/publicar" className="text-slate-600 hover:text-slate-900">
            Cómo publicar
          </Link>
          <a href="mailto:contacto@reydeldato.cl" className="text-slate-600 hover:text-slate-900">
            Contacto
          </a>
          <Link href="/comunas" className="text-slate-600 hover:text-slate-900">
            Comunas abiertas
          </Link>
        </div>
        <p className="mt-4 text-xs text-slate-500">
          © Rey del Dato. Emprendimientos locales cerca de ti.
        </p>
      </div>
    </footer>
  );
}
