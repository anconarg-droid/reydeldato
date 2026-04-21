import { getAlgoliaAdminIndex } from "@/lib/algoliaServer";

function s(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function arr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => s(x)).filter(Boolean);
}

const INDEX_NAME = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_EMPRENDEDORES || "emprendedores";

type EmprendedorIndexable = Record<string, any>;

function toAlgoliaRecord(emprendedor: EmprendedorIndexable) {
  const slug = s(emprendedor.slug);
  const id = s(emprendedor.id);
  const objectID = slug || id;

  return {
    objectID,

    id: id || undefined,
    slug,
    nombre: s(emprendedor.nombre ?? emprendedor.nombre_emprendimiento),
    descripcion_corta: s(emprendedor.descripcion_corta),
    descripcion_larga: s(emprendedor.descripcion_larga),
    foto_principal_url: s(emprendedor.foto_principal_url),

    // Fuente de verdad pública (final) - NO usar palabras_clave ni el alias `keywords` de la vista
    categoria_id: s(emprendedor.categoria_id),
    categoria_slug: s(
      emprendedor.categoria_slug ?? emprendedor.categoria_slug_final
    ),
    subcategoria_slug: s(
      emprendedor.subcategoria_slug ?? emprendedor.subcategoria_slug_final
    ),
    keywords: Array.isArray(emprendedor.keywords_finales)
      ? emprendedor.keywords_finales
      : [],

    comuna: s(emprendedor.comuna_nombre ?? emprendedor.comuna_base_nombre),
    cobertura: s(emprendedor.cobertura_tipo ?? emprendedor.nivel_cobertura),
    comunas: arr(
      emprendedor.cobertura_comunas_arr ??
        emprendedor.comunas_cobertura_slugs_arr ??
        emprendedor.comunas_cobertura_arr ??
        emprendedor.comunas_cobertura
    ),
    modalidades: arr(
      emprendedor.modalidades_atencion_arr ??
        emprendedor.modalidad_atencion ??
        emprendedor.modalidades
    ),

    whatsapp: s(emprendedor.whatsapp_principal ?? emprendedor.whatsapp),
    instagram: s(emprendedor.instagram),
    web: s(emprendedor.sitio_web ?? emprendedor.web),

    estado_publicacion: s(emprendedor.estado_publicacion),
    publicado: s(emprendedor.estado_publicacion) === "publicado",
  };
}

function isPublicado(emprendedor: EmprendedorIndexable): boolean {
  return s(emprendedor.estado_publicacion) === "publicado";
}

/**
 * Única puerta de indexación a Algolia para emprendimientos.
 * - No indexa si estado_publicacion !== "publicado"
 * - Si no está publicado, elimina del índice (limpieza defensiva)
 */
export async function indexarEmprendedor(emprendedor: EmprendedorIndexable | EmprendedorIndexable[]) {
  const index = getAlgoliaAdminIndex(INDEX_NAME);
  const list = Array.isArray(emprendedor) ? emprendedor : [emprendedor];
  if (list.length === 0) return;

  const toDelete: string[] = [];
  const toSave: any[] = [];

  for (const e of list) {
    const record = toAlgoliaRecord(e);
    if (!record.objectID) continue;
    if (!isPublicado(e)) {
      toDelete.push(record.objectID);
      continue;
    }
    toSave.push(record);
  }

  if (toSave.length) {
    await index.saveObjects(toSave);
  }
  if (toDelete.length) {
    await index.deleteObjects(toDelete).catch(() => {});
  }
}