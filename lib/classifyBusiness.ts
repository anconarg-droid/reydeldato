// lib/classifyBusiness.ts
import type { SupabaseClient } from "@supabase/supabase-js";

export type ClassificationResult = {
  categoria_ia: string | null;
  subcategoria_ia: string | null;
  etiquetas_ia: string[];
  confianza_ia: number | null;
  observacion_ia: string | null;
};

/**
 * Normaliza texto para comparación/búsqueda:
 * minúsculas, sin tildes, sin puntuación, espacios colapsados.
 */
export function toSlugForm(value: string): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function classifyBusiness(params: {
  nombre: string;
  descripcion_corta: string;
  comuna_base_id: number;
  cobertura_tipo: string;
  modalidades?: string[] | null;
}): Promise<ClassificationResult> {
  const text = `${params.nombre} ${params.descripcion_corta}`.toLowerCase();

  if (text.includes("gasfiter")) {
    return {
      categoria_ia: "Hogar y Servicios",
      subcategoria_ia: "Gasfitería",
      etiquetas_ia: ["gasfitería", "destapes", "urgencias"],
      confianza_ia: 0.94,
      observacion_ia: null,
    };
  }

  if (text.includes("manicure") || text.includes("uñas")) {
    return {
      categoria_ia: "Belleza y Cuidado Personal",
      subcategoria_ia: "Manicure",
      etiquetas_ia: ["manicure", "uñas", "belleza"],
      confianza_ia: 0.9,
      observacion_ia: null,
    };
  }

  return {
    categoria_ia: null,
    subcategoria_ia: null,
    etiquetas_ia: [],
    confianza_ia: 0.35,
    observacion_ia: "Clasificación ambigua. Requiere revisión manual.",
  };
}

export type ClassifyAndAssignResult = {
  ok: boolean;
  error?: string;
  needsManualReview: boolean;
  subcategoriasAssigned: number;
  principalId: string | null;
  estado_publicacion?: string;
  motivo_verificacion?: string | null;
};

/**
 * Orquestador esperado por `/api/emprendedor/.../reclasificar` y scripts de backfill.
 * Implementación mínima: no escribe taxonomía hasta reconectar el motor completo (map + IA + pivots).
 */
export async function classifyAndAssignBusiness(
  _supabase: SupabaseClient,
  _emprendedorId: string
): Promise<ClassifyAndAssignResult> {
  return {
    ok: false,
    needsManualReview: true,
    subcategoriasAssigned: 0,
    principalId: null,
    error:
      "La reclasificación automática no está activa en esta versión del código. Usá el panel o moderación para asignar rubros.",
  };
}