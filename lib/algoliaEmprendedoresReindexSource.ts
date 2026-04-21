import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isPostgrestMissingRelationError,
  type PostgrestErrLike,
} from "@/lib/postgrestUnknownColumn";

/** Vista por defecto para indexación y sync (existe en BDs alineadas al esquema actual). */
export const EMPRENDEDORES_INDEXACION_VIEW_DEFAULT = "vw_emprendedores_publico";

/**
 * Vista(s) para leer la fila de un emprendedor antes de enviarla a Algolia.
 * Override: `SUPABASE_EMPRENDEDORES_ALGOLIA_VIEW` si en tu BD el nombre difiere.
 */
export function emprendedoresAlgoliaViewCandidates(): string[] {
  const env = process.env.SUPABASE_EMPRENDEDORES_ALGOLIA_VIEW?.trim();
  const list = [env, EMPRENDEDORES_INDEXACION_VIEW_DEFAULT].filter(Boolean) as string[];
  return [...new Set(list)];
}

export type FetchEmprendedorAlgoliaRowResult = {
  data: Record<string, unknown> | null;
  error: PostgrestErrLike | null;
  viewUsed: string | null;
  viewsAttempted: string[];
};

/**
 * Intenta `select` en cada vista candidata; si PostgREST no expone una vista, prueba la siguiente.
 */
export async function fetchEmprendedorRowFromAlgoliaViews(
  supabase: SupabaseClient,
  opts: { id?: string; slug?: string }
): Promise<FetchEmprendedorAlgoliaRowResult> {
  const views = emprendedoresAlgoliaViewCandidates();
  const id = opts.id?.trim() ?? "";
  const slug = opts.slug?.trim() ?? "";
  if (!id && !slug) {
    return {
      data: null,
      error: { message: "Debes enviar slug o id" },
      viewUsed: null,
      viewsAttempted: views,
    };
  }

  let lastError: PostgrestErrLike | null = null;
  for (const viewName of views) {
    let q = supabase.from(viewName).select("*").limit(1);
    q = slug ? q.eq("slug", slug) : q.eq("id", id);
    const { data, error } = await q.maybeSingle();
    if (!error) {
      return {
        data: (data as Record<string, unknown> | null) ?? null,
        error: null,
        viewUsed: viewName,
        viewsAttempted: views,
      };
    }
    lastError = error as PostgrestErrLike;
    if (!isPostgrestMissingRelationError(lastError)) {
      return { data: null, error: lastError, viewUsed: null, viewsAttempted: views };
    }
  }

  return { data: null, error: lastError, viewUsed: null, viewsAttempted: views };
}
