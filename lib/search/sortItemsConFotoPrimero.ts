/**
 * Listados públicos: dentro del mismo bloque (misma comuna / mismo contexto),
 * priorizar ítems con foto de listado visible sin alterar el orden relativo entre sí.
 *
 * Equivale a `[...grupoConFoto, ...grupoSinFoto]` con el orden interno de cada grupo
 * igual al del array de entrada (p. ej. ya rotado en `/api/buscar` cada 5 min por
 * subgrupo `:foto` / `:sin_foto`). No sustituye esa rotación en el cliente.
 */

export function urlTieneFotoListado(url: unknown): boolean {
  const u = String(url ?? "").trim();
  if (!u) return false;
  const low = u.toLowerCase();
  if (low.includes("placeholder-emprendedor")) return false;
  return true;
}

export function sortItemsConFotoPrimeroStable<T>(
  items: T[],
  getFotoUrl: (item: T) => string | null | undefined
): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const fa = urlTieneFotoListado(getFotoUrl(a.item));
      const fb = urlTieneFotoListado(getFotoUrl(b.item));
      if (fa !== fb) return fa ? -1 : 1;
      return a.index - b.index;
    })
    .map(({ item }) => item);
}
