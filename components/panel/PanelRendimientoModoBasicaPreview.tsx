"use client";

function ValorMetricaOculto({ size = "lg" }: { size?: "lg" | "md" }) {
  const cls =
    size === "lg"
      ? "text-3xl font-bold tabular-nums"
      : "text-2xl font-bold tabular-nums";
  return (
    <span
      className={`inline-block min-h-[1.15em] select-none rounded-md bg-gray-200/95 px-3 py-0.5 ${cls} text-gray-700 blur-[7px] sm:blur-[9px]`}
      aria-hidden
    >
      000
    </span>
  );
}

/**
 * Vista previa «Básica»: misma estructura que el bloque real de rendimiento, con títulos legibles
 * y solo los números difuminados (sin datos reales).
 */
export function PanelRendimientoModoBasicaPreview() {
  return (
    <div
      className="w-full min-w-0 rounded-xl border border-gray-200 bg-white px-3 py-4 shadow-sm sm:px-5 sm:py-5"
      role="status"
      aria-label="Vista previa: con ficha básica no verías los números de rendimiento en el panel."
    >
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <h3 className="text-base font-semibold tracking-tight text-gray-900">
              Rendimiento de tu negocio
            </h3>
            <p className="text-sm leading-relaxed text-gray-500">
              Cuántas veces apareciste y qué hicieron las personas.
            </p>
          </div>
          <div
            className="inline-flex max-w-full flex-wrap shrink-0 rounded-lg border border-dashed border-gray-300 bg-gray-50/90 p-1 opacity-80"
            aria-hidden
          >
            <span className="px-3 py-1.5 text-sm font-medium text-gray-400">7d</span>
            <span className="px-3 py-1.5 text-sm font-medium text-gray-400">30d</span>
            <span className="px-3 py-1.5 text-sm font-medium text-gray-400">Total</span>
          </div>
        </div>

        <section aria-label="Métricas principales (vista previa sin números)">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
              <p className="text-lg" aria-hidden>
                🔍
              </p>
              <p className="mt-1 flex justify-center">
                <ValorMetricaOculto size="lg" />
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-700">Te encontraron</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
              <p className="text-lg" aria-hidden>
                👁
              </p>
              <p className="mt-1 flex justify-center">
                <ValorMetricaOculto size="lg" />
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-700">Vieron tu ficha</p>
            </div>
            <div className="rounded-xl border border-emerald-200/80 bg-gray-50 p-4 text-center ring-1 ring-emerald-100/60">
              <p className="text-lg" aria-hidden>
                💬
              </p>
              <p className="mt-1 flex justify-center">
                <ValorMetricaOculto size="lg" />
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-700">Te contactaron</p>
            </div>
          </div>
        </section>

        <hr className="border-gray-200" aria-hidden />

        <section className="space-y-2" aria-label="Interés (vista previa sin números)">
          <div className="space-y-0.5">
            <h4 className="text-sm font-semibold text-gray-900">Mostraron interés</h4>
            <p className="text-xs leading-relaxed text-gray-500">
              Otras acciones que indican interés
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
              <p className="text-lg" aria-hidden>
                🌐
              </p>
              <p className="mt-1 flex justify-center">
                <ValorMetricaOculto size="md" />
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-700">Instagram / Web</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
              <p className="text-lg" aria-hidden>
                🗺
              </p>
              <p className="mt-1 flex justify-center">
                <ValorMetricaOculto size="md" />
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-700">Cómo llegar</p>
            </div>
          </div>
        </section>

        <div className="rounded-xl border border-amber-200/95 bg-amber-50/95 px-3.5 py-3 text-center sm:px-4 sm:text-left">
          <p className="text-[13px] font-black uppercase tracking-wide text-amber-950/90 text-center sm:text-left">
            Ficha básica
          </p>
          <p className="mt-2 text-xs leading-relaxed text-gray-800 sm:text-[13px] text-center sm:text-left">
            Así se vería el bloque, pero <span className="font-semibold">sin los números reales</span>: en
            ficha básica no tendrías estadísticas de rendimiento en el panel;{" "}
            <span className="font-semibold text-gray-900">solo con ficha completa</span>.
          </p>
          <p className="mt-2 text-[11px] leading-snug text-gray-600 text-center sm:text-left">
            Elige «Completa» arriba para volver a ver tus métricas aquí.
          </p>
        </div>
      </div>
    </div>
  );
}
