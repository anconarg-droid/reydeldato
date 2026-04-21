import { calcularEstadoFicha } from "@/lib/estadoFicha";

export type TipoFicha = "basica" | "completa";

export type CalcularTipoFichaInput = {
  nombre_emprendimiento?: string | null;
  whatsapp_principal?: string | null;
  frase_negocio?: string | null;
  comuna_id?: number | null;
  cobertura_tipo?: string | null;

  descripcion_libre?: string | null;
  foto_principal_url?: string | null;
  galeria_count?: number | null;

  instagram?: string | null;
  sitio_web?: string | null;

  plan_activo?: boolean | null;
  plan_expira_at?: string | null;
  trial_expira_at?: string | null;
  trial_expira?: string | null;
};

/** Normaliza a string recortado; vacío si null/undefined. */
export function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

/**
 * Alineado al panel y listados: **completa** = `calcularEstadoFicha` → `mejorada` (solo trial/plan vigente).
 */
export function calcularTipoFicha(input: CalcularTipoFichaInput): TipoFicha {
  return calcularEstadoFicha({
    nombre_emprendimiento: input.nombre_emprendimiento,
    whatsapp_principal: input.whatsapp_principal,
    frase_negocio: input.frase_negocio,
    comuna_id: input.comuna_id,
    cobertura_tipo: input.cobertura_tipo,
    descripcion_libre: input.descripcion_libre,
    foto_principal_url: input.foto_principal_url,
    galeria_count: input.galeria_count,
    instagram: input.instagram,
    sitio_web: input.sitio_web,
    plan_activo: input.plan_activo,
    plan_expira_at: input.plan_expira_at ?? null,
    trial_expira_at: input.trial_expira_at ?? null,
    trial_expira: input.trial_expira ?? null,
  }) === "mejorada"
    ? "completa"
    : "basica";
}
