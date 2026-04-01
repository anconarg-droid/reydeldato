import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  attachPosiblesDuplicadosModeracion,
  type PosibleDuplicadoEmprendedorModeracion,
} from "@/lib/moderacionDuplicadosEmprendedor";

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
  frase_negocio?: string | null;
  descripcion_libre?: string | null;
  email?: string | null;
  whatsapp_principal?: string | null;
  instagram?: string | null;
  sitio_web?: string | null;
  cobertura_tipo?: string | null;
  comunas_cobertura?: string[] | null;
  regiones_cobertura?: string[] | null;
  categoria_id?: string | null;
  /** Sugerencia IA o legacy (texto o uuid según fila). */
  categoria_ia?: string | null;
  subcategoria_ia?: string | null;
  subcategorias_ids?: string[] | null;
  foto_principal_url?: string | null;
  comuna_base_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  comuna?: { id: string; nombre: string; slug: string } | null;
  categoria?: { id: string; nombre: string; slug: string } | null;
  subcategorias_nombres: string[];
  /** Emprendedores publicados con mismo WhatsApp (normalizado) y misma comuna base. */
  posibles_duplicados?: PosibleDuplicadoEmprendedorModeracion[];
};

/**
 * Lista postulaciones por `estado` con comuna, categoría y nombres de subcategorías resueltos.
 * No toca `emprendedores`.
 */
export async function loadPostulacionesPorEstado(
  estado: string
): Promise<{ items: PostulacionModeracionItem[]; error: Error | null }> {
  const supabase = getSupabaseAdmin();

  const estadosTodos = [
    "borrador",
    "pendiente_revision",
    "aprobada",
    "rechazada",
  ] as const;

  let q = supabase.from("postulaciones_emprendedores").select(
    `
      id,
      tipo_postulacion,
      emprendedor_id,
      estado,
      nombre_emprendimiento,
      frase_negocio,
      descripcion_libre,
      email,
      whatsapp_principal,
      instagram,
      sitio_web,
      cobertura_tipo,
      comunas_cobertura,
      regiones_cobertura,
      categoria_id,
      categoria_ia,
      subcategoria_ia,
      subcategorias_ids,
      foto_principal_url,
      comuna_base_id,
      created_at,
      updated_at
    `
  );

  if (estado === "todos") {
    q = q.in("estado", [...estadosTodos]);
  } else {
    q = q.eq("estado", estado);
  }

  const { data: rows, error } = await q
    .order("updated_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    return { items: [], error: new Error(error.message) };
  }

  const list = rows ?? [];
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

    return {
      id: s(r.id),
      tipo_postulacion: r.tipo_postulacion != null ? s(r.tipo_postulacion) : null,
      emprendedor_id: r.emprendedor_id != null ? s(r.emprendedor_id) : null,
      estado: r.estado != null ? s(r.estado) : null,
      nombre_emprendimiento:
        r.nombre_emprendimiento != null ? s(r.nombre_emprendimiento) : null,
      frase_negocio: r.frase_negocio != null ? s(r.frase_negocio) : null,
      descripcion_libre: r.descripcion_libre != null ? s(r.descripcion_libre) : null,
      email: r.email != null ? s(r.email) : null,
      whatsapp_principal:
        r.whatsapp_principal != null ? s(r.whatsapp_principal) : null,
      instagram: r.instagram != null ? s(r.instagram) : null,
      sitio_web: r.sitio_web != null ? s(r.sitio_web) : null,
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
      comuna_base_id: comunaBaseId || null,
      created_at: r.created_at != null ? s(r.created_at) : null,
      updated_at: r.updated_at != null ? s(r.updated_at) : null,
      comuna: comunaBaseId ? comunaMap.get(comunaBaseId) ?? null : null,
      categoria: catId ? categoriaMap.get(catId) ?? null : null,
      subcategorias_nombres: subIds.map((sid) => subMap.get(sid) || sid),
    };
  });

  const itemsConDuplicados = await attachPosiblesDuplicadosModeracion(
    supabase,
    items
  );

  return { items: itemsConDuplicados, error: null };
}
