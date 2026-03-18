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
  nivel_cobertura?: string | null;
  coverage_keys?: string[] | null;
  coverage_labels?: string[] | null;
};

/**
 * Lógica territorial compartida para agrupar resultados por:
 * - exacta (base en la comuna buscada)
 * - cobertura_comuna (atienden explícitamente la comuna)
 * - regional / nacional
 * - general (sin relación directa con la comuna)
 */
export function resolveBucket(
  item: ResolveBucketInput,
  comunaBuscada: string
): TerritorialBucket {
  const comuna = norm(comunaBuscada).replace(/\s+/g, "-");
  if (!comuna) return "general";

  const base = norm(item.comuna_base_slug).replace(/\s+/g, "-");
  const nivel = norm(item.nivel_cobertura);
  const keys = arr(item.coverage_keys).map((x) => norm(x).replace(/\s+/g, "-"));
  const labels = arr(item.coverage_labels).map(norm);

  const baseCoincide = base && base === comuna;
  const esNivelComuna = nivel === "comuna" || nivel === "solo_mi_comuna";

  // exacta SOLO si base coincide y nivel es "comuna" (compat: solo_mi_comuna)
  if (baseCoincide && esNivelComuna) return "exacta";

  // 2) Cobertura explícita en otras comunas
  if (nivel === "varias_comunas") {
    // Si la base coincide pero el nivel es varias_comunas, NO es exacta: cuenta como "Disponible".
    if (baseCoincide) return "cobertura_comuna";
    if (keys.includes(comuna)) return "cobertura_comuna";
    if (labels.includes(norm(comunaBuscada))) return "cobertura_comuna";
  }

  // 3) Cobertura amplia
  if (nivel === "regional" || nivel === "varias_regiones") return "regional";
  if (nivel === "nacional") return "nacional";

  return "general";
}

