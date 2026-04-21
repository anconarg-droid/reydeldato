import { normalizeCoberturaTipoDb } from "@/lib/cobertura";
import { humanizeCoverageSlug } from "@/lib/search/atiendeResumenLabel";

export type TerritorialCardLinesInput = {
  comunaBaseNombre: string;
  comunaBaseRegionAbrev?: string | null;
  coberturaTipo?: string;
  comunasCobertura?: string[] | null;
  /** Comuna del local físico principal (texto legible). */
  localFisicoComunaNombre?: string | null;
  /**
   * Línea única desde `emprendedor_locales` (comuna + dirección corta o “Local en X y Y”).
   * Si viene definida, sustituye la línea derivada de `localFisicoComunaNombre`.
   */
  lineaLocalesEmprendedor?: string | null;
  /** Salida de `buildAtiendeLine` (nacional, regional, o “varias comunas” sin conteo). */
  atiendeLineFallback: string;
  /**
   * Perfil completo en listado (trial/plan): se puede mostrar dirección resumida del local.
   * En perfil básico, no mostrar dirección exacta.
   */
  listadoMuestraDireccionLocal?: boolean;
  /** `true` si modalidades incluyen local físico (para línea genérica sin dirección en plan básico). */
  tieneModalidadLocalFisico?: boolean;
};

export type TerritorialCardSections = {
  /** Base + región y, si aplica, locales físicos (dirección resumida). */
  ubicacionLines: string[];
  /** Alcance territorial (N comunas, regional, nacional). */
  coberturaLines: string[];
};

const COBERTURA_COMUNAS_PREVIEW_MAX = 3;

function dedupeComunaTokensPreserveOrder(tokens: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tokens) {
    const t = String(raw ?? "").trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

/**
 * Lista 2–3 nombres de comuna legibles (desde slug o nombre) y `+N` si hay más.
 * Ej.: "Atiende: Padre Hurtado, Talagante, Estación Central +2"
 */
export function buildAtiendeComunasPreviewLine(comunasRaw: string[]): string | null {
  const unique = dedupeComunaTokensPreserveOrder(comunasRaw);
  if (unique.length === 0) return null;
  const labels = unique.map((c) => humanizeCoverageSlug(c));
  const shown = labels.slice(0, COBERTURA_COMUNAS_PREVIEW_MAX);
  const extra = labels.length - shown.length;
  const head = shown.join(", ");
  if (extra > 0) return `Atiende: ${head} +${extra}`;
  return `Atiende: ${head}`;
}

/**
 * Separa ubicación (dónde está / locales) de cobertura (dónde atiende) para jerarquía en la card.
 */
export function buildTerritorialResumenCardSections(
  input: TerritorialCardLinesInput
): TerritorialCardSections {
  const ubicacionLines: string[] = [];
  const coberturaLines: string[] = [];

  const base = String(input.comunaBaseNombre || "").trim() || "—";
  const reg = String(input.comunaBaseRegionAbrev || "").trim();
  ubicacionLines.push(reg ? `Base en ${base} · ${reg}` : `Base en ${base}`);

  const tipo = normalizeCoberturaTipoDb(input.coberturaTipo);
  const comunas = Array.isArray(input.comunasCobertura)
    ? input.comunasCobertura.map((x) => String(x ?? "").trim()).filter(Boolean)
    : [];
  const nComunas = new Set(comunas.map((c) => c.toLowerCase())).size;

  if (tipo === "varias_comunas") {
    if (nComunas > 0) {
      const preview = buildAtiendeComunasPreviewLine(comunas);
      if (preview) coberturaLines.push(preview);
      else {
        coberturaLines.push(
          nComunas === 1 ? "Atiende 1 comuna" : `Atiende ${nComunas} comunas`
        );
      }
    } else {
      const fb = String(input.atiendeLineFallback || "").trim();
      if (fb) coberturaLines.push(fb);
    }
  } else if (tipo === "nacional" || tipo === "varias_regiones") {
    const fb = String(input.atiendeLineFallback || "").trim();
    if (fb) coberturaLines.push(fb);
  }

  const muestraDir = input.listadoMuestraDireccionLocal !== false;
  const tieneLocalMod = input.tieneModalidadLocalFisico === true;
  const lineaLocales = String(input.lineaLocalesEmprendedor ?? "").trim();

  if (muestraDir) {
    if (lineaLocales) {
      ubicacionLines.push(lineaLocales);
    } else {
      const local = String(input.localFisicoComunaNombre || "").trim();
      if (local) {
        const baseLc = base.toLowerCase();
        const localLc = local.toLowerCase();
        if (localLc !== baseLc) {
          ubicacionLines.push(`Local en ${local}`);
        }
      }
    }
  } else if (tieneLocalMod) {
    ubicacionLines.push("Local físico");
  }

  return { ubicacionLines, coberturaLines };
}

/**
 * Orden legacy en una sola lista: ubicación primero, luego cobertura (mismo contenido que {@link buildTerritorialResumenCardSections}).
 */
export function buildTerritorialResumenCardLines(
  input: TerritorialCardLinesInput
): string[] {
  const { ubicacionLines, coberturaLines } =
    buildTerritorialResumenCardSections(input);
  return [...ubicacionLines, ...coberturaLines];
}
