/**
 * Generación automática de sugerencias de keywords desde la descripción del negocio.
 *
 * Las sugerencias se validan contra la lista interna de keywords válidas
 * (keyword_to_subcategory_map con activo = true). Solo se sugieren términos
 * que existan en ese diccionario; así se evita contaminar el buscador con
 * términos irrelevantes. Las palabras detectadas que no están en la lista
 * válida no se sugieren automáticamente, pero el usuario puede agregarlas
 * manualmente si lo desea. Opcionalmente se guardan en keywords_pendientes
 * para análisis futuro.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { extractKeywordsFromText } from "./extractKeywordsFromText";

const SUGERIR_MIN = 3;
const SUGERIR_MAX = 8;

/**
 * Genera sugerencias de keywords a partir de descripcion_negocio (y opcionalmente nombre).
 * 1. Normaliza y extrae palabras del texto (stopwords + normalizeAndFilterKeyword).
 * 2. Busca en keyword_to_subcategory_map solo las que existan y estén activas (lista válida).
 * 3. Solo esas se devuelven como sugeridas; el resto no se sugiere (evita contaminar el buscador).
 * 4. Prioriza por usage_count (más usadas primero). Devuelve entre 3 y 8 keywords.
 * 5. Opcional: registra las no encontradas en keywords_detectadas (aprendizaje automático).
 */
export async function generateKeywordSuggestions(
  supabase: SupabaseClient,
  descripcionNegocio: string,
  nombreEmprendimiento?: string
): Promise<{ ok: true; keywords: string[] } | { ok: false; error: string }> {
  const texto = [nombreEmprendimiento, descripcionNegocio].filter(Boolean).join(" ").trim();
  if (!texto || texto.length < 25) {
    return { ok: false, error: "Se necesita al menos 25 caracteres de descripción o nombre." };
  }

  const normalizedCandidates = extractKeywordsFromText(texto);
  if (normalizedCandidates.length === 0) {
    return { ok: true, keywords: [] };
  }

  const { data: rows, error } = await supabase
    .from("keyword_to_subcategory_map")
    .select("keyword, normalized_keyword, usage_count")
    .eq("activo", true)
    .in("normalized_keyword", normalizedCandidates)
    .order("usage_count", { ascending: false, nullsFirst: false });

  if (error) {
    return { ok: false, error: error.message };
  }

  const validNormalized = new Set<string>();
  const seen = new Set<string>();
  const keywords: string[] = [];
  for (const row of rows ?? []) {
    const r = row as { keyword: string; normalized_keyword: string };
    const display = (r.keyword || r.normalized_keyword || "").trim();
    const norm = (r.normalized_keyword || "").trim().toLowerCase();
    if (!display || seen.has(norm)) continue;
    seen.add(norm);
    validNormalized.add(norm);
    keywords.push(display);
    if (keywords.length >= SUGERIR_MAX) break;
  }

  const unknown = normalizedCandidates.filter((c) => !validNormalized.has(c));
  if (unknown.length > 0) {
    upsertKeywordsDetectadas(supabase, unknown).catch(() => {});
  }

  return { ok: true, keywords };
}

/**
 * Registra o actualiza palabras detectadas que no están en el diccionario (keywords_detectadas).
 * Incrementa veces_detectada si ya existe y está en estado pendiente. Fire-and-forget.
 */
async function upsertKeywordsDetectadas(
  supabase: SupabaseClient,
  normalizedKeywords: string[]
): Promise<void> {
  const uniq = [...new Set(normalizedKeywords)].filter((k) => k.length >= 2 && k.length <= 40);
  if (uniq.length === 0) return;
  const { error } = await supabase.rpc("upsert_keywords_detectadas", { p_keywords: uniq });
  if (error) {
    // RPC o tabla puede no existir si la migración no está aplicada
  }
}
