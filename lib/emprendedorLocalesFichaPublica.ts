/**
 * Locales públicos (`emprendedor_locales`): orden y texto sin usar dirección legacy en `emprendedores`.
 */

export type LocalFichaPublico = {
  nombre_local: string | null;
  direccion: string;
  referencia: string;
  comuna_nombre: string;
  comuna_slug: string;
  es_principal: boolean;
  /** WGS84 si existen en `emprendedor_locales` (geocoding al guardar). */
  lat?: number | null;
  lng?: number | null;
};

export function sortLocalesFichaPrincipalPrimero<T extends { es_principal?: boolean }>(
  locales: T[]
): T[] {
  return [...locales].sort((a, b) => {
    const ap = a.es_principal === true ? 1 : 0;
    const bp = b.es_principal === true ? 1 : 0;
    return bp - ap;
  });
}

/** Línea de calle/referencia para un local (UI o checklist). */
export function formatDireccionLocalLinea(loc: {
  direccion?: string;
  referencia?: string;
}): string {
  const capFirst = (input: string) => {
    const t = String(input ?? "");
    if (!t.trim()) return t.trim();
    return t.trim().replace(/^(\s*)(\S)/, (_, ws: string, ch: string) => `${ws}${ch.toUpperCase()}`);
  };

  const d = capFirst(String(loc.direccion ?? ""));
  const r = capFirst(String(loc.referencia ?? ""));
  if (d && r) return `${d} · ${r}`;
  return d || r;
}

/**
 * Primera dirección con texto (principal primero). Para JSON-LD / checklist corta.
 * No lee columnas de dirección en `emprendedores`.
 */
export function direccionCallePrincipalDesdeLocales(
  locales: { direccion?: string; es_principal?: boolean }[]
): string {
  const sorted = sortLocalesFichaPrincipalPrimero(locales);
  for (const l of sorted) {
    const d = String(l.direccion ?? "").trim();
    if (d) return d;
  }
  return "";
}

/** Texto para checklist “perfil completo” según cantidad de locales. */
export function lineaChecklistDireccionLocales(
  locales: {
    es_principal?: boolean;
    comuna_nombre?: string;
    direccion?: string;
    referencia?: string;
  }[]
): string {
  const sorted = sortLocalesFichaPrincipalPrimero(locales);
  if (sorted.length === 0) return "";
  if (sorted.length === 1) {
    const L = sorted[0];
    const com = String(L.comuna_nombre ?? "").trim();
    const line = formatDireccionLocalLinea(L);
    if (line && com) return `Dirección del local (${com}): ${line}`;
    if (line) return `Dirección del local: ${line}`;
    if (com) return `Local en ${com}`;
    return "";
  }
  return `${sorted.length} locales`;
}
