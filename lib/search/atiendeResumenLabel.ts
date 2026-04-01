/**
 * Texto "Atiende: …" para cards de resultados (directorio, sin marketing vago).
 * Usa cobertura_tipo + arrays del emprendedor y la comuna buscada en contexto.
 */

export function humanizeCoverageSlug(slug: string): string {
  return String(slug || "")
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function buildAtiendeLine(input: {
  coberturaTipo: string;
  comunasCobertura?: string[] | null;
  regionesCobertura?: string[] | null;
  comunaBuscadaSlug: string;
  comunaBuscadaNombre: string;
}): string {
  const tipo = String(input.coberturaTipo || "").trim();
  if (!tipo || tipo === "solo_comuna") return "";
  if (tipo === "nacional") return "Atiende: Todo Chile";

  const coms = Array.isArray(input.comunasCobertura)
    ? input.comunasCobertura.map((x) => String(x).trim()).filter(Boolean)
    : [];
  const regs = Array.isArray(input.regionesCobertura)
    ? input.regionesCobertura.map((x) => String(x).trim()).filter(Boolean)
    : [];

  if (tipo === "varias_comunas") {
    if (coms.length > 1) return "Atiende: varias comunas";
    if (coms.length === 1) {
      const one = coms[0].toLowerCase();
      const bus = String(input.comunaBuscadaSlug || "").toLowerCase();
      if (one === bus && input.comunaBuscadaNombre.trim())
        return `Atiende: ${input.comunaBuscadaNombre.trim()}`;
      return `Atiende: ${humanizeCoverageSlug(coms[0])}`;
    }
    return "Atiende: varias comunas";
  }

  if (tipo === "varias_regiones") {
    if (regs.length > 1) return "Atiende: varias regiones";
    if (regs.length === 1) {
      const label = humanizeCoverageSlug(regs[0]);
      const low = label.toLowerCase();
      if (low.startsWith("región ") || low.startsWith("region "))
        return `Atiende: ${label}`;
      return `Atiende: Región ${label}`;
    }
    return "Atiende: varias regiones";
  }

  return "";
}
