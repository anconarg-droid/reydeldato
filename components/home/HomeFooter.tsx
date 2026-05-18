"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePanelEmbed } from "@/hooks/usePanelEmbed";

export default function HomeFooter() {
  const panelEmbed = usePanelEmbed();
  const pathname = usePathname();
  if (panelEmbed) return null;
  const isTerminos = pathname === "/terminos";
  const isPrivacidad = pathname === "/privacidad";
  return (
    <footer
      className="border-t bg-slate-50"
      style={{
        background: "var(--color-background, var(--background))",
        borderTop: "0.5px solid var(--color-border, var(--border))",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 py-4">
        <nav className="flex flex-wrap justify-center gap-x-5 gap-y-1.5 text-sm" aria-label="Enlaces del sitio">
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
          <Link
            href="/privacidad"
            className={
              isPrivacidad ? "font-medium text-slate-900" : "text-slate-600 hover:text-slate-900"
            }
          >
            Política de privacidad
          </Link>
        </nav>

        <p className="mt-3 text-xs text-slate-500">© Rey del Dato SpA · RUT 78.403.835-1</p>
      </div>
    </footer>
  );
}
