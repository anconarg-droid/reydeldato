import {
  rotateDeterministic,
  SEARCH_ROTATION_WINDOW_MS,
} from "@/lib/search/deterministicRotation";

function rotationKeyForItem(i: unknown): string {
  const anyI = i as Record<string, unknown>;
  const k =
    (anyI?.slug != null ? String(anyI.slug) : "") ||
    (anyI?.id != null ? String(anyI.id) : "") ||
    (anyI?.nombre != null ? String(anyI.nombre) : "") ||
    "";
  return k || JSON.stringify(i);
}

/**
 * Orden dentro de un bloque territorial: rotación determinística por bucket de 5 min.
 * **No** se prioriza perfil completo sobre básico (justicia en el ranking).
 */
export function orderItemsFichaCompletaPrimero<T>(
  items: T[],
  namespace: string,
): T[] {
  return rotateDeterministic(
    [...items],
    rotationKeyForItem,
    SEARCH_ROTATION_WINDOW_MS,
    namespace,
  );
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
 * Paso 2: dentro de cada bucket, rotación determinística (sin separar completos/básicos).
 * Paso 3: unir en orden: en tu comuna → atiende → regional → nacional (`general` → nacional).
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
    ...orderItemsFichaCompletaPrimero(enTuComuna, "merge:tier:exacta"),
    ...orderItemsFichaCompletaPrimero(atiende, "merge:tier:cobertura_comuna"),
    ...orderItemsFichaCompletaPrimero(regional, "merge:tier:regional"),
    ...orderItemsFichaCompletaPrimero(nacional, "merge:tier:nacional"),
  ];
}
