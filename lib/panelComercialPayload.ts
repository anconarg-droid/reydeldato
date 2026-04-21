import type { EstadoComercialEmprendedor } from "@/lib/getEstadoComercialEmprendedor";
import type { PlanEstado } from "@/lib/planEstado";

/** Respuesta `comercial` de `GET /api/panel/negocio`. */
export type PanelComercialPayload = {
  /** Estado fino para copy y CTAs (panel / planes). */
  estado: EstadoComercialEmprendedor;
  esPerfilCompletoComercial: boolean;
  fechaExpiracion: string | null;
  diasRestantes: number | null;
  planTipo: string | null;
  planPeriodicidad: string | null;
  sugiereRenovarPlan: boolean;
  /** Compat: trial | perfil_completo | perfil_basico */
  planEstado: PlanEstado;
  subtitulo: string;
  trialIniciaAt: string | null;
  trialExpiraAt: string | null;
  planIniciaAt: string | null;
  planExpiraAt: string | null;
};
