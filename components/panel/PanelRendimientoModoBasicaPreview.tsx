"use client";

/**
 * Cuando el emprendedor elige «Básica» en «Compara cómo te ven»: simula el bloque de rendimiento
 * difuminado, sin mostrar números reales, y aclara que las estadísticas del panel son solo con ficha completa.
 */
export function PanelRendimientoModoBasicaPreview() {
  return (
    <div
      className="relative w-full min-w-0 rounded-xl border border-gray-200 bg-white px-3 py-4 shadow-sm sm:px-5 sm:py-5"
      role="status"
      aria-label="Vista previa: con ficha básica no hay estadísticas de rendimiento en el panel."
    >
      <div
        className="pointer-events-none select-none space-y-5 blur-md sm:blur-lg"
        aria-hidden
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <div className="h-5 w-48 max-w-full rounded-md bg-gray-200" />
            <div className="h-4 w-full max-w-[14rem] rounded-md bg-gray-100" />
          </div>
          <div className="h-9 w-[7.5rem] shrink-0 rounded-lg bg-gray-100" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[0, 1, 2].map((k) => (
            <div
              key={k}
              className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-center"
            >
              <div className="mx-auto h-6 w-6 rounded bg-gray-200/90" />
              <div className="mx-auto mt-3 h-9 w-14 rounded-md bg-gray-200/90" />
              <div className="mx-auto mt-2 h-3.5 w-24 rounded bg-gray-100" />
            </div>
          ))}
        </div>
        <hr className="border-gray-200" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[0, 1].map((k) => (
            <div key={k} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <div className="mx-auto h-7 w-12 rounded bg-gray-200/90" />
              <div className="mx-auto mt-2 h-8 w-10 rounded-md bg-gray-200/90" />
            </div>
          ))}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-3 py-5 sm:px-5">
        <div className="max-w-[min(100%,22rem)] rounded-xl border border-amber-200/95 bg-amber-50/98 px-3.5 py-3 text-center shadow-lg ring-1 ring-amber-100/80 backdrop-blur-[1px] sm:px-4 sm:py-3.5">
          <p className="text-[13px] font-black uppercase tracking-wide text-amber-950/90">
            Ficha básica
          </p>
          <p className="mt-2 text-xs leading-relaxed text-gray-800 sm:text-[13px]">
            En el panel <span className="font-semibold">no verás el rendimiento ni estadísticas</span>{" "}
            de tu negocio. Esa sección está disponible{" "}
            <span className="font-semibold text-gray-900">solo con ficha completa</span>.
          </p>
          <p className="mt-2.5 text-[11px] leading-snug text-gray-600">
            Elegí «Completa» arriba para volver a ver tus números aquí.
          </p>
        </div>
      </div>
    </div>
  );
}
