import type { SupabaseClient } from "@supabase/supabase-js";

/** Si hay subcategorías, la categoría principal es obligatoria. */
export const MSG_TAXONOMIA_SUBS_SIN_CATEGORIA =
  "Si eliges una o más subcategorías, debes indicar la categoría principal.";

/** Ningún id coincide con filas en `subcategorias`. */
export const MSG_TAXONOMIA_SUBS_INEXISTENTES =
  "Una o más subcategorías no existen o el identificador no es válido.";

/** Alguna subcategoría tiene otro `categoria_id` que el elegido. */
export const MSG_TAXONOMIA_SUBS_FUERA_DE_CATEGORIA =
  "Una o más subcategorías no pertenecen a la categoría seleccionada. Todas deben ser del mismo rubro que la categoría principal.";

/** Aprobación en admin: categoría obligatoria (no basta IA legacy si no resolvió a uuid). */
export const MSG_APROBACION_REQUIERE_CATEGORIA =
  "Debes indicar la categoría principal para aprobar.";

/** Aprobación en admin: al menos una subcategoría. */
export const MSG_APROBACION_REQUIERE_SUBCATEGORIAS =
  "Debes indicar al menos una subcategoría para aprobar.";

function trimId(v: unknown): string {
  return v === null || v === undefined ? "" : String(v).trim();
}

/** Normaliza un uuid (o string id) desde fila JSON / formulario. */
export function normalizeTaxonomiaUuid(v: unknown): string | null {
  const t = trimId(v);
  return t.length > 0 ? t : null;
}

/** Lista deduplicada de ids de subcategoría. */
export function normalizeTaxonomiaUuidList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of v) {
    const u = normalizeTaxonomiaUuid(item);
    if (u && !seen.has(u)) {
      seen.add(u);
      out.push(u);
    }
  }
  return out;
}

function idsEqual(a: string, b: string): boolean {
  const na = trimId(a).replace(/-/g, "").toLowerCase();
  const nb = trimId(b).replace(/-/g, "").toLowerCase();
  return na.length > 0 && na === nb;
}

export type ValidateCategoriaSubcategoriasResult =
  | { ok: true }
  | { ok: false; error: string };

export type ValidateCategoriaSubcategoriasOptions = {
  /**
   * Flujo de aprobación admin: exige categoría y ≥1 subcategoría antes de las reglas de coherencia.
   */
  requireAprobacionCompleta?: boolean;
};

/**
 * Regla de producto:
 * - Un emprendimiento tiene una categoría principal (`categoria_id`).
 * - Puede tener varias subcategorías.
 * - Todas deben existir en `subcategorias` y tener `categoria_id` igual al indicado.
 * - Si `subcategoriasIds` no está vacío, `categoriaId` es obligatorio.
 */
export async function validateCategoriaSubcategorias(
  client: SupabaseClient,
  categoriaId: string | null,
  subcategoriasIds: string[],
  options?: ValidateCategoriaSubcategoriasOptions
): Promise<ValidateCategoriaSubcategoriasResult> {
  const subs = [...new Set(subcategoriasIds.map((x) => trimId(x)).filter(Boolean))];

  if (options?.requireAprobacionCompleta) {
    const cat = categoriaId ? trimId(categoriaId) : "";
    if (!cat) {
      return { ok: false, error: MSG_APROBACION_REQUIERE_CATEGORIA };
    }
    if (subs.length === 0) {
      return { ok: false, error: MSG_APROBACION_REQUIERE_SUBCATEGORIAS };
    }
  }

  if (subs.length === 0) {
    return { ok: true };
  }

  const cat = categoriaId ? trimId(categoriaId) : "";
  if (!cat) {
    return { ok: false, error: MSG_TAXONOMIA_SUBS_SIN_CATEGORIA };
  }

  const { data, error } = await client
    .from("subcategorias")
    .select("id, categoria_id")
    .in("id", subs);

  if (error) {
    return { ok: false, error: error.message };
  }

  const rows = (data ?? []) as Array<{ id: unknown; categoria_id: unknown }>;
  if (rows.length !== subs.length) {
    return { ok: false, error: MSG_TAXONOMIA_SUBS_INEXISTENTES };
  }

  for (const row of rows) {
    const rowCategoriaId = trimId(row.categoria_id);
    if (!idsEqual(rowCategoriaId, cat)) {
      return { ok: false, error: MSG_TAXONOMIA_SUBS_FUERA_DE_CATEGORIA };
    }
  }

  return { ok: true };
}
