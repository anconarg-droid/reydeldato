/**
 * Estado fino del plan: trial | perfil_completo (pagado) | perfil_basico.
 * Prioridad: plan pagado vigente > trial vigente > básico.
 * Usa la misma lógica que {@link tieneFichaCompleta} vía helpers exportados allí.
 */

import type { TieneFichaCompletaInput } from "./tieneFichaCompleta";
import {
  planPagadoVigenteComercial,
  trialComercialVigente,
} from "./tieneFichaCompleta";

export type PlanEstado = "trial" | "perfil_completo" | "perfil_basico";

export type PlanEstadoInput = TieneFichaCompletaInput;

/**
 * @param now — opcional; por defecto `new Date()` (útil en tests).
 */
export function getPlanEstado(
  input: PlanEstadoInput,
  now?: Date
): PlanEstado {
  if (planPagadoVigenteComercial(input, now)) return "perfil_completo";
  if (trialComercialVigente(input, now)) return "trial";
  return "perfil_basico";
}
