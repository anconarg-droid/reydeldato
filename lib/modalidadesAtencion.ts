/**
 * Valores del enum Postgres `modalidad_atencion` en `emprendedor_modalidades.modalidad`.
 *
 * UI nueva: local_fisico | delivery | domicilio | online
 * Compatibilidad: `presencial` (payload viejo) → `presencial_terreno`; no re-mapear `delivery`/`domicilio` entre sí.
 */

export const MODALIDADES_ATENCION_DB = [
  "local_fisico",
  "delivery",
  "domicilio",
  "online",
  "presencial_terreno",
] as const;

export type ModalidadAtencionDb = (typeof MODALIDADES_ATENCION_DB)[number];

/** Valores que envían los botones actuales (sin legacy). */
export const MODALIDADES_ATENCION_CANONICAS = [
  "local_fisico",
  "delivery",
  "domicilio",
  "online",
] as const;

export type ModalidadAtencionCanonica =
  (typeof MODALIDADES_ATENCION_CANONICAS)[number];

export function esModalidadAtencionDbValida(m: string): boolean {
  return (MODALIDADES_ATENCION_DB as readonly string[]).includes(m);
}

/** @deprecated usar esModalidadAtencionDbValida; mantenido por imports viejos */
export function esModalidadAtencionCanonicaDb(m: string): boolean {
  return (MODALIDADES_ATENCION_CANONICAS as readonly string[]).includes(m);
}

/**
 * Entrada (formulario, API, JSON) → valor del enum en BD.
 * - `presencial` (flujo viejo) → `presencial_terreno`
 * - `presencial_terreno` se conserva
 */
export function modalidadAtencionInputToDb(raw: string): string | null {
  const x = String(raw ?? "").trim().toLowerCase();
  if (!x) return null;
  if (x === "local" || x === "local_fisico" || x === "fisico") return "local_fisico";
  if (x === "delivery") return "delivery";
  if (x === "domicilio") return "domicilio";
  if (x === "online") return "online";
  if (x === "presencial") return "presencial_terreno";
  if (x === "presencial_terreno") return "presencial_terreno";
  if (esModalidadAtencionDbValida(x)) return x;
  return null;
}

export function modalidadesAtencionInputsToDbUnique(inputs: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of inputs) {
    const db = modalidadAtencionInputToDb(raw);
    if (db && esModalidadAtencionDbValida(db) && !seen.has(db)) {
      seen.add(db);
      out.push(db);
    }
  }
  return out;
}

/** Etiqueta para ficha / listados / preview (lee valores BD o slugs legacy). */
export function etiquetaModalidadAtencion(raw: string): string {
  const x = String(raw ?? "").trim().toLowerCase();
  if (x === "presencial_terreno" || x === "presencial") {
    return "A domicilio / Delivery";
  }
  if (x === "local_fisico" || x === "local" || x === "fisico") return "Local físico";
  if (x === "delivery") return "Delivery";
  if (x === "domicilio") return "A domicilio";
  if (x === "online") return "Online";
  const t = String(raw ?? "").trim();
  return t || "";
}
