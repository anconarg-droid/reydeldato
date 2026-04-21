import {
  isPerfilCompletoParaBusqueda,
  type PerfilCompletoBusquedaFlags,
} from "@/lib/isPerfilCompletoParaBusqueda";

/**
 * Filtro “Ver mejores perfiles”: misma regla que el badge ({@link isPerfilCompletoParaBusqueda}).
 */
export function buscarApiItemPasaFiltroVerMejoresOpciones(
  item: PerfilCompletoBusquedaFlags
): boolean {
  return isPerfilCompletoParaBusqueda(item);
}

export function filtrarItemsPorMejoresOpciones<
  T extends PerfilCompletoBusquedaFlags,
>(items: T[], activo: boolean): T[] {
  if (!activo) return items;
  return items.filter((item) => buscarApiItemPasaFiltroVerMejoresOpciones(item));
}
