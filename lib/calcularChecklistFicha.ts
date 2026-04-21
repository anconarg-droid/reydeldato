import { tieneFichaCompleta } from "@/lib/tieneFichaCompleta";

export type CalcularChecklistFichaInput = {
  descripcion_libre?: string | null;
  frase_negocio?: string | null;
  whatsapp_principal?: string | null;
  foto_principal_url?: string | null;
  galeria_count?: number | null;
  instagram?: string | null;
  sitio_web?: string | null;

  plan_activo?: boolean | null;
  plan_expira_at?: string | null;
  trial_expira_at?: string | null;
  trial_expira?: string | null;
};

/**
 * Pendientes para alcanzar **perfil completo** (solo trial/plan vigente).
 */
export function calcularChecklistFicha(
  input: CalcularChecklistFichaInput
): string[] {
  const faltantes: string[] = [];

  const suscripcion = tieneFichaCompleta({
    planActivo: input.plan_activo,
    planExpiraAt: input.plan_expira_at ?? null,
    trialExpiraAt: input.trial_expira_at ?? null,
    trialExpira: input.trial_expira ?? null,
  });

  if (!suscripcion) {
    faltantes.push("Activa tu periodo de prueba o un plan para tener perfil completo");
  }

  return faltantes;
}
