"use client";

import HomeComunaAutocomplete from "@/components/home/HomeComunaAutocomplete";

/**
 * Acceso directo a otra comuna en flujo de activación (sin pasar por listados legacy).
 */
export default function AbrirComunaCambiarComuna() {
  return (
    <div
      className="mt-2 flex w-full flex-col gap-1.5 sm:mt-3 sm:items-end"
      role="region"
      aria-label="Cambiar de comuna"
    >
      <HomeComunaAutocomplete
        target="abrir-comuna"
        placeholder="Buscar otra comuna…"
        confirmButtonLabel="Ir"
        containerClassName="w-full min-w-0 sm:max-w-[min(100%,28.5rem)]"
      />
      <p className="m-0 max-w-full text-[11px] leading-snug text-slate-500 sm:max-w-[min(100%,28.5rem)] sm:text-right">
        Revisa otra comuna o entra a su directorio si ya está activa.
      </p>
    </div>
  );
}
