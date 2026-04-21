/**
 * Palabras clave del usuario.
 *
 * - **`emprendedores`**: lectura unificada con {@link readKeywordsUsuarioPreferJson} (prioriza
 *   `keywords_usuario_json` si existe en la fila, luego `keywords_usuario`).
 * - **`postulaciones_emprendedores`** (esquema actual): solo columna `keywords_usuario` (text[]).
 *   Usar {@link readKeywordsUsuarioFromPostulacionRow}; no asumir `keywords_usuario_json` en esa tabla.
 *
 * En formularios se edita como texto; se normaliza al guardar (coma, punto, punto y coma, saltos de línea).
 */

export const MAX_KEYWORDS_USUARIO = 40;

function s(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

/**
 * Tokeniza un texto de keywords: separa por coma, punto, punto y coma o salto de línea.
 * Trim, minúsculas, deduplicado, máximo {@link MAX_KEYWORDS_USUARIO}.
 */
export function parseKeywordsUsuarioInputToTextArray(raw: string): string[] {
  const t = s(raw);
  if (!t) return [];
  const pieces = t
    .split(/[.,;\n\r-]+/)
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const k of pieces) {
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(k);
    if (out.length >= MAX_KEYWORDS_USUARIO) break;
  }
  return out;
}

/**
 * Normaliza keywords ya guardadas (jsonb, text[] o string suelto).
 * Cada elemento del array puede contener varios términos separados por coma o punto (ej. "tomates. platanos").
 */
export function normalizeKeywordsUsuarioFromDbValue(raw: unknown): string[] {
  if (raw == null) return [];
  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t) return [];
    if (t.startsWith("[") && t.endsWith("]")) {
      try {
        const parsed: unknown = JSON.parse(t);
        return normalizeKeywordsUsuarioFromDbValue(parsed);
      } catch {
        return parseKeywordsUsuarioInputToTextArray(t);
      }
    }
    return parseKeywordsUsuarioInputToTextArray(t);
  }
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const el of raw) {
    for (const k of parseKeywordsUsuarioInputToTextArray(String(el ?? ""))) {
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(k);
      if (out.length >= MAX_KEYWORDS_USUARIO) return out;
    }
  }
  return out;
}

/**
 * Igual que {@link parseKeywordsUsuarioInputToTextArray} si es string; si es array, aplica la misma
 * regla por elemento y aplana (útil en PATCH con array “sucio”).
 */
export function normalizeKeywordsUsuarioListFromMixed(value: unknown): string[] {
  if (typeof value === "string") return parseKeywordsUsuarioInputToTextArray(value);
  return normalizeKeywordsUsuarioFromDbValue(value);
}

/**
 * Lectura para **`emprendedores`** (o payload panel ya mergeado que incluye `keywords_usuario_json`):
 * primero `keywords_usuario_json`, si vacío entonces `keywords_usuario`.
 */
export function readKeywordsUsuarioPreferJson(
  row: Record<string, unknown> | null | undefined
): string[] {
  if (!row) return [];
  const fromJson = normalizeKeywordsUsuarioFromDbValue(row.keywords_usuario_json);
  if (fromJson.length) return fromJson;
  return normalizeKeywordsUsuarioFromDbValue(row.keywords_usuario);
}

/**
 * Lectura desde fila de **`postulaciones_emprendedores`**: solo `keywords_usuario` (text[]) y
 * opcional `palabras_clave` legacy. No consulta `keywords_usuario_json` (no existe en el esquema actual).
 */
export function readKeywordsUsuarioFromPostulacionRow(
  row: Record<string, unknown> | null | undefined
): string[] {
  if (!row) return [];
  const fromArr = normalizeKeywordsUsuarioFromDbValue(row.keywords_usuario);
  if (fromArr.length) return fromArr;
  const v = row.palabras_clave;
  if (Array.isArray(v)) return normalizeKeywordsUsuarioFromDbValue(v);
  if (typeof v === "string") return parseKeywordsUsuarioInputToTextArray(v);
  return [];
}
