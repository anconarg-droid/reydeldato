import { createClient } from "@supabase/supabase-js";
import algoliasearch from "algoliasearch";
import { indexarEmprendedor } from "@/lib/algolia";

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

    if (error || !data) {
      // Si no hay fila en la vista, eliminamos del índice por si quedó huérfano.
      await indexarEmprendedor({ id, slug: id, estado_publicacion: "no_publicado" });
      if (process.env.NODE_ENV !== "production") {
        console.warn("[algoliaSync] No data in view for id, deleting from index", {
          id,
          error: error?.message,
        });
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

