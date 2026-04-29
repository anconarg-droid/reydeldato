import { createSupabaseServerPublicClient } from "@/lib/supabase/server";
import { normalizeTaxonomySlug } from "@/lib/normalizeTaxonomySlug";
import { slugify } from "@/lib/slugify";

const PAGE = 800;

function s(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

function empIdKey(row: Record<string, unknown>): string {
  const id = row.id;
  return id != null ? String(id) : "";
}

/** Compara id de comuna en fila (number, string, bigint) con el id resuelto. */
function comunaIdCoincide(field: unknown, comunaId: number): boolean {
  if (field == null || String(field).trim() === "") return false;
  const n = typeof field === "number" ? field : Number(field);
  if (Number.isFinite(n)) {
    return Math.trunc(n) === Math.trunc(comunaId);
  }
  return String(field).trim() === String(comunaId);
}

/**
 * `comunas_cobertura` en BD suele ser `text[]` de slugs; a veces mezcla id como string.
 * `comunas_cobertura_ids` (mismo tipo que `comunas.id`) es la fuente canónica para `varias_comunas`.
 */
export function coberturaArrayIncluyeComuna(
  raw: unknown,
  comunaId: number,
  comunaSlugNorm: string,
  rawIds?: unknown
): boolean {
  const idsArr = Array.isArray(rawIds) ? rawIds : [];
  for (const x of idsArr) {
    if (comunaIdCoincide(x, comunaId)) return true;
  }

  const arr = Array.isArray(raw) ? raw : [];
  const idStr = String(comunaId);
  const slugTarget = comunaSlugNorm.trim().toLowerCase();
  for (const x of arr) {
    const t = s(x);
    if (!t) continue;
    if (t === idStr) return true;
    const n = Number(t);
    if (Number.isFinite(n) && Math.trunc(n) === Math.trunc(comunaId)) return true;
    if (t.toLowerCase() === slugTarget) return true;
    const asSlug = normalizeTaxonomySlug(t) || slugify(t);
    if (asSlug === comunaSlugNorm) return true;
  }
  return false;
}

function formatSupabaseError(error: unknown): string {
  if (error == null) return "null";
  if (error instanceof Error) return error.message;
  if (typeof error === "object") {
    const e = error as Record<string, unknown>;
    const bits = ["message", "code", "details", "hint"]
      .map((k) => (e[k] != null ? `${k}=${String(e[k])}` : ""))
      .filter(Boolean);
    if (bits.length) return bits.join(" | ");
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

async function loadEmprendedorIdsCoberturaPivot(
  supabase: ReturnType<typeof createSupabaseServerPublicClient>,
  comunaId: number
): Promise<Set<string>> {
  const out = new Set<string>();
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("emprendedor_comunas_cobertura")
      .select("emprendedor_id")
      .eq("comuna_id", comunaId)
      .range(offset, offset + PAGE - 1);
    if (error) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[loadEmprendedorIdsCoberturaPivot]",
          formatSupabaseError(error)
        );
      }
      break;
    }
    const chunk = data ?? [];
    for (const r of chunk) {
      const id = (r as { emprendedor_id?: unknown }).emprendedor_id;
      if (id != null) out.add(String(id));
    }
    if (chunk.length < PAGE) break;
    offset += PAGE;
    if (offset > 200_000) break;
  }
  return out;
}

/** Incluir taxonomía para chips en /categorias (subcategorías con oferta real). */
const SELECT_VARIANTS_GLOBAL = [
  "id, categoria_id, subcategorias_slugs, subcategoria_slug_final",
  "id, categoria_id",
] as const;

const SELECT_VARIANTS_COMUNA = [
  "id, categoria_id, comuna_id, comuna_base_id, comunas_cobertura, comunas_cobertura_ids, subcategorias_slugs, subcategoria_slug_final",
  "id, categoria_id, comuna_id, comuna_base_id, comunas_cobertura, comunas_cobertura_ids",
  "id, categoria_id, comuna_id, comuna_base_id, comunas_cobertura",
  "id, categoria_id, comuna_base_id, comunas_cobertura",
  "id, categoria_id, comuna_base_id",
  "id, categoria_id",
] as const;

/** Slugs de subcategoría asociados al emprendedor (misma idea que aggregateFromEmpRows en subconteos). */
function collectSubSlugsFromVwRow(row: Record<string, unknown>): string[] {
  const subs = new Set<string>();
  const arr = row.subcategorias_slugs;
  if (Array.isArray(arr)) {
    for (const x of arr) {
      const k = normalizeTaxonomySlug(x);
      if (k) subs.add(k);
    }
  }
  const fin =
    row.subcategoria_slug_final != null
      ? normalizeTaxonomySlug(row.subcategoria_slug_final)
      : "";
  if (fin) subs.add(fin);
  const b = row.subcategorias_slugs_arr;
  if (Array.isArray(b)) {
    for (const x of b) {
      const k = normalizeTaxonomySlug(x);
      if (k) subs.add(k);
    }
  }
  return [...subs];
}

/**
 * Clasifica si el emprendedor publicado cuenta para la comuna: base local vs solo cobertura.
 */
export function clasificarEmprendedorParaComuna(
  row: Record<string, unknown>,
  comunaId: number,
  comunaSlugNorm: string
): "base" | "atiende" | "no" {
  if (comunaIdCoincide(row.comuna_base_id, comunaId)) return "base";
  if (comunaIdCoincide(row.comuna_id, comunaId)) return "base";

  const bslugRaw = s(row.comuna_base_slug);
  const bslug = bslugRaw ? normalizeTaxonomySlug(bslugRaw) || slugify(bslugRaw) : "";
  if (bslug && bslug === comunaSlugNorm) return "base";

  if (
    coberturaArrayIncluyeComuna(
      row.comunas_cobertura,
      comunaId,
      comunaSlugNorm,
      row.comunas_cobertura_ids
    )
  ) {
    return "atiende";
  }

  return "no";
}

export type ConteoCategoriaIndex = {
  enBase: number;
  atiende: number;
  total: number;
};

type Agg = { base: Set<string>; atiende: Set<string> };

/**
 * Cuenta emprendedores publicados por categoría (slug), paginando la tabla `emprendedores`.
 * - Sin `comunaSlug` resuelto: total nacional por categoría.
 * - Con comuna resuelta: separa base en comuna vs cobertura.
 */
export async function loadConteosCategoriasIndex(opts: {
  comunaSlug?: string | null;
}): Promise<{
  porSlug: Map<string, ConteoCategoriaIndex>;
  comunaNombre: string | null;
  comunaResuelta: boolean;
  /** Slugs de subcategoría (normalizados) con ≥1 emprendedor publicado en el mismo alcance que los conteos. */
  subSlugsConPublicadosPorCategoriaSlug: Map<string, Set<string>>;
}> {
  const comunaSlugNorm = opts.comunaSlug ? slugify(String(opts.comunaSlug)) : "";
  const supabase = createSupabaseServerPublicClient();

  let comunaId: number | null = null;
  let comunaNombre: string | null = null;
  let comunaResuelta = false;

  if (comunaSlugNorm) {
    const { data: cr } = await supabase
      .from("comunas")
      .select("id, nombre")
      .eq("slug", comunaSlugNorm)
      .maybeSingle();
    if (cr && (cr as { id?: unknown }).id != null) {
      const id = Number((cr as { id: unknown }).id);
      if (Number.isFinite(id) && id > 0) {
        comunaId = id;
        comunaNombre = s((cr as { nombre?: unknown }).nombre) || null;
        comunaResuelta = true;
      }
    }
  }

  const byCategoriaId = new Map<string, Agg>();
  const globalTotals = new Map<string, number>();
  const subSlugsByCatId = new Map<string, Set<string>>();

  const comunaMode = Boolean(comunaId && comunaResuelta);
  const idsAtiendePivot =
    comunaMode && comunaId
      ? await loadEmprendedorIdsCoberturaPivot(supabase, comunaId)
      : new Set<string>();

  const variants = comunaMode ? SELECT_VARIANTS_COMUNA : SELECT_VARIANTS_GLOBAL;

  let selectCols: string | null = null;
  let variantIndex = 0;
  let from = 0;

  const rowHasCoberturaColumn = (row: Record<string, unknown>) =>
    Object.prototype.hasOwnProperty.call(row, "comunas_cobertura") ||
    Object.prototype.hasOwnProperty.call(row, "comunas_cobertura_ids");

  for (;;) {
    const cols: string =
      selectCols ?? variants[variantIndex] ?? variants[variants.length - 1];

    const { data, error } = await supabase
      .from("vw_emprendedores_publico")
      .select(cols)
      .eq("estado_publicacion", "publicado")
      .range(from, from + PAGE - 1);

    if (error) {
      if (!selectCols && variantIndex + 1 < variants.length) {
        variantIndex += 1;
        from = 0;
        byCategoriaId.clear();
        globalTotals.clear();
        continue;
      }
      if (process.env.NODE_ENV === "development") {
        console.error(
          "[loadConteosCategoriasIndex]",
          formatSupabaseError(error),
          `select="${cols}"`
        );
      }
      break;
    }

    selectCols = cols;

    const rows = (data ?? []) as unknown as Record<string, unknown>[];
    if (rows.length === 0) break;

    for (const row of rows) {
      const catId = s(row.categoria_id);
      if (!catId) continue;
      const ek = empIdKey(row);
      if (!ek) continue;

      const subsRow = collectSubSlugsFromVwRow(row);

      if (!comunaMode) {
        globalTotals.set(catId, (globalTotals.get(catId) || 0) + 1);
        if (subsRow.length) {
          let subSet = subSlugsByCatId.get(catId);
          if (!subSet) {
            subSet = new Set<string>();
            subSlugsByCatId.set(catId, subSet);
          }
          for (const sub of subsRow) subSet.add(sub);
        }
      } else {
        const rowForClass = rowHasCoberturaColumn(row)
          ? row
          : { ...row, comunas_cobertura: [], comunas_cobertura_ids: [] };
        let tier = clasificarEmprendedorParaComuna(
          rowForClass,
          comunaId!,
          comunaSlugNorm
        );
        if (tier === "no" && idsAtiendePivot.has(ek)) {
          tier = "atiende";
        }
        if (tier === "no") continue;
        let agg = byCategoriaId.get(catId);
        if (!agg) {
          agg = { base: new Set(), atiende: new Set() };
          byCategoriaId.set(catId, agg);
        }
        if (tier === "base") agg.base.add(ek);
        else agg.atiende.add(ek);
        if (subsRow.length) {
          let subSet = subSlugsByCatId.get(catId);
          if (!subSet) {
            subSet = new Set<string>();
            subSlugsByCatId.set(catId, subSet);
          }
          for (const sub of subsRow) subSet.add(sub);
        }
      }
    }

    if (rows.length < PAGE) break;
    from += PAGE;
    if (from > 200_000) break;
  }

  const ids = new Set<string>();
  if (!comunaId || !comunaResuelta) {
    for (const id of globalTotals.keys()) ids.add(id);
  } else {
    for (const id of byCategoriaId.keys()) ids.add(id);
  }

  if (ids.size === 0) {
    return {
      porSlug: new Map(),
      comunaNombre,
      comunaResuelta,
      subSlugsConPublicadosPorCategoriaSlug: new Map(),
    };
  }

  const { data: catRows, error: catErr } = await supabase
    .from("categorias")
    .select("id, slug")
    .in("id", [...ids]);

  if (catErr || !catRows?.length) {
    return {
      porSlug: new Map(),
      comunaNombre,
      comunaResuelta,
      subSlugsConPublicadosPorCategoriaSlug: new Map(),
    };
  }

  const idToSlug = new Map<string, string>();
  for (const c of catRows) {
    const id = s((c as { id?: unknown }).id);
    const slug = normalizeTaxonomySlug((c as { slug?: unknown }).slug);
    if (id && slug) idToSlug.set(id, slug);
  }

  const porSlug = new Map<string, ConteoCategoriaIndex>();
  const subSlugsConPublicadosPorCategoriaSlug = new Map<string, Set<string>>();

  if (!comunaId || !comunaResuelta) {
    for (const [catId, n] of globalTotals) {
      const slug = idToSlug.get(catId);
      if (!slug || n <= 0) continue;
      porSlug.set(slug, { enBase: 0, atiende: 0, total: n });
    }
  } else {
    for (const [catId, agg] of byCategoriaId) {
      const slug = idToSlug.get(catId);
      if (!slug) continue;
      const enBase = agg.base.size;
      const atiende = agg.atiende.size;
      const total = enBase + atiende;
      if (total <= 0) continue;
      porSlug.set(slug, { enBase, atiende, total });
    }
  }

  for (const [catId, subSet] of subSlugsByCatId) {
    const slug = idToSlug.get(catId);
    if (!slug || subSet.size === 0) continue;
    subSlugsConPublicadosPorCategoriaSlug.set(slug, subSet);
  }

  return {
    porSlug,
    comunaNombre,
    comunaResuelta,
    subSlugsConPublicadosPorCategoriaSlug,
  };
}
