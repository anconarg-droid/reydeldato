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
 * Mensaje fijo de producto: trial, precio referencial y continuidad en ficha básica.
 * Usar en panel / planes (no implica cambiar precios en checkout).
 */
export const COPY_PLAN_GRATIS_LUEGO_BASICO =
  "Gratis por 90 días. Luego puedes mantener tu ficha completa desde $3.500/mes. Si no continúas, tu negocio sigue visible con datos básicos.";

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
  return "Sin plan de pago activo: tu negocio sigue visible como perfil básico (contacto y datos esenciales).";
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
          ? `Periodo de prueba: te quedan ${dTxt} días con ficha completa.`
          : "Periodo de prueba: tienes ficha completa activa.",
        subtexto: COPY_PLAN_GRATIS_LUEGO_BASICO,
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
          "Tu negocio sigue publicado: los vecinos pueden contactarte por WhatsApp. Con ficha completa destacas más en el directorio en crecimiento de tu zona.",
        subtexto: COPY_PLAN_GRATIS_LUEGO_BASICO,
      };
  }
}

/** Bloque superior de `/panel/planes` sin id/comercial válido (sin mensajes de error). */
export function copyBloqueSuperiorPlanesSinContextoNegocio(): CopyBloqueEstadoPlanes {
  return {
    titulo: "Planes de ficha completa",
    texto: COPY_PLAN_GRATIS_LUEGO_BASICO,
    subtexto:
      "Ficha completa: más fotos, descripción y enlaces. Ficha básica: visible con lo esencial y WhatsApp.",
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
        texto: `Aprovecha estos días para recibir visitas y contactos. ${COPY_PLAN_GRATIS_LUEGO_BASICO}`,
        cta: "Ver planes",
      };
    case "trial_por_vencer":
      return {
        titulo: "Tu periodo de prueba está por terminar",
        texto: dTxt
          ? `Te quedan ${dTxt} días con ficha completa. ${COPY_PLAN_GRATIS_LUEGO_BASICO}`
          : `Tu periodo de prueba está por terminar. ${COPY_PLAN_GRATIS_LUEGO_BASICO}`,
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
        titulo: "Tu ficha está en modo básico",
        texto:
          "Tu negocio sigue visible con datos básicos. En el directorio en crecimiento de tu zona, la ficha completa ayuda a que más vecinos te encuentren y confíen en ti.\n\n" +
          COPY_PLAN_GRATIS_LUEGO_BASICO,
        cta: "Ver planes",
      };
    case "vencido_reciente":
      return {
        titulo: "Tu ficha volvió a modo básico",
        texto:
          "Tu plan venció recientemente: sigues visible con datos básicos. Reactiva la ficha completa para destacar de nuevo en el directorio en crecimiento de tu zona.",
        cta: "Volver a activar",
      };
  }
}
