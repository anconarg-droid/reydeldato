// lib/publicarValidation.ts
import { normalizeAndFilterKeyword } from "@/lib/keywordValidation";
export type CoberturaTipo = "comuna" | "varias" | "region" | "nacional";
export type ModalidadAtencion = "local" | "domicilio" | "online";

export type PublicarPayload = {
  nombre: string;
  whatsapp: string;
  comuna_base_id: number;
  descripcion_corta: string;
  /** Opcional: keywords separadas por coma o lista. No visible públicamente. */
  keywords_usuario?: string[] | string | null;
  cobertura_tipo: CoberturaTipo;
  cobertura_comunas?: number[] | null;
  modalidades?: ModalidadAtencion[] | null;

  foto_principal_url?: string | null;
  galeria_urls?: string[] | null;
  instagram?: string | null;
  web?: string | null;
  sitio_web?: string | null;
  email?: string | null;
  direccion?: string | null;
  descripcion_libre?: string | null;
  nombre_responsable?: string | null;
  mostrar_responsable_publico?: boolean;
};

function isValidWhatsapp(value: string) {
  const clean = value.replace(/\s+/g, "");
  return /^\+?\d{9,15}$/.test(clean);
}

export function validateNuevoPayload(input: unknown) {
  const data = input as PublicarPayload;
  const errors: string[] = [];

  if (!data?.nombre?.trim()) errors.push("nombre es obligatorio");
  if (!data?.whatsapp?.trim()) errors.push("whatsapp es obligatorio");
  if (!data?.comuna_base_id) errors.push("comuna_base_id es obligatorio");
  if (!data?.descripcion_corta?.trim()) errors.push("descripcion_corta es obligatoria");
  if (!data?.cobertura_tipo) errors.push("cobertura_tipo es obligatorio");

  if (data?.descripcion_corta?.trim()?.length < 40) {
    errors.push("descripcion_corta debe tener al menos 40 caracteres");
  }

  if (data?.whatsapp && !isValidWhatsapp(data.whatsapp)) {
    errors.push("whatsapp no tiene formato válido");
  }

  if (data?.cobertura_tipo === "varias") {
    if (!Array.isArray(data.cobertura_comunas) || data.cobertura_comunas.length === 0) {
      errors.push("cobertura_comunas es obligatoria cuando cobertura_tipo = varias");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    data,
  };
}

export function validatePatchPayload(input: unknown) {
  const data = input as Partial<PublicarPayload>;
  const allowedKeys = [
    "paso_actual",
    "estado",
    "foto_principal_url",
    "galeria_urls",
    "instagram",
    "web",
    "email",
    "direccion",
    "direccion_referencia",
    "modalidades",
    "modalidades_atencion",
    "descripcion_corta",
    "frase_negocio",
    "cobertura_tipo",
    "cobertura_comunas",
    "comunas_cobertura",
    "regiones_cobertura",
    "nombre",
    "nombre_emprendimiento",
    "whatsapp",
    "whatsapp_principal",
    "comuna_base_id",
    "descripcion_libre",
    "sitio_web",
    "nombre_responsable",
    "mostrar_responsable_publico",
    "categoria_id",
    "subcategorias_ids",
    "keywords_usuario",
  ];

  const extraKeys = Object.keys(data || {}).filter((k) => !allowedKeys.includes(k));
  if (extraKeys.length > 0) {
    return {
      valid: false,
      errors: [`Campos no permitidos: ${extraKeys.join(", ")}`],
      data,
    };
  }

  return {
    valid: true,
    errors: [] as string[],
    data,
  };
}

const BORRADOR_PATCH_STRING_KEYS = new Set([
  "estado",
  "foto_principal_url",
  "instagram",
  "web",
  "email",
  "direccion",
  "direccion_referencia",
  "descripcion_corta",
  "frase_negocio",
  "cobertura_tipo",
  "nombre",
  "nombre_emprendimiento",
  "whatsapp",
  "whatsapp_principal",
  "descripcion_libre",
  "sitio_web",
  "nombre_responsable",
]);

const BORRADOR_PATCH_INT_KEYS = new Set([
  "comuna_base_id",
  "paso_actual",
  "categoria_id",
]);

const BORRADOR_PATCH_STRING_ARRAY_KEYS = new Set([
  "galeria_urls",
  "comunas_cobertura",
  "regiones_cobertura",
  "modalidades",
  "modalidades_atencion",
  "keywords_usuario",
]);

function optionalStringOrStringArray(v: unknown): string[] | undefined {
  if (typeof v === "string") return [v];
  if (!Array.isArray(v)) return undefined;
  return v.every((x) => typeof x === "string") ? [...v] : undefined;
}

function normalizeKeywordsUsuario(raw: unknown): string[] | undefined {
  const list = optionalStringOrStringArray(raw);
  if (!list) return undefined;

  const joined = list.length === 1 ? String(list[0] ?? "") : list.join(",");
  const parts = joined
    .split(",")
    .map((x) => String(x ?? "").trim())
    .filter(Boolean);

  const out: string[] = [];
  for (const p of parts) {
    const norm = normalizeAndFilterKeyword(p);
    if (norm) out.push(norm);
  }
  return [...new Set(out)].slice(0, 20);
}

function optionalInt(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return Math.trunc(n);
  }
  return undefined;
}

function optionalNumberArray(v: unknown): number[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: number[] = [];
  for (const x of v) {
    if (typeof x === "number" && Number.isFinite(x)) {
      out.push(Math.trunc(x));
      continue;
    }
    if (typeof x === "string" && x.trim() !== "") {
      const n = Number(x);
      if (Number.isFinite(n)) out.push(Math.trunc(n));
      else return undefined;
      continue;
    }
    return undefined;
  }
  return out;
}

function optionalStringArray(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  return v.every((x) => typeof x === "string") ? [...v] : undefined;
}

/**
 * PATCH borrador: solo claves permitidas y tipos coherentes.
 * Omite claves desconocidas y valores `undefined` sin error (actualización parcial).
 */
export function extractBorradorPatchFromBody(
  body: Record<string, unknown>
): Record<string, unknown> {
  const normalized: Record<string, unknown> = { ...body };
  if (
    normalized.categoria_id === undefined &&
    "categoriaId" in normalized &&
    normalized.categoriaId !== undefined
  ) {
    normalized.categoria_id = normalized.categoriaId;
  }
  if (
    normalized.subcategorias_ids === undefined &&
    "subcategoriasIds" in normalized &&
    normalized.subcategoriasIds !== undefined
  ) {
    normalized.subcategorias_ids = normalized.subcategoriasIds;
  }

  if (
    normalized.frase_negocio === undefined &&
    "fraseNegocio" in normalized &&
    normalized.fraseNegocio !== undefined
  ) {
    normalized.frase_negocio = normalized.fraseNegocio;
  }
  if (
    normalized.descripcion_libre === undefined &&
    "descripcionNegocio" in normalized &&
    normalized.descripcionNegocio !== undefined
  ) {
    normalized.descripcion_libre = normalized.descripcionNegocio;
  }
  if (
    normalized.nombre_responsable === undefined &&
    "responsable" in normalized &&
    normalized.responsable !== undefined
  ) {
    normalized.nombre_responsable = normalized.responsable;
  }
  if (
    "ocultarResponsable" in normalized &&
    typeof normalized.ocultarResponsable === "boolean" &&
    normalized.mostrar_responsable_publico === undefined
  ) {
    normalized.mostrar_responsable_publico = !normalized.ocultarResponsable;
  }

  const out: Record<string, unknown> = {};

  for (const key of Object.keys(normalized)) {
    const value = normalized[key];
    if (value === undefined) continue;

    if (key === "mostrar_responsable_publico") {
      if (typeof value === "boolean") out[key] = value;
      continue;
    }

    if (key === "keywords_usuario") {
      const kws = normalizeKeywordsUsuario(value);
      if (kws && kws.length > 0) out[key] = kws;
      continue;
    }

    if (BORRADOR_PATCH_INT_KEYS.has(key)) {
      const n = optionalInt(value);
      if (n !== undefined) out[key] = n;
      continue;
    }

    if (BORRADOR_PATCH_STRING_ARRAY_KEYS.has(key)) {
      const arr = optionalStringArray(value);
      if (arr) out[key] = arr;
      continue;
    }

    if (key === "cobertura_comunas") {
      const arr = optionalNumberArray(value);
      if (arr) out[key] = arr;
      continue;
    }

    if (key === "subcategorias_ids") {
      const ids = optionalNumberArray(value);
      if (ids && ids.length > 0) {
        out[key] = [...new Set(ids)];
      }
      continue;
    }

    if (BORRADOR_PATCH_STRING_KEYS.has(key)) {
      if (typeof value === "string") out[key] = value;
      continue;
    }
  }

  return out;
}