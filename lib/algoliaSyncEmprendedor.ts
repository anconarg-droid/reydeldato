import algoliasearch from "algoliasearch";
import { indexarEmprendedor } from "@/lib/algolia";
import { fetchEmprendedorRowFromAlgoliaViews } from "@/lib/algoliaEmprendedoresReindexSource";
import { isPostgrestMissingRelationError } from "@/lib/postgrestUnknownColumn";
import type { SupabaseClient } from "@supabase/supabase-js";

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

  if (n === "comuna" || n === "solo_mi_comuna") return 0;
  if (n === "comunas") return 1;
  if (n === "regional" || n === "varias_regiones") return 2;
  if (n === "nacional") return 3;

  return 9;
}

const algolia = algoliasearch(
  process.env.ALGOLIA_APP_ID!,
  process.env.ALGOLIA_ADMIN_KEY!
);

const INDEX_NAME = process.env.ALGOLIA_INDEX_EMPRENDEDORES || "emprendedores";

/**
 * Reindexa en Algolia un solo emprendimiento leyendo desde la vista configurada
 * (`vw_emprendedores_publico` por defecto; override con SUPABASE_EMPRENDEDORES_ALGOLIA_VIEW).
 *
 * - Si el emprendimiento está publicado -> saveObject/actualización.
 * - Si no está publicado o no existe en la vista -> deleteObject.
 *
 * Nunca lanza errores hacia afuera: en caso de fallo, registra en consola
 * pero no rompe el flujo de publicación/actualización.
 */
export async function syncEmprendedorToAlgolia(emprendedorId: string) {
  // Back-compat: si se llama sin cliente (legacy), no hacer nada.
  return;
}

export async function syncEmprendedorToAlgoliaWithSupabase(
  supabase: SupabaseClient,
  emprendedorId: string
) {
  const id = s(emprendedorId);
  if (!id) return;

  try {
    const { data, error, viewsAttempted } = await fetchEmprendedorRowFromAlgoliaViews(supabase, {
      id,
    });

    if (error) {
      if (isPostgrestMissingRelationError(error)) {
        console.warn(
          "[algoliaSync] Vista de indexación no disponible en PostgREST; omitiendo sync Algolia.",
          { id, viewsAttempted, message: error.message }
        );
        return;
      }
      console.warn("[algoliaSync] Error leyendo fila para Algolia; omitiendo sync.", {
        id,
        viewsAttempted,
        message: error.message,
      });
      return;
    }

    if (!data) {
      await indexarEmprendedor({ id, slug: id, estado_publicacion: "no_publicado" });
      if (process.env.NODE_ENV !== "production") {
        console.warn("[algoliaSync] No hay fila en vista para id; limpiando índice si aplica.", { id });
      }
      return;
    }

    // Indexación centralizada. La vista ya entrega *_final y campos públicos básicos.
    await indexarEmprendedor(data as any);

    if (process.env.NODE_ENV !== "production") {
      console.log("[algoliaSync] Synced emprendedor to Algolia", {
        id,
        slug: s((data as any)?.slug),
        publicado: s((data as any)?.estado_publicacion) === "publicado",
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

