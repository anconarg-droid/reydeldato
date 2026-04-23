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

function normalizeKey(v: string): string {
  return s(v)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function prettyWordsFromSlug(raw: string): string {
  const base = s(raw).replace(/[-_]+/g, " ").trim();
  if (!base) return "";
  // Capitalización suave palabra a palabra (evita depender de displayTitleCaseWords aquí).
  return base
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
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

function pickSupportTag(opts: {
  tagsSlugs: string[];
  subcategoriaNombre: string;
  subcategoriaSlug: string;
  categoriaNombre: string;
}): string | null {
  const allow = new Set([
    "calefont",
    "destape",
    "fuga-agua",
    "pizzas",
    "sushi",
  ]);

  const subN = normalizeKey(opts.subcategoriaNombre);
  const subS = normalizeKey(opts.subcategoriaSlug);
  const catN = normalizeKey(opts.categoriaNombre);

  for (const raw of opts.tagsSlugs) {
    const tag = s(raw);
    if (!tag) continue;
    if (!allow.has(tag)) continue;
    const k = normalizeKey(tag);
    if (!k) continue;
    if (k === subS) continue;
    if (subN && k === subN) continue;
    if (catN && k === catN) continue;
    return tag;
  }
  return null;
}

export function getLabelInteligenteSimilares(input: LabelInput): {
  title: string;
  subtitle: string;
  /** Label principal usado (subcategoría o categoría). Útil para debug/copy extra. */
  primaryLabel: string;
} {
  const comuna = s(input.comunaNombre);
  const subNombre = s(input.subcategoriaNombre);
  const subSlug = s(input.subcategoriaSlug);
  const catNombre = s(input.categoriaNombre);
  const tags = Array.isArray(input.tagsSlugs)
    ? input.tagsSlugs.map((x) => s(x)).filter(Boolean)
    : [];

  const primaryLabel = subNombre || catNombre || "Servicios";

  const rubroPlural = pluralSuave(primaryLabel) || "servicios";
  const title = comuna
    ? `Más ${rubroPlural} cerca de ${comuna}`
    : "Negocios similares";

  const supportTag = pickSupportTag({
    tagsSlugs: tags,
    subcategoriaNombre: subNombre,
    subcategoriaSlug: subSlug,
    categoriaNombre: catNombre,
  });

  const baseSentence =
    normalizeKey(primaryLabel) === "negocios" || normalizeKey(primaryLabel) === "servicios"
      ? "Ofrecen servicios similares."
      : `Ofrecen servicios similares de ${primaryLabel}.`;

  const tagSentence = supportTag
    ? ` Especialidad: ${prettyWordsFromSlug(supportTag).toLowerCase()}.`
    : "";

  const locationSentence = comuna
    ? input.todosAtiendenComuna
      ? ` Aparecen porque están en ${comuna}.`
      : ` Aparecen porque están en ${comuna} o trabajan en esta zona.`
    : "";

  const subtitle = `${baseSentence}${tagSentence}${locationSentence}`.replace(/\s+/g, " ").trim();

  return { title, subtitle, primaryLabel };
}

