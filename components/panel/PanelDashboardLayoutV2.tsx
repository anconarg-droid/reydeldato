"use client";

import type { ReactNode } from "react";

type Props = {
  /** Botón/back y barra superior (ya renderizados afuera o aquí). */
  backButton: ReactNode;
  tuNegocio: ReactNode;
  planActual: ReactNode;
  progresoFicha: ReactNode;
  cuandoTerminePlan: ReactNode;
  rendimiento: ReactNode;
  previewBusqueda: ReactNode;
  perfilPublico: ReactNode;
};

export default function PanelDashboardLayoutV2({
  backButton,
  tuNegocio,
  planActual,
  progresoFicha,
  cuandoTerminePlan,
  rendimiento,
  previewBusqueda,
  perfilPublico,
}: Props) {
  const DEBUG_GRID = process.env.NEXT_PUBLIC_PANEL1_DEBUG_GRID === "1";

  return (
    <main className="mx-auto w-full max-w-[1180px] px-4 py-6">
      {backButton}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <section className="min-w-0 space-y-4">
          {DEBUG_GRID ? <div className="bg-red-200 p-2">LEFT</div> : null}
          {tuNegocio}
          {planActual}
          {progresoFicha}
          {cuandoTerminePlan}
        </section>

        <aside className="min-w-0 space-y-4 xl:sticky xl:top-24">
          {DEBUG_GRID ? <div className="bg-blue-200 p-2">RIGHT</div> : null}
          {rendimiento}
          {previewBusqueda}
        </aside>
      </div>

      <section className="mt-10">{perfilPublico}</section>
    </main>
  );
}

