import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * FUENTES DE DATOS COBERTURA:
 *
 * A. HERO (total registrados, faltan, meta):
 *    - Primero: tabla comunas, columnas emprendimientos_registrados y meta_emprendimientos
 *      (actualizadas por trigger desde emprendedores con comuna_base_id = comuna, estado_publicacion = 'publicado').
 *    - Si emprendimientos_registrados no existe o es 0: vista vw_comunas_por_abrir,
 *      columnas total_emprendedores y meta_apertura (faltan = meta - total).
 *
 * B. BLOQUE RUBROS (subcategoria_nombre, registrados por rubro, objetivo, faltan):
 *    - Vista vw_apertura_rubros_comuna (filtro comuna_slug = canonicalSlug).
 *    - registrados vienen de vw_conteo_comuna_rubro.
 *    - vw_conteo_comuna_rubro cuenta desde emprendedores (comuna_base_id, subcategoria_principal_id,
 *      estado_publicacion = 'publicado') JOIN subcategorias ON s.id = e.subcategoria_principal_id.
 *    - No usa categorias ni keywords; solo subcategoria_principal_id para la grilla de rubros.
 */

/**
 * @deprecated (APERTURA legacy)
 * `lib/coverage-data.ts` mezcla fuentes v1 para “apertura” (incluye `vw_comunas_por_abrir`
 * y columnas legacy en `comunas` como `meta_emprendimientos` / `emprendimientos_registrados`).
 *
 * Fuente de verdad oficial de APERTURA (consolidación v2):
 * - vw_apertura_comuna_v2
 * - vw_faltantes_comuna_v2
 * - vw_conteo_comuna_rubro_contado_v2
 * - endpoint `GET /api/comunas/estado`
 *
 * Nota: este módulo puede seguir existiendo temporalmente para la página `/cobertura`,
 * pero NO debe ser usado para determinar estado/porcentaje de apertura “oficial”.
 */

/** Fila de vw_comunas_por_abrir (columnas reales en Supabase) */
type ComunaPorAbrirRow = {
  comuna_slug: string;
  comuna_nombre: string;
  region_nombre: string;
  total_emprendedores: number;
  meta_apertura: number;
  faltan_emprendedores_meta: number;
  porcentaje_apertura: number;
  estado_apertura: "activa" | "en_apertura" | "sin_cobertura";
};

/** Fila de vw_apertura_rubros_comuna */
type AperturaRubroRow = {
  comuna_slug: string;
  comuna_nombre: string;
  region_nombre: string;
  subcategoria_slug: string;
  subcategoria_nombre: string;
  prioridad: string;
  objetivo: number;
  registrados: number;
  faltan: number;
  porcentaje: number;
};

/** Fila de vw_resumen_pais_apertura */
type ResumenPaisRow = {
  pais_nombre: string;
  total_comunas: number;
  comunas_activas: number;
  comunas_en_apertura: number;
  comunas_sin_cobertura: number;
  porcentaje_cobertura_pais: number;
};

/** Fila de vw_resumen_regiones_apertura (columnas reales en Supabase) */
type ResumenRegionRow = {
  region_id: string;
  region_nombre: string;
  total_comunas: number;
  comunas_con_emprendimientos: number;
  comunas_en_apertura: number;
  comunas_sin_cobertura: number;
  porcentaje_cobertura_region: number;
};

export type SelectedCity = {
  name: string;
  slug: string;
  region: string;
  businessCount: number;
  businessGoal: number;
  missingCategories: string[];
  /** Si la comuna está activa por meta (tabla comunas.status = 'activa') */
  isActive?: boolean;
};

export type CategoryItem = {
  name: string;
  registered: number;
  goal: number;
};

/**
 * APERTURA vs OFERTA:
 * - Apertura: solo negocios con comuna_base = esta comuna (hero y rubros en /cobertura).
 * - Oferta: base + negocios que atienden la comuna (cobertura) + regional + nacional (búsqueda y bloque "Oferta disponible").
 */
/** Detalle de cobertura de una comuna: total APERTURA (solo base), meta, faltan, rubros y oferta disponible. */
export type CommuneCoverageDetail = {
  comunaSlug: string;
  comunaNombre: string;
  /** Total para apertura: solo emprendimientos con comuna_base = esta comuna */
  totalRegistrados: number;
  meta: number;
  faltan: number;
  rubros: Array<{ name: string; registrados: number; objetivo: number; faltan: number }>;
  /** Oferta disponible: base + atienden comuna + regional + nacional (para bloque secundario) */
  ofertaDisponible?: number;
};

export type RankedCity = {
  name: string;
  slug: string;
  percentage: number;
};

export type CitySectionItem = {
  name: string;
  slug: string;
  status: "opening" | "no-coverage" | "active";
  businessCount: number;
  businessGoal: number;
};

export type RegionExpansionItem = {
  name: string;
  slug: string;
  active: number;
  total: number;
};

export type RegionComunaItem = {
  slug: string;
  name: string;
};

export type CoverageData = {
  selectedCity: SelectedCity | null;
  categories: CategoryItem[];
  rankedCities: RankedCity[];
  activeCities: CitySectionItem[];
  openingCities: CitySectionItem[];
  noCoverageCities: CitySectionItem[];
  countryActive: number;
  countryTotal: number;
  regionName: string;
  currentRegionSlug: string;
  /** Comunas con emprendimientos (activas) en la región actual - desde vista */
  regionActive: number;
  regionTotal: number;
  regionEnApertura: number;
  /** Comunas sin cobertura en la región actual - desde vista */
  regionSinCobertura: number;
  /** Porcentaje cobertura regional - desde vw_resumen_regiones_apertura.porcentaje_cobertura_region */
  regionPorcentajeCobertura: number;
  expansionRegions: RegionExpansionItem[];
  regionComunas: RegionComunaItem[];
  /** Oferta disponible en la comuna seleccionada (base + atienden + regional + nacional). Solo si hay comuna seleccionada. */
  ofertaDisponible?: number;
};

function normSlug(s: string): string {
  return String(s ?? "").trim().toLowerCase().replace(/\s+/g, "-");
}

function getTotalContado(r: ComunaPorAbrirRow): number {
  return Number(r.total_emprendedores ?? 0) || 0;
}

/** Compara nombres de región (case-insensitive, ignora prefijo "Región ") */
function sameRegion(a: string, b: string): boolean {
  const na = String(a ?? "").trim().toLowerCase();
  const nb = String(b ?? "").trim().toLowerCase();
  if (na === nb) return true;
  const norm = (s: string) => s.replace(/^región\s+/i, "").replace(/^region\s+/i, "").trim();
  return norm(na) === norm(nb);
}

/** Deriva slug de región desde nombre (fallback cuando no hay region_slug). */
function regionNameToSlug(name: string): string {
  return String(name ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[áàä]/g, "a")
    .replace(/[éèë]/g, "e")
    .replace(/[íìï]/g, "i")
    .replace(/[óòö]/g, "o")
    .replace(/[úùü]/g, "u")
    .replace(/ñ/g, "n")
    .replace(/[^a-z0-9-]/g, "");
}

/**
 * Detalle de cobertura para una comuna.
 * APERTURA: totalRegistrados y rubros usan solo emprendimientos con comuna_base = esta comuna.
 * OFERTA: ofertaDisponible = base + atienden comuna + regional + nacional (RPC get_oferta_comuna_count).
 */
export async function getCommuneCoverageDetail(comunaSlug: string | null): Promise<CommuneCoverageDetail | null> {
  if (!comunaSlug?.trim()) return null;
  const supabase = createSupabaseServerClient();
  const slugNorm = normSlug(comunaSlug);
  const slugParam = comunaSlug.trim();

  // 1) Resolver comuna desde tabla para obtener slug canónico (insensible a mayúsculas/acentos)
  const slugsToTry = [slugParam, slugNorm].filter((s, i, a) => a.indexOf(s) === i);
  let comunaRow: { id: string; slug: string; nombre: string } | null = null;
  const { data: comunaRowsExact } = await supabase
    .from("comunas")
    .select("id, slug, nombre")
    .in("slug", slugsToTry)
    .limit(1);
  if (Array.isArray(comunaRowsExact) && comunaRowsExact.length > 0) {
    comunaRow = comunaRowsExact[0] as { id: string; slug: string; nombre: string };
  }
  if (!comunaRow) {
    const { data: allComunas } = await supabase.from("comunas").select("id, slug, nombre");
    const found = (allComunas ?? []).find((c: { slug?: string }) => normSlug(String(c.slug ?? "")) === slugNorm);
    comunaRow = found ? (found as { id: string; slug: string; nombre: string }) : null;
  }

  const canonicalSlug = comunaRow?.slug ?? slugNorm;
  const comunaNombre = comunaRow?.nombre ?? comunaSlug;

  // 2) Total real: desde tabla comunas si existe columna, si no desde vista (misma lógica que rubros)
  let totalRegistrados = 0;
  try {
    const { data: comunaCountRows } = await supabase
      .from("comunas")
      .select("emprendimientos_registrados, meta_emprendimientos")
      .eq("slug", canonicalSlug)
      .limit(1)
      .maybeSingle();
    const comunaCount = comunaCountRows as { emprendimientos_registrados?: number } | null;
    if (comunaCount && typeof (comunaCount as { emprendimientos_registrados?: number }).emprendimientos_registrados === "number") {
      totalRegistrados = (comunaCount as { emprendimientos_registrados: number }).emprendimientos_registrados;
    }
  } catch {
    // Columnas pueden no existir
  }
  let meta = 50;
  if (totalRegistrados === 0) {
    const { data: viewRow } = await supabase
      .from("vw_comunas_por_abrir")
      .select("total_emprendedores, meta_apertura")
      .eq("comuna_slug", canonicalSlug)
      .limit(1)
      .maybeSingle();
    totalRegistrados = Number((viewRow as { total_emprendedores?: number } | null)?.total_emprendedores ?? 0) || 0;
    meta = Number((viewRow as { meta_apertura?: number } | null)?.meta_apertura ?? 50) || 50;
  } else {
    try {
      const { data: metaRow } = await supabase
        .from("comunas")
        .select("meta_emprendimientos")
        .eq("slug", canonicalSlug)
        .limit(1)
        .maybeSingle();
      const metaVal = (metaRow as { meta_emprendimientos?: number } | null)?.meta_emprendimientos;
      if (typeof metaVal === "number" && metaVal > 0) meta = metaVal;
    } catch {
      // ignore
    }
  }

  // 3) Rubros con registrados reales: misma comuna por slug canónico (vw_apertura_rubros_comuna)
  const { data: rubrosRows } = await supabase
    .from("vw_apertura_rubros_comuna")
    .select("subcategoria_slug, subcategoria_nombre, objetivo, registrados, faltan")
    .eq("comuna_slug", canonicalSlug)
    .order("subcategoria_slug");

  let rubros = ((rubrosRows ?? []) as unknown as AperturaRubroRow[]).map((r) => ({
    name: r.subcategoria_nombre ?? r.subcategoria_slug ?? "",
    registrados: Number(r.registrados) ?? 0,
    objetivo: Number(r.objetivo) ?? 0,
    faltan: Number(r.faltan) ?? 0,
  }));

  let sumRubros = rubros.reduce((s, r) => s + r.registrados, 0);

  // ----- DIAGNÓSTICO: por qué hero y rubros pueden diferir -----
  // A. Hero: total = comunas.emprendimientos_registrados (si existe) o vw_comunas_por_abrir.total_emprendedores
  // B. Rubros: vw_apertura_rubros_comuna → registrados de vw_conteo_comuna_rubro (esta vista EXIGE emprendedor_subcategorias)
  if (comunaRow?.id) {
    const { data: emprendedoresEnComuna } = await supabase
      .from("emprendedores")
      .select("id")
      .eq("comuna_base_id", comunaRow.id)
      .eq("estado_publicacion", "publicado");
    const ids = (emprendedoresEnComuna ?? []) as Array<{ id: string }>;
    const totalRaw = ids.length;
    const idList = ids.map((r) => r.id);

    let conSubcat = 0;
    const subcategoriasVistas = new Map<string, string>();
    if (idList.length > 0) {
      const { data: relaciones } = await supabase
        .from("emprendedor_subcategorias")
        .select("emprendedor_id, subcategoria_id")
        .in("emprendedor_id", idList);
      const rels = (relaciones ?? []) as Array<{ emprendedor_id: string; subcategoria_id: string }>;
      const emprendedoresConSubcatSet = new Set(rels.map((r) => r.emprendedor_id));
      conSubcat = emprendedoresConSubcatSet.size;
      const subcatIds = [...new Set(rels.map((r) => r.subcategoria_id))];
      if (subcatIds.length > 0) {
        const { data: subcats } = await supabase
          .from("subcategorias")
          .select("id, slug, nombre")
          .in("id", subcatIds);
        for (const s of (subcats ?? []) as Array<{ id: string; slug: string; nombre: string }>) {
          subcategoriasVistas.set(s.slug, s.nombre);
        }
      }
    }
    const sinSubcat = totalRaw - conSubcat;

    console.log("[cobertura-diagnostico]", JSON.stringify({
      comuna: canonicalSlug,
      comuna_id: comunaRow.id,
      fuente_hero: totalRegistrados > 0 ? "comunas.emprendimientos_registrados" : "vw_comunas_por_abrir.total_emprendedores",
      total_hero: totalRegistrados,
      suma_registrados_rubros: sumRubros,
      diferencia: totalRegistrados - sumRubros,
      total_emprendimientos_comuna_raw: totalRaw,
      con_subcategoria_asignada: conSubcat,
      sin_subcategoria: sinSubcat,
      subcategorias_en_comuna: Array.from(subcategoriasVistas.entries()).map(([slug, nombre]) => ({ slug, nombre })),
    }));
  }

  // 4) Si el total real es mayor que la suma en rubros_apertura, incluir subcategorías con registrados desde vw_conteo_comuna_rubro
  const slugsEnRubrosApertura = new Set(
    ((rubrosRows ?? []) as AperturaRubroRow[]).map((r) => r.subcategoria_slug ?? "")
  );
  if (totalRegistrados > sumRubros) {
    const { data: conteoRows } = await supabase
      .from("vw_conteo_comuna_rubro")
      .select("subcategoria_slug, total_registrados")
      .eq("comuna_slug", canonicalSlug);
    const conteoList = (conteoRows ?? []) as Array<{ subcategoria_slug: string; total_registrados: number }>;
    const subcategoriasToAdd = conteoList.filter(
      (c) => !slugsEnRubrosApertura.has(c.subcategoria_slug ?? "") && (Number(c.total_registrados) ?? 0) > 0
    );
    for (const c of subcategoriasToAdd) {
      const reg = Number(c.total_registrados) ?? 0;
      const nameFromSlug =
        (c.subcategoria_slug ?? "").charAt(0).toUpperCase() +
        (c.subcategoria_slug ?? "").slice(1).replace(/-/g, " ");
      rubros = rubros.concat({
        name: nameFromSlug,
        registrados: reg,
        objetivo: 0,
        faltan: 0,
      });
      sumRubros += reg;
    }
  }

  // Oferta disponible (base + atienden comuna + regional + nacional) vía RPC
  let ofertaDisponible: number | undefined;
  if (comunaRow?.id) {
    try {
      const { data: ofertaNum, error: errOferta } = await supabase.rpc("get_oferta_comuna_count", {
        p_comuna_id: comunaRow.id,
      });
      if (!errOferta && typeof ofertaNum === "number") ofertaDisponible = ofertaNum;
    } catch {
      // RPC puede no existir aún
    }
  }

  // Logs de depuración: coherencia hero vs rubros
  console.log("[cobertura-detail]", JSON.stringify({
    comunaSlug: canonicalSlug,
    totalRegistrados,
    sumRegistradosRubros: sumRubros,
    ofertaDisponible,
    meta,
    rubrosCount: rubros.length,
  }));

  return {
    comunaSlug: canonicalSlug,
    comunaNombre,
    totalRegistrados,
    meta,
    faltan: Math.max(0, meta - totalRegistrados),
    rubros,
    ofertaDisponible,
  };
}

/**
 * Obtiene datos de cobertura desde las vistas de Supabase.
 * APERTURA (hero + rubros): solo emprendimientos con comuna_base = comuna seleccionada (vw_conteo_comuna_rubro, comunas.emprendimientos_registrados).
 * OFERTA (bloque secundario): base + atienden comuna + regional + nacional (RPC get_oferta_comuna_count).
 */
export async function getCoverageData(
  citySlug: string | null,
  regionSlug: string | null = null
): Promise<CoverageData> {
  const supabase = createSupabaseServerClient();
  const slugNorm = citySlug ? normSlug(citySlug) : null;
  const regionSlugNorm = regionSlug ? normSlug(regionSlug) : null;

  const [
    { data: comunasRows, error: errComunas },
    { data: paisRows, error: errPais },
    { data: regionesRows, error: errRegiones },
    { data: regionesTable },
  ] = await Promise.all([
    supabase
      .from("vw_comunas_por_abrir")
      .select("comuna_slug, comuna_nombre, region_nombre, total_emprendedores, meta_apertura, faltan_emprendedores_meta, porcentaje_apertura, estado_apertura")
      .order("porcentaje_apertura", { ascending: false }),
    supabase
      .from("vw_resumen_pais_apertura")
      .select("pais_nombre, total_comunas, comunas_activas, comunas_en_apertura, comunas_sin_cobertura, porcentaje_cobertura_pais")
      .maybeSingle(),
    supabase
      .from("vw_resumen_regiones_apertura")
      .select("region_id, region_nombre, total_comunas, comunas_con_emprendimientos, comunas_en_apertura, comunas_sin_cobertura, porcentaje_cobertura_region")
      .order("total_comunas", { ascending: false }),
    supabase
      .from("regiones")
      .select("id, slug")
      .then((r) => ({ data: r.data ?? [] })),
  ]);

  if (errComunas) {
    const msg = (errComunas as { message?: string })?.message ?? String(errComunas);
    const code = (errComunas as { code?: string })?.code;
    console.error("[coverage-data] vw_comunas_por_abrir error:", msg, code ? `(${code})` : "");
    return emptyCoverageData();
  }

  const rows = (comunasRows ?? []) as unknown as ComunaPorAbrirRow[];
  const pais = (errPais ? null : paisRows) as ResumenPaisRow | null;
  const regionesList = (errRegiones ? [] : (regionesRows ?? [])) as unknown as ResumenRegionRow[];
  const regionesById = new Map<string, { slug: string }>(
    (Array.isArray(regionesTable) ? regionesTable : []).map((x: { id: string; slug: string }) => [x.id, { slug: x.slug }])
  );

  const countryActive = pais ? Number(pais.comunas_activas) ?? 0 : rows.filter((r) => r.estado_apertura === "activa").length;
  const countryTotal = pais ? Number(pais.total_comunas) ?? 0 : rows.length;

  const expansionRegions: RegionExpansionItem[] = regionesList.length > 0
    ? regionesList.map((r) => ({
        name: r.region_nombre ?? "",
        slug: regionesById.get(r.region_id)?.slug ?? regionNameToSlug(r.region_nombre ?? ""),
        active: Number(r.comunas_con_emprendimientos) ?? 0,
        total: Number(r.total_comunas) ?? 0,
      }))
    : buildRegionStatsFromComunas(rows);

  // 1) Determinar región actual: por ?region= o por la comuna seleccionada (nunca mezclar con otras regiones)
  let currentRegionName = "";
  let currentRegionSlug = "";
  let currentRegionRow: ResumenRegionRow | null = null;
  if (regionSlugNorm && regionesList.length > 0) {
    const regionesArr = Array.isArray(regionesTable) ? regionesTable : [];
    const regionIdBySlug = (regionesArr as Array<{ id: string; slug: string }>).find(
      (x) => normSlug(x.slug) === regionSlugNorm
    )?.id;
    const match = regionIdBySlug
      ? regionesList.find((r) => r.region_id === regionIdBySlug)
      : regionesList.find((r) => regionNameToSlug(r.region_nombre ?? "") === regionSlugNorm) ?? null;
    if (match) {
      currentRegionRow = match;
      currentRegionName = match.region_nombre ?? "";
      currentRegionSlug = regionesById.get(match.region_id)?.slug ?? regionNameToSlug(currentRegionName);
    }
  }

  // 2) Filtrar comunas a la región actual (si hay región, solo esa región)
  const rowsInRegion =
    currentRegionName.length > 0
      ? rows.filter((r) => sameRegion(r.region_nombre ?? "", currentRegionName))
      : rows;

  // 3) Comuna seleccionada: solo si viene en URL; si hay región en URL, la comuna debe estar en esa región
  let selectedRow: ComunaPorAbrirRow | null = null;
  if (slugNorm) {
    selectedRow = rowsInRegion.find((r) => normSlug(r.comuna_slug) === slugNorm) ?? null;
    if (!selectedRow && !regionSlugNorm) {
      selectedRow = rows.find((r) => normSlug(r.comuna_slug) === slugNorm) ?? null;
    }
  }
  if (!selectedRow && !regionSlugNorm) {
    selectedRow =
      rows.find((r) => r.estado_apertura === "en_apertura") ??
      rows.find((r) => r.estado_apertura === "sin_cobertura") ??
      rows[0] ??
      null;
  }
  if (selectedRow && currentRegionName.length === 0) {
    currentRegionName = selectedRow.region_nombre ?? "";
    const matchRegion = regionesList.find((r) => sameRegion(r.region_nombre ?? "", currentRegionName)) ?? null;
    if (matchRegion) {
      currentRegionRow = matchRegion;
      currentRegionSlug = regionesById.get(matchRegion.region_id)?.slug ?? regionNameToSlug(currentRegionName);
    } else {
      currentRegionSlug = regionNameToSlug(currentRegionName);
    }
  }

  // 4) Lista final de comunas: SOLO la región actual (evitar rankings nacionales cuando hay región)
  const finalRowsInRegion =
    currentRegionName.length > 0
      ? rows.filter((r) => sameRegion(r.region_nombre ?? "", currentRegionName))
      : rows;

  // 5) Comunas activas desde tabla (status = 'activa' por meta 50 emprendimientos)
  let activeCities: CitySectionItem[] = finalRowsInRegion
    .filter((r) => r.estado_apertura === "activa")
    .sort((a, b) => (a.comuna_nombre ?? "").localeCompare(b.comuna_nombre ?? ""))
    .map((r) => ({
      name: r.comuna_nombre ?? r.comuna_slug ?? "",
      slug: r.comuna_slug ?? "",
      status: "active" as const,
      businessCount: getTotalContado(r),
      businessGoal: Number(r.meta_apertura) ?? 50,
    }));
  const comunaStatusBySlug = new Map<string, boolean>();
  try {
    const { data: comunasTable } = await supabase
      .from("comunas")
      .select("slug, status, nombre, emprendimientos_registrados, meta_emprendimientos, region_id");
    if (comunasTable && Array.isArray(comunasTable)) {
      const list = comunasTable as Array<{
        slug: string;
        nombre: string;
        status: string;
        emprendimientos_registrados: number;
        meta_emprendimientos: number;
        region_id: string;
      }>;
      list.forEach((c) => comunaStatusBySlug.set(normSlug(c.slug), c.status === "activa"));
      const activeList = list.filter((c) => c.status === "activa");
      const filtered = currentRegionRow
        ? activeList.filter((c) => c.region_id === currentRegionRow!.region_id)
        : activeList;
      activeCities = filtered
        .map((c) => ({
          name: c.nombre ?? c.slug ?? "",
          slug: c.slug ?? "",
          status: "active" as const,
          businessCount: Number(c.emprendimientos_registrados) ?? 0,
          businessGoal: Number(c.meta_emprendimientos) ?? 50,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    }
  } catch {
    // Columnas de activación pueden no existir aún; se usa lista desde vista
  }

  let categories: CategoryItem[] = [];
  let missingCategories: string[] = [];
  let detailTotal = 0;
  let detailMeta = 50;
  let ofertaDisponible: number | undefined;

  if (selectedRow) {
    const detail = await getCommuneCoverageDetail(selectedRow.comuna_slug ?? null);
    if (detail) {
      detailTotal = detail.totalRegistrados;
      detailMeta = detail.meta;
      ofertaDisponible = detail.ofertaDisponible;
      categories = detail.rubros.map((r) => ({
        name: r.name,
        registered: r.registrados,
        goal: r.objetivo,
      }));
      missingCategories = detail.rubros.filter((r) => r.faltan > 0).map((r) => r.name);
    } else {
      const { data: rubrosRows } = await supabase
        .from("vw_apertura_rubros_comuna")
        .select("subcategoria_slug, subcategoria_nombre, objetivo, registrados, faltan")
        .eq("comuna_slug", selectedRow.comuna_slug)
        .order("subcategoria_slug");
      const rubros = (rubrosRows ?? []) as unknown as AperturaRubroRow[];
      categories = rubros.map((r) => ({
        name: r.subcategoria_nombre ?? r.subcategoria_slug ?? "",
        registered: Number(r.registrados) ?? 0,
        goal: Number(r.objetivo) ?? 0,
      }));
      missingCategories = rubros
        .filter((r) => (Number(r.faltan) ?? 0) > 0)
        .map((r) => r.subcategoria_nombre ?? r.subcategoria_slug ?? "");
      detailTotal = getTotalContado(selectedRow);
      detailMeta = Number(selectedRow.meta_apertura) ?? 50;
    }
  }

  const selectedCity: SelectedCity | null = selectedRow
    ? {
        name: selectedRow.comuna_nombre ?? selectedRow.comuna_slug ?? "",
        slug: selectedRow.comuna_slug ?? "",
        region: selectedRow.region_nombre ?? "",
        businessCount: detailTotal,
        businessGoal: detailMeta,
        missingCategories,
        isActive: comunaStatusBySlug.get(normSlug(selectedRow.comuna_slug ?? "")) ?? (detailTotal >= detailMeta),
      }
    : null;

  // Solo usar región cuando está realmente detectada (comuna o ?region=), no fallback a otra región.
  // Valores regionales desde la vista vw_resumen_regiones_apertura cuando hay región seleccionada.
  const regionName = currentRegionName;
  const regionTotal = currentRegionRow
    ? Number(currentRegionRow.total_comunas) ?? 0
    : finalRowsInRegion.length;
  const regionActive = currentRegionRow
    ? Number(currentRegionRow.comunas_con_emprendimientos) ?? 0
    : finalRowsInRegion.filter((r) => r.estado_apertura === "activa").length;
  const regionEnApertura = currentRegionRow
    ? Number(currentRegionRow.comunas_en_apertura) ?? 0
    : finalRowsInRegion.filter((r) => r.estado_apertura === "en_apertura").length;
  const regionSinCobertura = currentRegionRow
    ? Number(currentRegionRow.comunas_sin_cobertura) ?? 0
    : Math.max(0, regionTotal - regionActive - regionEnApertura);
  const regionPorcentajeCobertura = currentRegionRow
    ? Number(currentRegionRow.porcentaje_cobertura_region) ?? 0
    : (regionTotal > 0 ? Math.round((regionActive / regionTotal) * 100) : 0);

  const regionComunas: RegionComunaItem[] = finalRowsInRegion
    .sort((a, b) => (a.comuna_nombre ?? "").localeCompare(b.comuna_nombre ?? ""))
    .map((r) => ({
      slug: r.comuna_slug ?? "",
      name: r.comuna_nombre ?? r.comuna_slug ?? "",
    }));

  // Rankings y listas solo con comunas de la región actual (intrarregional)
  const rankedCities: RankedCity[] = finalRowsInRegion
    .filter((r) => r.estado_apertura !== "activa")
    .sort((a, b) => (Number(b.porcentaje_apertura) || 0) - (Number(a.porcentaje_apertura) || 0))
    .map((r) => ({
      name: r.comuna_nombre ?? r.comuna_slug ?? "",
      slug: r.comuna_slug ?? "",
      percentage: Math.round(Number(r.porcentaje_apertura) || 0),
    }));

  const openingCities: CitySectionItem[] = finalRowsInRegion
    .filter((r) => r.estado_apertura === "en_apertura")
    .sort((a, b) => (Number(b.porcentaje_apertura) || 0) - (Number(a.porcentaje_apertura) || 0))
    .map((r) => ({
      name: r.comuna_nombre ?? r.comuna_slug ?? "",
      slug: r.comuna_slug ?? "",
      status: "opening" as const,
      businessCount: getTotalContado(r),
      businessGoal: Number(r.meta_apertura) ?? 50,
    }));

  const noCoverageCities: CitySectionItem[] = finalRowsInRegion
    .filter((r) => r.estado_apertura === "sin_cobertura")
    .map((r) => ({
      name: r.comuna_nombre ?? r.comuna_slug ?? "",
      slug: r.comuna_slug ?? "",
      status: "no-coverage" as const,
      businessCount: getTotalContado(r),
      businessGoal: Number(r.meta_apertura) ?? 50,
    }));

  // Logs temporales: coherencia hero vs rubros (total hero vs suma registrados en categorías)
  const sumCategories = categories.reduce((s, c) => s + c.registered, 0);
  console.log("[cobertura]", JSON.stringify({
    comunaSeleccionada: selectedCity
      ? {
          slug: selectedCity.slug,
          name: selectedCity.name,
          totalHero: selectedCity.businessCount,
          totalRubros: sumCategories,
          diferencia: selectedCity.businessCount - sumCategories,
          businessGoal: selectedCity.businessGoal,
        }
      : null,
    regionDetectada: currentRegionName || currentRegionSlug ? { name: currentRegionName, slug: currentRegionSlug } : null,
    comunasFiltradas: finalRowsInRegion.length,
    resumenRegional: {
      total: regionTotal,
      conEmprendimientos: regionActive,
      enApertura: regionEnApertura,
      sinCobertura: regionSinCobertura,
      porcentajeCoberturaRegion: regionPorcentajeCobertura,
    },
  }));

  return {
    selectedCity,
    categories,
    rankedCities,
    activeCities,
    openingCities,
    noCoverageCities,
    countryActive,
    countryTotal,
    regionName,
    currentRegionSlug,
    regionActive,
    regionTotal,
    regionEnApertura,
    regionSinCobertura,
    regionPorcentajeCobertura,
    expansionRegions,
    regionComunas,
    ofertaDisponible,
  };
}

function buildRegionStatsFromComunas(rows: ComunaPorAbrirRow[]): RegionExpansionItem[] {
  const map = new Map<string, { active: number; total: number }>();
  for (const r of rows) {
    const region = r.region_nombre ?? "Sin región";
    const cur = map.get(region) ?? { active: 0, total: 0 };
    cur.total += 1;
    if (r.estado_apertura === "activa") cur.active += 1;
    map.set(region, cur);
  }
  return Array.from(map.entries())
    .map(([name, v]) => ({
      name,
      slug: regionNameToSlug(name),
      active: v.active,
      total: v.total,
    }))
    .sort((a, b) => b.total - a.total);
}

function emptyCoverageData(): CoverageData {
  return {
    selectedCity: null,
    categories: [],
    rankedCities: [],
    activeCities: [],
    openingCities: [],
    noCoverageCities: [],
    countryActive: 0,
    countryTotal: 0,
    regionName: "",
    currentRegionSlug: "",
    regionActive: 0,
    regionTotal: 0,
    regionEnApertura: 0,
    regionSinCobertura: 0,
    regionPorcentajeCobertura: 0,
    expansionRegions: [],
    regionComunas: [],
    ofertaDisponible: undefined,
  };
}
