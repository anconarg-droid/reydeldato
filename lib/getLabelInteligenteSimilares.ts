type LabelInput = {
  subcategoriaNombre?: string | null;
  subcategoriaSlug?: string | null;
  categoriaNombre?: string | null;
  tagsSlugs?: string[] | null;
  comunaNombre?: string | null;
  todosAtiendenComuna: boolean;
};

function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

/** Plural “suave” para titulares; si es frase, se deja tal cual. */
function pluralSuave(texto: string): string {
  const raw = s(texto);
  if (!raw) return "";
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length !== 1) return raw.toLowerCase();
  const t = parts[0].toLowerCase();
  if (t.endsWith("s") || t.endsWith("x")) return t;
  if (t.endsWith("ía")) return `${t.slice(0, -2)}ías`;
  if (t.endsWith("í")) return `${t.slice(0, -1)}is`;
  if (/[aeiouáéíóú]$/.test(t)) return `${t}s`;
  return `${t}es`;
}

export function getLabelInteligenteSimilares(input: LabelInput): {
  title: string;
  subtitle: string;
  /** Label principal usado (subcategoría o categoría). Útil para debug/copy extra. */
  primaryLabel: string;
} {
  const comuna = s(input.comunaNombre);
  const subNombre = s(input.subcategoriaNombre);
  const catNombre = s(input.categoriaNombre);

  const primaryLabel = subNombre || catNombre || "Servicios";

  const rubroPlural = pluralSuave(primaryLabel) || "servicios";
  const title = comuna
    ? `Más ${rubroPlural} que atienden ${comuna}`
    : "Negocios similares";

  const subtitle = comuna
    ? "Negocios que pueden atenderte en tu comuna."
    : "Opciones en el mismo rubro o servicios parecidos.";

  return { title, subtitle, primaryLabel };
}
