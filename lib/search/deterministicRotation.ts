/** Ventana de rotación equitativa: **5 minutos**. Mismo valor en `/api/buscar`, resultados globales y tests. */
export const SEARCH_ROTATION_WINDOW_MS = 5 * 60 * 1000;

export function rotationSeed(windowMs: number = SEARCH_ROTATION_WINDOW_MS): number {
  if (!Number.isFinite(windowMs) || windowMs <= 0) return 0;
  return Math.floor(Date.now() / windowMs);
}

/** Hash estable (FNV-1a 32-bit) para ordenar sin Math.random(). */
function fnv1a32(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Orden pseudoaleatorio estable por ventana de tiempo (p. ej. 5 minutos).
 * - Misma ventana + mismo namespace + mismos items ⇒ mismo orden (no cambia en cada refresh).
 * - Nueva ventana ⇒ nuevo orden (equidad en el tiempo).
 * - `namespace` distinto por bloque ⇒ el mismo negocio no queda correlacionado entre bloques.
 */
export function rotateDeterministic<T>(
  items: T[],
  keyFn: (item: T) => string,
  windowMs: number = SEARCH_ROTATION_WINDOW_MS,
  namespace: string = "",
): T[] {
  if (!Array.isArray(items) || items.length <= 1) return items;

  const seed = rotationSeed(windowMs);
  const ns = String(namespace ?? "");
  return [...items].sort((a, b) => {
    const ka = String(keyFn(a) ?? "");
    const kb = String(keyFn(b) ?? "");
    const ha = fnv1a32(`${seed}\0${ns}\0${ka}`);
    const hb = fnv1a32(`${seed}\0${ns}\0${kb}`);
    if (ha !== hb) return ha < hb ? -1 : 1;
    return ka.localeCompare(kb);
  });
}

/**
 * Rotación equitativa por ventana ({@link SEARCH_ROTATION_WINDOW_MS}) con **dos sublistas fijas**:
 *
 * 1. Emprendimientos **con** foto de listado (`hasFotoListado` = true) — orden rotado con namespace `${namespaceBase}:foto`.
 * 2. Emprendimientos **sin** foto — orden rotado con namespace `${namespaceBase}:sin_foto`.
 *
 * En `/api/buscar` hay dos bloques territoriales; cada uno llama a esta función con un `namespaceBase` distinto
 * (`buscar:de_tu_comuna` y `buscar:atienden_tu_comuna`), así que en la práctica hay **cuatro** rotaciones
 * independientes por ventana de 5 minutos: base+foto, base+sin foto, cobertura+foto, cobertura+sin foto.
 *
 * No se usa plan, trial ni premium para ordenar; la concatenación con/sin foto es solo UX (separación visual).
 */
export function rotateDeterministicPhotoBuckets<T>(
  items: T[],
  keyFn: (item: T) => string,
  hasFotoListado: (item: T) => boolean,
  windowMs: number = SEARCH_ROTATION_WINDOW_MS,
  namespaceBase: string = "",
): T[] {
  if (!Array.isArray(items) || items.length === 0) return items;

  const base = String(namespaceBase ?? "");
  const con: T[] = [];
  const sin: T[] = [];
  for (const it of items) {
    (hasFotoListado(it) ? con : sin).push(it);
  }

  const conRot = rotateDeterministic(con, keyFn, windowMs, `${base}:foto`);
  const sinRot = rotateDeterministic(sin, keyFn, windowMs, `${base}:sin_foto`);
  return [...conRot, ...sinRot];
}
