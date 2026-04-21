/**
 * Estados de publicación en `emprendedores.estado_publicacion` (CHECK en BD).
 * Valor en revisión moderación: `en_revision`.
 */
export const ESTADO_PUBLICACION = {
  borrador: "borrador",
  en_revision: "en_revision",
  publicado: "publicado",
  rechazado: "rechazado",
  suspendido: "suspendido",
} as const;

export type EstadoPublicacionEmprendedor =
  (typeof ESTADO_PUBLICACION)[keyof typeof ESTADO_PUBLICACION];

export function normalizeEstadoPublicacionDb(
  raw: string | null | undefined
): string {
  const x = String(raw ?? "").trim().toLowerCase();
  /** Compat lecturas/cache antiguas que usaban `pendiente`. */
  if (x === "pendiente") return ESTADO_PUBLICACION.en_revision;
  return x;
}

export function emprendedorFichaVisiblePublicamente(
  estado: string | null | undefined
): boolean {
  return normalizeEstadoPublicacionDb(estado) === ESTADO_PUBLICACION.publicado;
}
