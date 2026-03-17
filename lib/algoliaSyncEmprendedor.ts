import { createClient } from "@supabase/supabase-js";
import algoliasearch from "algoliasearch";

function s(v: any): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function arr(v: any): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter(Boolean).map((x) => String(x).trim());
}

function nivelRank(nivel: any) {
  const n = s(nivel).toLowerCase();

  if (n === "solo_mi_comuna") return 0;
  if (n === "comunas") return 1;
  if (n === "varias_regiones") return 2;
  if (n === "nacional") return 3;

  return 9;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const algolia = algoliasearch(
  process.env.ALGOLIA_APP_ID!,
  process.env.ALGOLIA_ADMIN_KEY!
);

const INDEX_NAME = process.env.ALGOLIA_INDEX_EMPRENDEDORES || "emprendedores";

/**
 * Reindexa en Algolia un solo emprendimiento usando la vista
 * vw_emprendedores_algolia_final, coherente con el flujo global de reindex.
 *
 * - Si el emprendimiento está publicado -> saveObject/actualización.
 * - Si no está publicado o no existe en la vista -> deleteObject.
 *
 * Nunca lanza errores hacia afuera: en caso de fallo, registra en consola
 * pero no rompe el flujo de publicación/actualización.
 */
export async function syncEmprendedorToAlgolia(emprendedorId: string) {
  const id = s(emprendedorId);
  if (!id) return;

  try {
    const { data, error } = await supabase
      .from("vw_emprendedores_algolia_final")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    const index = algolia.initIndex(INDEX_NAME);

    if (error || !data) {
      // Si no hay fila en la vista, eliminamos del índice por si quedó huérfano.
      await index.deleteObject(id).catch(() => {});
      if (process.env.NODE_ENV !== "production") {
        console.warn("[algoliaSync] No data in view for id, deleting from index", {
          id,
          error: error?.message,
        });
      }
      return;
    }

    const nivel = s((data as any)?.nivel_cobertura);
    const tagsSlugs = arr((data as any)?.tags_slugs);
    const keywordsClasif = arr((data as any)?.keywords_clasificacion);
    const coverageKeys = arr((data as any)?.coverage_keys);
    const coverageLabels = arr((data as any)?.coverage_labels);
    const estadoPublicacion = s((data as any)?.estado_publicacion);

    const object = {
      objectID: s((data as any)?.id || (data as any)?.slug),

      id: s((data as any)?.id),
      slug: s((data as any)?.slug),
      nombre: s((data as any)?.nombre),

      descripcion_corta: s((data as any)?.descripcion_corta),
      descripcion_larga: s((data as any)?.descripcion_larga),
      foto_principal_url: s((data as any)?.foto_principal_url),

      comuna_slug: s((data as any)?.comuna_base_slug),
      comuna_base_slug: s((data as any)?.comuna_base_slug),
      comuna_base_nombre: s((data as any)?.comuna_base_nombre),

      coverage_keys: coverageKeys,
      coverage_labels: coverageLabels,

      nivel_cobertura: nivel,
      nivel_rank: nivelRank(nivel),
      estado_publicacion: estadoPublicacion,
      publicado: estadoPublicacion === "publicado",

      tipo_actividad: s((data as any)?.tipo_actividad),
      sector_slug: s((data as any)?.sector_slug),
      tags_slugs: tagsSlugs,
      keywords_clasificacion: keywordsClasif,
      clasificacion_confianza:
        (data as any)?.clasificacion_confianza != null
          ? Number((data as any).clasificacion_confianza)
          : null,

      search_text: [
        s((data as any)?.nombre),
        s((data as any)?.descripcion_corta),
        s((data as any)?.descripcion_larga),
        ...tagsSlugs,
        ...keywordsClasif,
        s((data as any)?.sector_slug),
      ].join(" "),
    };

    if (object.estado_publicacion === "publicado") {
      await index.saveObject(object);
    } else {
      await index.deleteObject(object.objectID).catch(() => {});
    }

    if (process.env.NODE_ENV !== "production") {
      console.log("[algoliaSync] Synced emprendedor to Algolia", {
        id,
        slug: object.slug,
        publicado: object.publicado,
      });
    }
  } catch (e: any) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[algoliaSync] Error syncing emprendedor to Algolia", {
        id,
        error: e?.message || String(e),
      });
    }
  }
}

