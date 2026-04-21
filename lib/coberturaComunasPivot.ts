/**
 * Normaliza filas de `emprendedor_comunas_cobertura` con embed `comunas`:
 * deduplica por `comuna_id`, alinea nombres/slugs y, en `varias_comunas`,
 * antepone la comuna base al texto público si no está en el pivote.
 */

function s(v: unknown): string {
  if (v == null || v === undefined) return "";
  return String(v).trim();
}

export type CoberturaComunaPivotRow = {
  comuna_id?: unknown;
  comunas?: { nombre?: unknown; slug?: unknown } | null;
};

export function coberturaComunasNombresYSlugsDesdePivot(
  pivotRows: CoberturaComunaPivotRow[] | null | undefined,
  coberturaTipo: string,
  baseSlug: string,
  baseNombre: string
): { nombres: string[]; slugs: string[] } {
  const rows = Array.isArray(pivotRows) ? pivotRows : [];
  const tipo = s(coberturaTipo).toLowerCase();

  const seenId = new Set<string>();
  const pairs: { slug: string; nombre: string }[] = [];

  for (const r of rows) {
    const cid = s(r.comuna_id);
    if (!cid || seenId.has(cid)) continue;
    const emb = r.comunas;
    if (!emb || typeof emb !== "object" || Array.isArray(emb)) continue;
    const slug = s(emb.slug);
    if (!slug) continue;
    const nombre = s(emb.nombre);
    seenId.add(cid);
    pairs.push({ slug, nombre: nombre || slug });
  }

  const bySlug = new Map<string, string>();
  for (const p of pairs) {
    if (!bySlug.has(p.slug)) bySlug.set(p.slug, p.nombre);
  }

  let slugs = [...bySlug.keys()];
  let nombres = slugs.map((slug) => bySlug.get(slug) ?? slug);

  if (tipo === "varias_comunas" && s(baseSlug) && !bySlug.has(s(baseSlug))) {
    const bs = s(baseSlug);
    slugs = [bs, ...slugs];
    nombres = [s(baseNombre) || bs, ...nombres];
  }

  return { nombres, slugs };
}
