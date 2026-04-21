import {
  ESTADO_PUBLICACION,
  normalizeEstadoPublicacionDb,
} from "@/lib/estadoPublicacion";

/**
 * Postulación `edicion_publicado` activa (borrador o enviada a revisión).
 * El GET `/api/panel/negocio` expone `postulacionActiva` cuando hay merge desde esa fila.
 */
export function panelPreviewTieneEdicionPublicadaPendiente(
  item: Record<string, unknown> | null | undefined
): boolean {
  if (!item || typeof item !== "object") return false;
  const pa = item.postulacionActiva as Record<string, unknown> | null | undefined;
  if (!pa || typeof pa !== "object") return false;
  const tipo = String(pa.tipo ?? "").trim();
  const est = String(pa.estado ?? "").trim().toLowerCase();
  if (tipo !== "edicion_publicado") return false;
  return est === "borrador" || est === "pendiente_revision";
}

/**
 * `true` cuando la ficha **no** está operativa como pública en el panel:
 * - no publicada, o
 * - publicada pero con edición pendiente de aprobación.
 */
export function panelPreviewDebeBloquearAccionesPublicas(
  item: Record<string, unknown> | null | undefined
): boolean {
  if (!item || typeof item !== "object") return true;
  const ep = normalizeEstadoPublicacionDb(String(item.estado_publicacion ?? ""));
  if (ep !== ESTADO_PUBLICACION.publicado) return true;
  return panelPreviewTieneEdicionPublicadaPendiente(item);
}

/** Subtítulo bajo "Vista previa de tu ficha" en la card del panel. */
export function panelPreviewSubtituloInformativo(
  item: Record<string, unknown> | null | undefined
): string {
  if (!item || typeof item !== "object") {
    return "Así se verá cuando tu ficha sea publicada o aprobada.";
  }
  const ep = normalizeEstadoPublicacionDb(String(item.estado_publicacion ?? ""));
  if (ep !== ESTADO_PUBLICACION.publicado) {
    return "Así se verá cuando tu ficha sea publicada o aprobada.";
  }
  return "Así se verá cuando tus cambios sean aprobados.";
}

/** Banner sobre el embed de ficha completa en el panel. */
export function panelPreviewMensajeEmbed(item: Record<string, unknown>): {
  titulo: string;
  cuerpo: string;
} {
  const ep = normalizeEstadoPublicacionDb(String(item.estado_publicacion ?? ""));
  if (ep === ESTADO_PUBLICACION.en_revision) {
    return {
      titulo: "Tu ficha está en revisión",
      cuerpo:
        "Te avisaremos cuando sea aprobada. No está visible en el sitio público; abajo ves una vista previa de cómo quedará.",
    };
  }
  if (ep === ESTADO_PUBLICACION.publicado && panelPreviewTieneEdicionPublicadaPendiente(item)) {
    return {
      titulo: "Tienes cambios pendientes de aprobación",
      cuerpo:
        "La ficha pública sigue mostrando la versión aprobada. Abajo ves cómo se verán tus cambios cuando los aprueben.",
    };
  }
  return {
    titulo: "Vista previa de tu ficha",
    cuerpo: "Así se verá cuando tu ficha sea publicada o aprobada.",
  };
}
