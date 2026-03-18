function s(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

export function coberturaTexto(nivel?: string, comunas?: string[]): string {
  const n = s(nivel).toLowerCase();

  if (n === "nacional") return "Atiende en todo Chile";
  if (n === "solo_comuna") return "Solo en su comuna";
  if (n === "solo_mi_comuna") return "Solo en su comuna";

  if (n === "varias_comunas") {
    if (comunas?.length) return `Varias comunas: ${comunas.join(", ")}`;
    return "Varias comunas";
  }

  if (n === "varias_regiones" || n === "regional") return "Varias regiones";

  return s(nivel) || "No informada";
}

export function coberturaBadge(nivel?: string): { label: string; emoji: string } {
  const n = s(nivel).toLowerCase();
  if (n === "solo_mi_comuna" || n === "solo_comuna")
    return { label: "Solo mi comuna", emoji: "📍" };
  if (n === "varias_comunas") return { label: "Varias comunas", emoji: "📌" };
  if (n === "varias_regiones" || n === "regional") return { label: "Cobertura regional", emoji: "🗺️" };
  if (n === "nacional") return { label: "Todo Chile", emoji: "🌎" };
  return { label: s(nivel) || "Cobertura", emoji: "🔎" };
}
