import type { PanelComercialPayload } from "@/lib/panelComercialPayload";
import type { EstadoComercialEmprendedor } from "@/lib/getEstadoComercialEmprendedor";
import {
  isValidPeriodicidad,
  PLAN_PERIODICIDAD_LABELS,
} from "@/lib/planConstants";

/** Duración estándar del trial en producto (UI y derivación de inicio si falta `trial_inicia_at`). */
export const TRIAL_DURACION_DIAS_UI = 90;

export const PLAN_UI_TITULO_ACCESO_INICIAL = "Plan actual: Acceso inicial";

const MS_DIA = 86_400_000;

function s(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function fechaValida(iso: string): boolean {
  const t = s(iso);
  if (!t) return false;
  const d = new Date(t);
  return !Number.isNaN(d.getTime());
}

/**
 * Fecha corta es-CL o `null` (nunca `"—"`): única fuente para textos de plan en panel.
 */
function fechaPanel(iso: string | null | undefined): string | null {
  const t = s(iso);
  if (!t || !fechaValida(t)) return null;
  const d = new Date(t);
  return new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

/**
 * Inicio de trial derivado solo para mostrar: `trial_expira_at` − N días (no persiste en BD).
 */
export function trialInicioDerivadoDesdeExpira(
  trialExpiraAt: string | null | undefined,
  dias: number = TRIAL_DURACION_DIAS_UI
): string | null {
  const fin = s(trialExpiraAt);
  if (!fin || !fechaValida(fin)) return null;
  const end = new Date(fin);
  const start = new Date(end.getTime() - dias * MS_DIA);
  if (Number.isNaN(start.getTime())) return null;
  if (start.getTime() >= end.getTime()) return null;
  return start.toISOString();
}

/**
 * Campos de `comercial` que intervienen en el plan (documentación; ver {@link buildPlanUi}).
 * Incluye `plan_tipo`, `plan_periodicidad`, fechas de trial/plan y `estado` / `diasRestantes` del API.
 */
export type BuildPlanUiInput = {
  estado: EstadoComercialEmprendedor;
  diasRestantes: number | null;
  planPeriodicidad: string | null;
  trialIniciaAt: string | null;
  trialExpiraAt: string | null;
  planIniciaAt: string | null;
  planExpiraAt: string | null;
};

export type PlanUiVista = {
  titulo: string;
  inicio: string | null;
  termino: string | null;
  diasRestantes: number | null;
  /**
   * Plan pagado vigente (`plan_activo` / `plan_por_vencer`) sin `plan_inicia_at` y `plan_expira_at`
   * válidos en BD: el panel no muestra filas Inicio/Término/Te quedan con “No disponible”.
   */
  planPagadoSinFechasEnPanel: boolean;
};

/** Copy cuando el plan pagado está activo pero faltan fechas en el panel. */
export const PLAN_UI_LINEA_PLAN_ACTIVO = "Tu plan está activo.";
export const PLAN_UI_LINEA_FECHAS_NO_PANEL =
  "Las fechas de inicio y término aún no están disponibles en este panel.";

function planPagadoTieneAmbasFechasEnPanel(c: BuildPlanUiInput): boolean {
  return Boolean(fechaPanel(c.planIniciaAt) && fechaPanel(c.planExpiraAt));
}

function tituloPlanPagado(c: BuildPlanUiInput): string {
  const p = s(c.planPeriodicidad).toLowerCase();
  const label =
    p && isValidPeriodicidad(p) ? PLAN_PERIODICIDAD_LABELS[p] : null;
  return label
    ? `Plan actual: Perfil completo · ${label}`
    : "Plan actual: Perfil completo";
}

/** Trial: `trial_inicia_at` si existe; si no, `trial_expira_at` − 90 días; si no, `null`. */
function inicioTrialUi(c: BuildPlanUiInput): string | null {
  const desdeColumna = fechaPanel(c.trialIniciaAt);
  if (desdeColumna) return desdeColumna;
  const derivadoIso = trialInicioDerivadoDesdeExpira(c.trialExpiraAt);
  if (!derivadoIso) return null;
  return fechaPanel(derivadoIso);
}

function terminoVencidoReciente(c: BuildPlanUiInput): string | null {
  const tEnd = s(c.trialExpiraAt);
  const pEnd = s(c.planExpiraAt);
  if (tEnd && pEnd && fechaValida(tEnd) && fechaValida(pEnd)) {
    return fechaPanel(
      new Date(tEnd) >= new Date(pEnd) ? tEnd : pEnd
    );
  }
  if (tEnd && fechaValida(tEnd)) return fechaPanel(tEnd);
  if (pEnd && fechaValida(pEnd)) return fechaPanel(pEnd);
  return null;
}

function payloadToInput(c: PanelComercialPayload): BuildPlanUiInput {
  return {
    estado: c.estado,
    diasRestantes: c.diasRestantes,
    planPeriodicidad: c.planPeriodicidad,
    trialIniciaAt: c.trialIniciaAt,
    trialExpiraAt: c.trialExpiraAt,
    planIniciaAt: c.planIniciaAt,
    planExpiraAt: c.planExpiraAt,
  };
}

/**
 * Única fuente de verdad para título, inicio, término y días restantes del plan en el panel.
 * Usa `estado` comercial del API; en trial calcula inicio desde `trial_inicia_at` o `trial_expira_at − 90d`.
 */
export function buildPlanUi(
  comercial: PanelComercialPayload | null
): PlanUiVista {
  if (!comercial || comercial.estado === "basico") {
    return {
      titulo: PLAN_UI_TITULO_ACCESO_INICIAL,
      inicio: null,
      termino: null,
      diasRestantes: null,
      planPagadoSinFechasEnPanel: false,
    };
  }

  const c = payloadToInput(comercial);

  if (c.estado === "trial_activo" || c.estado === "trial_por_vencer") {
    return {
      titulo: `Plan actual: Trial de ${TRIAL_DURACION_DIAS_UI} días`,
      inicio: inicioTrialUi(c),
      termino: fechaPanel(c.trialExpiraAt),
      diasRestantes: c.diasRestantes,
      planPagadoSinFechasEnPanel: false,
    };
  }

  if (c.estado === "plan_activo" || c.estado === "plan_por_vencer") {
    if (planPagadoTieneAmbasFechasEnPanel(c)) {
      return {
        titulo: tituloPlanPagado(c),
        inicio: fechaPanel(c.planIniciaAt),
        termino: fechaPanel(c.planExpiraAt),
        diasRestantes: c.diasRestantes,
        planPagadoSinFechasEnPanel: false,
      };
    }
    return {
      titulo: tituloPlanPagado(c),
      inicio: null,
      termino: null,
      diasRestantes: null,
      planPagadoSinFechasEnPanel: true,
    };
  }

  if (c.estado === "vencido_reciente") {
    return {
      titulo: "Plan actual: Vigencia vencida",
      inicio: null,
      termino: terminoVencidoReciente(c),
      diasRestantes: null,
      planPagadoSinFechasEnPanel: false,
    };
  }

  return {
    titulo: PLAN_UI_TITULO_ACCESO_INICIAL,
    inicio: null,
    termino: null,
    diasRestantes: null,
    planPagadoSinFechasEnPanel: false,
  };
}
