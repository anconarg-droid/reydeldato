/**
 * Línea secundaria de cobertura en cards (debajo de 📍 comuna base · región).
 * Sin listar comunas: solo mensajes fijos o regiones abreviadas.
 */

import { normalizeCoberturaTipoDb } from "@/lib/cobertura";
import { getRegionShort } from "@/utils/regionShort";

const MAX_CARD_COBERTURA_LEN = 52;

export function humanizeCoverageSlug(slug: string): string {
  return String(slug || "")
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function dedupeSlugs(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of arr) {
    const t = String(raw || "").trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

function regionLabelForCard(slug: string): string {
  const human = humanizeCoverageSlug(slug);
  return getRegionShort(human) || human;
}

export function buildAtiendeLine(input: {
  coberturaTipo: string;
  regionesCobertura?: string[] | null;
}): string {
  const tipo = normalizeCoberturaTipoDb(input.coberturaTipo);
  if (!tipo || tipo === "solo_comuna") return "";

  if (tipo === "nacional") return "Atiende todo Chile";

  if (tipo === "varias_comunas") return "Atiende varias comunas";

  const regs = dedupeSlugs(
    Array.isArray(input.regionesCobertura) ? input.regionesCobertura : [],
  );

  if (tipo === "varias_regiones") {
    if (regs.length === 0) return "Atiende varias regiones";

    const labels = regs.map(regionLabelForCard);

    if (labels.length === 1) {
      const line = `Atiende ${labels[0]}`;
      return line.length <= MAX_CARD_COBERTURA_LEN
        ? line
        : "Atiende varias regiones";
    }

    if (labels.length === 2) {
      const line = `Atiende ${labels[0]} y ${labels[1]}`;
      return line.length <= MAX_CARD_COBERTURA_LEN
        ? line
        : "Atiende varias regiones";
    }

    return "Atiende varias regiones";
  }

  return "";
}
