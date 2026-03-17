/**
 * Aprendizaje desde corrección manual: al asignar una subcategoría principal a un
 * emprendimiento (p. ej. desde clasificacion_pendiente), guarda las keywords
 * relevantes en keyword_to_subcategory_map respetando prioridad de source_type.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  normalizeAndFilterKeyword,
  canOverwriteKeywordSource,
  MAX_KEYWORD_LENGTH,
} from "@/lib/keywordValidation";

export type LearnFromManualClassificationOptions = {
  reviewedBy?: string | null;
};

/**
 * Aprende desde una corrección manual: toma keywords del emprendedor (usuario + IA),
 * las normaliza, filtra ruido, respeta prioridad source_type y las inserta/actualiza
 * en keyword_to_subcategory_map. Marca clasificacion_pendiente como resuelto y
 * registra en clasificacion_feedback_log.
 */
export async function learnFromManualClassification(
  supabase: SupabaseClient,
  emprendedorId: string,
  subcategoriaId: string,
  options?: LearnFromManualClassificationOptions
): Promise<{ ok: boolean; keywordsAdded: number; error?: string }> {
  const { data: emp, error: fetchError } = await supabase
    .from("emprendedores")
    .select(
      "id, subcategoria_principal_id, keywords_usuario_json, keywords_usuario, ai_keywords_json, ai_raw_classification_json"
    )
    .eq("id", emprendedorId)
    .single();

  if (fetchError || !emp) {
    return { ok: false, keywordsAdded: 0, error: "Emprendimiento no encontrado" };
  }

  const row = emp as Record<string, unknown>;
  const oldSubcategoriaId = row.subcategoria_principal_id as string | null | undefined;

  const keywordsUsuario: string[] = [];
  const rawUser = row.keywords_usuario_json ?? row.keywords_usuario;
  if (Array.isArray(rawUser)) {
    rawUser.forEach((x) => keywordsUsuario.push(String(x ?? "").trim()));
  } else if (rawUser && typeof rawUser === "object" && "keywords" in rawUser) {
    const arr = (rawUser as { keywords?: unknown[] }).keywords;
    if (Array.isArray(arr)) arr.forEach((x) => keywordsUsuario.push(String(x ?? "").trim()));
  }
  const userTerms = keywordsUsuario.filter(Boolean);

  const aiKeywords: string[] = [];
  const rawAi = row.ai_keywords_json as Record<string, unknown> | null | undefined;
  if (rawAi && Array.isArray(rawAi.keywords)) {
    rawAi.keywords.forEach((x) => aiKeywords.push(String(x ?? "").trim()));
  }
  if (rawAi && Array.isArray(rawAi.keywords_ia)) {
    rawAi.keywords_ia.forEach((x) => aiKeywords.push(String(x ?? "").trim()));
  }
  const aiTerms = aiKeywords.filter(Boolean);

  const seenNorm = new Set<string>();
  const now = new Date().toISOString();
  let keywordsActuallyAdded = 0;
  const toInsert: Array<{
    keyword: string;
    normalized_keyword: string;
    subcategoria_id: string;
    confidence_default: number;
    activo: boolean;
    source_type: "manual" | "ai_feedback";
    updated_at: string;
  }> = [];

  for (const kw of userTerms) {
    const norm = normalizeAndFilterKeyword(kw);
    if (norm && !seenNorm.has(norm)) {
      seenNorm.add(norm);
      toInsert.push({
        keyword: (kw.slice(0, MAX_KEYWORD_LENGTH) || norm).trim(),
        normalized_keyword: norm,
        subcategoria_id: subcategoriaId,
        confidence_default: 0.9,
        activo: true,
        source_type: "manual",
        updated_at: now,
      });
    }
  }

  for (const kw of aiTerms) {
    const norm = normalizeAndFilterKeyword(kw);
    if (norm && !seenNorm.has(norm)) {
      seenNorm.add(norm);
      toInsert.push({
        keyword: (kw.slice(0, MAX_KEYWORD_LENGTH) || norm).trim(),
        normalized_keyword: norm,
        subcategoria_id: subcategoriaId,
        confidence_default: 0.75,
        activo: true,
        source_type: "ai_feedback",
        updated_at: now,
      });
    }
  }

  if (toInsert.length > 0) {
    const norms = [...new Set(toInsert.map((r) => r.normalized_keyword))];
    const { data: existingRows } = await supabase
      .from("keyword_to_subcategory_map")
      .select("normalized_keyword, source_type")
      .in("normalized_keyword", norms);

    const existingByNorm = new Map<string, string>();
    for (const r of existingRows ?? []) {
      const row = r as { normalized_keyword: string; source_type: string };
      existingByNorm.set(row.normalized_keyword, row.source_type);
    }

    const toUpsert = toInsert.filter((row) =>
      canOverwriteKeywordSource(existingByNorm.get(row.normalized_keyword), row.source_type)
    );
    keywordsActuallyAdded = toUpsert.length;

    if (toUpsert.length > 0) {
      const { error: upsertError } = await supabase
        .from("keyword_to_subcategory_map")
        .upsert(toUpsert, {
          onConflict: "normalized_keyword",
          ignoreDuplicates: false,
        });
      if (upsertError) {
        return { ok: false, keywordsAdded: 0, error: upsertError.message };
      }
    }
  }


  const clasificacionIaJson = rawAi ?? row.ai_raw_classification_json ?? null;
  const clasificacionFinalJson = {
    subcategoria_principal_id: subcategoriaId,
    updated_at: now,
  };

  try {
    await supabase
      .from("clasificacion_pendiente")
      .update({
        status: "resuelto",
        resuelto_at: now,
        reviewed_by: options?.reviewedBy ?? null,
        reviewed_at: now,
        updated_at: now,
      })
      .eq("emprendedor_id", emprendedorId);
  } catch {
    // No existe fila en clasificacion_pendiente o no existe columna reviewed_at; no es error
  }

  try {
    await supabase.from("clasificacion_feedback_log").insert({
      emprendedor_id: emprendedorId,
      action: "correccion",
      old_subcategoria_id: oldSubcategoriaId ?? null,
      new_subcategoria_id: subcategoriaId,
      reviewed_by: options?.reviewedBy ?? null,
      clasificacion_ia_json: clasificacionIaJson,
      clasificacion_final_json: clasificacionFinalJson,
      cambio_realizado: `Subcategoría principal asignada manualmente; ${keywordsActuallyAdded} keyword(s) aprendidas.`,
      notes:
        keywordsActuallyAdded > 0
          ? `Keywords agregadas/actualizadas: ${keywordsActuallyAdded}`
          : null,
    });
  } catch (e) {
    console.warn("[learnFromManualClassification] feedback_log insert failed", e);
  }

  return { ok: true, keywordsAdded: keywordsActuallyAdded };
}