import { createSupabaseServerPublicClient } from "@/lib/supabase/server";
import { normalizeTaxonomySlug } from "@/lib/normalizeTaxonomySlug";

const RM_REGION_SLUG = "metropolitana";

function s(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

function isPgUndefinedColumn(error: unknown, columnSqlName: string): boolean {
  const e = error as { code?: string; message?: string };
  if (String(e?.code) !== "42703") return false;
  return (e?.message ?? "").toLowerCase().includes(columnSqlName.toLowerCase());
}

/** PostgREST a veces usa PGRST204 si la columna no está en el schema expuesto. */
function isPostgrestMissingColumn(error: unknown, columnName: string): boolean {
  const e = error as { code?: string; message?: string };
  if (String(e?.code) !== "PGRST204") return false;
  return (e?.message ?? "").includes(columnName);
}

function errorMentionsColumn(error: unknown, columnName: string): boolean {
  const msg = (error as { message?: string })?.message ?? "";
  return msg.toLowerCase().includes(columnName.toLowerCase());
}

function logSubconteoRmError(error: unknown) {
  if (process.env.NODE_ENV !== "development") return;
  const e = error as { message?: string; code?: string; details?: string; hint?: string };
  console.error(
    "[categoria subconteo RM]",
    e?.message || String(error),
    e?.code ? `code=${e.code}` : "",
    e?.details ? `details=${e.details}` : "",
    e?.hint ? `hint=${e.hint}` : ""
  );
}

type ComunaGeoCol = "comuna_id" | "comuna_base_id";

function aggregateFromEmpRows(rows: Record<string, unknown>[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const subs = new Set<string>();
    const arr = row.subcategorias_slugs;
    if (Array.isArray(arr)) {
      for (const x of arr) {
        const k = normalizeTaxonomySlug(x);
        if (k) subs.add(k);
      }
    }
    const fin =
      row.subcategoria_slug_final != null ? normalizeTaxonomySlug(row.subcategoria_slug_final) : "";
    if (fin) subs.add(fin);
    for (const k of subs) {
      counts.set(k, (counts.get(k) || 0) + 1);
    }
  }
  return counts;
}

function subSlugsFromApiItem(item: Record<string, unknown>): string[] {
  const subs = new Set<string>();
  const a = item.subcategorias_slugs;
  if (Array.isArray(a)) {
    for (const x of a) {
      const k = normalizeTaxonomySlug(x);
      if (k) subs.add(k);
    }
  }
  const b = item.subcategorias_slugs_arr;
  if (Array.isArray(b)) {
    for (const x of b) {
      const k = normalizeTaxonomySlug(x);
      if (k) subs.add(k);
    }
  }
  const fin = item.subcategoria_slug != null ? normalizeTaxonomySlug(item.subcategoria_slug) : "";
  if (fin) subs.add(fin);
  return [...subs];
}

async function fetchSubRowsRm(
  supabase: ReturnType<typeof createSupabaseServerPublicClient>,
  categoriaId: string
): Promise<Record<string, unknown>[] | null> {
  const { data: regRow } = await supabase
    .from("regiones")
    .select("id")
    .eq("slug", RM_REGION_SLUG)
    .maybeSingle();
  const regionIdRaw = regRow ? (regRow as { id?: unknown }).id : null;
  const regionId =
    regionIdRaw != null && (typeof regionIdRaw === "number" || typeof regionIdRaw === "string")
      ? Number(regionIdRaw)
      : NaN;

  let rmComunaIds: number[] = [];
  if (Number.isFinite(regionId) && regionId > 0) {
    const { data: crs } = await supabase.from("comunas").select("id").eq("region_id", regionId);
    rmComunaIds = (crs ?? [])
      .map((c) => Number((c as { id?: unknown }).id))
      .filter((id) => Number.isFinite(id) && id > 0);
  }

  const selectVariants = [
    "subcategorias_slugs, subcategoria_slug_final",
    "subcategoria_slug_final",
    "subcategorias_slugs",
  ] as const;

  const comunaCols: ComunaGeoCol[] = ["comuna_id", "comuna_base_id"];

  function comunaColumnMismatch(error: unknown, col: ComunaGeoCol): boolean {
    if (col === "comuna_id") {
      return (
        isPgUndefinedColumn(error, "comuna_id") ||
        isPostgrestMissingColumn(error, "comuna_id") ||
        errorMentionsColumn(error, "comuna_id does not exist")
      );
    }
    return (
      isPgUndefinedColumn(error, "comuna_base_id") ||
      isPostgrestMissingColumn(error, "comuna_base_id") ||
      errorMentionsColumn(error, "comuna_base_id does not exist")
    );
  }

  function selectColumnMismatch(error: unknown, selectCols: string): boolean {
    if (selectCols.includes("subcategorias_slugs")) {
      if (
        isPgUndefinedColumn(error, "subcategorias_slugs") ||
        isPostgrestMissingColumn(error, "subcategorias_slugs") ||
        errorMentionsColumn(error, "subcategorias_slugs")
      ) {
        return true;
      }
    }
    if (selectCols.includes("subcategoria_slug_final")) {
      if (
        isPgUndefinedColumn(error, "subcategoria_slug_final") ||
        isPostgrestMissingColumn(error, "subcategoria_slug_final") ||
        errorMentionsColumn(error, "subcategoria_slug_final")
      ) {
        return true;
      }
    }
    return false;
  }

  for (const comunaGeoCol of comunaCols) {
    for (const selectCols of selectVariants) {
      let q = supabase
        .from("vw_emprendedores_publico")
        .select(selectCols)
        .eq("estado_publicacion", "publicado")
        .eq("categoria_id", categoriaId);
      if (rmComunaIds.length > 0) {
        q = q.in(comunaGeoCol, rmComunaIds);
      }
      const { data, error } = await q;
      if (!error) {
        return (data ?? []) as unknown as Record<string, unknown>[];
      }
      if (comunaColumnMismatch(error, comunaGeoCol)) {
        break;
      }
      if (selectColumnMismatch(error, selectCols)) {
        continue;
      }
      logSubconteoRmError(error);
      return null;
    }
  }

  return [];
}

async function aggregateFromCategoriaApi(
  categoriaSlug: string,
  comunaSlug: string
): Promise<Map<string, number> | null> {
  try {
    const h = await import("next/headers").then((m) => m.headers());
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
    const proto =
      h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
    const base = `${proto}://${host}`;
    const res = await fetch(
      `${base}/api/categoria/${encodeURIComponent(categoriaSlug)}?comuna=${encodeURIComponent(comunaSlug)}`,
      { cache: "no-store" }
    );
    const json = (await res.json()) as {
      ok?: boolean;
      grupos?: Record<string, Record<string, unknown>[] | undefined>;
    };
    if (!res.ok || !json?.ok || !json.grupos) return null;

    const g = json.grupos;
    const flat = [
      ...(g.en_tu_comuna ?? []),
      ...(g.atienden_tu_comuna ?? []),
      ...(g.regional ?? []),
      ...(g.nacional ?? []),
    ];
    const seenEmp = new Set<string>();
    const counts = new Map<string, number>();
    for (const raw of flat) {
      const item = raw as Record<string, unknown>;
      const key = s(item.slug) || s(item.id);
      if (!key || seenEmp.has(key)) continue;
      seenEmp.add(key);
      for (const sub of subSlugsFromApiItem(item)) {
        counts.set(sub, (counts.get(sub) || 0) + 1);
      }
    }
    return counts;
  } catch {
    return null;
  }
}

export type SubcategoriaConteo = { slug: string; count: number };

/**
 * Conteos por slug de subcategoría, alineados a la misma zona que el listado principal:
 * - sin comuna: emprendedores publicados en RM y `categoria_id`
 * - con comuna: respuesta de `/api/categoria` (Algolia + buckets)
 */
export async function loadCategoriaSubcategoriasConConteo(
  categoriaSlug: string,
  allowedSubSlugs: string[],
  comunaSlug: string | null | undefined
): Promise<SubcategoriaConteo[]> {
  const cat = normalizeTaxonomySlug(categoriaSlug);
  if (!cat || allowedSubSlugs.length === 0) return [];

  const allowed = new Set(allowedSubSlugs.map((x) => normalizeTaxonomySlug(x)).filter(Boolean));
  if (allowed.size === 0) return [];

  const supabase = createSupabaseServerPublicClient();
  const { data: catRow } = await supabase
    .from("categorias")
    .select("id")
    .eq("slug", cat)
    .maybeSingle();
  const categoriaId =
    catRow && (catRow as { id?: unknown }).id != null
      ? String((catRow as { id: string }).id)
      : null;
  if (!categoriaId) return [];

  const comuna = s(comunaSlug).toLowerCase();
  let counts: Map<string, number>;

  if (comuna) {
    const fromApi = await aggregateFromCategoriaApi(cat, comuna);
    counts = fromApi ?? new Map();
    if (!fromApi) {
      return [];
    }
  } else {
    const rows = await fetchSubRowsRm(supabase, categoriaId);
    if (!rows) return [];
    counts = aggregateFromEmpRows(rows);
  }

  const out: SubcategoriaConteo[] = [];
  for (const slug of allowed) {
    const n = counts.get(slug) ?? 0;
    if (n > 0) out.push({ slug, count: n });
  }
  out.sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug));
  return out;
}
