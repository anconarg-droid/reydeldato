import Link from "next/link";
import LegalBackButton from "@/components/LegalBackButton";

/**
 * Marca + inicio y botón atrás para páginas legales / informativas sin header global.
 */
export default function LegalPageTopNav() {
  return (
    <nav
      className="mb-8 flex flex-col gap-3 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
      aria-label="Navegación"
    >
      <Link
        href="/"
        className="w-fit font-black text-xl tracking-tight text-slate-900 transition hover:text-sky-700"
      >
        Rey del Dato
      </Link>
      <LegalBackButton />
    </nav>
  );
}
