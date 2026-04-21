/** Rutas de API de publicar / borrador (única fuente para el cliente). */

export const PUBLICAR_BORRADOR_PATH = "/api/publicar/borrador";

export function publicarBorradorByTokenPath(token: string): string {
  const t = String(token ?? "").trim();
  if (!t) return PUBLICAR_BORRADOR_PATH;
  return `${PUBLICAR_BORRADOR_PATH}/${encodeURIComponent(t)}`;
}

export function publicarBorradorByIdPath(id: string): string {
  const t = String(id ?? "").trim();
  if (!t) return PUBLICAR_BORRADOR_PATH;
  return `${PUBLICAR_BORRADOR_PATH}/${encodeURIComponent(t)}`;
}
