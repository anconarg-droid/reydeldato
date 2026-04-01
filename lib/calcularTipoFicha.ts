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
};

/** Normaliza a string recortado; vacío si null/undefined. */
export function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

/**
 * Tipo de ficha por contenido (sin plan, trial ni verificación).
 * Básica mínima: nombre, WhatsApp, frase, comuna, cobertura.
 * Completa: además descripción ≥120, ≥2 fotos en total, Instagram o web.
 */
export function calcularTipoFicha(input: CalcularTipoFichaInput): TipoFicha {
  const basicaOk =
    s(input.nombre_emprendimiento).length > 0 &&
    s(input.whatsapp_principal).length > 0 &&
    s(input.frase_negocio).length > 0 &&
    Number(input.comuna_id) > 0 &&
    s(input.cobertura_tipo).length > 0;

  if (!basicaOk) return "basica";

  const descripcionOk = s(input.descripcion_libre).length >= 120;

  const totalFotos =
    (s(input.foto_principal_url) ? 1 : 0) + Number(input.galeria_count || 0);
  const fotosOk = totalFotos >= 2;

  const canalExtraOk =
    s(input.instagram).length > 0 || s(input.sitio_web).length > 0;

  return descripcionOk && fotosOk && canalExtraOk ? "completa" : "basica";
}
