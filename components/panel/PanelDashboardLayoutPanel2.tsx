"use client";

import type { ReactNode } from "react";

type Props = {
  backButton: ReactNode;
  tuNegocio: ReactNode;
  planActual: ReactNode;
  progresoFicha: ReactNode;
  cuandoTerminePlan: ReactNode;
  rendimiento: ReactNode;
  previewBusqueda: ReactNode;
  perfilPublico: ReactNode;
};

export default function PanelDashboardLayoutPanel2({
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
    <main className="mx-auto w-full max-w-[1280px] px-4 py-6 space-y-6">
      {backButton}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
        <section className="min-w-0 space-y-4">
          {tuNegocio}
          {planActual}
          {progresoFicha}
          {cuandoTerminePlan}
        </section>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-24">
          {rendimiento}
          {previewBusqueda}
        </aside>
      </div>

      <section className="w-full">{perfilPublico}</section>
    </main>
  );
}
