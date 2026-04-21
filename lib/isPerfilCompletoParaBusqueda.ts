/**
 * Regla única para “perfil completo” en **búsqueda** (badge en card + filtro “Ver mejores perfiles”):
 * coincide con {@link fichaPublicaEsMejoradaDesdeBusqueda} / {@link tieneFichaCompleta}
 * (trial vigente o plan pagado vigente). No evalúa foto, descripción ni redes.
 *
 * El API puede exponer el mismo booleano bajo varios nombres; esta función los trata como alias
 * del mismo valor cuando el servidor los mantiene alineados.
 */
export type PerfilCompletoBusquedaFlags = {
  esFichaCompleta?: boolean;
  estadoFicha?: string;
  fichaActivaPorNegocio?: boolean;
};

export function isPerfilCompletoParaBusqueda(item: PerfilCompletoBusquedaFlags): boolean {
  if (item.esFichaCompleta === true) return true;
  if (item.estadoFicha === "ficha_completa") return true;
  if (item.fichaActivaPorNegocio === true) return true;
  return false;
}
