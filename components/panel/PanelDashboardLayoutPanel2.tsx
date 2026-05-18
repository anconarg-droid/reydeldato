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
    <main style={{ maxWidth: "1280px", margin: "0 auto", padding: "24px 16px" }}>
      {backButton}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: "24px", alignItems: "start", marginTop: "24px" }}>
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: "16px" }}>
          {tuNegocio}
          {planActual}
          {progresoFicha}
          {cuandoTerminePlan}
        </div>
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: "16px", position: "sticky", top: "96px" }}>
          {rendimiento}
          {previewBusqueda}
        </div>
      </div>
      <div style={{ marginTop: "40px" }}>
        {perfilPublico}
      </div>
    </main>
  );
}
