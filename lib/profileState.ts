/**
 * Estado visual/funcional de la ficha del emprendimiento.
 * `isFullProfile` sigue `calcularEstadoFicha` (solo suscripción: trial o plan vigente).
 */

import type { PlanEstadoInput } from "./planEstado";
import { calcularEstadoFicha } from "./estadoFicha";

function parseDate(v: string | null | undefined): Date | null {
  if (v == null || String(v).trim() === "") return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Días para considerar "Nuevo" (ficha completa por trial). */
export const NEW_PROFILE_DAYS = 90;

/** Días para mostrar el badge "🆕 Nuevo" sobre la foto. */
export const NEW_BADGE_DAYS = 30;

export type ProfileState = {
  isNew: boolean;
  isFullProfile: boolean;
  isBasicProfile: boolean;
  showNewBadge: boolean;
  showFullProfileBadge: boolean;
};

export type GetProfileStateInput = PlanEstadoInput & {
  createdAt?: string | null;
};

/**
 * Calcula el estado del perfil para UI.
 * isFullProfile = misma regla comercial que listados y `/emprendedor/[slug]`.
 */
export function getProfileState(
  createdAt: string | null | undefined,
  options: {
    planActivo?: boolean | null;
    planExpiraAt?: string | null;
    trialExpiraAt?: string | null;
    trialExpira?: string | null;
    descripcionLibre?: string | null;
    fraseNegocio?: string | null;
    whatsappPrincipal?: string | null;
    fotoPrincipalUrl?: string | null;
    instagram?: string | null;
    sitioWeb?: string | null;
  }
): ProfileState {
  const created = parseDate(createdAt);
  const createdDaysAgo = created
    ? (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24)
    : Infinity;
  const isNew = createdDaysAgo <= NEW_PROFILE_DAYS;
  const showNewBadge = createdDaysAgo <= NEW_BADGE_DAYS;

  const isFullProfile =
    calcularEstadoFicha({
      nombre_emprendimiento: null,
      whatsapp_principal: options?.whatsappPrincipal ?? null,
      frase_negocio: options?.fraseNegocio ?? null,
      comuna_id: null,
      cobertura_tipo: null,
      descripcion_libre: options?.descripcionLibre ?? null,
      galeria_count: null,
      foto_principal_url: options?.fotoPrincipalUrl,
      instagram: options?.instagram,
      sitio_web: options?.sitioWeb,
      plan_activo: options?.planActivo === true ? true : options?.planActivo ?? null,
      plan_expira_at: options?.planExpiraAt ?? null,
      trial_expira_at: options?.trialExpiraAt ?? null,
      trial_expira: options?.trialExpira ?? null,
    }) === "mejorada";
  const isBasicProfile = !isFullProfile;

  return {
    isNew,
    isFullProfile,
    isBasicProfile,
    showNewBadge,
    showFullProfileBadge: isFullProfile,
  };
}
