/**
 * PostgREST / Postgres: errores por columna inexistente en el esquema expuesto o en la tabla.
 * Sirve para reintentar `select` / `update` quitando columnas hasta alinear con la BD real.
 */

export type PostgrestErrLike = {
  message?: string;
  code?: string;
  details?: unknown;
  hint?: string;
};

export function isPostgrestUnknownColumnError(err: PostgrestErrLike | null): boolean {
  if (!err) return false;
  const code = String(err.code ?? "").trim();
  if (code === "PGRST204") return true;
  const m = String(err.message ?? "").toLowerCase();
  if (m.includes("does not exist") && m.includes("column")) return true;
  return (
    m.includes("schema cache") &&
    (m.includes("column") || m.includes("could not find"))
  );
}

/**
 * Tabla o vista inexistente en el schema cache de PostgREST (p. ej. migración no aplicada).
 */
export function isPostgrestMissingRelationError(err: PostgrestErrLike | null): boolean {
  if (!err) return false;
  const code = String(err.code ?? "").trim();
  if (code === "PGRST205" || code === "42P01") return true;
  const m = String(err.message ?? "").toLowerCase();
  if (m.includes("could not find the table") && m.includes("schema cache")) return true;
  if (m.includes("could not find the relation") && m.includes("schema cache")) return true;
  return false;
}

/**
 * Extrae el nombre de columna citado en el mensaje (PostgREST o Postgres).
 */
export function unknownColumnNameFromDbErrorMessage(message: string): string | null {
  const t = String(message ?? "").trim();
  const postgrest = t.match(/Could not find the '([^']+)' column/i);
  if (postgrest?.[1]) return postgrest[1];

  const pg = t.match(/\.([a-zA-Z_][a-zA-Z0-9_]*)\s+does not exist/i);
  if (pg?.[1]) return pg[1];

  const quoted = t.match(/column\s+"([^"]+)"\s+does not exist/i);
  if (quoted?.[1]) return quoted[1];

  return null;
}
