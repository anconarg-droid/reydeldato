export type TerritorialBucket =
  | "exacta"
  | "cobertura_comuna"
  | "regional"
  | "nacional"
  | "general";

function s(v: unknown) {
  return String(v ?? "").trim();
}

function norm(v: unknown) {
  return s(v)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function arr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => s(x)).filter(Boolean);
}

export type ResolveBucketInput = {
  comuna_base_slug?: string | null;
  comuna_base_nombre?: string | null;
  coverage_labels?: string[] | null;
  coverage_keys?: string[] | null;
  nivel_cobertura?: string | null;
};

/**
 * Lógica territorial compartida para agrupar resultados por:
 * - exacta (base en la comuna buscada)
 * - cobertura_comuna (atienden explícitamente la comuna)
 * - varias_regiones / nacional
 * - general (sin relación directa con la comuna)
 */
export function resolveBucket(
  item: ResolveBucketInput,
  comunaBuscada: string
): TerritorialBucket {
  const comunaRaw = s(comunaBuscada);
  const comunaSlugLike = norm(comunaRaw);
  const comunaNameLike = norm(comunaRaw.replace(/-/g, " "));

  if (!comunaSlugLike && !comunaNameLike) return "general";

  const comunaBaseSlug = norm(item.comuna_base_slug);
  const comunaBaseNombre = norm(item.comuna_base_nombre);
  const coverageLabels = arr(item.coverage_labels).map(norm);
  const coverageKeys = arr(item.coverage_keys).map(norm);
  const nivel = s(item.nivel_cobertura);

  if (
    (comunaSlugLike && comunaBaseSlug === comunaSlugLike) ||
    (comunaNameLike && comunaBaseNombre === comunaNameLike)
  ) {
    return "exacta";
  }

  if (
    coverageLabels.includes(comunaSlugLike) ||
    coverageLabels.includes(comunaNameLike)
  ) {
    return "cobertura_comuna";
  }

  if (coverageKeys.includes(comunaSlugLike)) {
    return "cobertura_comuna";
  }

  if (
    coverageLabels.some(
      (label) =>
        (comunaSlugLike && label.includes(comunaSlugLike)) ||
        (comunaNameLike && label.includes(comunaNameLike))
    )
  ) {
    return "cobertura_comuna";
  }

  if (nivel === "varias_regiones" || nivel === "regional") return "regional";
  if (nivel === "nacional") return "nacional";

  return "general";
}

