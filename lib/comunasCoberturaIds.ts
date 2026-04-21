import type { SupabaseClient } from "@supabase/supabase-js";

function s(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

function dedupeStrings(xs: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of xs) {
    const t = s(x);
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

/**
 * Resuelve slugs canónicos de `comunas` a los mismos IDs que `public.comunas.id`
 * (entero / smallint / bigint según esquema). Para persistir en `comunas_cobertura_ids`.
 */
export async function comunaIdsFromSlugs(
  supabase: SupabaseClient,
  slugs: string[]
): Promise<number[]> {
  const uniq = dedupeStrings(slugs.map((x) => s(x)).filter(Boolean));
  if (!uniq.length) return [];

  const { data, error } = await supabase
    .from("comunas")
    .select("id")
    .in("slug", uniq);

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[comunaIdsFromSlugs]", error.message);
    }
    return [];
  }

  const ids: number[] = [];
  for (const row of data ?? []) {
    const raw = (row as { id?: unknown }).id;
    const n = typeof raw === "number" ? raw : Number(raw);
    if (Number.isFinite(n)) ids.push(Math.trunc(n));
  }
  ids.sort((a, b) => a - b);
  return [...new Set(ids)];
}
