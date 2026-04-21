import type { EmprendedorSearchCardProps } from "@/components/search/EmprendedorSearchCard";
import type { TipoFicha } from "@/lib/calcularTipoFicha";

export type ModoVistaPanel = "completa" | "basica";

/**
 * Props de listado para el panel según el modo global.
 * En `basica` se limita información visible (p. ej. sin descripción larga en la card).
 * La ficha pública ampliada se resuelve con {@link PanelFichaPublicaEmbed} (iframe o mensaje).
 */
export function aplicarModoBasicoSearchCardProps(
  base: EmprendedorSearchCardProps,
  modo: ModoVistaPanel,
  _tipoComercialReal: TipoFicha
): EmprendedorSearchCardProps {
  if (modo === "completa") {
    return { ...base };
  }
  return {
    ...base,
    esFichaCompleta: false,
    estadoFicha: "ficha_basica",
    descripcionLibre: "",
  };
}

/** Helper único del modo de vista en el panel (card de búsqueda). */
export const aplicarModoBasico = {
  searchCardProps: aplicarModoBasicoSearchCardProps,
} as const;
