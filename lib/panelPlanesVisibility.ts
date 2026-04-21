/**
 * Lanzamiento inicial: ocultar planes y pagos en el panel salvo pruebas internas.
 *
 * Activar la experiencia completa:
 * - Cliente (y servidor Next): `NEXT_PUBLIC_PANEL_PLANES_VISIBLE=true`
 * - Solo servidor (p. ej. acceso directo a `/panel/planes`): `PANEL_PLANES_VISIBLE=true`
 *
 * Por defecto (variables ausentes o distintas de `"true"`): oculto.
 */

export function panelPlanesVisibleEnCliente(): boolean {
  return process.env.NEXT_PUBLIC_PANEL_PLANES_VISIBLE === "true";
}

export function panelPlanesVisibleEnServidor(): boolean {
  return (
    process.env.NEXT_PUBLIC_PANEL_PLANES_VISIBLE === "true" ||
    process.env.PANEL_PLANES_VISIBLE === "true"
  );
}
