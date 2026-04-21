export type BuildPlanActivationMessageInput = {
  nombreNegocio: string;
  comunaNombre: string;
  planEtiqueta: string;
  precioDisplay: string;
};

/**
 * Texto para WhatsApp al solicitar activación (sin datos técnicos en UI).
 */
export function buildPlanActivationMessage(
  input: BuildPlanActivationMessageInput
): string {
  const n = input.nombreNegocio.trim() || "mi negocio";
  const c = input.comunaNombre.trim() || "—";
  const p = input.planEtiqueta.trim();
  const $ = input.precioDisplay.trim();
  return `Hola, quiero activar mi plan ${p} en Rey del Dato.
Negocio: ${n}
Comuna: ${c}
Plan: ${p} (${$})`;
}
