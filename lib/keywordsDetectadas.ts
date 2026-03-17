/**
 * Sistema de aprendizaje de keywords detectadas.
 * Palabras que aparecen en descripciones y no están en el diccionario.
 * Estado: pendiente → aprobada (se agregan al diccionario) o bloqueada.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type EstadoKeywordDetectada = "pendiente" | "aprobada" | "bloqueada";

export type KeywordDetectada = {
  id: string;
  keyword: string;
  veces_detectada: number;
  veces_usada_busqueda: number;
  fecha_primera: string;
  fecha_ultima: string;
  estado: EstadoKeywordDetectada;
  subcategoria_id: string | null;
  created_at: string;
  updated_at: string;
};

export async function listKeywordsDetectadas(
  supabase: SupabaseClient,
  opts: { estado?: EstadoKeywordDetectada; limit?: number; offset?: number } = {}
): Promise<{ ok: true; data: KeywordDetectada[] } | { ok: false; error: string }> {
  const limit = Math.min(opts.limit ?? 100, 500);
  const offset = opts.offset ?? 0;
  let q = supabase
    .from("keywords_detectadas")
    .select("id, keyword, veces_detectada, veces_usada_busqueda, fecha_primera, fecha_ultima, estado, subcategoria_id, created_at, updated_at")
    .order("veces_detectada", { ascending: false })
    .range(offset, offset + limit - 1);
  if (opts.estado) {
    q = q.eq("estado", opts.estado);
  }
  const { data, error } = await q;
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data ?? []) as KeywordDetectada[] };
}

/**
 * Cambia el estado de una keyword detectada.
 * pendiente → aprobada: requiere subcategoria_id, llama a aprobar_keyword_detectada (inserta en diccionario).
 * pendiente → bloqueada: solo actualiza estado.
 */
export async function updateEstadoKeywordDetectada(
  supabase: SupabaseClient,
  id: string,
  estado: EstadoKeywordDetectada,
  subcategoriaId?: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (estado !== "aprobada" && estado !== "bloqueada") {
    return { ok: false, error: "Estado debe ser aprobada o bloqueada." };
  }

  if (estado === "aprobada") {
    if (!subcategoriaId?.trim()) {
      return { ok: false, error: "subcategoria_id es requerido para aprobar." };
    }
    const { error: rpcError } = await supabase.rpc("aprobar_keyword_detectada", {
      p_id: id,
      p_subcategoria_id: subcategoriaId,
    });
    if (rpcError) return { ok: false, error: rpcError.message };
    return { ok: true };
  }

  const { error } = await supabase
    .from("keywords_detectadas")
    .update({ estado: "bloqueada", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("estado", "pendiente");
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
