import {
  isPerfilCompletoParaBusqueda,
  type PerfilCompletoBusquedaFlags,
} from "@/lib/isPerfilCompletoParaBusqueda";

/** Badge y estilo “perfil completo” en cards: {@link isPerfilCompletoParaBusqueda}. */
export function buscarApiItemEsFichaCompleta(item: PerfilCompletoBusquedaFlags): boolean {
  return isPerfilCompletoParaBusqueda(item);
}
