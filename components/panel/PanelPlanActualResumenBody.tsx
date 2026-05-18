import type { PlanUiVista } from "@/lib/panelEstadoPlanUi";
import {
  PLAN_UI_LINEA_FECHAS_NO_PANEL,
  PLAN_UI_LINEA_PLAN_ACTIVO,
} from "@/lib/panelEstadoPlanUi";

type Props = {
  planUi: PlanUiVista;
};

/**
 * Cuerpo compacto del bloque «Plan actual» en panel1/panel2 (fechas desde `buildPlanUi`).
 */
export function PanelPlanActualResumenBody({ planUi }: Props) {
  if (planUi.planPagadoSinFechasEnPanel) {
    return (
      <>
        <p className="m-0 font-medium text-gray-900 leading-relaxed">
          {PLAN_UI_LINEA_PLAN_ACTIVO}
        </p>
        <p className="m-0 text-gray-700 leading-relaxed">{PLAN_UI_LINEA_FECHAS_NO_PANEL}</p>
      </>
    );
  }

  const diasRestantesTexto =
    planUi.diasRestantes == null
      ? null
      : planUi.diasRestantes <= 0
        ? "0 días"
        : `${planUi.diasRestantes} días`;

  return (
    <>
      <p className="m-0 text-gray-700 leading-relaxed">
        <span className="text-gray-500">Inicio ficha:</span>{" "}
        <span className="tabular-nums font-medium text-gray-900">
          {planUi.inicio ?? "No disponible"}
        </span>
      </p>
      <p className="m-0 text-gray-700 leading-relaxed">
        <span className="text-gray-500">Término ficha:</span>{" "}
        <span className="tabular-nums font-medium text-gray-900">
          {planUi.termino ?? "No disponible"}
        </span>
      </p>
      {diasRestantesTexto ? (
        <p className="m-0 font-semibold text-gray-900 leading-relaxed">
          Te quedan: <span className="tabular-nums">{diasRestantesTexto}</span>
        </p>
      ) : null}
    </>
  );
}
