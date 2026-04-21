/**
 * Señales de actividad para copy de conversión en el panel (no altera estado comercial).
 */
export const UMBRAL_VISITAS_PANEL_CONVERSION = 100;
export const UMBRAL_CLICS_PANEL_CONVERSION = 10;

export function panelNegocioTieneActividadConversion(m: {
  visitas: number;
  click_whatsapp: number;
  click_ficha: number;
}): boolean {
  const clics = m.click_whatsapp + m.click_ficha;
  return (
    m.visitas >= UMBRAL_VISITAS_PANEL_CONVERSION ||
    clics >= UMBRAL_CLICS_PANEL_CONVERSION
  );
}
