import { rotateDeterministic } from "@/lib/search/deterministicRotation";

/**
 * @deprecated No usar en resultados visibles.
 * Usar rotación determinística por bloque (ver `lib/search/deterministicRotation.ts`)
 * y reglas territoriales explícitas (ver `lib/search/territorialLevelFromRpcRow.ts`).
 *
 * Este helper existía para “mezclar” resultados antes de priorizar ficha completa;
 * se eliminó `Math.random()` para evitar orden aleatorio por request.
 */
export function orderItemsFichaCompletaPrimero<
  T extends { es_ficha_completa?: boolean | null },
>(items: T[]): T[] {
  const mezcladas = rotateDeterministic(
    [...items],
    (i) => {
      const anyI = i as any;
      const k =
        (anyI?.slug != null ? String(anyI.slug) : "") ||
        (anyI?.id != null ? String(anyI.id) : "") ||
        (anyI?.nombre != null ? String(anyI.nombre) : "") ||
        "";
      return k || JSON.stringify(i);
    },
    5 * 60 * 1000
  );
  mezcladas.sort((a, b) => {
    if (a.es_ficha_completa === b.es_ficha_completa) return 0;
    return a.es_ficha_completa === true ? -1 : 1;
  });
  return mezcladas;
}

/** Nivel territorial según `ranking_score` (misma lógica que badges en búsqueda). */
export type TerritorialTier =
  | "exacta"
  | "cobertura_comuna"
  | "regional"
  | "nacional"
  | "general";

export function territorialTierFromRanking<
  T extends { ranking_score?: number | null },
>(item: T): TerritorialTier {
  const score = Number(item.ranking_score ?? 0);
  if (score === 4) return "exacta";
  if (score === 3) return "cobertura_comuna";
  if (score === 2) return "regional";
  if (score === 1) return "nacional";
  return "general";
}

/**
 * Paso 1: buckets por tier territorial.
 * Paso 2: dentro de cada bucket, `orderItemsFichaCompletaPrimero` (equiv. ordenarBucket).
 * Paso 3: unir solo en este orden — sin volver a mezclar el array final:
 * en tu comuna → atiende → regional → nacional (items tier `general` van en bucket nacional).
 */
export function mergeTerritorialBucketsOrdered<
  T extends {
    ranking_score?: number | null;
    es_ficha_completa?: boolean | null;
  },
>(items: T[]): T[] {
  const enTuComuna = items.filter((i) => territorialTierFromRanking(i) === "exacta");
  const atiende = items.filter((i) => territorialTierFromRanking(i) === "cobertura_comuna");
  const regional = items.filter((i) => territorialTierFromRanking(i) === "regional");
  const nacional = items.filter((i) => {
    const t = territorialTierFromRanking(i);
    return t === "nacional" || t === "general";
  });

  return [
    ...orderItemsFichaCompletaPrimero(enTuComuna),
    ...orderItemsFichaCompletaPrimero(atiende),
    ...orderItemsFichaCompletaPrimero(regional),
    ...orderItemsFichaCompletaPrimero(nacional),
  ];
}
