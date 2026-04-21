/**
 * Listados públicos: dentro del mismo bloque (misma comuna / mismo contexto),
 * priorizar ítems con foto visible sin alterar el orden relativo entre sí.
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
