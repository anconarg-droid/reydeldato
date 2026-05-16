import { getHomeComunasActivasItems } from "@/lib/getHomeComunasActivasItems";

/** Suma de fichas en comunas abiertas con resultados (misma fuente que el carrusel home). */
export async function loadHomeTotalNegociosActivos(): Promise<number | null> {
  const res = await getHomeComunasActivasItems();
  if (!res.ok) return null;
  const sum = res.items.reduce((s, x) => s + (x.count || 0), 0);
  return sum;
}
