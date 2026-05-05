import { normalizeText } from "@/lib/search/normalizeText";

/** Etiquetas legibles para slugs de `subcategoria_slug_final` usados en búsqueda global / sinónimos. */
const SLUG_LABELS: Record<string, string> = {
  gasfiteria: "Gasfitería",
  peluqueria: "Peluquería",
  barberia: "Barbería",
  carniceria: "Carnicería",
  terapias_alternativas: "Terapias alternativas",
  "terapias-holisticas": "Terapias holísticas",
  yoga: "Yoga",
  pasteleria: "Pastelería",
  panaderia: "Panadería",
  mecanico: "Mecánica",
};

function looksLikeSingleSlugToken(s: string): boolean {
  const t = String(s ?? "").trim();
  if (!t || /\s/.test(t)) return false;
  const u = normalizeText(t);
  return /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(u);
}

function normKeyForLabels(slug: string): string {
  return normalizeText(slug).replace(/\s+/g, "");
}

function labelOneSlug(slug: string): string {
  const raw = String(slug ?? "").trim();
  if (!raw) return "";
  const k = normKeyForLabels(raw);
  const kUnderscore = k.replace(/-/g, "_");
  const kHyphen = k.replace(/_/g, "-");
  return (
    SLUG_LABELS[k] ||
    SLUG_LABELS[kUnderscore] ||
    SLUG_LABELS[kHyphen] ||
    raw
      .replace(/[-_]+/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ")
  );
}

/**
 * Convierte un slug interno (p. ej. `gasfiteria`) a texto para UI.
 * Si `slug` parece frase humana (espacios, etc.), se devuelve tal cual.
 * Varios slugs separados por `/`, `,` o `|` → unidos con ` · `.
 */
export function slugToReadableLabel(slug: string): string {
  const t = String(slug ?? "").trim();
  if (!t) return "";
  const parts = t.split(/\s*[/,|]\s*/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1 && !looksLikeSingleSlugToken(parts[0])) {
    return parts[0];
  }
  if (parts.every(looksLikeSingleSlugToken)) {
    if (parts.length === 1) return labelOneSlug(parts[0]);
    return parts.map(labelOneSlug).join(" / ");
  }
  return t;
}
