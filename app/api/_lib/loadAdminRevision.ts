import type { SupabaseClient } from "@supabase/supabase-js";
import {
  POSTULACIONES_APROBAR_COLUMNS,
  postulacionesEmprendedoresSelectWithColumnRetry,
} from "@/lib/loadPostulacionesModeracion";
import {
  buildAdminRevisionDiff,
  type AdminRevisionFieldRow,
} from "@/lib/buildAdminRevisionFieldRows";
import { modalidadAtencionInputToDb, modalidadesAtencionInputsToDbUnique } from "@/lib/modalidadesAtencion";
import {
  localesFromPostulacionRowForGet,
  parseLocalesPatchInput,
} from "@/lib/emprendedorLocalesDb";

function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function revisionLocalDebugEnabled(): boolean {
  return s(process.env.REVISION_LOCAL_DEBUG) === "1";
}

function revisionLocalDebugMatchesEmprendedor(emprendedorId: string): boolean {
  const filter = s(process.env.REVISION_LOCAL_DEBUG_EMPRENDEDOR_ID);
  if (!filter) return true;
  return s(emprendedorId) === filter;
}

function logRevisionLocalDebug(emprendedorId: string, payload: Record<string, unknown>) {
  if (!revisionLocalDebugEnabled() || !revisionLocalDebugMatchesEmprendedor(emprendedorId)) return;
  // eslint-disable-next-line no-console
  console.log("[revision-local-debug][load]", { emprendedor_id: emprendedorId, ...payload });
}

export type AdminRevisionPageData = {
  postulacion: Record<string, unknown> | null;
  emprendedor: Record<string, unknown> | null;
  emprendedorSlug: string | null;
  fields: AdminRevisionFieldRow[];
  resumenCambios: string[];
  tieneCambiosCriticos: boolean;
  /** Valores iniciales del formulario Clasificación (admin): ficha actual si hay emprendedor, si no borrador. */
  initialCategoriaId: string;
  initialSubcategoriaIds: string[];
  /**
   * Texto de referencia: clasificación propuesta en el borrador; si el borrador no trae rubro,
   * la clasificación vigente en la ficha publicada (mismo criterio que el precarga).
   */
  referenciaCategoriaNombre: string | null;
  referenciaSubcategoriasTexto: string | null;
  error: string | null;
};

async function nombreCategoria(
  supabase: SupabaseClient,
  id: unknown
): Promise<string | null> {
  const cid = s(id);
  if (!cid) return null;
  const { data } = await supabase.from("categorias").select("nombre").eq("id", cid).maybeSingle();
  return data && typeof (data as { nombre?: unknown }).nombre === "string"
    ? s((data as { nombre: string }).nombre)
    : null;
}

async function nombreComuna(supabase: SupabaseClient, id: unknown): Promise<string | null> {
  const cid = s(id);
  if (!cid) return null;
  const { data } = await supabase.from("comunas").select("nombre").eq("id", cid).maybeSingle();
  return data && typeof (data as { nombre?: unknown }).nombre === "string"
    ? s((data as { nombre: string }).nombre)
    : null;
}

async function nombresSubcategoriasPorIds(
  supabase: SupabaseClient,
  ids: string[]
): Promise<string | null> {
  const uniq = [...new Set(ids.map((x) => s(x)).filter(Boolean))];
  if (!uniq.length) return null;
  const { data: subNomRows } = await supabase
    .from("subcategorias")
    .select("nombre")
    .in("id", uniq);
  const nombres = (subNomRows ?? [])
    .map((r) => s((r as { nombre?: unknown }).nombre))
    .filter(Boolean);
  return nombres.length ? nombres.join(", ") : null;
}

async function slugComunaPorId(
  supabase: SupabaseClient,
  comunaId: unknown
): Promise<string> {
  const cid = s(comunaId);
  if (!cid) return "";
  const { data } = await supabase
    .from("comunas")
    .select("slug")
    .eq("id", cid)
    .maybeSingle();
  return data && typeof (data as { slug?: unknown }).slug === "string"
    ? s((data as { slug: string }).slug)
    : "";
}

async function textoDetalleLocalesPostulacion(
  supabase: SupabaseClient,
  post: Record<string, unknown>,
  comunaBaseSlug: string
): Promise<string> {
  const parsed = parseLocalesPatchInput(post.locales);
  const rows =
    parsed && parsed.length > 0
      ? [...parsed]
      : localesFromPostulacionRowForGet(
          {
            direccion: post.direccion,
            direccion_referencia: post.direccion_referencia,
          },
          comunaBaseSlug
        );
  if (rows.length === 0) return "—";
  const slugs = [...new Set(rows.map((r) => r.comuna_slug).filter(Boolean))];
  const nombrePorSlug = new Map<string, string>();
  if (slugs.length > 0) {
    const { data: crows } = await supabase
      .from("comunas")
      .select("slug,nombre")
      .in("slug", slugs);
    for (const crow of crows ?? []) {
      const sl = s((crow as { slug?: unknown }).slug);
      const nm = s((crow as { nombre?: unknown }).nombre);
      if (sl) nombrePorSlug.set(sl, nm || sl);
    }
  }
  const lines: string[] = [];
  rows.forEach((r, i) => {
    const cn = nombrePorSlug.get(r.comuna_slug) || r.comuna_slug || "—";
    const refPart = r.referencia ? ` · ref.: ${r.referencia}` : "";
    lines.push(
      `Local ${i + 1}${r.es_principal ? " (principal)" : ""}: ${cn} · ${r.direccion}${refPart}`
    );
  });
  return lines.join("\n");
}

async function textoDetalleLocalesEmprendedor(
  supabase: SupabaseClient,
  emprendedorId: string
): Promise<string> {
  const eid = s(emprendedorId);
  if (!eid) return "—";
  const { data: locs, error } = await supabase
    .from("emprendedor_locales")
    .select("direccion, referencia, es_principal, comuna_id")
    .eq("emprendedor_id", eid)
    .order("es_principal", { ascending: false });
  if (error || !locs?.length) return "—";
  const ids = [
    ...new Set(
      (locs as { comuna_id?: unknown }[])
        .map((r) => s(r.comuna_id))
        .filter(Boolean)
    ),
  ];
  const nombrePorId = new Map<string, string>();
  if (ids.length) {
    const { data: coms } = await supabase
      .from("comunas")
      .select("id,nombre")
      .in("id", ids);
    for (const c of coms ?? []) {
      const id = s((c as { id?: unknown }).id);
      const nm = s((c as { nombre?: unknown }).nombre);
      if (id) nombrePorId.set(id, nm || id);
    }
  }
  const lines: string[] = [];
  (locs as Record<string, unknown>[]).forEach((row, i) => {
    const cid = s(row.comuna_id);
    const cn = cid ? nombrePorId.get(cid) || cid : "—";
    const dir = s(row.direccion);
    const ref = s(row.referencia);
    const pr = row.es_principal === true ? " (principal)" : "";
    lines.push(
      `Local ${i + 1}${pr}: ${cn} · ${dir || "—"}` + (ref ? ` · ref.: ${ref}` : "")
    );
  });
  return lines.join("\n");
}

export async function loadAdminRevisionData(
  supabase: SupabaseClient,
  postulacionId: string
): Promise<AdminRevisionPageData> {
  const id = s(postulacionId);
  if (!id) {
    return {
      postulacion: null,
      emprendedor: null,
      emprendedorSlug: null,
      fields: [],
      resumenCambios: [],
      tieneCambiosCriticos: false,
      initialCategoriaId: "",
      initialSubcategoriaIds: [],
      referenciaCategoriaNombre: null,
      referenciaSubcategoriasTexto: null,
      error: "Falta el id de la postulación.",
    };
  }

  const { data: post, error: postErr } = await postulacionesEmprendedoresSelectWithColumnRetry(
    supabase,
    [...POSTULACIONES_APROBAR_COLUMNS],
    async (selectStr) => {
      return await supabase
        .from("postulaciones_emprendedores")
        .select(selectStr)
        .eq("id", id)
        .maybeSingle();
    }
  );

  if (postErr) {
    return {
      postulacion: null,
      emprendedor: null,
      emprendedorSlug: null,
      fields: [],
      resumenCambios: [],
      tieneCambiosCriticos: false,
      initialCategoriaId: "",
      initialSubcategoriaIds: [],
      referenciaCategoriaNombre: null,
      referenciaSubcategoriasTexto: null,
      error: postErr.message || "No se pudo cargar la postulación.",
    };
  }

  if (!post) {
    return {
      postulacion: null,
      emprendedor: null,
      emprendedorSlug: null,
      fields: [],
      resumenCambios: [],
      tieneCambiosCriticos: false,
      initialCategoriaId: "",
      initialSubcategoriaIds: [],
      referenciaCategoriaNombre: null,
      referenciaSubcategoriasTexto: null,
      error: "Postulación no encontrada.",
    };
  }

  const pr = post as unknown as Record<string, unknown>;
  const empId = s(pr.emprendedor_id);

  let emp: Record<string, unknown> | null = null;
  let emprendedorSlug: string | null = null;
  let empModalidades: string[] = [];
  let empGaleriaUrls: string[] = [];

  if (empId) {
    const { data: empRow } = await supabase.from("emprendedores").select("*").eq("id", empId).maybeSingle();
    emp = (empRow as Record<string, unknown> | null) ?? null;
    if (emp) {
      emprendedorSlug = s(emp.slug) || null;
    }

    const { data: modRows } = await supabase
      .from("emprendedor_modalidades")
      .select("modalidad")
      .eq("emprendedor_id", empId)
      .order("modalidad", { ascending: true });
    empModalidades = (modRows ?? [])
      .map((r) => s((r as { modalidad?: unknown }).modalidad))
      .filter(Boolean);

    const { data: galRows } = await supabase
      .from("emprendedor_galeria")
      .select("imagen_url")
      .eq("emprendedor_id", empId)
      .order("id", { ascending: true });
    empGaleriaUrls = (galRows ?? [])
      .map((r) => s((r as { imagen_url?: unknown }).imagen_url))
      .filter(Boolean);
  }

  const postModalidadesRaw = Array.isArray(pr.modalidades_atencion)
    ? pr.modalidades_atencion.map((x) => s(x)).filter(Boolean)
    : [];
  const postModalidadesDb = modalidadesAtencionInputsToDbUnique(postModalidadesRaw);

  const empModsCanon = modalidadesAtencionInputsToDbUnique([...empModalidades]);
  let postForRevisionUi: Record<string, unknown> = pr;
  if (
    empId &&
    empModsCanon.length > 0 &&
    postModalidadesDb.includes("local_fisico") &&
    !empModsCanon.includes("local_fisico")
  ) {
    postForRevisionUi = { ...pr, modalidades_atencion: empModsCanon };
    logRevisionLocalDebug(empId, {
      step: "modalidades_borrador_alineadas_a_pivot_revision",
      modalidades_en_json_previas: postModalidadesDb,
      modalidades_desde_pivot: empModsCanon,
    });
  }
  const mapRawToDb = postModalidadesRaw.map((raw) => ({
    raw,
    db: modalidadAtencionInputToDb(raw),
  }));
  const postTieneLocalFisicoDb = postModalidadesDb.includes("local_fisico");
  const rawQueMapeaALocalFisico = mapRawToDb
    .filter((x) => x.db === "local_fisico")
    .map((x) => x.raw);
  if (empId) {
    logRevisionLocalDebug(empId, {
      step: "carga_revision_modalidades",
      modalidades_atencion_borrador: postModalidadesRaw,
      modalidades_db_normalizadas_borrador: postModalidadesDb,
      modalidades_emprendedor_actuales: empModalidades,
      tieneLocalFisico_normalizado: postTieneLocalFisicoDb,
      raw_que_mapea_a_local_fisico: rawQueMapeaALocalFisico,
      origen_inferido:
        postTieneLocalFisicoDb
          ? "borrador/postulacion (o mapeo de raw → local_fisico)"
          : empModalidades.includes("local_fisico")
            ? "ficha/emprendedor previo (pivot) pero NO debería afectar publicar desde revisión"
            : "ninguno",
    });
  }

  const postCategoriaNombre = await nombreCategoria(supabase, pr.categoria_id);
  const empCategoriaNombre = emp ? await nombreCategoria(supabase, emp.categoria_id) : null;
  const postComunaNombre = await nombreComuna(supabase, pr.comuna_base_id);
  const empComunaNombre = emp ? await nombreComuna(supabase, emp.comuna_id) : null;
  const postComunaBaseSlug = await slugComunaPorId(supabase, pr.comuna_base_id);
  const [postLocalesDetalle, empLocalesDetalle] = await Promise.all([
    textoDetalleLocalesPostulacion(supabase, pr, postComunaBaseSlug),
    empId ? textoDetalleLocalesEmprendedor(supabase, empId) : Promise.resolve("—" as const),
  ]);

  const postCatId = s(pr.categoria_id);
  const subIdsRaw = pr.subcategorias_ids;
  const postSubcategoriaIds = Array.isArray(subIdsRaw)
    ? subIdsRaw.map((x) => s(x)).filter(Boolean)
    : [];

  let empSubcategoriaIds: string[] = [];
  if (empId) {
    const { data: esRows } = await supabase
      .from("emprendedor_subcategorias")
      .select("subcategoria_id")
      .eq("emprendedor_id", empId)
      .order("subcategoria_id", { ascending: true });
    empSubcategoriaIds = (esRows ?? [])
      .map((r) => s((r as { subcategoria_id?: unknown }).subcategoria_id))
      .filter(Boolean);
  }

  let initialCategoriaId: string;
  let initialSubcategoriaIds: string[];
  if (empId && emp) {
    const empCatId = s(emp.categoria_id);
    initialCategoriaId = empCatId || postCatId;
    initialSubcategoriaIds =
      empSubcategoriaIds.length > 0 ? empSubcategoriaIds : [...postSubcategoriaIds];
  } else {
    initialCategoriaId = postCatId;
    initialSubcategoriaIds = [...postSubcategoriaIds];
  }

  const borradorTieneClasificacion = Boolean(postCatId) || postSubcategoriaIds.length > 0;

  let referenciaCategoriaNombre: string | null;
  let referenciaSubcategoriasTexto: string | null;

  if (borradorTieneClasificacion) {
    referenciaCategoriaNombre = postCategoriaNombre;
    referenciaSubcategoriasTexto = await nombresSubcategoriasPorIds(
      supabase,
      postSubcategoriaIds
    );
  } else if (empId && emp) {
    referenciaCategoriaNombre = empCategoriaNombre;
    referenciaSubcategoriasTexto = await nombresSubcategoriasPorIds(supabase, empSubcategoriaIds);
  } else {
    referenciaCategoriaNombre = null;
    referenciaSubcategoriasTexto = null;
  }

  const { fields, resumenCambios, tieneCambiosCriticos } = buildAdminRevisionDiff({
    post: postForRevisionUi,
    emp,
    empModalidades,
    empGaleriaUrls,
    postCategoriaNombre,
    empCategoriaNombre,
    postComunaNombre,
    empComunaNombre,
    postLocalesDetalle,
    empLocalesDetalle,
  });

  return {
    postulacion: postForRevisionUi,
    emprendedor: emp,
    emprendedorSlug,
    fields,
    resumenCambios,
    tieneCambiosCriticos,
    initialCategoriaId,
    initialSubcategoriaIds,
    referenciaCategoriaNombre,
    referenciaSubcategoriasTexto,
    error: null,
  };
}

/**
 * Para cada emprendedor en `en_revision`, la postulación de **edición de ficha publicada** más
 * reciente (borrador / pendiente de moderación / aprobada esperando “Revisión de cambios”).
 * Antes solo se buscaba `aprobada`, sin filtrar tipo: fallaba el enlace si la fila activa era
 * `pendiente_revision`, o se podía enlazar una aprobación vieja no asociada a esta revisión.
 */
export async function mapEmprendedorIdToRevisionPostulacionId(
  supabase: SupabaseClient,
  emprendedorIds: string[]
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const ids = [...new Set(emprendedorIds.map((x) => s(x)).filter(Boolean))];
  if (!ids.length) return out;

  const { data: rows, error } = await supabase
    .from("postulaciones_emprendedores")
    .select("id, emprendedor_id, updated_at")
    .eq("tipo_postulacion", "edicion_publicado")
    .in("estado", ["borrador", "pendiente_revision", "aprobada"])
    .in("emprendedor_id", ids);

  if (error || !rows?.length) return out;

  const best = new Map<string, { id: string; t: number }>();
  for (const r of rows as { id?: unknown; emprendedor_id?: unknown; updated_at?: unknown }[]) {
    const eid = s(r.emprendedor_id);
    const pid = s(r.id);
    if (!eid || !pid) continue;
    const t = r.updated_at ? new Date(String(r.updated_at)).getTime() : 0;
    const prev = best.get(eid);
    if (!prev || t >= prev.t) best.set(eid, { id: pid, t });
  }
  for (const [eid, v] of best) out.set(eid, v.id);

  return out;
}

