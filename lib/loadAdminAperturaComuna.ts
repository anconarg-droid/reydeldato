import type { SupabaseClient } from "@supabase/supabase-js";
import {
  RPC_LIST_EMPRENDEDORES_APERTURA_ADMIN,
  VW_ADMIN_APERTURA_RUBRO_POR_COMUNA,
  VW_APERTURA_COMUNA_V2,
} from "@/lib/aperturaComunaContrato";
import {
  motivosEmprendedorCuentaParaComuna,
  MOTIVO_CUENTA_LABEL,
  type EmpRowCuenta,
  type MotivoCuentaComuna,
} from "@/lib/clasificarEmprendedorCuentaComuna";
import {
  isPostgrestUnknownColumnError,
  unknownColumnNameFromDbErrorMessage,
  type PostgrestErrLike,
} from "@/lib/postgrestUnknownColumn";

function s(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function normUuid(v: unknown): string {
  return s(v).toLowerCase();
}

const EMP_ID_CHUNK = 120;
const MAX_SCHEMA_STRIP = 32;

/** Columnas en `emprendedores` para hidratar el detalle (sin `nombre` si la BD no lo tiene). */
const EMPRENDEDORES_DETAIL_COLS = [
  "id",
  "slug",
  "nombre_emprendimiento",
  "comuna_id",
  "cobertura_tipo",
  "nivel_cobertura",
  "comunas_cobertura",
  "comunas_cobertura_ids",
] as const;

/** Columnas en `vw_emprendedores_publico` para fallback de hidratación. */
const VW_PUBLICO_DETAIL_COLS = [
  "id",
  "slug",
  "nombre_emprendimiento",
  "comuna_id",
  "cobertura_tipo",
  "nivel_cobertura",
  "comunas_cobertura_slugs_arr",
] as const;

function stripCoberturaRelatedCols(cols: string[]): string[] {
  return cols.filter(
    (c) =>
      c !== "cobertura_tipo" &&
      c !== "nivel_cobertura" &&
      c !== "comunas_cobertura" &&
      c !== "comunas_cobertura_slugs_arr" &&
      c !== "cobertura"
  );
}

const LEGACY_COMUNA_BASE_COL_NAMES = ["comuna_base_id", "comunaBaseId"] as const;

/** Solo `comuna_id` entra al select; nombres legacy se descartan por si reaparecen en listas. */
function dropForbiddenComunaBaseCols(cols: string[]): string[] {
  const banned = new Set<string>([...LEGACY_COMUNA_BASE_COL_NAMES]);
  return cols.filter((c) => !banned.has(c));
}

function warnIfLegacyComunaBaseColsRequested(table: string, initialCols: readonly string[]) {
  if (process.env.NODE_ENV !== "development") return;
  const banned = new Set<string>([...LEGACY_COMUNA_BASE_COL_NAMES]);
  if (initialCols.some((c) => banned.has(c))) {
    console.warn("[admin/apertura-comuna] columna legacy de comuna base ignorada en select. Tabla:", table);
  }
}

function empRowCuentaForMotivos(row: Record<string, unknown>, idNorm: string): EmpRowCuenta {
  return {
    id: row.id ?? idNorm,
    comuna_id: row.comuna_id,
    cobertura_tipo: row.cobertura_tipo,
    nivel_cobertura: row.nivel_cobertura,
    comunas_cobertura: row.comunas_cobertura,
    comunas_cobertura_ids: row.comunas_cobertura_ids,
  };
}

/**
 * `.in("id", …)` por chunks; ante `column … does not exist` vuelve a intentar sin esa columna.
 */
async function selectRowsByIdsWithColumnRetry(
  supabase: SupabaseClient,
  table: string,
  idsNorm: string[],
  initialCols: readonly string[]
): Promise<{ byId: Map<string, Record<string, unknown>>; error: string | null }> {
  warnIfLegacyComunaBaseColsRequested(table, initialCols);
  let cols = dropForbiddenComunaBaseCols([...initialCols]);
  outer: for (let strip = 0; strip < MAX_SCHEMA_STRIP; strip++) {
    cols = dropForbiddenComunaBaseCols(cols);
    if (cols.length === 0) {
      return { byId: new Map(), error: `${table}: no quedan columnas válidas para el select` };
    }
    const byId = new Map<string, Record<string, unknown>>();
    for (let i = 0; i < idsNorm.length; i += EMP_ID_CHUNK) {
      const chunk = idsNorm.slice(i, i + EMP_ID_CHUNK);
      const { data, error } = await supabase.from(table).select(cols.join(", ")).in("id", chunk);
      if (error) {
        const err = error as PostgrestErrLike;
        const msg = String(err.message ?? "");
        const col = unknownColumnNameFromDbErrorMessage(msg);
        if (isPostgrestUnknownColumnError(err) && col && cols.includes(col)) {
          cols = dropForbiddenComunaBaseCols(cols.filter((c) => c !== col));
          continue outer;
        }
        // Algunos mensajes citan `.cobertura` aunque el select pida `cobertura_tipo` / `nivel_cobertura`.
        if (isPostgrestUnknownColumnError(err) && /\.cobertura\b/i.test(msg) && !cols.includes("cobertura")) {
          const next = stripCoberturaRelatedCols(cols);
          if (next.length < cols.length) {
            cols = dropForbiddenComunaBaseCols(next);
            continue outer;
          }
        }
        return { byId: new Map(), error: msg };
      }
      for (const er of data ?? []) {
        const r = er as unknown as Record<string, unknown>;
        const id = normUuid(r.id);
        if (id) byId.set(id, r);
      }
    }
    return { byId, error: null };
  }
  return { byId: new Map(), error: `${table}: demasiados reintentos ajustando columnas` };
}

function parseEmprendedorIdsFromRpcList(listRpc: unknown): string[] {
  if (!Array.isArray(listRpc)) return [];
  const out: string[] = [];
  for (const row of listRpc) {
    if (row == null) continue;
    if (typeof row === "string" || typeof row === "number") {
      const id = normUuid(row);
      if (id) out.push(id);
      continue;
    }
    if (typeof row === "object" && !Array.isArray(row)) {
      const r = row as Record<string, unknown>;
      const v = r.emprendedor_id ?? r.id;
      const id = normUuid(v);
      if (id) out.push(id);
    }
  }
  return [...new Set(out)];
}

async function fetchEmprendedoresRowsByIds(
  supabase: SupabaseClient,
  empIdsNorm: string[]
): Promise<{ byId: Map<string, Record<string, unknown>>; error: string | null }> {
  return selectRowsByIdsWithColumnRetry(supabase, "emprendedores", empIdsNorm, EMPRENDEDORES_DETAIL_COLS);
}

/** Rellena filas que no vinieron de `emprendedores` (p. ej. mismatch de ID) usando la vista pública. */
async function mergeVwEmprendedoresPublicoForIds(
  supabase: SupabaseClient,
  missingNormIds: string[],
  byId: Map<string, Record<string, unknown>>
): Promise<string | null> {
  if (missingNormIds.length === 0) return null;
  const { byId: fromVw, error } = await selectRowsByIdsWithColumnRetry(
    supabase,
    "vw_emprendedores_publico",
    missingNormIds,
    VW_PUBLICO_DETAIL_COLS
  );
  if (error && fromVw.size === 0) {
    return error;
  }
  for (const [id, row] of fromVw) {
    if (byId.has(id)) continue;
    const slugsArr = row.comunas_cobertura_slugs_arr;
    byId.set(id, {
      id: row.id,
      nombre_emprendimiento: row.nombre_emprendimiento,
      slug: row.slug,
      comuna_id: row.comuna_id,
      cobertura_tipo: row.cobertura_tipo,
      nivel_cobertura: row.nivel_cobertura,
      comunas_cobertura: Array.isArray(slugsArr) ? slugsArr : [],
    });
  }
  return null;
}

function coberturaDeclaradaLabel(row: Record<string, unknown> | undefined): string {
  if (!row) return "—";
  const ct = s(row.cobertura_tipo);
  const nv = s(row.nivel_cobertura);
  const c = s((row as { cobertura?: unknown }).cobertura);
  return ct || nv || c || "—";
}

function nombreDisplay(row: Record<string, unknown> | undefined, idNorm: string): string {
  if (!row) {
    return idNorm ? "Sin datos de ficha" : "Sin nombre";
  }
  const n = s(row.nombre_emprendimiento) || s(row.slug);
  return n || "Sin nombre";
}

export type RubroAperturaAdminRow = {
  subcategoria_slug: string;
  subcategoria_nombre: string;
  minimo_requerido: number;
  empresas_con_este_rubro: number;
  contado_para_meta: number;
  faltantes: number;
  /** `completo` si contado_para_meta >= minimo_requerido */
  estado: "completo" | "faltante";
  /** Emprendedores que cuentan territorialmente y tienen este subrubro en su ficha */
  emprendedores: EmprendedorAperturaAdminRow[];
};

export type EmprendedorAperturaAdminRow = {
  id: string;
  /** Nombre para mostrar (prioriza nombre_emprendimiento). */
  nombre: string;
  slug: string;
  /** Tipo/nivel de cobertura declarado en ficha (texto legible). */
  cobertura_tipo_declarada: string;
  motivos: MotivoCuentaComuna[];
  motivos_label: string;
};

export type AdminAperturaComunaDetalle = {
  comuna_slug: string;
  comuna_nombre: string;
  region_slug: string | null;
  porcentaje_apertura: number | null;
  total_requerido: number | null;
  total_cumplido: number | null;
  rubros: RubroAperturaAdminRow[];
  /** Todos los que cuentan por cobertura (mismo orden que RPC) */
  emprendedores: EmprendedorAperturaAdminRow[];
  /**
   * Cuentan para el total agregado pero ninguna de sus subcategorías coincide con un rubro
   * de `rubros_apertura` (ej. panadería cuando la meta solo pide gasfiter, mecánico, etc.).
   */
  emprendedores_sin_rubro_apertura: EmprendedorAperturaAdminRow[];
  error: string | null;
};

export type AdminAperturaComunaResumen = {
  comuna_slug: string;
  comuna_nombre: string;
  porcentaje_apertura: number | null;
  total_requerido: number | null;
  total_cumplido: number | null;
};

export async function loadAdminAperturaComunasResumen(
  supabase: SupabaseClient
): Promise<{ items: AdminAperturaComunaResumen[]; error: string | null }> {
  const { data, error } = await supabase
    .from(VW_APERTURA_COMUNA_V2)
    .select("comuna_slug, comuna_nombre, porcentaje_apertura, total_requerido, total_cumplido")
    .order("comuna_nombre", { ascending: true });

  if (error) {
    return { items: [], error: error.message };
  }

  const items: AdminAperturaComunaResumen[] = (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    const p = Number(row.porcentaje_apertura ?? NaN);
    const tr = Number(row.total_requerido ?? NaN);
    const tc = Number(row.total_cumplido ?? NaN);
    return {
      comuna_slug: s(row.comuna_slug).toLowerCase(),
      comuna_nombre: s(row.comuna_nombre),
      porcentaje_apertura: Number.isFinite(p) ? p : null,
      total_requerido: Number.isFinite(tr) && tr > 0 ? Math.floor(tr) : null,
      total_cumplido: Number.isFinite(tc) && tc >= 0 ? Math.floor(tc) : null,
    };
  });

  return { items, error: null };
}

export async function loadAdminAperturaComunaDetalle(
  supabase: SupabaseClient,
  comunaSlugRaw: string
): Promise<AdminAperturaComunaDetalle | null> {
  const slug = s(comunaSlugRaw).toLowerCase();
  if (!slug) {
    return {
      comuna_slug: "",
      comuna_nombre: "",
      region_slug: null,
      porcentaje_apertura: null,
      total_requerido: null,
      total_cumplido: null,
      rubros: [],
      emprendedores: [],
      emprendedores_sin_rubro_apertura: [],
      error: "Slug inválido.",
    };
  }

  const { data: comunaRow, error: comunaErr } = await supabase
    .from("comunas")
    .select("id, slug, nombre, region_id, regiones(slug)")
    .eq("slug", slug)
    .maybeSingle();

  if (comunaErr) {
    return {
      comuna_slug: slug,
      comuna_nombre: slug,
      region_slug: null,
      porcentaje_apertura: null,
      total_requerido: null,
      total_cumplido: null,
      rubros: [],
      emprendedores: [],
      emprendedores_sin_rubro_apertura: [],
      error: comunaErr.message,
    };
  }

  if (!comunaRow || (comunaRow as { id?: unknown }).id == null) {
    return null;
  }

  const comunaId = s((comunaRow as { id: unknown }).id);
  const comunaNombre = s((comunaRow as { nombre?: unknown }).nombre) || slug;
  const regionJoin = (comunaRow as { regiones?: { slug?: unknown } | null }).regiones;
  const regionSlug = regionJoin?.slug != null ? s(regionJoin.slug) : null;
  const regionIdRaw = (comunaRow as { region_id?: unknown }).region_id;
  const regionId = regionIdRaw != null ? s(regionIdRaw) : "";

  const { data: vwRow } = await supabase
    .from(VW_APERTURA_COMUNA_V2)
    .select("porcentaje_apertura, total_requerido, total_cumplido")
    .eq("comuna_slug", slug)
    .maybeSingle();

  const vw = vwRow as Record<string, unknown> | null;
  const pVw = vw ? Number(vw.porcentaje_apertura ?? NaN) : NaN;
  const trVw = vw ? Number(vw.total_requerido ?? NaN) : NaN;
  const tcVw = vw ? Number(vw.total_cumplido ?? NaN) : NaN;

  const { data: rubrosData, error: rubrosErr } = await supabase
    .from(VW_ADMIN_APERTURA_RUBRO_POR_COMUNA)
    .select(
      "subcategoria_slug, subcategoria_nombre, minimo_requerido, empresas_con_este_rubro, contado_para_meta, faltantes"
    )
    .eq("comuna_slug", slug);

  const rubrosBase: RubroAperturaAdminRow[] = rubrosErr
    ? []
    : (rubrosData ?? []).map((r) => {
        const row = r as Record<string, unknown>;
        const minimo = Math.max(0, Math.floor(Number(row.minimo_requerido ?? 0)));
        const contado = Math.max(0, Math.floor(Number(row.contado_para_meta ?? 0)));
        const falt = Math.max(0, Math.floor(Number(row.faltantes ?? 0)));
        const estado: "completo" | "faltante" =
          minimo <= 0 ? (falt <= 0 ? "completo" : "faltante") : contado >= minimo ? "completo" : "faltante";
        return {
          subcategoria_slug: s(row.subcategoria_slug),
          subcategoria_nombre: s(row.subcategoria_nombre),
          minimo_requerido: minimo,
          empresas_con_este_rubro: Math.max(0, Math.floor(Number(row.empresas_con_este_rubro ?? 0))),
          contado_para_meta: contado,
          faltantes: falt,
          estado,
          emprendedores: [] as EmprendedorAperturaAdminRow[],
        };
      });

  rubrosBase.sort((a, b) => {
    const labelA = (a.subcategoria_nombre || a.subcategoria_slug).toLowerCase();
    const labelB = (b.subcategoria_nombre || b.subcategoria_slug).toLowerCase();
    const cmp = labelA.localeCompare(labelB, "es", { sensitivity: "base" });
    if (cmp !== 0) return cmp;
    return a.subcategoria_slug.localeCompare(b.subcategoria_slug, "es", { sensitivity: "base" });
  });

  let emprendedores: EmprendedorAperturaAdminRow[] = [];
  let emprendedores_sin_rubro_apertura: EmprendedorAperturaAdminRow[] = [];
  let empError: string | null = rubrosErr ? rubrosErr.message : null;

  const { data: listRpc, error: listErr } = await supabase.rpc(
    RPC_LIST_EMPRENDEDORES_APERTURA_ADMIN,
    {
      p_comuna_id: (comunaRow as { id: unknown }).id,
      p_comuna_slug: slug,
      p_region_slug: regionSlug ?? "",
      p_limit: 500,
    }
  );

  if (listErr) {
    empError = empError ? `${empError}; ${listErr.message}` : listErr.message;
  } else {
    const empIds = parseEmprendedorIdsFromRpcList(listRpc);

    if (empIds.length > 0) {
      const { byId, error: empFetchErr } = await fetchEmprendedoresRowsByIds(supabase, empIds);
      if (empFetchErr) {
        empError = empError ? `${empError}; ${empFetchErr}` : empFetchErr;
      }

      const missing = empIds.filter((id) => !byId.has(id));
      if (missing.length > 0) {
        const vwErr = await mergeVwEmprendedoresPublicoForIds(supabase, missing, byId);
        if (vwErr) {
          empError = empError ? `${empError}; ${vwErr}` : vwErr;
        }
      }

      const { data: eccRows, error: eccErr } = await supabase
        .from("emprendedor_comunas_cobertura")
        .select("emprendedor_id")
        .in("emprendedor_id", empIds)
        .eq("comuna_id", (comunaRow as { id: unknown }).id);

      if (eccErr) {
        empError = empError ? `${empError}; ${eccErr.message}` : eccErr.message;
      }

      const eccSet = new Set(
        (eccRows ?? []).map((x) => normUuid((x as { emprendedor_id?: unknown }).emprendedor_id))
      );

      let errSet = new Set<string>();
      if (regionId) {
        const { data: errRows, error: ercErr } = await supabase
          .from("emprendedor_regiones_cobertura")
          .select("emprendedor_id")
          .in("emprendedor_id", empIds)
          .eq("region_id", regionIdRaw);

        if (ercErr) {
          empError = empError ? `${empError}; ${ercErr.message}` : ercErr.message;
        }

        errSet = new Set(
          (errRows ?? []).map((x) => normUuid((x as { emprendedor_id?: unknown }).emprendedor_id))
        );
      }

      emprendedores = empIds.map((id) => {
        const row = byId.get(id);
        const nombre = nombreDisplay(row, id);
        const slugEmp = row ? s(row.slug) : "";
        const cobertura_tipo_declarada = coberturaDeclaradaLabel(row);
        const motivos = row
          ? motivosEmprendedorCuentaParaComuna(empRowCuentaForMotivos(row, id), {
              comunaId: comunaId,
              comunaSlug: slug,
              emprendedorEnPivotComuna: eccSet.has(id),
              emprendedorEnPivotRegion: errSet.has(id),
            })
          : [];
        const motivos_label =
          motivos.length > 0
            ? motivos.map((m) => MOTIVO_CUENTA_LABEL[m]).join(" · ")
            : "—";
        return {
          id,
          nombre,
          slug: slugEmp,
          cobertura_tipo_declarada,
          motivos,
          motivos_label,
        };
      });

      const subSlugByEmp = new Map<string, Set<string>>();
      const { data: pivotRows, error: pivotErr } = await supabase
        .from("emprendedor_subcategorias")
        .select("emprendedor_id, subcategorias(slug)")
        .in("emprendedor_id", empIds);

      if (pivotErr) {
        empError = empError ? `${empError}; ${pivotErr.message}` : pivotErr.message;
      }

      if (!pivotErr && pivotRows?.length) {
        for (const pr of pivotRows) {
          const rec = pr as {
            emprendedor_id?: unknown;
            subcategorias?: { slug?: unknown } | null;
          };
          const eid = normUuid(rec.emprendedor_id);
          const subSlug = s(rec.subcategorias?.slug).toLowerCase();
          if (!eid || !subSlug) continue;
          const set = subSlugByEmp.get(eid) ?? new Set<string>();
          set.add(subSlug);
          subSlugByEmp.set(eid, set);
        }
      }

      if (subSlugByEmp.size === 0 && empIds.length > 0) {
        const { data: esFlat, error: flatErr } = await supabase
          .from("emprendedor_subcategorias")
          .select("emprendedor_id, subcategoria_id")
          .in("emprendedor_id", empIds);
        if (flatErr) {
          empError = empError ? `${empError}; ${flatErr.message}` : flatErr.message;
        } else {
          const subIds = [
            ...new Set(
              (esFlat ?? [])
                .map((x) => s((x as { subcategoria_id?: unknown }).subcategoria_id))
                .filter(Boolean)
            ),
          ];
          const idToSlug = new Map<string, string>();
          if (subIds.length > 0) {
            const { data: subRows } = await supabase
              .from("subcategorias")
              .select("id, slug")
              .in("id", subIds);
            for (const sr of subRows ?? []) {
              const rec = sr as { id?: unknown; slug?: unknown };
              const id = s(rec.id);
              const sl = s(rec.slug).toLowerCase();
              if (id && sl) idToSlug.set(id, sl);
            }
          }
          for (const row of esFlat ?? []) {
            const rec = row as { emprendedor_id?: unknown; subcategoria_id?: unknown };
            const eid = normUuid(rec.emprendedor_id);
            const sid = s(rec.subcategoria_id);
            const slugSub = idToSlug.get(sid);
            if (!eid || !slugSub) continue;
            const set = subSlugByEmp.get(eid) ?? new Set<string>();
            set.add(slugSub);
            subSlugByEmp.set(eid, set);
          }
        }
      }

      const empEnAlgunRubroApertura = new Set<string>();

      for (const rubro of rubrosBase) {
        const key = rubro.subcategoria_slug.toLowerCase();
        const list: EmprendedorAperturaAdminRow[] = [];
        for (const emp of emprendedores) {
          const subs = subSlugByEmp.get(emp.id);
          if (subs?.has(key)) {
            list.push(emp);
            empEnAlgunRubroApertura.add(emp.id);
          }
        }
        list.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
        rubro.emprendedores = list;
      }

      emprendedores_sin_rubro_apertura = emprendedores
        .filter((e) => !empEnAlgunRubroApertura.has(e.id))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    }
  }

  return {
    comuna_slug: slug,
    comuna_nombre: comunaNombre,
    region_slug: regionSlug,
    porcentaje_apertura: Number.isFinite(pVw) ? pVw : null,
    total_requerido: Number.isFinite(trVw) && trVw > 0 ? Math.floor(trVw) : null,
    total_cumplido: Number.isFinite(tcVw) && tcVw >= 0 ? Math.floor(tcVw) : null,
    rubros: rubrosBase,
    emprendedores,
    emprendedores_sin_rubro_apertura,
    error: empError,
  };
}
