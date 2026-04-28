"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function HomeFooter() {
  const pathname = usePathname();
  const isTerminos = pathname === "/terminos";
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm" aria-label="Enlaces del sitio">
          <Link href="/que-es" className="text-slate-600 hover:text-slate-900">
            Qué es Rey del Dato
          </Link>
          <Link href="/publicar" className="text-slate-600 hover:text-slate-900">
            Cómo publicar
          </Link>
          <Link href="/contacto" className="text-slate-600 hover:text-slate-900">
            Contacto
          </Link>
          <Link
            href="/terminos"
            className={isTerminos ? "font-medium text-slate-900" : "text-slate-600 hover:text-slate-900"}
          >
            Términos y condiciones
          </Link>
          <Link href="/privacidad" className="text-slate-600 hover:text-slate-900">
            Política de privacidad
          </Link>
        </nav>

        <p className="mt-5 text-xs text-slate-500">© Rey del Dato SpA · RUT 78.403.835-1</p>
      </div>
    </footer>
  );
}
