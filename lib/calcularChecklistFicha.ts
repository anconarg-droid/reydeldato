export type CalcularChecklistFichaInput = {
  descripcion_libre?: string | null;
  foto_principal_url?: string | null;
  galeria_count?: number | null;
  instagram?: string | null;
  sitio_web?: string | null;
};

function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

/**
 * Pendientes para pasar de “contenido básico” a criterios de ficha completa
 * (mismas reglas que la parte “completa” de calcularTipoFicha, sin plan/trial).
 */
export function calcularChecklistFicha(
  input: CalcularChecklistFichaInput
): string[] {
  const faltantes: string[] = [];

  if (s(input.descripcion_libre).length < 120) {
    faltantes.push("Agrega una descripción más detallada");
  }

  const totalFotos =
    (s(input.foto_principal_url) ? 1 : 0) + Number(input.galeria_count || 0);
  if (totalFotos < 2) {
    faltantes.push("Sube al menos 2 fotos");
  }

  if (s(input.instagram).length === 0 && s(input.sitio_web).length === 0) {
    faltantes.push("Agrega Instagram o sitio web");
  }

  return faltantes;
}
