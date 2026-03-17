/**
 * Arquitectura de clasificación automática: texto libre + IA → subcategorías estructuradas.
 * Conecta detección de keywords con tabla keyword_to_subcategory_map y asignación en
 * emprendedor_subcategorias (principal + secundarias).
 * Usado en creación (publicar) y actualización (reclasificar).
 *
 * Prioridad de fuentes:
 * - Texto: descripcion_negocio > descripcion_corta + descripcion_larga > nombre
 * - Keywords: keywords_usuario_json > keywords_usuario > IA detectadas
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { classifyWithAI } from "@/lib/aiClassify";
import { mapKeywordsToSubcategorias as mapBySlugSimilarity } from "@/lib/mapKeywordsToSubcategorias";
import { getPublishingDecision } from "@/lib/regulatedPublishingRules";

/** Estados de clasificación (solo clasificación, no publicación) */
export const CLASSIFICATION_STATUS = {
  SIN_CLASIFICAR: "sin_clasificar",
  CLASIFICADA_AUTOMATICA: "clasificada_automatica",
  PENDIENTE_REVISION: "pendiente_revision",
  CLASIFICADA_MANUAL: "clasificada_manual",
} as const;

/** Si la confianza de la IA es menor que este umbral, se marca pendiente_revision */
export const CONFIDENCE_THRESHOLD = 0.7;

/** Mínimo de palabras en el texto para considerar que hay suficiente información */
const MIN_WORDS_FOR_TEXT = 2;
/** Mínimo de caracteres en el texto cuando se usa solo texto (sin keywords usuario) */
const MIN_CHARS_FOR_TEXT_ONLY = 25;
/** Con al menos esta cantidad de keywords del usuario se considera suficiente */
const MIN_USER_KEYWORDS = 2;

export type DetectKeywordsInput = {
  nombre?: string;
  descripcion_corta?: string;
  descripcion_larga?: string;
};

export type DetectKeywordsResult = {
  keywords: string[];
  tags_slugs: string[];
  confianza: number;
  raw?: AIClassificationResult;
};

type AIClassificationResult = import("@/lib/aiClassify").AIClassificationResult;

export type SubcategoriaCandidata = {
  subcategoria_id: string;
  subcategoria_slug: string;
  categoria_id: string;
  score: number;
  source_type: "manual" | "ai" | "fallback";
};

export type MapKeywordsResult = {
  candidatas: SubcategoriaCandidata[];
  principalId: string | null;
  /** Normalized keywords que hicieron match en keyword_to_subcategory_map (para usage_count) */
  matchedNormalizedKeywords: string[];
};

/** Normaliza término a forma slug para búsqueda (exportada para uso en aprendizaje) */
export function toSlugForm(s: string): string {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Paso 1: Detecta keywords y posibles rubros desde texto libre usando la IA existente.
 */
export async function detectBusinessKeywords(
  input: DetectKeywordsInput
): Promise<DetectKeywordsResult | null> {
  const parts = [
    input.nombre,
    input.descripcion_corta,
    input.descripcion_larga,
  ].filter(Boolean) as string[];
  const text = parts.join(". ").trim();
  if (text.length < 3) return null;

  const result = await classifyWithAI(text);
  if (!result) return null;

  const tags = result.tags_slugs ?? [];
  const keywords = result.keywords ?? [];
  const allTerms = [...new Set([...tags, ...keywords])];

  return {
    keywords: allTerms,
    tags_slugs: tags,
    confianza: result.confianza ?? 0.7,
    raw: result,
  };
}

/**
 * Paso 2: Mapea keywords a subcategorías: primero keyword_to_subcategory_map, luego similitud por slug/nombre.
 * Devuelve candidatas con score y la subcategoría principal (mayor score).
 */
export async function mapKeywordsToSubcategories(
  supabase: SupabaseClient,
  keywords: string[]
): Promise<MapKeywordsResult> {
  const candidatasMap = new Map<string, SubcategoriaCandidata>();
  const matchedNorms = new Set<string>();
  const normalizedInput = keywords.map((k) => toSlugForm(k)).filter(Boolean);
  if (normalizedInput.length === 0) {
    return { candidatas: [], principalId: null, matchedNormalizedKeywords: [] };
  }

  // A) Buscar en keyword_to_subcategory_map (tabla puede no existir aún)
  const { data: mapRows } = await supabase
    .from("keyword_to_subcategory_map")
    .select("keyword, normalized_keyword, subcategoria_id, confidence_default")
    .eq("activo", true);

  if (mapRows?.length) {
    const normToRow = new Map<string, { subcategoria_id: string; confidence_default: number }>();
    for (const row of mapRows as Array<{ keyword: string; normalized_keyword: string; subcategoria_id: string; confidence_default: number }>) {
      const n = toSlugForm(row.normalized_keyword || row.keyword);
      normToRow.set(n, { subcategoria_id: row.subcategoria_id, confidence_default: Number(row.confidence_default) || 0.85 });
    }
    for (const kw of normalizedInput) {
      const row = normToRow.get(kw);
      if (row) {
        matchedNorms.add(kw);
        const existing = candidatasMap.get(row.subcategoria_id);
        if (!existing || existing.score < row.confidence_default) {
          candidatasMap.set(row.subcategoria_id, {
            subcategoria_id: row.subcategoria_id,
            subcategoria_slug: "",
            categoria_id: "",
            score: row.confidence_default,
            source_type: "ai",
          });
        }
      }
    }
  }

  // B) Términos no resueltos por el map: usar mapeo por slug/similitud
  const unresolved = normalizedInput.filter((n) => !matchedNorms.has(n));
  if (unresolved.length > 0) {
    const { subcategorias: bySimilarity } = await mapBySlugSimilarity(supabase, unresolved);
    for (const sub of bySimilarity) {
      const existing = candidatasMap.get(sub.id);
      const score = 0.75;
      if (!existing || existing.score < score) {
        candidatasMap.set(sub.id, {
          subcategoria_id: sub.id,
          subcategoria_slug: sub.slug,
          categoria_id: sub.categoria_id,
          score,
          source_type: "fallback",
        });
      }
    }
  }

  // Enriquecer con slug y categoria_id para las que solo tenemos id (desde map)
  const ids = Array.from(candidatasMap.keys());
  if (ids.length > 0) {
    const { data: subRows } = await supabase
      .from("subcategorias")
      .select("id, slug, categoria_id")
      .in("id", ids);
    for (const row of subRows ?? []) {
      const r = row as { id: string; slug: string; categoria_id: string };
      const c = candidatasMap.get(r.id);
      if (c) {
        c.subcategoria_slug = r.slug;
        c.categoria_id = r.categoria_id;
      }
    }
  }

  const candidatas = Array.from(candidatasMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
  const principalId = candidatas.length > 0 ? candidatas[0].subcategoria_id : null;
  const matchedNormalizedKeywords = Array.from(matchedNorms);

  return { candidatas, principalId, matchedNormalizedKeywords };
}

/**
 * Incrementa usage_count en keyword_to_subcategory_map para las normalized_keywords
 * que participaron en una clasificación exitosa (vía RPC).
 */
export async function incrementKeywordUsageCount(
  supabase: SupabaseClient,
  normalizedKeywords: string[]
): Promise<void> {
  const list = normalizedKeywords.filter((k) => k && k.length > 0);
  if (list.length === 0) return;
  try {
    await supabase.rpc("increment_keyword_usage_count", {
      normalized_keywords: list,
    });
  } catch {
    // RPC puede no existir si la migración no se ha ejecutado
  }
}

/**
 * Paso 3: Asigna subcategorías al emprendimiento: limpia relaciones previas, inserta en
 * emprendedor_subcategorias (con source_type, confidence_score, is_primary) y actualiza
 * subcategoria_principal_id y categoria_id en emprendedores.
 */
export async function assignBusinessSubcategories(
  supabase: SupabaseClient,
  emprendedorId: string,
  candidatas: SubcategoriaCandidata[],
  options?: {
    ai_keywords_json?: Record<string, unknown> | null;
    ai_raw_classification_json?: Record<string, unknown> | null;
  }
): Promise<void> {
  await supabase
    .from("emprendedor_subcategorias")
    .delete()
    .eq("emprendedor_id", emprendedorId);

  if (candidatas.length === 0) {
    await supabase
      .from("emprendedores")
      .update({
        subcategoria_principal_id: null,
        ai_keywords_json: options?.ai_keywords_json ?? null,
        ai_raw_classification_json: options?.ai_raw_classification_json ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", emprendedorId);
    return;
  }

  const primaryId = candidatas[0].subcategoria_id;
  const categoriaId = candidatas[0].categoria_id || null;

  const rows = candidatas.map((c, i) => ({
    emprendedor_id: emprendedorId,
    subcategoria_id: c.subcategoria_id,
    source_type: c.source_type,
    confidence_score: c.score,
    is_primary: i === 0,
    created_at: new Date().toISOString(),
  }));

  await supabase.from("emprendedor_subcategorias").insert(rows);

  const updatePayload: Record<string, unknown> = {
    subcategoria_principal_id: primaryId,
    ai_keywords_json: options?.ai_keywords_json ?? null,
    ai_raw_classification_json: options?.ai_raw_classification_json ?? null,
    updated_at: new Date().toISOString(),
  };
  if (categoriaId) {
    updatePayload.categoria_id = categoriaId;
  }
  await supabase.from("emprendedores").update(updatePayload).eq("id", emprendedorId);
}

export type ClassifyAndAssignOptions = {
  /** Texto libre principal (ej. descripcion_negocio). Si no se pasa, se lee de la fila. */
  descripcion_negocio?: string;
  /** Keywords del usuario. Si no se pasa, se leen de keywords_usuario_json o keywords_usuario. */
  keywords_usuario?: string[];
};

/** Parsea keywords desde la fila: prioridad keywords_usuario_json > keywords_usuario */
function parseKeywordsFromRow(row: Record<string, unknown>): string[] {
  const raw = row.keywords_usuario_json ?? row.keywords_usuario;
  if (Array.isArray(raw)) return raw.map((x) => String(x ?? "").trim()).filter(Boolean);
  if (raw && typeof raw === "object" && "keywords" in raw && Array.isArray((raw as any).keywords)) {
    return (raw as any).keywords.map((x: unknown) => String(x ?? "").trim()).filter(Boolean);
  }
  return [];
}

/**
 * Decide si hay suficiente información para intentar clasificar.
 * No depende solo de "25 caracteres": exige texto con sentido (palabras) o keywords del usuario.
 */
export function hasEnoughInfoToClassify(
  text: string,
  keywordsUsuario: string[]
): boolean {
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);

  if (keywordsUsuario.length >= MIN_USER_KEYWORDS) return true;
  if (words.length >= MIN_WORDS_FOR_TEXT && trimmed.length >= MIN_CHARS_FOR_TEXT_ONLY) return true;
  if (words.length >= 3 && trimmed.length >= 20) return true;

  return false;
}

/**
 * Construye el texto para la IA con prioridad estricta:
 * descripcion_negocio > descripcion_corta + descripcion_larga > nombre
 */
function buildTextByPriority(
  descripcionNegocio: string,
  descripcionCorta: string,
  descripcionLarga: string,
  nombre: string
): string {
  if (descripcionNegocio.trim().length > 0) return descripcionNegocio.trim();
  const cortaLarga = [descripcionCorta, descripcionLarga].filter(Boolean).join(" ").trim();
  if (cortaLarga.length > 0) return cortaLarga;
  return nombre.trim();
}

/**
 * Construye la lista de keywords para mapeo con prioridad:
 * keywords_usuario (json o columna) primero, luego las detectadas por IA.
 */
function buildKeywordsForMapping(keywordsUsuario: string[], keywordsIa: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const k of keywordsUsuario) {
    const n = k.trim().toLowerCase();
    if (n && !seen.has(n)) {
      seen.add(n);
      out.push(k.trim());
    }
  }
  for (const k of keywordsIa) {
    const n = k.trim().toLowerCase();
    if (n && !seen.has(n)) {
      seen.add(n);
      out.push(k.trim());
    }
  }
  return out;
}

/**
 * Orquestador: toma texto del emprendimiento, detecta keywords, mapea a subcategorías y guarda.
 * Prioridad texto: descripcion_negocio > descripcion_corta + descripcion_larga > nombre.
 * Prioridad keywords: keywords_usuario_json > keywords_usuario > ai_keywords_json.
 * - classification_status / classification_review_required: estado de la clasificación (clasificada_automatica vs pendiente_revision).
 * - estado_publicacion / motivo_verificacion: decisión de publicación (getPublishingDecision); no mezclar con el estado de clasificación.
 * Si no hay match: guarda en clasificacion_pendiente, classification_status = pendiente_revision.
 * Si hay match y confianza alta: classification_status = clasificada_automatica, usage_count incrementado.
 * Si hay match y confianza baja: classification_status = pendiente_revision, se mantiene en clasificacion_pendiente.
 */
export async function classifyAndAssignBusiness(
  supabase: SupabaseClient,
  emprendedorId: string,
  options?: ClassifyAndAssignOptions
): Promise<{
  ok: boolean;
  subcategoriasAssigned: number;
  principalId?: string;
  error?: string;
  needsManualReview?: boolean;
  estado_publicacion?: "publicado" | "pendiente_aprobacion";
  motivo_verificacion?: string | null;
}> {
  const { data: emp, error: fetchError } = await supabase
    .from("emprendedores")
    .select(
      "id, nombre, descripcion_negocio, descripcion_corta, descripcion_larga, keywords_usuario_json, keywords_usuario"
    )
    .eq("id", emprendedorId)
    .single();

  if (fetchError || !emp) {
    return { ok: false, subcategoriasAssigned: 0, error: "Emprendimiento no encontrado" };
  }

  const row = emp as Record<string, unknown>;
  const nombre = String(row.nombre ?? "").trim();

  const descripcionNegocio = options?.descripcion_negocio ?? String(row.descripcion_negocio ?? "").trim();
  const descripcionCorta = String(row.descripcion_corta ?? "").trim();
  const descripcionLarga = String(row.descripcion_larga ?? "").trim();
  const keywordsUsuario = options?.keywords_usuario ?? parseKeywordsFromRow(row);

  const textForAI = buildTextByPriority(
    descripcionNegocio,
    descripcionCorta,
    descripcionLarga,
    nombre
  );
  const textWithKeywords = [textForAI, ...keywordsUsuario].filter(Boolean).join(" ").trim();

  if (!hasEnoughInfoToClassify(textForAI, keywordsUsuario)) {
    return {
      ok: false,
      subcategoriasAssigned: 0,
      error:
        "Información insuficiente para clasificar: describe el negocio (al menos 2–3 palabras y 25 caracteres) o agrega al menos 2 palabras clave.",
    };
  }

  const detected = await detectBusinessKeywords({
    nombre,
    descripcion_corta: textWithKeywords.length >= 3 ? textWithKeywords : textForAI,
    descripcion_larga: undefined,
  });

  const keywordsIa = detected
    ? [...(detected.raw?.keywords ?? []), ...(detected.raw?.tags_slugs ?? [])].filter(Boolean)
    : [];
  const terms = detected?.keywords?.length ? detected.keywords : [];
  const keywordsCombined = buildKeywordsForMapping(keywordsUsuario, terms);

  const rawForJson = detected?.raw
    ? {
        tipo_actividad: detected.raw.tipo_actividad,
        sector_slug: detected.raw.sector_slug,
        tags_slugs: detected.raw.tags_slugs,
        keywords: detected.raw.keywords,
        confianza: detected.raw.confianza,
      }
    : null;

  const { candidatas, principalId, matchedNormalizedKeywords } = await mapKeywordsToSubcategories(
    supabase,
    keywordsCombined.length ? keywordsCombined : terms
  );

  const now = new Date().toISOString();

  if (candidatas.length === 0) {
    const aiPayload =
      terms.length || keywordsIa.length
        ? { keywords: keywordsCombined, keywords_ia: keywordsIa, confianza: detected?.confianza ?? 0 }
        : null;

    await supabase
      .from("emprendedores")
      .update({
        ai_keywords_json: aiPayload,
        ai_raw_classification_json: rawForJson,
        subcategoria_principal_id: null,
        categoria_id: null,
        estado_publicacion: "pendiente_aprobacion",
        motivo_verificacion:
          "Sin subcategoría asignada por clasificación automática. Requiere asignación manual.",
        classification_status: CLASSIFICATION_STATUS.PENDIENTE_REVISION,
        classification_confidence: detected?.confianza ?? null,
        classification_review_required: true,
        updated_at: now,
      })
      .eq("id", emprendedorId);

    await supabase.from("emprendedor_subcategorias").delete().eq("emprendedor_id", emprendedorId);

    try {
      await supabase.from("clasificacion_pendiente").upsert(
        {
          emprendedor_id: emprendedorId,
          status: "pendiente",
          prioridad: 0,
          texto_fuente: textForAI || null,
          keywords_detectadas_json:
            keywordsCombined.length || keywordsIa.length
              ? { keywords: keywordsCombined, keywords_ia: keywordsIa }
              : null,
          sugerencias_json: rawForJson ?? null,
          motivo:
            "Sin subcategoría asignada por clasificación automática. Requiere asignación manual.",
          updated_at: now,
        },
        { onConflict: "emprendedor_id" }
      );
    } catch {
      // Tabla clasificacion_pendiente puede no existir si la migración no se ha ejecutado
    }

    return {
      ok: false,
      subcategoriasAssigned: 0,
      needsManualReview: true,
      estado_publicacion: "pendiente_aprobacion",
      motivo_verificacion:
        "Sin subcategoría asignada por clasificación automática. Requiere asignación manual.",
      error: "No se encontró ninguna subcategoría válida",
    };
  }

  await assignBusinessSubcategories(supabase, emprendedorId, candidatas, {
    ai_keywords_json:
      keywordsCombined.length || keywordsIa.length
        ? { keywords: keywordsCombined, keywords_ia: keywordsIa, confianza: detected?.confianza }
        : null,
    ai_raw_classification_json: rawForJson,
  });

  const confidence = detected?.confianza ?? 0;
  const lowConfidence = confidence < CONFIDENCE_THRESHOLD;
  const classificationStatus = lowConfidence
    ? CLASSIFICATION_STATUS.PENDIENTE_REVISION
    : CLASSIFICATION_STATUS.CLASIFICADA_AUTOMATICA;

  const publishingDecision = getPublishingDecision({
    sector_slug: detected?.raw?.sector_slug ?? null,
    tags_slugs: detected?.raw?.tags_slugs ?? null,
    keywords_clasificacion: keywordsCombined.length ? keywordsCombined : null,
    tipo_actividad: detected?.raw?.tipo_actividad ?? null,
  });

  await supabase
    .from("emprendedores")
    .update({
      classification_status: classificationStatus,
      classification_confidence: confidence,
      classification_review_required: lowConfidence,
      estado_publicacion: publishingDecision.estado_publicacion,
      motivo_verificacion: publishingDecision.motivo_verificacion,
      tipo_actividad: detected?.raw?.tipo_actividad ?? null,
      sector_slug: detected?.raw?.sector_slug ?? null,
      updated_at: now,
    })
    .eq("id", emprendedorId);

  if (lowConfidence) {
    try {
      await supabase.from("clasificacion_pendiente").upsert(
        {
          emprendedor_id: emprendedorId,
          status: "pendiente",
          prioridad: 0,
          updated_at: now,
        },
        { onConflict: "emprendedor_id" }
      );
    } catch {
      // Tabla clasificacion_pendiente puede no existir
    }
  } else {
    try {
      await supabase.from("clasificacion_pendiente").delete().eq("emprendedor_id", emprendedorId);
    } catch {
      // Tabla clasificacion_pendiente puede no existir
    }
    // Clasificación exitosa y no pendiente de revisión: incrementar usage_count de las keywords que hicieron match
    if (matchedNormalizedKeywords.length > 0) {
      await incrementKeywordUsageCount(supabase, matchedNormalizedKeywords);
    }
  }

  return {
    ok: true,
    subcategoriasAssigned: candidatas.length,
    principalId: principalId ?? undefined,
    needsManualReview: lowConfidence,
    estado_publicacion: publishingDecision.estado_publicacion,
    motivo_verificacion: publishingDecision.motivo_verificacion ?? undefined,
  };
}
