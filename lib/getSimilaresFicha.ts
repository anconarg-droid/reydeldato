import { createSupabaseServerPublicClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function arr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => s(x)).filter(Boolean);
}

/** Evita que un solo bucket llene toda la grilla de similares. */
const MAX_POR_BUCKET = 4;

const COBERTURA_ATIENDE_AMPLIO = [
  "varias_comunas",
  "varias_regiones",
  "nacional",
] as const;

const LOG_PREFIX = "[getSimilaresFicha]";

/** Solo columnas de la vista pública (sin columnas sensibles). */
const EMP_ROW_SELECT =
  "id, slug, nombre_emprendimiento, foto_principal_url, descripcion_corta, categoria_id, comuna_id, subcategoria_slug_final, subcategorias_slugs";

function debugSimilaresLog(payload: Record<string, unknown>) {
  if (
    process.env.NODE_ENV === "development" ||
    process.env.LOG_SIMILARES_FICHA === "1"
  ) {
    const ev =
      payload.event != null && String(payload.event).length > 0
        ? String(payload.event)
        : "log";
    console.log(`${LOG_PREFIX} event="${ev}"`, payload);
  }
}

export type SimilarFichaBucket =
  | "misma_comuna"
  | "atiende_comuna"
  | "misma_region"
  | "nacional"
  | "misma_categoria";

export type SimilarFichaItem = {
  id: string;
  slug: string;
  nombre_emprendimiento: string;
  foto_principal_url: string | null;
  comuna_nombre: string | null;
  /** Categoría principal (siempre presente si hay `categoria_id`). */
  categoria_nombre: string | null;
  /** Primera subcategoría del emprendedor similar (lookup por slug); UI prefiere esto sobre categoría. */
  subcategoria_nombre: string | null;
  /** Texto corto público (vista: frase_negocio como descripcion_corta). */
  descripcion_corta: string | null;
  bucket: SimilarFichaBucket;
};

/** Orden fijo de buckets en UI; dentro de cada bucket: con foto primero, luego nombre. */
const BUCKET_DISPLAY_ORDER: SimilarFichaBucket[] = [
  "misma_comuna",
  "atiende_comuna",
  "misma_region",
  "nacional",
  "misma_categoria",
];

/** Oculta filas de prueba en UI (nombre o slug). */
const RUIDO_SIMILARES_RE = /\b(TEST|SCORE|PRUEBA)\b/i;

export function filtrarSimilaresSinRuido(items: SimilarFichaItem[]): SimilarFichaItem[] {
  return items.filter((x) => {
    const nombre = s(x.nombre_emprendimiento) || s(x.slug);
    const slug = s(x.slug);
    return !RUIDO_SIMILARES_RE.test(nombre) && !RUIDO_SIMILARES_RE.test(slug);
  });
}

export function sortSimilarFichaItemsForDisplay(items: SimilarFichaItem[]): SimilarFichaItem[] {
  const bucketIdx = (b: SimilarFichaBucket) => {
    const i = BUCKET_DISPLAY_ORDER.indexOf(b);
    return i === -1 ? 99 : i;
  };
  return [...items].sort((a, b) => {
    const d = bucketIdx(a.bucket) - bucketIdx(b.bucket);
    if (d !== 0) return d;
    const af = Boolean(s(a.foto_principal_url));
    const bf = Boolean(s(b.foto_principal_url));
    if (af && !bf) return -1;
    if (!af && bf) return 1;
    return s(a.nombre_emprendimiento).localeCompare(s(b.nombre_emprendimiento), "es");
  });
}

type EmpRow = {
  id: string;
  slug: string;
  nombre_emprendimiento: string | null;
  foto_principal_url: string | null;
  descripcion_corta?: string | null;
  categoria_id?: string | number | null;
  comuna_id?: string | number | null;
  subcategoria_slug_final?: unknown;
  subcategorias_slugs?: unknown;
};

function sortRowsForDisplay(rows: EmpRow[]): EmpRow[] {
  return [...rows].sort((a, b) => {
    const aFoto = Boolean(s(a.foto_principal_url));
    const bFoto = Boolean(s(b.foto_principal_url));
    if (aFoto && !bFoto) return -1;
    if (!aFoto && bFoto) return 1;
    const na = s(a.nombre_emprendimiento) || s(a.slug);
    const nb = s(b.nombre_emprendimiento) || s(b.slug);
    return na.localeCompare(nb, "es");
  });
}

export type GetSimilaresFichaArgsCurrent = {
  id?: string | number | null;
  slug?: string | null;
  comuna_id?: string | number | null;
  comuna_base_id?: string | number | null;
  region_id?: string | number | null;
  categoria_id?: string | number | null;
  /** Primera subcategoría (principal); si falta, los pasos A–D usan solo categoría. */
  subcategoria_principal_slug?: string | null;
};

type GetSimilaresFichaArgs = {
  current: GetSimilaresFichaArgsCurrent;
  limit?: number;
};

function toItem(
  row: EmpRow,
  bucket: SimilarFichaBucket,
  comunaNombreById: Map<string, string>,
  categoriaNombreById: Map<string, string>,
  subcategoriaNombreBySlug: Map<string, string>
): SimilarFichaItem {
  const comId = s(row.comuna_id);
  const catId = s(row.categoria_id);
  // Fuente de verdad: subcategoria_slug_final (no depender de arrays desordenados).
  const subSlug0 = s(row.subcategoria_slug_final) || s(arr(row.subcategorias_slugs)[0]);
  return {
    id: String(row.id),
    slug: s(row.slug),
    nombre_emprendimiento: s(row.nombre_emprendimiento) || s(row.slug),
    foto_principal_url: row.foto_principal_url ? s(row.foto_principal_url) : null,
    comuna_nombre: comId ? comunaNombreById.get(comId) ?? null : null,
    categoria_nombre: catId ? categoriaNombreById.get(catId) ?? null : null,
    subcategoria_nombre: subSlug0
      ? subcategoriaNombreBySlug.get(subSlug0) ?? null
      : null,
    descripcion_corta: row.descripcion_corta != null ? s(row.descripcion_corta) || null : null,
    bucket,
  };
}

export function buildSubtituloSimilarFicha(item: SimilarFichaItem): string {
  const rubro = s(item.subcategoria_nombre) || s(item.categoria_nombre) || "Servicios";
  const comuna = s(item.comuna_nombre);

  if (item.bucket === "misma_comuna") {
    return comuna ? `${rubro} en ${comuna}` : rubro;
  }
  if (item.bucket === "atiende_comuna") {
    return comuna ? `Atiende en ${comuna}` : "Atiende en tu comuna";
  }
  if (item.bucket === "misma_region") {
    return "Disponible en la región";
  }
  if (item.bucket === "misma_categoria") {
    return comuna ? `${rubro} · ${comuna}` : `${rubro} · misma categoría`;
  }
  return "Disponible en todo Chile";
}

async function ensureRowDisplayMaps(
  supabase: SupabaseClient,
  rows: EmpRow[],
  comunaNombreById: Map<string, string>,
  categoriaNombreById: Map<string, string>,
  subcategoriaNombreBySlug: Map<string, string>,
  logQueryError: (step: string, err: { message?: string } | null) => void
) {
  const needCom = [...new Set(rows.map((r) => s(r.comuna_id)).filter(Boolean))].filter(
    (id) => !comunaNombreById.has(id)
  );
  const needCat = [...new Set(rows.map((r) => s(r.categoria_id)).filter(Boolean))].filter(
    (id) => !categoriaNombreById.has(id)
  );
  const needSubSlugs = [
    ...new Set(
      rows
        .map((r) => s(r.subcategoria_slug_final) || s(arr(r.subcategorias_slugs)[0]))
        .filter(Boolean)
    ),
  ].filter((slug) => !subcategoriaNombreBySlug.has(slug));

  if (needCom.length) {
    const { data, error } = await supabase
      .from("comunas")
      .select("id, nombre")
      .in("id", needCom);
    logQueryError("lookup_comunas", error);
    for (const r of data ?? []) {
      const rec = r as { id?: unknown; nombre?: unknown };
      comunaNombreById.set(s(rec.id), s(rec.nombre));
    }
  }

  if (needCat.length) {
    const { data, error } = await supabase
      .from("categorias")
      .select("id, nombre")
      .in("id", needCat);
    logQueryError("lookup_categorias", error);
    for (const r of data ?? []) {
      const rec = r as { id?: unknown; nombre?: unknown };
      categoriaNombreById.set(s(rec.id), s(rec.nombre));
    }
  }

  if (needSubSlugs.length) {
    const { data, error } = await supabase
      .from("subcategorias")
      .select("slug, nombre")
      .in("slug", needSubSlugs);
    logQueryError("lookup_subcategorias", error);
    for (const r of data ?? []) {
      const rec = r as { slug?: unknown; nombre?: unknown };
      subcategoriaNombreBySlug.set(s(rec.slug), s(rec.nombre));
    }
  }
}

function uniqPush(
  out: SimilarFichaItem[],
  seenSlugs: Set<string>,
  bucketCounts: Record<SimilarFichaBucket, number>,
  rows: EmpRow[],
  bucket: SimilarFichaBucket,
  limit: number,
  maxPerBucket: number,
  excludeSlug: string,
  comunaNombreById: Map<string, string>,
  categoriaNombreById: Map<string, string>,
  subcategoriaNombreBySlug: Map<string, string>
): number {
  let added = 0;
  for (const r of sortRowsForDisplay(rows)) {
    if (out.length >= limit) break;
    if (bucketCounts[bucket] >= maxPerBucket) break;
    const slug = s(r.slug);
    if (!slug) continue;
    if (slug === excludeSlug) continue;
    if (seenSlugs.has(slug)) continue;
    seenSlugs.add(slug);
    bucketCounts[bucket] += 1;
    out.push(toItem(r, bucket, comunaNombreById, categoriaNombreById, subcategoriaNombreBySlug));
    added += 1;
  }
  return added;
}

/** region_id desde `comunas` por comuna base (fuente de verdad para bucket C). */
async function resolveRegionIdFromComuna(
  supabase: SupabaseClient,
  comunaId: string,
  logQueryError: (step: string, err: { message?: string } | null) => void
): Promise<number | null> {
  const { data, error } = await supabase
    .from("comunas")
    .select("region_id")
    .eq("id", comunaId)
    .maybeSingle();
  logQueryError("resolve_region_from_comuna", error);
  const rid = (data as { region_id?: unknown } | null)?.region_id;
  if (rid == null) return null;
  const n = Number(rid);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function comunaIdsEnRegion(
  supabase: SupabaseClient,
  regionId: number,
  logQueryError: (step: string, err: { message?: string } | null) => void
): Promise<string[]> {
  const { data, error } = await supabase
    .from("comunas")
    .select("id")
    .eq("region_id", regionId)
    .limit(2000);
  logQueryError("comunas_por_region", error);
  if (!Array.isArray(data)) return [];
  return data.map((r) => s((r as { id?: unknown }).id)).filter(Boolean);
}

export async function getSimilaresFicha({
  current,
  limit = 8,
}: GetSimilaresFichaArgs): Promise<SimilarFichaItem[]> {
  const supabase = createSupabaseServerPublicClient();

  const currentId = s(current.id);
  const currentSlug = s(current.slug);
  const comunaId = s(current.comuna_id) || s(current.comuna_base_id);
  const regionIdFromCurrent = s(current.region_id);
  const catId = s(current.categoria_id);
  const principalSubSlug = s(current.subcategoria_principal_slug);

  const comunaNombreById = new Map<string, string>();
  const categoriaNombreById = new Map<string, string>();
  const subcategoriaNombreBySlug = new Map<string, string>();

  if (!currentSlug) {
    debugSimilaresLog({ event: "abort_sin_slug" });
    return [];
  }

  const publishedExcluyeActual = (q: any) => {
    let qq = q.eq("estado_publicacion", "publicado").neq("slug", currentSlug);
    if (currentId) qq = qq.neq("id", currentId);
    return qq;
  };

  /** Misma categoría; si hay subcategoría principal, exige que el candidato la tenga en su array. */
  const conCategoriaYSubcategoriaOpcional = (q: any) => {
    let qq = q.eq("categoria_id", catId);
    if (principalSubSlug) {
      qq = qq.contains("subcategorias_slugs", [principalSubSlug]);
    }
    return qq;
  };

  const out: SimilarFichaItem[] = [];
  const seen = new Set<string>([currentSlug]);
  const bucketCounts: Record<SimilarFichaBucket, number> = {
    misma_comuna: 0,
    atiende_comuna: 0,
    misma_region: 0,
    nacional: 0,
    misma_categoria: 0,
  };

  const pushedPorPaso = {
    A_misma_comuna: 0,
    B_atiende_comuna: 0,
    C_misma_region: 0,
    D_nacional: 0,
    fallback_misma_categoria: 0,
  };

  const logQueryError = (step: string, err: { message?: string } | null) => {
    if (err?.message) debugSimilaresLog({ event: "query_error", step, message: err.message });
  };

  if (!catId) {
    debugSimilaresLog({
      event: "abort_sin_categoria_id",
      slug: currentSlug,
      note: "Sin categoria_id no hay buckets ni fallback por categoría.",
    });
    return [];
  }

  const runBucket = async (
    step: keyof typeof pushedPorPaso,
    rowsRaw: EmpRow[],
    bucket: SimilarFichaBucket,
    maxPerBucket: number
  ) => {
    await ensureRowDisplayMaps(
      supabase,
      rowsRaw,
      comunaNombreById,
      categoriaNombreById,
      subcategoriaNombreBySlug,
      logQueryError
    );
    pushedPorPaso[step] = uniqPush(
      out,
      seen,
      bucketCounts,
      rowsRaw,
      bucket,
      limit,
      maxPerBucket,
      currentSlug,
      comunaNombreById,
      categoriaNombreById,
      subcategoriaNombreBySlug
    );
  };

  // A) misma subcategoría (si aplica) + misma comuna — sin subslug: solo categoría + comuna
  if (comunaId) {
    const { data, error } = await publishedExcluyeActual(
      conCategoriaYSubcategoriaOpcional(
        supabase
          .from("vw_emprendedores_publico")
          .select(EMP_ROW_SELECT)
          .eq("comuna_id", comunaId)
          .limit(40)
      )
    );
    logQueryError("A_misma_comuna", error);
    await runBucket("A_misma_comuna", Array.isArray(data) ? (data as EmpRow[]) : [], "misma_comuna", MAX_POR_BUCKET);
  } else {
    pushedPorPaso.A_misma_comuna = 0;
    debugSimilaresLog({ event: "bucket_A_omitido", reason: "sin comuna_id" });
  }

  // B) misma subcategoría (si aplica) + cobertura amplia
  if (out.length < limit) {
    const { data, error } = await publishedExcluyeActual(
      conCategoriaYSubcategoriaOpcional(
        supabase
          .from("vw_emprendedores_publico")
          .select(EMP_ROW_SELECT)
          .in("cobertura_tipo", [...COBERTURA_ATIENDE_AMPLIO])
          .limit(60)
      )
    );
    logQueryError("B_atiende_comuna", error);
    await runBucket(
      "B_atiende_comuna",
      Array.isArray(data) ? (data as EmpRow[]) : [],
      "atiende_comuna",
      MAX_POR_BUCKET
    );
  }

  // C) misma subcategoría (si aplica) + misma región
  if (out.length < limit) {
    let regionNum: number | null = null;
    if (comunaId) {
      regionNum = await resolveRegionIdFromComuna(supabase, comunaId, logQueryError);
    }
    if (regionNum == null && regionIdFromCurrent) {
      const n = Number(regionIdFromCurrent);
      if (Number.isFinite(n) && n > 0) regionNum = n;
    }

    if (regionNum != null) {
      const idsRegion = await comunaIdsEnRegion(supabase, regionNum, logQueryError);
      if (idsRegion.length) {
        const { data, error } = await publishedExcluyeActual(
          conCategoriaYSubcategoriaOpcional(
            supabase
              .from("vw_emprendedores_publico")
              .select(EMP_ROW_SELECT)
              .in("comuna_id", idsRegion)
              .limit(80)
          )
        );
        logQueryError("C_misma_region", error);
        await runBucket(
          "C_misma_region",
          Array.isArray(data) ? (data as EmpRow[]) : [],
          "misma_region",
          MAX_POR_BUCKET
        );
      } else {
        pushedPorPaso.C_misma_region = 0;
        debugSimilaresLog({
          event: "bucket_C_sin_comunas",
          region_id: regionNum,
        });
      }
    } else {
      pushedPorPaso.C_misma_region = 0;
      debugSimilaresLog({ event: "bucket_C_omitido", reason: "sin region_id resuelto" });
    }
  }

  // D) misma subcategoría (si aplica) + cobertura nacional
  if (out.length < limit) {
    const { data, error } = await publishedExcluyeActual(
      conCategoriaYSubcategoriaOpcional(
        supabase
          .from("vw_emprendedores_publico")
          .select(EMP_ROW_SELECT)
          .eq("cobertura_tipo", "nacional")
          .limit(80)
      )
    );
    logQueryError("D_nacional", error);
    await runBucket("D_nacional", Array.isArray(data) ? (data as EmpRow[]) : [], "nacional", MAX_POR_BUCKET);
  }

  let usoFallback = false;
  // E) Fallback: misma categoría (sin filtro de subcategoría), igual que antes
  if (out.length < limit) {
    usoFallback = true;
    const { data, error } = await publishedExcluyeActual(
      supabase
        .from("vw_emprendedores_publico")
        .select(EMP_ROW_SELECT)
        .eq("categoria_id", catId)
        .limit(4)
    );
    logQueryError("fallback_misma_categoria", error);
    await runBucket(
      "fallback_misma_categoria",
      Array.isArray(data) ? (data as EmpRow[]) : [],
      "misma_categoria",
      4
    );
  }

  debugSimilaresLog({
    event: "resumen",
    slug: currentSlug,
    categoria_id: catId,
    subcategoria_principal_slug: principalSubSlug || null,
    comuna_id: comunaId || null,
    region_id: regionIdFromCurrent || null,
    limite: limit,
    total_resultados: out.length,
    por_bucket: { ...bucketCounts },
    agregados_por_paso: pushedPorPaso,
    fallback_ejecutado: usoFallback,
  });

  return sortSimilarFichaItemsForDisplay(out).slice(0, limit);
}
