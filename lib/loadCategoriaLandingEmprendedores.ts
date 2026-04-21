import { comunaLabelNombreYRegion } from "@/lib/comunaDisplayLabel";
import type { BuscarApiItem } from "@/lib/mapBuscarItemToEmprendedorCard";
import { createSupabaseServerPublicClient } from "@/lib/supabase/server";
import {
  categoriaApiItemToBuscarApiItem,
  emprendedorTableRowToBuscarApiItem,
  vwAlgoliaRowToBuscarApiItem,
} from "@/lib/categoriaListingMappers";

export const CATEGORIA_LANDING_PAGE_SIZE = 12;

function s(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

type ComunaRowEmbed = {
  nombre?: unknown;
  regiones?: { nombre?: string } | { nombre?: string }[] | null;
};

function regionNombreFromComunaRow(row: ComunaRowEmbed | null | undefined): string {
  if (!row?.regiones) return "";
  const r = row.regiones;
  if (Array.isArray(r)) return s((r[0] as { nombre?: string } | undefined)?.nombre);
  return s((r as { nombre?: string }).nombre);
}

function logSupabaseError(label: string, error: unknown) {
  const e = error as { message?: string; code?: string; details?: string; hint?: string };
  console.error(
    `[categoria landing] ${label}`,
    e?.message || String(error),
    e?.code ? `code=${e.code}` : "",
    e?.details ? `details=${e.details}` : "",
    e?.hint ? `hint=${e.hint}` : ""
  );
}

const RM_REGION_SLUG = "metropolitana";
export const RM_LABEL = "Región Metropolitana";

function isEmprendedoresListingViewUnavailable(error: unknown): boolean {
  const e = error as { code?: string; message?: string };
  const msg = (e?.message ?? "").toLowerCase();
  if (e?.code === "PGRST205") return true;
  if (msg.includes("vw_emprendedores_publico")) return true;
  if (msg.includes("vw_emprendedores_algolia_final")) return true;
  if (msg.includes("could not find") && msg.includes("schema cache")) return true;
  return false;
}

function isPgUndefinedColumn(error: unknown, columnSqlName: string): boolean {
  const e = error as { code?: string; message?: string };
  if (String(e?.code) !== "42703") return false;
  return (e?.message ?? "").toLowerCase().includes(columnSqlName.toLowerCase());
}

function isPostgrestMissingColumn(error: unknown, columnName: string): boolean {
  const e = error as { code?: string; message?: string };
  if (String(e?.code) !== "PGRST204") return false;
  return (e?.message ?? "").includes(columnName);
}

function errorMentionsColumn(error: unknown, needle: string): boolean {
  return (error as { message?: string })?.message?.toLowerCase().includes(needle.toLowerCase()) ?? false;
}

/** PostgREST: offset fuera de rango (p. ej. `page=2` con menos de `pageSize` resultados). */
function isPostgrestRangeNotSatisfiable(error: unknown): boolean {
  const e = error as { code?: string; message?: string };
  if (String(e?.code) === "PGRST103") return true;
  const msg = String(e?.message ?? "").toLowerCase();
  return (
    msg.includes("range not satisfiable") ||
    msg.includes("requested range") ||
    msg.includes("not satisfiable")
  );
}

function effectivePageForTotal(page: number, pageSize: number, total: number): number {
  if (total <= 0) return 1;
  const maxPage = Math.max(1, Math.ceil(total / pageSize));
  return Math.min(Math.max(1, page), maxPage);
}

function missingEmpSubcolumn(
  error: unknown,
  col: "subcategorias_slugs" | "subcategoria_slug_final"
): boolean {
  return (
    isPgUndefinedColumn(error, col) ||
    isPostgrestMissingColumn(error, col) ||
    errorMentionsColumn(error, `${col} does not exist`)
  );
}

type SupabaseSrv = ReturnType<typeof createSupabaseServerPublicClient>;
type ComunaGeoCol = "comuna_id" | "comuna_base_id";

/** Columnas de `vw_emprendedores_publico` usadas en cards de categoría (RM). */
const VW_CARD_SELECT =
  "id, slug, nombre, descripcion_corta, descripcion_larga, foto_principal_url, whatsapp_principal, sitio_web, cobertura_tipo, nivel_cobertura, comuna_base_id, comuna_base_slug, comuna_base_nombre, region_nombre, categoria_nombre, subcategoria_slug_final, subcategorias_slugs, subcategorias_nombres_arr, regiones_cobertura_slugs_arr, comunas_cobertura_slugs_arr, plan_activo, plan_expira_at, trial_expira_at, created_at, estado_publicacion, categoria_id";

export type CategoriaLandingLoadOptions = {
  comunaSlug?: string | null;
  subcategoriaSlug?: string | null;
  page?: number | string | null;
  categoriaNombreDisplay?: string;
  /** Slugs válidos (lista estática de la categoría); evita `or()` con valores arbitrarios. */
  allowedSubSlugs?: string[];
};

export type CategoriaLandingResult = {
  items: BuscarApiItem[];
  total: number;
  page: number;
  pageSize: number;
  zonaLabel: string;
  comunaSlugResolved: string;
  comunaNombreResolved: string;
  /**
   * Solo ruta `?comuna=`: mismos grupos que `/api/categoria` (sin mezclar en una lista paginada).
   * La página muestra dos bloques; `items` queda vacío en ese modo.
   */
  comunaGrupos?: {
    enTuComuna: BuscarApiItem[];
    atiendenTuComuna: BuscarApiItem[];
  };
};

export function textoRangoCategoriaLanding(
  page: number,
  pageSize: number,
  total: number,
  zonaLabel: string
): string {
  if (total <= 0) {
    return `No hay servicios listados en ${zonaLabel} para esta categoría.`;
  }
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  return `Mostrando ${start}–${end} de ${total} servicios en ${zonaLabel}`;
}

async function resolveRmComunaIds(supabase: SupabaseSrv): Promise<number[]> {
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
  if (!Number.isFinite(regionId) || regionId <= 0) return [];
  const { data: crs } = await supabase.from("comunas").select("id").eq("region_id", regionId);
  return (crs ?? [])
    .map((c) => Number((c as { id?: unknown }).id))
    .filter((id) => Number.isFinite(id) && id > 0);
}

async function loadRmFromTable(
  supabase: SupabaseSrv,
  categoriaId: string,
  subNorm: string,
  page: number,
  pageSize: number,
  ctx: { categoriaNombre?: string }
): Promise<CategoriaLandingResult | null> {
  const rmComunaIds = await resolveRmComunaIds(supabase);

  const baseCore =
    "id, slug, nombre_emprendimiento, frase_negocio, descripcion_libre, foto_principal_url, whatsapp_principal, cobertura_tipo, sitio_web, plan_activo, plan_expira_at, trial_expira_at, created_at, estado_publicacion";

  type SubMode = "array_or_principal" | "principal_eq" | "none";

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

  function subcolumnMismatch(error: unknown, mode: SubMode): boolean {
    if (mode === "array_or_principal") {
      return (
        missingEmpSubcolumn(error, "subcategorias_slugs") ||
        missingEmpSubcolumn(error, "subcategoria_slug_final")
      );
    }
    if (mode === "principal_eq") {
      return missingEmpSubcolumn(error, "subcategoria_slug_final");
    }
    return false;
  }

  const comunaCols: ComunaGeoCol[] = ["comuna_id", "comuna_base_id"];
  const subModes: SubMode[] = subNorm
    ? ["array_or_principal", "principal_eq"]
    : ["none"];

  let data: Record<string, unknown>[] | null = null;
  let count: number | null = null;
  let comunaGeoCol: ComunaGeoCol = "comuna_id";
  let lastError: unknown = null;
  let resolvedRmPage = page;

  outer: for (const cc of comunaCols) {
    comunaGeoCol = cc;
    for (const subMode of subModes) {
      const extra =
        subMode === "array_or_principal"
          ? ", subcategorias_slugs, subcategoria_slug_final"
          : subMode === "principal_eq"
            ? ", subcategoria_slug_final"
            : "";
      const selectList = `${baseCore}${extra}, ${cc}`;

      const buildDataQuery = () => {
        let q0 = supabase
          .from("vw_emprendedores_publico")
          .select(selectList, { count: "exact" })
          .eq("estado_publicacion", "publicado")
          .eq("categoria_id", categoriaId)
          .order("nombre_emprendimiento", { ascending: true });
        if (rmComunaIds.length > 0) {
          q0 = q0.in(cc, rmComunaIds);
        }
        if (subNorm && subMode === "array_or_principal") {
          q0 = q0.or(
            `subcategoria_slug_final.eq.${subNorm},subcategorias_slugs.cs.{${subNorm}}`
          );
        } else if (subNorm && subMode === "principal_eq") {
          q0 = q0.eq("subcategoria_slug_final", subNorm);
        }
        return q0;
      };

      const buildCountQuery = () => {
        let q0 = supabase
          .from("vw_emprendedores_publico")
          .select("id", { count: "exact", head: true })
          .eq("estado_publicacion", "publicado")
          .eq("categoria_id", categoriaId);
        if (rmComunaIds.length > 0) {
          q0 = q0.in(cc, rmComunaIds);
        }
        if (subNorm && subMode === "array_or_principal") {
          q0 = q0.or(
            `subcategoria_slug_final.eq.${subNorm},subcategorias_slugs.cs.{${subNorm}}`
          );
        } else if (subNorm && subMode === "principal_eq") {
          q0 = q0.eq("subcategoria_slug_final", subNorm);
        }
        return q0;
      };

      let effPage = page;
      let from = (effPage - 1) * pageSize;
      let to = from + pageSize - 1;

      let res = await buildDataQuery().range(from, to);

      if (res.error && isPostgrestRangeNotSatisfiable(res.error)) {
        const cRes = await buildCountQuery();
        if (!cRes.error && typeof cRes.count === "number") {
          effPage = effectivePageForTotal(page, pageSize, cRes.count);
          resolvedRmPage = effPage;
          from = (effPage - 1) * pageSize;
          to = from + pageSize - 1;
          res = await buildDataQuery().range(from, to);
        }
      }

      if (!res.error) {
        resolvedRmPage = effPage;
        data = (res.data ?? []) as unknown as Record<string, unknown>[];
        count = typeof res.count === "number" ? res.count : null;
        break outer;
      }
      lastError = res.error;
      if (comunaColumnMismatch(res.error, cc)) {
        break;
      }
      if (subcolumnMismatch(res.error, subMode)) {
        continue;
      }
      logSupabaseError("tablas RM (listado)", res.error);
      return null;
    }
  }

  if (!data) {
    if (subNorm && lastError) {
      logSupabaseError("tablas RM (listado) sin columnas de subcategoría", lastError);
    } else if (lastError) {
      logSupabaseError("tablas RM (listado)", lastError);
    }
    return null;
  }

  const rows = data;
  const ids = [
    ...new Set(
      rows
        .map((r) => {
          const raw = r[comunaGeoCol] ?? r.comuna_id ?? r.comuna_base_id;
          const n = typeof raw === "number" ? raw : Number(raw);
          return Number.isFinite(n) && n > 0 ? n : null;
        })
        .filter((x): x is number => x != null)
    ),
  ];
  const comunaById = new Map<number, { nombre: string; slug: string }>();
  if (ids.length) {
    const { data: cn } = await supabase.from("comunas").select("id, nombre, slug").in("id", ids);
    for (const c of cn ?? []) {
      const id = Number((c as { id?: unknown }).id);
      if (!Number.isFinite(id)) continue;
      comunaById.set(id, {
        nombre: s((c as { nombre?: unknown }).nombre),
        slug: s((c as { slug?: unknown }).slug),
      });
    }
  }

  const items = rows.map((r) =>
    emprendedorTableRowToBuscarApiItem(r, comunaById, comunaGeoCol, {
      categoriaNombreFallback: ctx.categoriaNombre,
    })
  );

  return {
    items,
    total: typeof count === "number" ? count : items.length,
    page: resolvedRmPage,
    pageSize,
    zonaLabel: RM_LABEL,
    comunaSlugResolved: "",
    comunaNombreResolved: "",
  };
}

async function loadRmFromView(
  supabase: SupabaseSrv,
  categoriaId: string,
  subNorm: string,
  page: number,
  pageSize: number,
  ctx: { categoriaNombre?: string }
): Promise<CategoriaLandingResult | null> {
  const buildDataQuery = () => {
    let q = supabase
      .from("vw_emprendedores_publico")
      .select(VW_CARD_SELECT, { count: "exact" })
      .eq("estado_publicacion", "publicado")
      .eq("categoria_id", categoriaId)
      .eq("region_slug", RM_REGION_SLUG)
      .order("nombre", { ascending: true });
    if (subNorm) {
      q = q.or(
        `subcategoria_slug_final.eq.${subNorm},subcategorias_slugs.cs.{${subNorm}}`
      );
    }
    return q;
  };

  const buildCountQuery = () => {
    let q = supabase
      .from("vw_emprendedores_publico")
      .select("id", { count: "exact", head: true })
      .eq("estado_publicacion", "publicado")
      .eq("categoria_id", categoriaId)
      .eq("region_slug", RM_REGION_SLUG);
    if (subNorm) {
      q = q.or(
        `subcategoria_slug_final.eq.${subNorm},subcategorias_slugs.cs.{${subNorm}}`
      );
    }
    return q;
  };

  let effPage = page;
  let from = (effPage - 1) * pageSize;
  let to = from + pageSize - 1;

  let { data, count, error } = await buildDataQuery().range(from, to);

  if (error && isPostgrestRangeNotSatisfiable(error)) {
    const cRes = await buildCountQuery();
    if (!cRes.error && typeof cRes.count === "number") {
      effPage = effectivePageForTotal(page, pageSize, cRes.count);
      from = (effPage - 1) * pageSize;
      to = from + pageSize - 1;
      const retry = await buildDataQuery().range(from, to);
      data = retry.data;
      count = retry.count;
      error = retry.error;
    }
  }

  if (error) {
    const missingCategoriaIdCol =
      isPgUndefinedColumn(error, "categoria_id") ||
      isPostgrestMissingColumn(error, "categoria_id");
    if (isEmprendedoresListingViewUnavailable(error) || missingCategoriaIdCol) {
      return loadRmFromTable(supabase, categoriaId, subNorm, page, pageSize, ctx);
    }
    logSupabaseError("vista RM", error);
    return loadRmFromTable(supabase, categoriaId, subNorm, page, pageSize, ctx);
  }

  const items = (data ?? []).map((r) =>
    vwAlgoliaRowToBuscarApiItem(r as Record<string, unknown>, {
      categoriaNombreFallback: ctx.categoriaNombre,
    })
  );

  return {
    items,
    total: typeof count === "number" ? count : items.length,
    page: effPage,
    pageSize,
    zonaLabel: RM_LABEL,
    comunaSlugResolved: "",
    comunaNombreResolved: "",
  };
}

/**
 * Listado paginado en `/categoria/[slug]`.
 * - `categoria_id` estricto vía taxonomía.
 * - Sin comuna: RM.
 * - Con comuna: Algolia + API existente (máx. ~100 ítems en índice por búsqueda vacía).
 */
export async function loadCategoriaLandingEmprendedores(
  categoriaSlug: string,
  opts: CategoriaLandingLoadOptions = {}
): Promise<CategoriaLandingResult> {
  const cat = s(categoriaSlug).toLowerCase();
  const pageSize = CATEGORIA_LANDING_PAGE_SIZE;
  const rawPage = Number(opts.page);
  const page =
    Number.isFinite(rawPage) && rawPage >= 1 ? Math.min(500, Math.floor(rawPage)) : 1;
  const subRaw = s(opts.subcategoriaSlug).toLowerCase();
  const allowedSubs = new Set((opts.allowedSubSlugs ?? []).map((x) => s(x).toLowerCase()).filter(Boolean));
  const subNorm = subRaw && allowedSubs.has(subRaw) ? subRaw : "";
  const comunaParam = s(opts.comunaSlug).toLowerCase();
  const catNombre = s(opts.categoriaNombreDisplay);

  const empty = (): CategoriaLandingResult => ({
    items: [],
    total: 0,
    page,
    pageSize,
    zonaLabel: RM_LABEL,
    comunaSlugResolved: "",
    comunaNombreResolved: "",
  });

  if (!cat) return empty();

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

  if (!categoriaId) {
    return empty();
  }

  if (!comunaParam) {
    const fromView = await loadRmFromView(supabase, categoriaId, subNorm, page, pageSize, {
      categoriaNombre: catNombre,
    });
    if (fromView) return fromView;
    const fromTable = await loadRmFromTable(supabase, categoriaId, subNorm, page, pageSize, {
      categoriaNombre: catNombre,
    });
    if (fromTable) return fromTable;
    return empty();
  }

  let comunaNombre = comunaParam;
  const { data: cRowEmb, error: cRowEmbErr } = await supabase
    .from("comunas")
    .select("nombre, regiones(nombre)")
    .eq("slug", comunaParam)
    .maybeSingle();
  if (!cRowEmbErr && cRowEmb) {
    const nombre = s((cRowEmb as ComunaRowEmbed).nombre);
    const reg = regionNombreFromComunaRow(cRowEmb as ComunaRowEmbed);
    if (nombre) comunaNombre = comunaLabelNombreYRegion(nombre, reg || undefined);
  } else {
    const { data: cRowPlain } = await supabase
      .from("comunas")
      .select("nombre")
      .eq("slug", comunaParam)
      .maybeSingle();
    if (cRowPlain && typeof (cRowPlain as { nombre?: unknown }).nombre === "string") {
      comunaNombre = s((cRowPlain as { nombre: string }).nombre);
    }
  }

  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
    const proto =
      h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
    const base = `${proto}://${host}`;
    const subQs = subNorm ? `&subcategoria=${encodeURIComponent(subNorm)}` : "";
    const res = await fetch(
      `${base}/api/categoria/${encodeURIComponent(cat)}?comuna=${encodeURIComponent(comunaParam)}${subQs}`,
      { cache: "no-store" }
    );
    const json = (await res.json()) as {
      ok?: boolean;
      total?: number;
      grupos?: {
        en_tu_comuna?: Record<string, unknown>[];
        atienden_tu_comuna?: Record<string, unknown>[];
        regional?: Record<string, unknown>[];
        nacional?: Record<string, unknown>[];
      };
    };

    const vacioComuna = (): CategoriaLandingResult => ({
      items: [],
      total: 0,
      page,
      pageSize,
      zonaLabel: comunaNombre,
      comunaSlugResolved: comunaParam,
      comunaNombreResolved: comunaNombre,
      comunaGrupos: { enTuComuna: [], atiendenTuComuna: [] },
    });

    if (!res.ok || !json?.ok) {
      return vacioComuna();
    }

    const g = json.grupos ?? {};
    const toCard = (x: Record<string, unknown>) =>
      categoriaApiItemToBuscarApiItem(x, comunaParam, comunaNombre);

    const enTuComuna = (g.en_tu_comuna ?? []).map((x) =>
      toCard(x as Record<string, unknown>)
    );
    const atiendenTuComuna = (g.atienden_tu_comuna ?? []).map((x) =>
      toCard(x as Record<string, unknown>)
    );

    /** Total canónico = filas que realmente renderiza la UI (solo esos dos grupos). */
    const totalDesdeGrupos = enTuComuna.length + atiendenTuComuna.length;

    return {
      items: [],
      total: totalDesdeGrupos,
      page: 1,
      pageSize,
      zonaLabel: comunaNombre,
      comunaSlugResolved: comunaParam,
      comunaNombreResolved: comunaNombre,
      comunaGrupos: {
        enTuComuna,
        atiendenTuComuna,
      },
    };
  } catch (e) {
    console.error("[categoria landing] fetch api", e);
    return {
      items: [],
      total: 0,
      page,
      pageSize,
      zonaLabel: comunaNombre,
      comunaSlugResolved: comunaParam,
      comunaNombreResolved: comunaNombre,
      comunaGrupos: { enTuComuna: [], atiendenTuComuna: [] },
    };
  }
}

/** @deprecated Usar `textoRangoCategoriaLanding` en la página de categoría. */
export function tituloServiciosDisponibles(total: number, zonaLabel: string): string {
  if (total <= 0) {
    return `Aún no hay servicios listados en ${zonaLabel} para esta categoría.`;
  }
  if (total > 12) {
    return `Más de 12 servicios disponibles en ${zonaLabel}`;
  }
  if (total === 1) {
    return `1 servicio disponible en ${zonaLabel}`;
  }
  return `${total} servicios disponibles en ${zonaLabel}`;
}
