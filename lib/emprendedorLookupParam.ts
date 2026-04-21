/**
 * Resolver búsqueda de `emprendedores` cuando el front puede mandar UUID en `slug` o en `id`.
 */

export function pareceUuidEmprendedor(v: string): boolean {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
    v.trim()
  );
}

export function columnaYValorBusquedaEmprendedor(
  idTrim: string,
  slugTrim: string
): { columna: "id" | "slug"; valor: string } | null {
  const ident = idTrim || slugTrim;
  if (!ident) return null;
  const buscarPorId =
    Boolean(idTrim) || (!idTrim && slugTrim && pareceUuidEmprendedor(slugTrim));
  return {
    columna: buscarPorId ? "id" : "slug",
    valor: idTrim || slugTrim,
  };
}
