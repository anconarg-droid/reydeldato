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
  return (
    <main className="mx-auto w-full max-w-[1180px] px-4 py-6">
      {backButton}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_400px] xl:items-start">
        <section className="min-w-0 space-y-4">
          {tuNegocio}
          {planActual}
          {progresoFicha}
          {cuandoTerminePlan}
        </section>

        <aside className="min-w-0 space-y-4 xl:sticky xl:top-24">
          {rendimiento}
          {previewBusqueda}
        </aside>
      </div>

      <section className="mt-10">{perfilPublico}</section>
    </main>
  );
}

