/** Máximo de resultados (total en zona) que consideramos “pocos” para mensaje de confianza. */
export const CATEGORIA_LANDING_FEW_RESULTS_MAX = 3;

export function mensajeCategoriaCompletandoZona(): string {
  return "Estamos completando esta categoría en tu zona";
}

export function categoriaLandingMuestraMensajeCompletando(totalDisponibles: number): boolean {
  return totalDisponibles > 0 && totalDisponibles <= CATEGORIA_LANDING_FEW_RESULTS_MAX;
}

/**
 * Panel ámbar “completar categoría” en landing de categoría con `?comuna=`.
 *
 * - Si la comuna ya es pública (`forzar_abierta` o mínimos en vista v2): no mostrar.
 * - Con comuna focal: solo si está en preparación (`en_preparacion` o sin fila en `comunas_activas`).
 * - Sin comuna focal (p. ej. RM agregada): conservar solo la regla de “pocos resultados”.
 */
export function categoriaMuestraPanelActivacionConfianza(
  totalDisponibles: number,
  opts: {
    slugComunaFocal: string;
    comuna_publica_abierta: boolean;
    estado_apertura: string | null;
  }
): boolean {
  if (!categoriaLandingMuestraMensajeCompletando(totalDisponibles)) return false;

  const slug = opts.slugComunaFocal.trim();
  if (!slug) return true;

  if (opts.comuna_publica_abierta) return false;

  const e = (opts.estado_apertura || "").toLowerCase();
  if (e === "activa") return false;
  if (!e) return true;
  return e === "en_preparacion";
}
