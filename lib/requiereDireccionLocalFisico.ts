import { getEstadoComercialEmprendedor } from "@/lib/getEstadoComercialEmprendedor";
import type { TieneFichaCompletaInput } from "@/lib/tieneFichaCompleta";

/**
 * Con modalidad `local_fisico`, ¿exige al menos un local con dirección?
 *
 * - **Perfil completo comercial** (trial o plan pagado vigente) → sí.
 * - **Plan / acceso básico** (`basico`, `vencido_reciente`) → no (pueden publicar el rubro sin domicilio del local).
 *
 * Alineado con {@link tieneFichaCompleta} / listados “ficha completa”.
 */
export function requiereDireccionSiModalidadLocalFisico(
  input: TieneFichaCompletaInput,
  now?: Date
): boolean {
  const { estado } = getEstadoComercialEmprendedor(input, now);
  return (
    estado === "trial_activo" ||
    estado === "trial_por_vencer" ||
    estado === "plan_activo" ||
    estado === "plan_por_vencer"
  );
}
