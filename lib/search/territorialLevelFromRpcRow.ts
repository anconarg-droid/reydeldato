/**
 * Escala unificada (alineada con `app/[comuna]/page.tsx` y badges):
 * 1 = base / "En tu comuna"
 * 2–4 = cobertura que atiende la comuna (comunas, región, nacional)
 *
 * REGLA ESTABLE DEL PRODUCTO (RESULTADOS POR COMUNA)
 * - Bloque "En tu comuna": incluir SIEMPRE TODO emprendimiento cuya comuna base sea EXACTAMENTE la comuna buscada,
 *   incluso si su cobertura es "solo_comuna", "varias_comunas", "varias_regiones" o "nacional".
 * - Bloque "Atienden tu comuna": incluir solo emprendimientos cuya comuna base NO es la buscada, pero que atienden
 *   por cobertura "varias_comunas", "varias_regiones" o "nacional".
 * - Prioridad entre bloques: primero siempre "En tu comuna", después siempre "Atienden tu comuna".
 * - Orden interno en cada bloque: rotación determinística cada 5 minutos.
 * - Prohibido: ordenar por clics, popularidad, premium, o random puro por request.
 *
 * Fuentes soportadas:
 * - `ranking_score` (migrations / RPC): 4 = match comuna base, 1 = nacional
 * - `score` legacy 1–4 donde 1 = local (si no hay ranking_score válido)
 * - `bloque` / `suborden` (mismo criterio que `effectiveTerritorialScore` en comuna page)
 */
export function territorialLevelFromRpcRow(row: Record<string, unknown>): number {
  const rs = Number(row.ranking_score ?? 0);
  if (Number.isFinite(rs) && rs >= 1 && rs <= 4) {
    return 5 - rs;
  }

  const score = Number(row.score ?? 0);
  if (Number.isFinite(score) && score >= 1 && score <= 4) {
    return score;
  }

  const bloque = Number(row.bloque ?? 0);
  const suborden = Number(row.suborden ?? 0);

  if (bloque === 1) return 1;
  if (suborden === 1) return 2;
  if (suborden === 2) return 3;
  if (suborden === 3) return 4;

  return 0;
}

/** Partición mutuamente excluyente: cada fila cae en a lo sumo un bucket (0 → atienden, sin duplicar). */
export function splitByTerritorialBucket<T extends Record<string, unknown>>(
  resultados: T[]
): { deMiComuna: T[]; atiendenMiComuna: T[] } {
  const deMiComuna: T[] = [];
  const atiendenMiComuna: T[] = [];

  for (const row of resultados) {
    const level = territorialLevelFromRpcRow(row);
    if (level === 1) {
      deMiComuna.push(row);
    } else {
      atiendenMiComuna.push(row);
    }
  }

  return { deMiComuna, atiendenMiComuna };
}
