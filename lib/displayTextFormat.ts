/**
 * Formato de solo visualización (cards, previews). No muta lo guardado en BD.
 * Locale fijo para títulos en español de Chile.
 */
const LOCALE = "es-CL";

/** Capitaliza la primera letra del texto (resto intacto). */
export function displayCapitalizeFirst(input: string): string {
  const t = String(input ?? "");
  if (!t.trim()) return t;
  return t.replace(/^(\s*)(\S)/, (_, ws: string, ch: string) => `${ws}${ch.toLocaleUpperCase(LOCALE)}`);
}

/**
 * Primera letra en mayúscula tras fin de oración (. ! ?) seguido de espacio.
 * Útil para descripciones largas pegadas en minúsculas.
 */
export function displayCapitalizeSentenceStarts(input: string): string {
  let out = displayCapitalizeFirst(String(input ?? "").trim());
  if (!out) return "";
  out = out.replace(
    /([.!?])\s+([a-záéíóúüñ])/gi,
    (_, punct: string, ch: string) => `${punct} ${ch.toLocaleUpperCase(LOCALE)}`
  );
  return out;
}

/**
 * Título por palabras: primera letra de cada palabra en mayúscula (resto en minúsculas).
 * Soporta guiones internos (p. ej. "maría-paz").
 */
export function displayTitleCaseWords(input: string): string {
  const s = String(input ?? "").trim();
  if (!s) return "";
  return s
    .split(/\s+/)
    .map((word) => {
      if (!word) return word;
      if (word.includes("-")) {
        return word
          .split("-")
          .map((part) =>
            part
              ? part.charAt(0).toLocaleUpperCase(LOCALE) +
                part.slice(1).toLocaleLowerCase(LOCALE)
              : part
          )
          .join("-");
      }
      return (
        word.charAt(0).toLocaleUpperCase(LOCALE) +
        word.slice(1).toLocaleLowerCase(LOCALE)
      );
    })
    .join(" ");
}
