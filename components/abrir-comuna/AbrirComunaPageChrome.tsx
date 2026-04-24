import Link from "next/link";

import AbrirComunaCambiarComuna from "./AbrirComunaCambiarComuna";

type Props = {
  children: React.ReactNode;
  /** Última miga: nombre de comuna (texto actual, sin enlace). */
  comunaBreadcrumbLabel: string;
};

/**
 * Migas sobre /abrir-comuna/[slug]: Inicio → "Comunas en crecimiento" (texto) → comuna actual.
 * La región no va en migas; va bajo el título en el cliente. Cambio de comuna: autocomplete + enlace a /buscar.
 */
export default function AbrirComunaPageChrome({
  children,
  comunaBreadcrumbLabel,
}: Props) {
  const label = comunaBreadcrumbLabel.trim() || "Comuna";

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100 text-slate-900">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 pt-6 sm:pt-8 pb-1">
        <nav
          className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500"
          aria-label="Migas de pan"
        >
          <Link href="/" className="font-medium text-sky-700 hover:text-sky-800">
            Inicio
          </Link>
          <span className="text-slate-300" aria-hidden>
            /
          </span>
          <span className="font-medium text-slate-600">Comunas en crecimiento</span>
          <span className="text-slate-300" aria-hidden>
            /
          </span>
          <span
            className="font-medium text-slate-700 max-w-[min(100%,14rem)] truncate sm:max-w-none sm:whitespace-normal"
            aria-current="page"
          >
            {label}
          </span>
        </nav>
        <AbrirComunaCambiarComuna />
      </div>
      {children}
    </main>
  );
}
