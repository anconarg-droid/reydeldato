"use client";

import { useRouter } from "next/navigation";

/**
 * Vuelve a la página anterior del historial. Si entraste directo, suele ir al sitio previo o quedarse.
 */
export default function LegalBackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
      aria-label="Volver a la página anterior"
    >
      <span aria-hidden className="text-slate-500">
        ←
      </span>
      Volver
    </button>
  );
}
