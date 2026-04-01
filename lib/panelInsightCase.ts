export type PanelInsightCase = "A" | "B" | "C" | "D";

/** whatsapp = clics WA; vistas = perfil; impresiones = resultados de búsqueda */
export function panelInsightCase(params: {
  impresiones: number;
  visitas: number;
  click_whatsapp: number;
}): PanelInsightCase {
  const whatsapp = params.click_whatsapp;
  const vistas = params.visitas;
  const impresiones = params.impresiones;
  if (whatsapp > 0) return "A";
  if (vistas > impresiones * 0.2) return "C";
  if (impresiones > 0) return "B";
  return "D";
}
