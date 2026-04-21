import { humanizeCoverageSlug } from "@/lib/search/atiendeResumenLabel";
import { slugify } from "@/lib/slugify";

export type ListadoPinUbicacionComunaInput = {
  fichaContextComunaSlug?: string | null;
  fichaContextComunaNombre?: string | null;
  comunaBuscadaNombre?: string | null;
  comunaBaseSlug?: string | null;
  comunaBaseNombre: string;
  comunaBaseRegionAbrev?: string | null;
  comunasCobertura?: string[] | null;
  bloqueTerritorial: "de_tu_comuna" | "atienden_tu_comuna" | null;
};

/**
 * Línea principal 📍 en cards de listado cuando hay comuna de contexto (búsqueda / directorio).
 * Prioriza la comuna buscada sobre la base física.
 */
export function buildListadoPinUbicacionComuna(
  input: ListadoPinUbicacionComunaInput
): { primary: string; secondary?: string } {
  const buscadaSlug = slugify(String(input.fichaContextComunaSlug ?? "").trim());
  const baseSlug = slugify(String(input.comunaBaseSlug ?? "").trim());
  const nomCtx = String(input.fichaContextComunaNombre ?? "").trim();
  const nomBus = String(input.comunaBuscadaNombre ?? "").trim();
  const nombreBuscada =
    nomCtx || nomBus || (buscadaSlug ? humanizeCoverageSlug(buscadaSlug) : "");

  const baseNom = String(input.comunaBaseNombre || "").trim();
  const reg = String(input.comunaBaseRegionAbrev || "").trim();
  const baseLine =
    baseNom || reg
      ? reg && baseNom
        ? `${baseNom} · ${reg}`
        : baseNom || reg
      : "Sin información de comuna base";

  if (!buscadaSlug || !nombreBuscada) {
    return { primary: `Base en ${baseLine}`, secondary: undefined };
  }

  const cov = input.comunasCobertura ?? [];
  const coberturaIncluye = cov.some((c) => slugify(String(c)) === buscadaSlug);
  const baseCoincide = Boolean(baseSlug && baseSlug === buscadaSlug);
  const enBloqueBase = input.bloqueTerritorial === "de_tu_comuna";
  const enBloqueAtienden = input.bloqueTerritorial === "atienden_tu_comuna";

  if (baseCoincide || enBloqueBase) {
    return { primary: `En ${nombreBuscada}`, secondary: undefined };
  }

  if (coberturaIncluye || enBloqueAtienden) {
    const secondary =
      baseSlug && buscadaSlug && baseSlug !== buscadaSlug ? `Base en ${baseLine}` : undefined;
    return { primary: `Atiende ${nombreBuscada}`, secondary };
  }

  return { primary: `Base en ${baseLine}`, secondary: undefined };
}
