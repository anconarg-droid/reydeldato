/**
 * Fechas con locale y opciones fijas: mismo string en Node (SSR) y en el navegador,
 * evitando hydration mismatch por toLocaleString() sin argumentos o por dateStyle/timeStyle.
 */
export const DATE_TIME_ES_CL_OPTIONS: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
};

export function formatDateTimeEsCL(
  input: string | Date | null | undefined
): string {
  if (input == null || input === "") return "";
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("es-CL", DATE_TIME_ES_CL_OPTIONS);
}

/** Alias histórico (misma implementación); evita ReferenceError si queda código o caché antigua. */
export const formatDateSafe = formatDateTimeEsCL;

/** Enteros con agrupación fija (es-CL); reduce diferencias SSR/client en contadores. */
export function formatIntegerEsCL(n: number): string {
  return n.toLocaleString("es-CL", {
    maximumFractionDigits: 0,
    useGrouping: true,
  });
}
