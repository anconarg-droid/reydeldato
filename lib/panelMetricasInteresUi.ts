/**
 * Qué filas mostrar en «Mostraron interés» del panel según datos públicos del emprendedor
 * (solo render; no afecta tracking ni agregados).
 */

export type PanelInteresMetricasFlags = {
  mostrarInstagramWeb: boolean;
  /** Etiqueta de la card de `click_ficha`; vacía si `mostrarInstagramWeb` es false. */
  etiquetaInstagramWeb: string;
  mostrarComoLlegar: boolean;
};

function str(v: unknown): string {
  return String(v ?? "").trim();
}

/**
 * `item`: fila típica de `/api/panel/negocio` (`instagram`, `web`, `sitio_web`, `modalidadesAtencion`, `localesFisicos`, `direccion`).
 */
export function panelInteresMetricasFlagsDesdeNegocioItem(
  item: Record<string, unknown> | null
): PanelInteresMetricasFlags {
  if (!item) {
    return {
      mostrarInstagramWeb: false,
      etiquetaInstagramWeb: "",
      mostrarComoLlegar: false,
    };
  }

  const tieneInstagram = Boolean(str(item.instagram));
  const tieneWeb = Boolean(
    str(item.sitio_web) || str(item.web) || str(item.url_web)
  );
  const mostrarInstagramWeb = tieneInstagram || tieneWeb;
  let etiquetaInstagramWeb = "";
  if (tieneInstagram && tieneWeb) etiquetaInstagramWeb = "Instagram / Web";
  else if (tieneInstagram) etiquetaInstagramWeb = "Instagram";
  else if (tieneWeb) etiquetaInstagramWeb = "Sitio web";

  const mods = Array.isArray(item.modalidadesAtencion)
    ? (item.modalidadesAtencion as unknown[]).map((x) =>
        String(x ?? "")
          .trim()
          .toLowerCase()
      )
    : [];
  const tieneLocalFisico = mods.some(
    (m) => m === "local_fisico" || m === "local"
  );

  const locales = Array.isArray(item.localesFisicos)
    ? (item.localesFisicos as unknown[])
    : [];
  const tieneLocalesConDireccion = locales.some((loc) => {
    if (!loc || typeof loc !== "object") return false;
    return Boolean(str((loc as Record<string, unknown>).direccion));
  });
  const direccionLegacy = Boolean(str(item.direccion));

  const mostrarComoLlegar =
    tieneLocalFisico && (tieneLocalesConDireccion || direccionLegacy);

  return {
    mostrarInstagramWeb,
    etiquetaInstagramWeb,
    mostrarComoLlegar,
  };
}
