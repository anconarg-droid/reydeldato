import type { EmprendedorSearchCardProps } from "@/components/search/EmprendedorSearchCard";
import {
  fichaPublicaEsMejoradaDesdeBusqueda,
  fotoListadoEmprendedorBusqueda,
} from "@/lib/estadoFicha";
import { buscarApiItemToEmprendedorCardProps, type BuscarApiItem } from "@/lib/mapBuscarItemToEmprendedorCard";
import { enrichmentFromMaps, fetchLocalesYModalidadesByEmprendedorIds } from "@/lib/search/cardListingEnrichment";
import { createSupabaseServerPublicClient } from "@/lib/supabase/server";
import { getRegionShort } from "@/utils/regionShort";

function s(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function parseStrArr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x ?? "").trim()).filter(Boolean);
}

function mergeComunaSlugSiFalta(slugs: string[], slug: string): string[] {
  const t = String(slug || "").trim();
  if (!t) return slugs;
  const lower = t.toLowerCase();
  if (slugs.some((x) => String(x || "").trim().toLowerCase() === lower)) return slugs;
  return [t, ...slugs];
}

/** Asegura "Atiende: …" con el nombre oficial de la comuna vista (no solo slug). */
function mergeAtiendeComunaActual(
  slugs: string[],
  slugActual: string,
  nombreOficialComuna: string
): string[] {
  const nom = nombreOficialComuna.trim();
  const sl = slugActual.trim().toLowerCase();
  if (!nom && !sl) return slugs;
  const nomLower = nom.toLowerCase();
  const ya = slugs.some((x) => {
    const u = String(x ?? "").trim();
    return (
      u.toLowerCase() === sl ||
      (nomLower.length > 0 && u.toLowerCase() === nomLower)
    );
  });
  if (ya) return slugs;
  if (nom) return [nom, ...slugs];
  return mergeComunaSlugSiFalta(slugs, slugActual);
}

function idsIguales(a: unknown, b: unknown): boolean {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

function rowToEmprendedorId(row: unknown): string {
  if (row == null) return "";
  if (typeof row === "string" || typeof row === "number") return String(row).trim();
  const r = row as Record<string, unknown>;
  const v = r.emprendedor_id ?? r.emprendedorId ?? r.id;
  return v != null ? String(v).trim() : "";
}

type Meta = {
  comunaNombre: string;
  comunaSlug: string;
  regionSlug: string;
};

type SortableActivacionAbrirComuna = {
  card: EmprendedorSearchCardProps;
  createdMs: number;
  /** `true` = base en la comuna vista; `false` = atiende desde otra base. */
  baseEnComunaVista: boolean;
};

function createdMsFromEmprendedorRow(row: Record<string, unknown>): number {
  const t = row.created_at;
  if (t == null || t === "") return 0;
  const ms = new Date(String(t)).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

/**
 * Orden estable para /abrir-comuna: sin rotación por ventanas de tiempo (≠ directorio /api/buscar).
 * Bloque 1: base en la comuna; bloque 2: atienden desde fuera.
 * Dentro de cada bloque: perfil completo → más reciente (`created_at`) → nombre A-Z.
 */
function ordenarListadoActivacionAbrirComuna(
  items: SortableActivacionAbrirComuna[]
): EmprendedorSearchCardProps[] {
  const cmp = (a: SortableActivacionAbrirComuna, b: SortableActivacionAbrirComuna) => {
    if (a.card.esFichaCompleta !== b.card.esFichaCompleta) {
      return a.card.esFichaCompleta ? -1 : 1;
    }
    if (a.createdMs !== b.createdMs) {
      return b.createdMs - a.createdMs;
    }
    return a.card.nombre.localeCompare(b.card.nombre, "es", { sensitivity: "base" });
  };
  const base = items.filter((x) => x.baseEnComunaVista);
  const fuera = items.filter((x) => !x.baseEnComunaVista);
  base.sort(cmp);
  fuera.sort(cmp);
  return [...base, ...fuera].map((x) => x.card);
}

/**
 * Listado para /abrir-comuna: IDs desde `list_emprendedores_abrir_comuna_activacion`,
 * filas con `select('*')` sin filtros extra (el RPC ya aplica `publicado` + territorial).
 */
export async function loadAbrirComunaEmprendedoresPublicados(
  comunaId: string | number,
  meta: Meta
): Promise<{ total: number; cardProps: EmprendedorSearchCardProps[] }> {
  const supabase = createSupabaseServerPublicClient();
  const comunaNombre = meta.comunaNombre.trim() || "esta comuna";
  const comunaSlug = meta.comunaSlug.trim().toLowerCase();
  const regionSlug = s(meta.regionSlug);

  /**
   * El RPC limita a 50; el cliente en /abrir-comuna muestra 6 en preview y el resto al expandir “Ver todos”.
   */
  const listLimit = 50;

  const rpcListArgs = {
    p_comuna_id: comunaId,
    p_comuna_slug: comunaSlug,
    p_region_slug: regionSlug,
    p_limit: listLimit,
  };

  let orderedIds: string[] = [];
  let total = 0;

  const { data: listData, error: listErr } = await supabase.rpc(
    "list_emprendedores_abrir_comuna_activacion",
    rpcListArgs
  );

  if (!listErr && Array.isArray(listData)) {
    orderedIds = listData.map((x) => rowToEmprendedorId(x)).filter(Boolean);
  }

  if (listErr) {
    console.warn("[abrir-comuna] list_emprendedores_abrir_comuna_activacion:", listErr.message);
    const { data: v2, error: v2Err } = await supabase.rpc("buscar_emprendedores_por_cobertura_v2", {
      p_comuna_id: comunaId,
      p_comuna_slug: comunaSlug,
      p_region_slug: regionSlug,
    });
    if (!v2Err && Array.isArray(v2)) {
      const filtered = (v2 as Record<string, unknown>[]).filter(
        (r) => Number(r.ranking_score ?? 0) > 0
      );
      orderedIds = filtered
        .slice(0, listLimit)
        .map((r) => (r.id != null ? String(r.id) : ""))
        .filter(Boolean);
    }
  }

  const { data: countData, error: countErr } = await supabase.rpc(
    "count_emprendedores_abrir_comuna_activacion",
    {
      p_comuna_id: comunaId,
      p_comuna_slug: comunaSlug,
      p_region_slug: regionSlug,
    }
  );

  if (!countErr && countData != null) {
    const n = Number(countData);
    total = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  } else if (orderedIds.length > 0) {
    total = orderedIds.length;
  }

  if (orderedIds.length === 0) {
    return { total, cardProps: [] };
  }

  const { data: rows, error } = await supabase
    .from("vw_emprendedores_publico")
    .select("*")
    .in("id", orderedIds);

  if (error || !Array.isArray(rows) || rows.length === 0) {
    console.warn("[abrir-comuna] fetch emprendedores por ids:", error?.message);
    return { total, cardProps: [] };
  }

  const byId = new Map<string, Record<string, unknown>>();
  for (const r of rows) {
    const id = (r as { id?: unknown }).id;
    if (id != null) byId.set(String(id), r as Record<string, unknown>);
  }

  /** Plan/trial + nombre de comuna base vía FK (respaldo si la vista no trae `comuna_base_nombre`). */
  const hydratedById = new Map<string, Record<string, unknown>>();
  const empSelectConBase = [
    "id",
    "plan_activo",
    "plan_expira_at",
    "trial_expira_at",
    "trial_expira",
    "base_comuna:comunas!comuna_base_id(nombre,slug)",
  ].join(", ");
  const empRes = await supabase.from("emprendedores").select(empSelectConBase).in("id", orderedIds);
  const empPlanRows =
    empRes.error != null
      ? (
          await supabase
            .from("emprendedores")
            .select("id, plan_activo, plan_expira_at, trial_expira_at, trial_expira")
            .in("id", orderedIds)
        ).data
      : empRes.data;
  if (empRes.error && process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.warn("[abrir-comuna] emprendedores embed comuna_base:", empRes.error.message);
  }
  for (const e of empPlanRows ?? []) {
    const eid = (e as { id?: unknown }).id;
    if (eid != null) hydratedById.set(String(eid), e as Record<string, unknown>);
  }

  const baseIds = [
    ...new Set(
      rows
        .map((r) => (r as { comuna_base_id?: unknown }).comuna_base_id)
        .filter((id) => id != null && String(id).trim() !== "")
        .map((id) => String(id))
    ),
  ];
  const baseMeta = new Map<string, { nombre: string; slug: string }>();
  if (baseIds.length > 0) {
    const { data: comunasRows } = await supabase
      .from("comunas")
      .select("id, nombre, slug")
      .in("id", baseIds);
    for (const c of comunasRows ?? []) {
      const rec = c as { id?: unknown; nombre?: unknown; slug?: unknown };
      const id = rec.id != null ? String(rec.id) : "";
      if (!id) continue;
      baseMeta.set(id, {
        nombre: s(rec.nombre) || id,
        slug: s(rec.slug) || id,
      });
    }
  }

  const primarySubByEmp = new Map<string, string>();
  if (orderedIds.length > 0) {
    const { data: pivotRows } = await supabase
      .from("emprendedor_subcategorias")
      .select("emprendedor_id, subcategoria_id")
      .in("emprendedor_id", orderedIds);

    if (Array.isArray(pivotRows)) {
      const byEmp = new Map<string, typeof pivotRows>();
      for (const pr of pivotRows) {
        const eid = s((pr as { emprendedor_id?: unknown }).emprendedor_id);
        if (!eid) continue;
        const list = byEmp.get(eid) ?? [];
        list.push(pr);
        byEmp.set(eid, list);
      }
      for (const [eid, list] of byEmp) {
        const sorted = [...list].sort((a, b) =>
          String((a as { subcategoria_id?: unknown }).subcategoria_id ?? "").localeCompare(
            String((b as { subcategoria_id?: unknown }).subcategoria_id ?? "")
          )
        );
        const sid = s((sorted[0] as { subcategoria_id?: unknown })?.subcategoria_id);
        if (sid) primarySubByEmp.set(eid, sid);
      }
    }
  }

  const subIds = [...new Set([...primarySubByEmp.values()])];
  const catIds = [
    ...new Set(
      rows
        .map((r) => (r as { categoria_id?: unknown }).categoria_id)
        .filter((id) => id != null && String(id).trim() !== "")
        .map((id) => String(id))
    ),
  ];

  const subMap = new Map<string, string>();
  if (subIds.length > 0) {
    const { data: subs } = await supabase.from("subcategorias").select("id, nombre").in("id", subIds);
    for (const row of subs ?? []) {
      const rec = row as { id?: unknown; nombre?: unknown };
      const id = rec.id != null ? String(rec.id) : "";
      const nombre = s(rec.nombre);
      if (id) subMap.set(id, nombre);
    }
  }

  const catMap = new Map<string, string>();
  if (catIds.length > 0) {
    const { data: cats } = await supabase.from("categorias").select("id, nombre").in("id", catIds);
    for (const row of cats ?? []) {
      const rec = row as { id?: unknown; nombre?: unknown };
      const id = rec.id != null ? String(rec.id) : "";
      const nombre = s(rec.nombre);
      if (id) catMap.set(id, nombre);
    }
  }

  const { localesMinisByEmp, modalidadesByEmp } =
    await fetchLocalesYModalidadesByEmprendedorIds(supabase, orderedIds);

  const sortableBuffer: SortableActivacionAbrirComuna[] = [];

  for (const id of orderedIds) {
    const row = byId.get(id);
    if (!row) continue;

    const slug = s(row.slug);
    if (!slug) continue;

    const nombreEmp = s(row.nombre_emprendimiento) || slug;
    const sid = primarySubByEmp.get(id) ?? "";
    const subNombre = sid ? subMap.get(sid) || "" : "";
    const cid = row.categoria_id != null ? String(row.categoria_id) : "";
    const catNombre = cid ? catMap.get(cid) || "" : "";

    const baseId = row.comuna_base_id != null ? String(row.comuna_base_id) : "";
    const baseInfo = baseId ? baseMeta.get(baseId) : undefined;

    /**
     * Nombre/slug de comuna base: priorizar columnas de `vw_emprendedores_publico`
     * (`comuna_base_nombre` / `comuna_base_slug` vienen del JOIN a `comunas` en la vista).
     * El lookup extra a `public.comunas` puede fallar con anon (RLS) y dejaba "Base en —".
     */
    const nombreDesdeVista = s(
      (row as { comuna_base_nombre?: unknown }).comuna_base_nombre
    );
    const slugDesdeVista = s(
      (row as { comuna_base_slug?: unknown }).comuna_base_slug
    );
    const regionNombreBase = s((row as { region_nombre?: unknown }).region_nombre);

    const hRow = hydratedById.get(id) as
      | { base_comuna?: { nombre?: unknown; slug?: unknown } | null }
      | undefined;
    const emb = hRow?.base_comuna;
    const nombreDesdeEmp = emb != null ? s(emb.nombre) : "";
    const slugDesdeEmp = emb != null ? s(emb.slug) : "";

    const comunaBaseNombre = (
      nombreDesdeVista ||
      nombreDesdeEmp ||
      baseInfo?.nombre?.trim() ||
      ""
    ).trim();
    const comunaBaseSlug = (
      slugDesdeVista ||
      slugDesdeEmp ||
      baseInfo?.slug?.trim() ||
      ""
    ).trim();
    const comunaBaseRegionAbrev = regionNombreBase
      ? getRegionShort(regionNombreBase) || undefined
      : undefined;

    /** Regla territorial: solo "de tu comuna" si la base coincide con la comuna vista (no usar `comuna_id` de la vista: viene mezclado). */
    const enBasePropio = idsIguales(row.comuna_base_id, comunaId);

    const estadoPub = s(row.estado_publicacion);

    const cardEnrich = enrichmentFromMaps(id, localesMinisByEmp, modalidadesByEmp);

    const rowRec = row as Record<string, unknown>;
    const hydrated = hydratedById.get(id) ?? null;
    const esFichaCompleta = fichaPublicaEsMejoradaDesdeBusqueda(rowRec, hydrated, 0);
    const fotoPrincipalUrl = fotoListadoEmprendedorBusqueda(rowRec, hydrated);

    let comunasCoberturaSlugs = parseStrArr(
      (row as { comunas_cobertura_slugs_arr?: unknown }).comunas_cobertura_slugs_arr
    );
    if (!enBasePropio) {
      comunasCoberturaSlugs = mergeAtiendeComunaActual(
        comunasCoberturaSlugs,
        comunaSlug,
        comunaNombre
      );
    }

    const item: BuscarApiItem = {
      slug,
      nombre: nombreEmp,
      frase: s(row.frase_negocio),
      descripcion: s(row.descripcion_libre),
      fotoPrincipalUrl,
      esFichaCompleta,
      estadoFicha: esFichaCompleta ? "ficha_completa" : "ficha_basica",
      whatsappPrincipal: s(row.whatsapp_principal),
      coberturaTipo: s(row.cobertura_tipo ?? row.nivel_cobertura),
      bloque: enBasePropio ? "de_tu_comuna" : "atienden_tu_comuna",
      comunaBaseNombre,
      comunaBaseSlug,
      ...(comunaBaseRegionAbrev
        ? { comunaBaseRegionAbrev }
        : {}),
      comunaSlug,
      comunaNombre,
      comunasCobertura: comunasCoberturaSlugs,
      subcategoriasNombres: subNombre ? [subNombre] : undefined,
      categoriaNombre: catNombre || undefined,
      createdAt: row.created_at ? String(row.created_at) : undefined,
      estadoPublicacion: estadoPub,
      regionesCobertura: parseStrArr(
        (row as { regiones_cobertura_nombres_arr?: unknown }).regiones_cobertura_nombres_arr
      ),
      ...(cardEnrich.resumenLocalesLinea
        ? { resumenLocalesLinea: cardEnrich.resumenLocalesLinea }
        : {}),
      ...(cardEnrich.modalidadesCardBadges.length > 0
        ? { modalidadesCardBadges: cardEnrich.modalidadesCardBadges }
        : {}),
    };

    sortableBuffer.push({
      card: buscarApiItemToEmprendedorCardProps(
        item,
        { comunaSlug, comunaNombre },
        "comuna"
      ),
      createdMs: createdMsFromEmprendedorRow(rowRec),
      baseEnComunaVista: enBasePropio,
    });
  }

  const cardProps = ordenarListadoActivacionAbrirComuna(sortableBuffer);

  return { total, cardProps };
}
