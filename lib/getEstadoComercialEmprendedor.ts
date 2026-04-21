/**
 * Estado comercial fino para panel, planes y recordatorios.
 * Se apoya en {@link planPagadoVigenteComercial}, {@link trialComercialVigente} y {@link tieneFichaCompleta}
 * sin redefinir reglas de vigencia.
 */

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
  | "plan_activo"
  | "plan_por_vencer"
  | "basico"
  | "vencido_reciente";

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
 * Prioridad: plan pagado vigente > trial vigente > vencido reciente > básico.
 */
export function getEstadoComercialEmprendedor(
  input: TieneFichaCompletaInput,
  now: Date = new Date()
): ResultadoEstadoComercialEmprendedor {
  const planV = planPagadoVigenteComercial(input, now);
  const trialEndIso = input.trialExpiraAt ?? input.trialExpira ?? null;

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
    const dias = diasRestantesHastaIso(trialEndIso, now);
    const porVencer =
      dias != null && dias > 0 && dias <= UMBRAL_DIAS_URGENCIA_COMERCIAL;
    const estado: EstadoComercialEmprendedor = porVencer
      ? "trial_por_vencer"
      : "trial_activo";
    return {
      estado,
      fechaExpiracion: trialEndIso,
      diasRestantes: dias,
    };
  }

  const trialEnd = parseFin(trialEndIso);
  const planEnd = parseFin(input.planExpiraAt ?? null);
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
