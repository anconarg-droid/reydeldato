/**
 * Reglas de producto: descripción corta (listados + panel ficha) vs larga (solo ficha completa).
 * Usar en normalización al guardar y en validación FE/BE.
 */

export const DESCRIPCION_CORTA_MIN = 40;
export const DESCRIPCION_CORTA_MAX = 120;
/** Límite defensivo para texto largo (BD / payload). */
export const DESCRIPCION_LARGA_MAX = 20_000;

/** Una línea: sin saltos de línea ni tabs; espacios colapsados. */
export function normalizeDescripcionCorta(raw: string): string {
  return String(raw ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Conserva párrafos; unifica finales de línea y recorta extremos. */
export function normalizeDescripcionLarga(raw: string): string {
  let t = String(raw ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  t = t.trim();
  if (t.length > DESCRIPCION_LARGA_MAX) {
    t = t.slice(0, DESCRIPCION_LARGA_MAX);
  }
  return t;
}

export function validateDescripcionCortaPublicacion(normalized: string): string[] {
  const e: string[] = [];
  if (!normalized) {
    e.push(
      `Escribí el resumen para aparecer en búsquedas (una frase, máx. ${DESCRIPCION_CORTA_MAX} caracteres).`,
    );
    return e;
  }
  if (normalized.length < DESCRIPCION_CORTA_MIN) {
    const faltan = DESCRIPCION_CORTA_MIN - normalized.length;
    e.push(
      `Máx. ${DESCRIPCION_CORTA_MAX} caracteres — sé claro y directo · te faltan ${faltan}`,
    );
  }
  if (normalized.length > DESCRIPCION_CORTA_MAX) {
    const pasados = normalized.length - DESCRIPCION_CORTA_MAX;
    e.push(
      `Máx. ${DESCRIPCION_CORTA_MAX} caracteres — sé claro y directo · te sobran ${pasados}`,
    );
  }
  return e;
}

/** Borrador / autosave: solo tope duro; permite menos de 40 mientras escribe. */
export function validateDescripcionCortaBorradorSiPresente(normalized: string): string[] {
  if (!normalized) return [];
  if (normalized.length > DESCRIPCION_CORTA_MAX) {
    return [
      `La descripción corta no puede superar ${DESCRIPCION_CORTA_MAX} caracteres (tiene ${normalized.length}).`,
    ];
  }
  return [];
}

/**
 * Publicación básica (`POST /api/publicar`): frase obligatoria y tope máximo, **sin** el mínimo de
 * ficha completa (`DESCRIPCION_CORTA_MIN`). La regla de 40+ caracteres queda para mejorar ficha / panel.
 */
export function validateDescripcionCortaPublicacionBasica(normalized: string): string[] {
  if (!normalized) {
    return [
      `Escribí un breve resumen de tu negocio (máx. ${DESCRIPCION_CORTA_MAX} caracteres).`,
    ];
  }
  return validateDescripcionCortaBorradorSiPresente(normalized);
}

export function validateDescripcionLarga(normalized: string): string[] {
  if (!normalized) return [];
  if (normalized.length > DESCRIPCION_LARGA_MAX) {
    return [
      `La descripción larga es demasiado extensa (máximo ${DESCRIPCION_LARGA_MAX} caracteres).`,
    ];
  }
  return [];
}

/** Primer mensaje para respuestas API o toasts. */
export function primeraValidacionDescripcion(errs: string[]): string | null {
  return errs.length ? errs[0]! : null;
}
