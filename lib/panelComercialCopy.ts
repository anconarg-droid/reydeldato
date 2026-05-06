import type { PlanEstado } from "@/lib/planEstado";
import type { EstadoComercialEmprendedor } from "@/lib/getEstadoComercialEmprendedor";
import type { PanelComercialPayload } from "@/lib/panelComercialPayload";

function fechaValidaIso(iso: string | null | undefined): boolean {
  if (iso == null || String(iso).trim() === "") return false;
  const d = new Date(String(iso));
  return !Number.isNaN(d.getTime());
}

function iniEfectivaPlanPagadoMs(
  iniciaAt: string | null | undefined,
  expiraAt: string | null | undefined,
  nowMs: number
): number | null {
  const iniS = String(iniciaAt ?? "").trim();
  const ini = fechaValidaIso(iniS) ? new Date(iniS).getTime() : null;
  if (ini != null) return ini;
  /** Compat BD: inferir desde fin − 30d sólo cuando el fin es plausible y cercano (“mensual”). */
  const finS = String(expiraAt ?? "").trim();
  if (!fechaValidaIso(finS)) return null;
  const fin = new Date(finS).getTime();
  if (fin <= nowMs) return null;
  return fin - 30 * 86_400_000;
}

/**
 * Texto requerido arriba de las tarjetas en `/panel/planes` según estado comercial/fechas.
 * (Fuera del “hero” principal para no duplicar el bloque superior existente.)
 */
export function mensajeContextualEncimaTarjetasPlanes(
  comercial: PanelComercialPayload | null,
  now: Date = new Date()
): string | null {
  if (!comercial) return null;

  const nowMs = now.getTime();
  const trialVigente =
    comercial.estado === "trial_activo" ||
    comercial.estado === "trial_por_vencer" ||
    comercial.estado === "trial_con_plan_confirmado_programado" ||
    comercial.estado === "trial_por_vencer_con_plan_confirmado_programado";

  const iniMs = iniEfectivaPlanPagadoMs(
    comercial.planIniciaAt,
    comercial.planExpiraAt,
    nowMs
  );
  const finMs = fechaValidaIso(comercial.planExpiraAt)
    ? new Date(String(comercial.planExpiraAt)).getTime()
    : null;

  const planEfectivoVigente =
    (comercial.estado === "plan_activo" || comercial.estado === "plan_por_vencer") &&
    finMs != null &&
    finMs > nowMs &&
    (iniMs == null || iniMs <= nowMs);

  const planProgramado =
    comercial.estado === "trial_con_plan_confirmado_programado" ||
    comercial.estado === "trial_por_vencer_con_plan_confirmado_programado" ||
    comercial.estado === "plan_confirmado_programado" ||
    comercial.estado === "plan_confirmado_programado_por_arrancar" ||
    (Boolean(comercial.planIniciaAt) &&
      fechaValidaIso(comercial.planIniciaAt) &&
      new Date(String(comercial.planIniciaAt)).getTime() > nowMs &&
      comercial.estado !== "trial_activo" &&
      comercial.estado !== "trial_por_vencer");

  if (trialVigente && planProgramado) {
    /** El bloque superior ya explica trial + compra; aquí evitamos repetir la misma línea. */
    return null;
  }

  if (trialVigente) {
    return "Estás en prueba gratis. Si pagas hoy, tu plan pagado comenzará cuando termine tu prueba.";
  }

  if (planProgramado && comercial.planIniciaAt && comercial.planExpiraAt) {
    const a = fechaLargaEs(comercial.planIniciaAt);
    const b = fechaLargaEs(comercial.planExpiraAt);
    if (a && b) {
      return `Tu pago está confirmado. Tu plan pagado comenzará el ${a} y terminará el ${b}.`;
    }
    return null;
  }

  if (planEfectivoVigente) {
    const b = fechaLargaEs(comercial.planExpiraAt);
    return b
      ? `Tu plan pagado está activo hasta el ${b}.`
      : "Tu plan pagado está activo.";
  }

  if (
    comercial.estado === "basico" ||
    comercial.estado === "vencido_reciente" ||
    comercial.estado === "plan_vencido"
  ) {
    return "Puedes activar tu ficha completa eligiendo un plan.";
  }

  return null;
}

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
    case "trial_con_plan_confirmado_programado":
    case "trial_por_vencer_con_plan_confirmado_programado":
      return {
        titulo: "Tu ficha está activa",
        texto: dTxt
          ? `Periodo de prueba: te quedan ${dTxt} días con ficha completa. Además, ya tienes un plan pagado confirmado que comenzará al término de tu prueba.`
          : "Periodo de prueba: tienes ficha completa activa y un plan pagado confirmado que comenzará al término de tu prueba.",
        subtexto: COPY_PLAN_GRATIS_LUEGO_BASICO,
      };
    case "plan_confirmado_programado":
    case "plan_confirmado_programado_por_arrancar":
      return {
        titulo: "Tu plan está confirmado",
        texto:
          "Tu pago está confirmado. Cuando comience tu periodo pagado, tu negocio seguirá apareciendo como perfil completo en las búsquedas.",
        subtexto:
          "Mientras tanto, tu ficha sigue publicada según el estado comercial actual.",
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
    case "plan_vencido":
      return {
        titulo: "Tu ficha está en modo básico",
        texto:
          "Tu plan anterior venció: sigues publicado con datos básicos y WhatsApp. Puedes reactivar la ficha completa eligiendo un plan.",
        subtexto: COPY_PLAN_GRATIS_LUEGO_BASICO,
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
      opts.estado === "trial_por_vencer_con_plan_confirmado_programado" ||
      opts.estado === "plan_por_vencer" ||
      opts.estado === "plan_confirmado_programado_por_arrancar")
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
    case "trial_con_plan_confirmado_programado":
      return {
        titulo: "Tu ficha está activa (prueba + plan confirmado)",
        texto: `Tienes periodo de prueba y además un plan pagado confirmado que comenzará al término de la prueba. ${COPY_PLAN_GRATIS_LUEGO_BASICO}`,
        cta: "Ver planes",
      };
    case "trial_por_vencer_con_plan_confirmado_programado":
      return {
        titulo: "Tu prueba está por terminar (plan confirmado)",
        texto: dTxt
          ? `Te quedan ${dTxt} días con ficha completa. Además, ya tienes un plan pagado confirmado. ${COPY_PLAN_GRATIS_LUEGO_BASICO}`
          : `Tu periodo de prueba está por terminar y ya tienes un plan pagado confirmado. ${COPY_PLAN_GRATIS_LUEGO_BASICO}`,
        cta: "Ver planes",
      };
    case "plan_confirmado_programado":
    case "plan_confirmado_programado_por_arrancar":
      return {
        titulo: "Plan confirmado (aún no arranca)",
        texto:
          "Tu pago está confirmado. Cuando empiece tu periodo pagado, tu negocio seguirá como perfil completo.",
        cta: "Ver mi plan",
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
    case "plan_vencido":
      return {
        titulo: "Tu plan venció",
        texto:
          "Tu negocio sigue visible como perfil básico (WhatsApp y datos esenciales). Reactiva tu ficha completa cuando quieras.",
        cta: "Volver a activar",
      };
    default: {
      const _exhaustive: never = opts.estado;
      return {
        titulo: "Tu ficha",
        texto:
          typeof _exhaustive === "string"
            ? `Estado comercial: ${_exhaustive}`
            : "Actualiza esta pantalla para ver el estado comercial más reciente.",
        cta: "Ver planes",
      };
    }
  }
}
