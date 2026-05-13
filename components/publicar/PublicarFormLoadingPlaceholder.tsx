"use client";

import { Loader2 } from "lucide-react";

type Props = {
  /** Clases Tailwind extra para el contenedor externo */
  className?: string;
};

/**
 * Estado de carga del formulario de publicación: solo figura, sin texto llamativo.
 * Incluye etiqueta accesible oculta visualmente.
 */
export default function PublicarFormLoadingPlaceholder({ className = "" }: Props) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 ${className}`}
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Cargando formulario</span>
      <Loader2
        className="h-9 w-9 shrink-0 animate-spin text-teal-700"
        strokeWidth={2.25}
        aria-hidden
      />
    </div>
  );
}
