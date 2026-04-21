import {
  attachPosiblesDuplicadosModeracion,
  type PosibleDuplicadoEmprendedorModeracion,
} from "@/app/api/_lib/moderacionDuplicadosEmprendedor";
import type {
  ClasificacionPublicadaModeracion,
} from "@/lib/clasificacionPublicadaEmprendedor";
import { loadClasificacionPublicadaBatchModeracion } from "@/lib/clasificacionPublicadaEmprendedor";
import {
  isPostgrestUnknownColumnError,
  unknownColumnNameFromDbErrorMessage,
  type PostgrestErrLike,
} from "@/lib/postgrestUnknownColumn";
import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_POSTULACIONES_SELECT_STRIP = 32;

/**
 * Columnas deseadas en `postulaciones_emprendedores` (moderación y APIs).
 * Si alguna no existe en la BD, `loadPostulacionesPorEstado` reintenta sin esa columna.
 */
export const POSTULACIONES_MODERACION_COLUMNS = [
  "id",
  "tipo_postulacion",
  "emprendedor_id",
  "estado",
  "nombre_emprendimiento",
  "frase_negocio",
  "descripcion_libre",
  "nombre_responsable",
  "mostrar_responsable_publico",
  "email",
  "whatsapp_principal",
  "whatsapp_secundario",
  "instagram",
  "sitio_web",
  "direccion",
  "direccion_referencia",
  "cobertura_tipo",
  "comunas_cobertura",
  "regiones_cobertura",
  "categoria_id",
  "categoria_ia",
  "subcategoria_ia",
  "subcategorias_ids",
  "foto_principal_url",
  "galeria_urls",
  "modalidades_atencion",
  "locales",
  "keywords_usuario",
  "comuna_base_id",
  "created_at",
  "updated_at",
] as const;

export const POSTULACIONES_MODERACION_SELECT = POSTULACIONES_MODERACION_COLUMNS.join(", ");

/**
 * Reintenta el select quitando columnas que la BD no expone (mismo criterio que `postgrestUnknownColumn`).
 */
export async function postulacionesEmprendedoresSelectWithColumnRetry(
  supabase: SupabaseClient,
  columnList: readonly string[],
  run: (
    selectStr: string
  ) => Promise<{ data: unknown; error: PostgrestErrLike | null }>
): Promise<{ data: unknown; error: PostgrestErrLike | null }> {
  let cols = [...columnList];
  for (let n = 0; n < MAX_POSTULACIONES_SELECT_STRIP; n++) {
    const { data, error } = await run(cols.join(", "));
    if (!error) {
      return { data, error: null };
    }
    const err = error as PostgrestErrLike;
    const col = unknownColumnNameFromDbErrorMessage(String(err.message ?? ""));
    if (!isPostgrestUnknownColumnError(err) || !col || !cols.includes(col)) {
      return { data: null, error: err };
    }
    cols = cols.filter((c) => c !== col);
  }
  return {
    data: null,
    error: { message: "postulaciones_emprendedores: demasiados reintentos ajustando columnas del select" },
  };
}

/** GET /api/publicar/borrador/[id] (`POSTULACIONES_MODERACION_SELECT` ya incluye responsable). */
export const POSTULACIONES_BORRADOR_GET_SELECT = `${POSTULACIONES_MODERACION_SELECT}, paso_actual`;

/** Columnas extra para aprobación / detalle admin (pueden faltar en BDs sin migrar). */
export const POSTULACIONES_APROBAR_EXTRA_COLUMNS = [
  "categoria_final",
  "subcategoria_final",
  /** Tags sugeridos por IA en edición pendiente (merge con keywords finales al aprobar). */
  "etiquetas_ia",
] as const;

export const POSTULACIONES_APROBAR_COLUMNS = [
  ...POSTULACIONES_MODERACION_COLUMNS,
  ...POSTULACIONES_APROBAR_EXTRA_COLUMNS,
] as const;

/**
 * Post /api/admin/postulaciones/[id]/aprobar, GET admin postulación, loadAdminRevision.
 * Preferir `postulacionesEmprendedoresSelectWithColumnRetry` + `POSTULACIONES_APROBAR_COLUMNS` si la BD puede no tener todas las columnas.
 */
export const POSTULACIONES_APROBAR_SELECT = POSTULACIONES_APROBAR_COLUMNS.join(", ");

function s(v: unknown): string {
  return v === null || v === undefined ? "" : String(v).trim();
}

export type { PosibleDuplicadoEmprendedorModeracion };

export type PostulacionModeracionItem = {
  id: string;
  tipo_postulacion?: string | null;
  emprendedor_id?: string | null;
  estado?: string | null;
  nombre_emprendimiento?: string | null;
  /**
   * Resumen corto si existe columna en BD; en muchos proyectos solo hay `frase_negocio`
   * en `postulaciones_emprendedores` (el formulario mapea descripción corta → frase).
   */
  descripcion_corta?: string | null;
  frase_negocio?: string | null;
  descripcion_libre?: string | null;
  nombre_responsable?: string | null;
  mostrar_responsable_publico?: boolean | null;
  email?: string | null;
  whatsapp_principal?: string | null;
  whatsapp_secundario?: string | null;
  instagram?: string | null;
  sitio_web?: string | null;
  /** En `emprendedores` a veces existe `web`; en postulaciones suele bastar `sitio_web`. */
  web?: string | null;
  direccion?: string | null;
  direccion_referencia?: string | null;
  cobertura_tipo?: string | null;
  comunas_cobertura?: string[] | null;
  regiones_cobertura?: string[] | null;
  categoria_id?: string | null;
  /** Sugerencia IA o legacy (texto o uuid según fila). */
  categoria_ia?: string | null;
  subcategoria_ia?: string | null;
  subcategorias_ids?: string[] | null;
  foto_principal_url?: string | null;
  galeria_urls?: string[] | null;
  modalidades_atencion?: string[] | null;
  /**
   * JSON de locales físicos (misma forma que `parseLocalesPatchInput` / borrador).
   */
  locales?: unknown;
  /** `postulaciones_emprendedores.keywords_usuario` (text[]). */
  keywords_usuario?: string[] | null;
  comuna_base_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  comuna?: { id: string; nombre: string; slug: string } | null;
  categoria?: { id: string; nombre: string; slug: string } | null;
  subcategorias_nombres: string[];
  /** Emprendedores publicados con mismo WhatsApp (normalizado) y misma comuna base. */
  posibles_duplicados?: PosibleDuplicadoEmprendedorModeracion[];
  /**
   * Solo `tipo_postulacion === edicion_publicado`: rubro/subrubros vigentes en `emprendedores`
   * antes de aplicar esta postulación (referencia para moderación).
   */
  clasificacion_publicada?: ClasificacionPublicadaModeracion | null;
};

/**
 * Lista postulaciones por `estado` con comuna, categoría y subcategorías resueltas.
 */
export async function loadPostulacionesPorEstado(
  supabase: SupabaseClient,
  estado: string
): Promise<{ items: PostulacionModeracionItem[]; error: Error | null }> {
  const estadosTodos = [
    "borrador",
    "pendiente_revision",
    "aprobada",
    "rechazada",
  ] as const;

  const { data: rows, error } = await postulacionesEmprendedoresSelectWithColumnRetry(
    supabase,
    [...POSTULACIONES_MODERACION_COLUMNS],
    async (selectStr) => {
      let q = supabase.from("postulaciones_emprendedores").select(selectStr);
      if (estado === "todos") {
        q = q.in("estado", [...estadosTodos]);
      } else {
        q = q.eq("estado", estado);
      }
      return await q
        .order("updated_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
    }
  );

  if (error) {
    return { items: [], error: new Error(String(error.message ?? "Error al cargar postulaciones")) };
  }

  const list = (rows ?? []) as unknown as Record<string, unknown>[];
  const comunaIds = [
    ...new Set(
      list
        .map((r) => (r as { comuna_base_id?: unknown }).comuna_base_id)
        .filter((x): x is string => s(x) !== "")
        .map((x) => s(x))
    ),
  ];

  const categoriaIds = [
    ...new Set(
      list
        .map((r) => (r as { categoria_id?: unknown }).categoria_id)
        .filter((x): x is string => s(x) !== "")
        .map((x) => s(x))
    ),
  ];

  const comunaMap = new Map<string, { id: string; nombre: string; slug: string }>();
  if (comunaIds.length) {
    const { data: comunasRows } = await supabase
      .from("comunas")
      .select("id, nombre, slug")
      .in("id", comunaIds);
    for (const c of comunasRows ?? []) {
      const id = s((c as { id?: unknown }).id);
      if (!id) continue;
      comunaMap.set(id, {
        id,
        nombre: s((c as { nombre?: unknown }).nombre),
        slug: s((c as { slug?: unknown }).slug),
      });
    }
  }

  const categoriaMap = new Map<string, { id: string; nombre: string; slug: string }>();
  if (categoriaIds.length) {
    const { data: catRows } = await supabase
      .from("categorias")
      .select("id, nombre, slug")
      .in("id", categoriaIds);
    for (const c of catRows ?? []) {
      const id = s((c as { id?: unknown }).id);
      if (!id) continue;
      categoriaMap.set(id, {
        id,
        nombre: s((c as { nombre?: unknown }).nombre),
        slug: s((c as { slug?: unknown }).slug),
      });
    }
  }

  const allSubIds = new Set<string>();
  for (const row of list) {
    const ids = (row as { subcategorias_ids?: unknown }).subcategorias_ids;
    if (Array.isArray(ids)) {
      for (const x of ids) {
        const u = s(x);
        if (u) allSubIds.add(u);
      }
    }
  }

  const subMap = new Map<string, string>();
  if (allSubIds.size) {
    const { data: subRows } = await supabase
      .from("subcategorias")
      .select("id, nombre, slug")
      .in("id", [...allSubIds]);
    for (const r of subRows ?? []) {
      const id = s((r as { id?: unknown }).id);
      if (!id) continue;
      const label =
        s((r as { nombre?: unknown }).nombre) || s((r as { slug?: unknown }).slug);
      subMap.set(id, label || id);
    }
  }

  const edicionEmprendedorIds = [
    ...new Set(
      list
        .filter(
          (r) =>
            s((r as { tipo_postulacion?: unknown }).tipo_postulacion) ===
            "edicion_publicado"
        )
        .map((r) => s((r as { emprendedor_id?: unknown }).emprendedor_id))
        .filter(Boolean)
    ),
  ];

  const clasificacionPubMap =
    edicionEmprendedorIds.length > 0
      ? await loadClasificacionPublicadaBatchModeracion(supabase, edicionEmprendedorIds)
      : new Map<string, ClasificacionPublicadaModeracion>();

  const items: PostulacionModeracionItem[] = list.map((row) => {
    const r = row as Record<string, unknown>;
    const comunaBaseId = s(r.comuna_base_id);
    const catId = s(r.categoria_id);
    const categoriaIa =
      r.categoria_ia != null && s(r.categoria_ia) !== "" ? s(r.categoria_ia) : null;
    const subcategoriaIa =
      r.subcategoria_ia != null && s(r.subcategoria_ia) !== ""
        ? s(r.subcategoria_ia)
        : null;
    const subIdsRaw = r.subcategorias_ids;
    const subIds = Array.isArray(subIdsRaw)
      ? subIdsRaw.map((x) => s(x)).filter(Boolean)
      : [];

    const strArr = (v: unknown): string[] | null => {
      if (!Array.isArray(v)) return null;
      const out = (v as unknown[]).map((x) => s(x)).filter(Boolean);
      return out.length ? out : null;
    };

    const tipoP = r.tipo_postulacion != null ? s(r.tipo_postulacion) : "";
    const empId = r.emprendedor_id != null ? s(r.emprendedor_id) : "";
    const clasificacion_publicada: ClasificacionPublicadaModeracion | null =
      tipoP === "edicion_publicado" && empId
        ? clasificacionPubMap.get(empId) ?? null
        : null;

    return {
      id: s(r.id),
      tipo_postulacion: r.tipo_postulacion != null ? s(r.tipo_postulacion) : null,
      emprendedor_id: r.emprendedor_id != null ? s(r.emprendedor_id) : null,
      estado: r.estado != null ? s(r.estado) : null,
      nombre_emprendimiento:
        r.nombre_emprendimiento != null ? s(r.nombre_emprendimiento) : null,
      descripcion_corta: null,
      frase_negocio: r.frase_negocio != null ? s(r.frase_negocio) : null,
      descripcion_libre: r.descripcion_libre != null ? s(r.descripcion_libre) : null,
      nombre_responsable:
        r.nombre_responsable != null ? s(r.nombre_responsable) : null,
      mostrar_responsable_publico:
        typeof r.mostrar_responsable_publico === "boolean"
          ? r.mostrar_responsable_publico
          : null,
      email: r.email != null ? s(r.email) : null,
      whatsapp_principal:
        r.whatsapp_principal != null ? s(r.whatsapp_principal) : null,
      whatsapp_secundario:
        r.whatsapp_secundario != null ? s(r.whatsapp_secundario) : null,
      instagram: r.instagram != null ? s(r.instagram) : null,
      sitio_web: r.sitio_web != null ? s(r.sitio_web) : null,
      web: null,
      direccion: r.direccion != null ? s(r.direccion) : null,
      direccion_referencia:
        r.direccion_referencia != null ? s(r.direccion_referencia) : null,
      cobertura_tipo: r.cobertura_tipo != null ? s(r.cobertura_tipo) : null,
      comunas_cobertura: Array.isArray(r.comunas_cobertura)
        ? (r.comunas_cobertura as unknown[]).map((x) => s(x)).filter(Boolean)
        : null,
      regiones_cobertura: Array.isArray(r.regiones_cobertura)
        ? (r.regiones_cobertura as unknown[]).map((x) => s(x)).filter(Boolean)
        : null,
      categoria_id: catId || null,
      categoria_ia: categoriaIa,
      subcategoria_ia: subcategoriaIa,
      subcategorias_ids: subIds.length ? subIds : null,
      foto_principal_url:
        r.foto_principal_url != null ? s(r.foto_principal_url) : null,
      galeria_urls: strArr(r.galeria_urls),
      modalidades_atencion: strArr(r.modalidades_atencion),
      locales: r.locales,
      keywords_usuario: strArr(r.keywords_usuario),
      comuna_base_id: comunaBaseId || null,
      created_at: r.created_at != null ? s(r.created_at) : null,
      updated_at: r.updated_at != null ? s(r.updated_at) : null,
      comuna: comunaBaseId ? comunaMap.get(comunaBaseId) ?? null : null,
      categoria: catId ? categoriaMap.get(catId) ?? null : null,
      subcategorias_nombres: subIds.map((sid) => subMap.get(sid) || sid),
      clasificacion_publicada,
    };
  });

  const itemsConDuplicados = await attachPosiblesDuplicadosModeracion(
    supabase,
    items
  );

  return { items: itemsConDuplicados, error: null };
}
