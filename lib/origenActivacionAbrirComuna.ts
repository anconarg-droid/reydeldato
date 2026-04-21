/**
 * Query `origen=` en `/buscar` (p. ej. enlaces antiguos): redirige a `/abrir-comuna/[slug]`.
 * Acepta guiones o guiones bajos por compatibilidad.
 */
export const ORIGEN_ACTIVACION_ABRIR_COMUNA = "abrir-comuna" as const;

const VALORES_ACEPTADOS = new Set(["abrir-comuna", "abrir_comuna"]);

export function isOrigenActivacionAbrirComuna(
  origen: string | undefined | null
): boolean {
  const o = String(origen ?? "").trim();
  return VALORES_ACEPTADOS.has(o);
}
