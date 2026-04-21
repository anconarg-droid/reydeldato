"use client";

import HomeComunaAutocomplete from "@/components/home/HomeComunaAutocomplete";

/**
 * Acceso directo a otra comuna en flujo de activación (sin pasar por listados legacy).
 */
export default function AbrirComunaCambiarComuna() {
  return (
    <div
      className="mt-3 flex flex-col gap-2 sm:mt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
      role="region"
      aria-label="Cambiar de comuna"
    >
      <div className="flex min-w-0 flex-col gap-0.5 sm:shrink-0">
        <span className="text-xs font-semibold text-slate-700">Cambiar comuna</span>
        <span className="text-[11px] leading-snug text-slate-500">
          Elige otra comuna para ver cómo va su activación; si esa comuna ya está abierta, te llevamos al
          directorio con resultados.
        </span>
      </div>
      <HomeComunaAutocomplete
        target="abrir-comuna"
        placeholder="Buscar otra comuna…"
        confirmButtonLabel="Ir"
        containerClassName="w-full min-w-0 flex-1 sm:max-w-[min(100%,28.5rem)]"
      />
    </div>
  );
}
