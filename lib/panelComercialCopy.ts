import type { PlanEstado } from "@/lib/planEstado";
import type { EstadoComercialEmprendedor } from "@/lib/getEstadoComercialEmprendedor";

export function fechaLargaEs(iso: string | null | undefined): string | null {
  if (iso == null || String(iso).trim() === "") return null;
  const d = new Date(String(iso));
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export {
  diasRestantesHastaIso as diasRestantesHasta,
} from "@/lib/getEstadoComercialEmprendedor";

/**
 * Línea secundaria compacta (API / resúmenes).
 */
export function subtituloEstadoComercialPanel(opts: {
  planEstado: PlanEstado;
  trialExpiraAt: string | null;
  planExpiraAt: string | null;
}): string {
  if (opts.planEstado === "perfil_completo") {
    const f = fechaLargaEs(opts.planExpiraAt);
    return f ? `Plan activo hasta el ${f}.` : "Plan de pago activo.";
  }
  if (opts.planEstado === "trial") {
    const f = fechaLargaEs(opts.trialExpiraAt);
    return f
      ? `Periodo de prueba vigente hasta el ${f}.`
      : "Periodo de prueba vigente.";
  }
  return "Sin plan de pago activo. En listados tu negocio se muestra como perfil básico.";
}

export type CopyBloqueEstadoPlanes = {
  titulo: string;
  texto: string;
  subtexto: string;
};

/** Bloque superior de `/panel/planes` según estado comercial real. */
export function copyBloqueSuperiorPlanesDesdeEstado(opts: {
  estado: EstadoComercialEmprendedor;
  diasRestantes: number | null;
  planExpiraAt: string | null;
}): CopyBloqueEstadoPlanes {
  const d = opts.diasRestantes;
  const dTxt = d != null && d > 0 ? String(d) : null;
  const fechaPlan = fechaLargaEs(opts.planExpiraAt);

  switch (opts.estado) {
    case "trial_activo":
    case "trial_por_vencer":
      return {
        titulo: "Tu ficha está activa",
        texto: dTxt
          ? `Estás en periodo de prueba. Te quedan ${dTxt} días para mantener tu perfil completo antes de pasar a modo básico.`
          : "Estás en periodo de prueba. Activa un plan para mantener tu perfil completo antes de pasar a modo básico.",
        subtexto:
          "Activa un plan para mantener tu perfil completo y recibir más contactos.",
      };
    case "plan_activo":
    case "plan_por_vencer":
      return {
        titulo: "Tu ficha está activa",
        texto: fechaPlan
          ? `Tienes un plan activo hasta el ${fechaPlan}. Tu negocio sigue apareciendo como perfil completo en las búsquedas.`
          : "Tienes un plan activo. Tu negocio sigue apareciendo como perfil completo en las búsquedas.",
        subtexto:
          "Tu ficha completa se mantiene activa mientras tu plan esté vigente.",
      };
    default:
      return {
        titulo: "Tu ficha está en modo básico",
        texto:
          "Si no activas un plan, tu negocio tendrá menos visibilidad y dejará de aparecer en 'mejores opciones'.",
        subtexto:
          "Activa un plan para mantener tu perfil completo y recibir más contactos.",
      };
  }
}

/** Bloque superior de `/panel/planes` sin id/comercial válido (sin mensajes de error). */
export function copyBloqueSuperiorPlanesSinContextoNegocio(): CopyBloqueEstadoPlanes {
  return {
    titulo: "Tu ficha está en modo básico",
    texto:
      "Activa un plan para mantener tu ficha completa activa y recibir más contactos.",
    subtexto: "",
  };
}

/** Banner encima de métricas en `/panel`. */
export function copyBannerComercialPanelDesdeEstado(opts: {
  estado: EstadoComercialEmprendedor;
  diasRestantes: number | null;
  /** Visitas ≥100 o clics ≥10: copy más orientado a conversión (solo ciertos estados). */
  actividadAlta?: boolean;
}): { titulo: string; texto: string; cta: string } {
  const d = opts.diasRestantes;
  const dTxt = d != null && d > 0 ? String(d) : null;

  const actividad = opts.actividadAlta === true;
  if (
    actividad &&
    (opts.estado === "basico" ||
      opts.estado === "trial_por_vencer" ||
      opts.estado === "plan_por_vencer")
  ) {
    return {
      titulo: "Tu negocio ya está recibiendo visitas",
      texto:
        "Si mantienes tu ficha completa activa, puedes recibir más contactos.",
      cta: "Activar plan ahora",
    };
  }

  switch (opts.estado) {
    case "trial_activo":
      return {
        titulo: "Tu ficha está activa (periodo de prueba)",
        texto:
          "Aprovecha estos días para recibir visitas y contactos. Activa un plan antes de que termine para mantener tu visibilidad.",
        cta: "Ver planes",
      };
    case "trial_por_vencer":
      return {
        titulo: "Tu periodo de prueba está por terminar",
        texto: dTxt
          ? `Te quedan ${dTxt} días para seguir apareciendo como perfil completo. Activa un plan para no perder visibilidad.`
          : "Te quedan pocos días para seguir apareciendo como perfil completo. Activa un plan para no perder visibilidad.",
        cta: "Activar plan ahora",
      };
    case "plan_activo":
      return {
        titulo: "Tu ficha está activa",
        texto:
          "Tu negocio está apareciendo como perfil completo. Sigue así para mantener tu visibilidad.",
        cta: "Ver mi plan",
      };
    case "plan_por_vencer":
      return {
        titulo: "Tu plan está por vencer",
        texto: dTxt
          ? `Te quedan ${dTxt} días para mantener tu ficha completa activa. Renueva a tiempo para no perder visibilidad.`
          : "Renueva a tiempo para mantener tu ficha completa activa y no perder visibilidad.",
        cta: "Renovar plan",
      };
    case "basico":
      return {
        titulo: "⚠️ Tu ficha está en modo básico",
        texto:
          'Tu negocio ya no aparece en "mejores opciones" dentro de tu comuna.\n\nEso significa menos visitas y menos contactos.\n\nActiva un plan para volver a destacarte.',
        cta: "Ver planes",
      };
    case "vencido_reciente":
      return {
        titulo: "Tu ficha volvió a modo básico",
        texto:
          "Tu plan venció recientemente. Actívalo de nuevo para recuperar tu visibilidad y volver a aparecer como perfil completo.",
        cta: "Volver a activar",
      };
  }
}
