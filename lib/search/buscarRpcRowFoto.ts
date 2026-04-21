import { urlTieneFotoListado } from "@/lib/search/sortItemsConFotoPrimero";

/**
 * URL de foto principal en filas del RPC de búsqueda, con el mismo fallback que
 * {@link mapRpcRowToSearchItem} en `app/api/buscar/route.ts` (row + hidratar por id).
 */
export function fotoPrincipalUrlFromBuscarRpcRow(
  row: Record<string, unknown>,
  hydratedById: Map<string, Record<string, unknown>>,
): string {
  const id = String(row.id ?? "");
  const hydrated = id ? hydratedById.get(id) ?? null : null;
  if (row.foto_principal_url != null) return String(row.foto_principal_url);
  if (hydrated?.foto_principal_url != null) return String(hydrated.foto_principal_url);
  if ((row as { fotoPrincipalUrl?: unknown }).fotoPrincipalUrl != null) {
    return String((row as { fotoPrincipalUrl?: unknown }).fotoPrincipalUrl);
  }
  if ((row as { foto_url?: unknown }).foto_url != null) {
    return String((row as { foto_url?: unknown }).foto_url);
  }
  return "";
}

export function buscarRpcRowTieneFotoListado(
  row: Record<string, unknown>,
  hydratedById: Map<string, Record<string, unknown>>,
): boolean {
  return urlTieneFotoListado(fotoPrincipalUrlFromBuscarRpcRow(row, hydratedById));
}
