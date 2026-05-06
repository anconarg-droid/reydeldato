/**
 * Estado comercial fino para panel, planes y recordatorios.
 * Se apoya en {@link planPagadoVigenteComercial}, {@link trialComercialVigente} y {@link tieneFichaCompleta}
 * sin redefinir reglas de vigencia.
 */

import { planContratadoPendienteDeInicio } from "@/lib/comercialPlanScheduling";
import {
  planPagadoVigenteComercial,
  trialComercialVigente,
  type TieneFichaCompletaInput,
} from "@/lib/tieneFichaCompleta";

const MS_DIA = 86_400_000;
/** Días para considerar “por vencer” o “vencido reciente”. */
export const UMBRAL_DIAS_URGENCIA_COMERCIAL = 7;

export type EstadoComercialEmprendedor =
  | "trial_activo"
  | "trial_por_vencer"
  /** Pagó durante trial: trial sigue, plan pagado con inicio diferido. */
  | "trial_con_plan_confirmado_programado"
  /** Como anterior, pero el trial está a ≤7 días del término. */
  | "trial_por_vencer_con_plan_confirmado_programado"
  | "plan_activo"
  | "plan_por_vencer"
  /** Pago confirmado fuera de trial vigente pero periodo pagado aún no comenzó (caso marginal / datos). */
  | "plan_confirmado_programado"
  /** Como `plan_confirmado_programado`, pero el inicio efectivo está a ≤7 días. */
  | "plan_confirmado_programado_por_arrancar"
  | "basico"
  | "vencido_reciente"
  /** Plan pagado vencido (sin trial vigente). */
  | "plan_vencido";

function parseFin(iso: string | null | undefined): Date | null {
  if (iso == null || String(iso).trim() === "") return null;
  const d = new Date(String(iso));
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Días calendario hasta `iso` (ceil). 0 si ya venció; null si no hay fecha válida.
 */
export function diasRestantesHastaIso(
  iso: string | null | undefined,
  now: Date = new Date()
): number | null {
  const end = parseFin(iso);
  if (!end) return null;
  const ms = end.getTime() - now.getTime();
  if (ms <= 0) return 0;
  return Math.ceil(ms / MS_DIA);
}

function vencioHaceNoMasDe(
  fin: Date | null,
  dias: number,
  now: Date
): boolean {
  if (!fin || fin.getTime() >= now.getTime()) return false;
  const msAgo = now.getTime() - fin.getTime();
  return msAgo <= dias * MS_DIA;
}

export type ResultadoEstadoComercialEmprendedor = {
  estado: EstadoComercialEmprendedor;
  /** Fin del periodo vigente (trial o plan) o null. */
  fechaExpiracion: string | null;
  diasRestantes: number | null;
};

/**
 * Prioridad (UI):
 * - plan pagado efectivo vigente (`planPagadoVigenteComercial`)
 * - trial vigente (+ variante si hay compra programada)
 * - compra confirmada pero programada (sin trial vigente)
 * - vencido reciente > básico / plan_vencido
 */
export function getEstadoComercialEmprendedor(
  input: TieneFichaCompletaInput,
  now: Date = new Date()
): ResultadoEstadoComercialEmprendedor {
  const contratadoDiferido = planContratadoPendienteDeInicio(
    input.planActivo,
    input.planIniciaAt,
    now
  );
  const trialEndIso = input.trialExpiraAt ?? input.trialExpira ?? null;

  const planV = planPagadoVigenteComercial(input, now);
  if (planV) {
    const dias = diasRestantesHastaIso(input.planExpiraAt ?? null, now);
    const porVencer =
      dias != null && dias > 0 && dias <= UMBRAL_DIAS_URGENCIA_COMERCIAL;
    const estado: EstadoComercialEmprendedor = porVencer
      ? "plan_por_vencer"
      : "plan_activo";
    return {
      estado,
      fechaExpiracion: input.planExpiraAt ?? null,
      diasRestantes: dias,
    };
  }

  if (trialComercialVigente(input, now)) {
    const diasTrial = diasRestantesHastaIso(trialEndIso, now);
    const porVencerTrial =
      diasTrial != null &&
      diasTrial > 0 &&
      diasTrial <= UMBRAL_DIAS_URGENCIA_COMERCIAL;

    if (contratadoDiferido) {
      const estadoTrialConPlan: EstadoComercialEmprendedor = porVencerTrial
        ? "trial_por_vencer_con_plan_confirmado_programado"
        : "trial_con_plan_confirmado_programado";

      /** Seguimos contando trial en “días restantes”; fechas pagadas llegan aparte (`plan_inicia_at`/`plan_expira_at`). */
      return {
        estado: estadoTrialConPlan,
        fechaExpiracion: trialEndIso,
        diasRestantes: diasTrial,
      };
    }

    const estadoTrial: EstadoComercialEmprendedor = porVencerTrial
      ? "trial_por_vencer"
      : "trial_activo";

    return {
      estado: estadoTrial,
      fechaExpiracion: trialEndIso,
      diasRestantes: diasTrial,
    };
  }

  if (contratadoDiferido) {
    const diasIni = diasRestantesHastaIso(input.planIniciaAt ?? null, now);
    const porVencer =
      diasIni != null &&
      diasIni > 0 &&
      diasIni <= UMBRAL_DIAS_URGENCIA_COMERCIAL;
    const estadoProg: EstadoComercialEmprendedor = porVencer
      ? "plan_confirmado_programado_por_arrancar"
      : "plan_confirmado_programado";

    /**
     * Métrica UX: cuántos días faltan para que empiece el periodo efectivo pagado.
     * (El copy principal en `/panel/planes` usa `plan_inicia_at`.)
     */
    return {
      estado: estadoProg,
      fechaExpiracion: input.planIniciaAt ?? null,
      diasRestantes: diasIni,
    };
  }

  const trialEnd = parseFin(trialEndIso);
  const planEnd = parseFin(input.planExpiraAt ?? null);

  /** Plan marcado como activo pero vencido (o sin trial que lo “tape”). */
  if (
    input.planActivo === true &&
    planEnd != null &&
    planEnd.getTime() <= now.getTime()
  ) {
    return {
      estado: "plan_vencido",
      fechaExpiracion: input.planExpiraAt ?? null,
      diasRestantes: 0,
    };
  }
  const trialReciente = vencioHaceNoMasDe(
    trialEnd,
    UMBRAL_DIAS_URGENCIA_COMERCIAL,
    now
  );
  const planReciente = vencioHaceNoMasDe(
    planEnd,
    UMBRAL_DIAS_URGENCIA_COMERCIAL,
    now
  );

  if (trialReciente || planReciente) {
    return {
      estado: "vencido_reciente",
      fechaExpiracion: null,
      diasRestantes: null,
    };
  }

  return {
    estado: "basico",
    fechaExpiracion: null,
    diasRestantes: null,
  };
}
