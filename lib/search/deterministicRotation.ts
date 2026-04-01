export function rotationSeed(windowMs: number = 5 * 60 * 1000): number {
  if (!Number.isFinite(windowMs) || windowMs <= 0) return 0;
  return Math.floor(Date.now() / windowMs);
}

/**
 * Rotación determinística por ventana de tiempo (default: 5 minutos).
 * - Misma ventana + mismos items => mismo orden (no "random" por request).
 * - Cambia cuando cambia la ventana de tiempo (p.ej. cada 5 minutos).
 * - No usa clics, popularidad, premium, ni nada externo.
 */
export function rotateDeterministic<T>(
  items: T[],
  keyFn: (item: T) => string,
  windowMs: number = 5 * 60 * 1000
): T[] {
  if (!Array.isArray(items) || items.length <= 1) return items;

  const seed = rotationSeed(windowMs);
  const sorted = [...items].sort((a, b) => {
    const ka = String(keyFn(a) ?? "");
    const kb = String(keyFn(b) ?? "");
    return ka.localeCompare(kb);
  });

  const shift = seed % sorted.length;
  return [...sorted.slice(shift), ...sorted.slice(0, shift)];
}

