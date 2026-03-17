/**
 * Estado visual/funcional de la ficha del emprendimiento.
 * Fuente de verdad: solo plan_activo, plan_expira_at, trial_expira_at (no plan, estado ni publicado).
 */

import { getPlanEstado, type PlanEstadoInput } from "./planEstado";

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
 * Calcula el estado del perfil para UI. Solo usa la fuente de verdad:
 * planActivo, planExpiraAt, trialExpiraAt (trialExpira como fallback).
 * isFullProfile = (estado === 'trial' || estado === 'perfil_completo').
 */
export function getProfileState(
  createdAt: string | null | undefined,
  options: {
    planActivo?: boolean | null;
    planExpiraAt?: string | null;
    trialExpiraAt?: string | null;
    trialExpira?: string | null;
  }
): ProfileState {
  const created = parseDate(createdAt);
  const createdDaysAgo = created
    ? (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24)
    : Infinity;
  const isNew = createdDaysAgo <= NEW_PROFILE_DAYS;
  const showNewBadge = createdDaysAgo <= NEW_BADGE_DAYS;

  const estado = getPlanEstado({
    trialExpiraAt: options?.trialExpiraAt ?? options?.trialExpira,
    trialExpira: options?.trialExpira,
    planActivo: options?.planActivo,
    planExpiraAt: options?.planExpiraAt,
  });

  const isFullProfile = estado === "trial" || estado === "perfil_completo";
  const isBasicProfile = estado === "perfil_basico";

  return {
    isNew,
    isFullProfile,
    isBasicProfile,
    showNewBadge,
    showFullProfileBadge: isFullProfile,
  };
}
