/**
 * Tags/categorías populares para el buscador.
 * Lee `vw_emprendedores_publico` (misma base territorial que tags-por-comuna-sector).
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type Bucket =
  | "exacta"
  | "cobertura_comuna"
  | "regional"
  | "nacional"
  | "general";

function s(v: unknown): string {
  return String(v ?? "").trim();
}

function norm(v: unknown): string {
  return s(v)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function arr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => s(x)).filter(Boolean);
}

function resolveBucket(
  item: {
    comuna_base_slug?: string | null;
    nivel_cobertura?: string | null;
    comunas_cobertura_slugs_arr?: string[] | null;
  },
  comunaBuscada: string
): Bucket {
  const comunaSlugLike = norm(comunaBuscada);
  if (!comunaSlugLike) return "general";

  const baseSlug = norm(item.comuna_base_slug);
  const nivel = norm(item.nivel_cobertura);
  const coberturaComunas = arr(item.comunas_cobertura_slugs_arr).map(norm);

  if (baseSlug === comunaSlugLike) return "exacta";

  if (
    nivel === "varias_comunas" &&
    coberturaComunas.includes(comunaSlugLike)
  ) {
    return "cobertura_comuna";
  }

  if (nivel === "regional" || nivel === "varias_regiones") return "regional";
  if (nivel === "nacional") return "nacional";

  return "general";
}

function tagToLabel(tag: string): string {
  const t = s(tag).replace(/_/g, " ").replace(/-/g, " ").trim();
  if (!t) return tag;
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

type Row = {
  categoria_slug_final: string | null;
  comuna_base_slug: string | null;
  nivel_cobertura: string | null;
  comunas_cobertura_slugs_arr: string[] | null;
};

const emptyOk = () => NextResponse.json({ ok: true, tags: [] });

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const comuna = s(searchParams.get("comuna"));
    const limit = Math.min(10, Math.max(1, Number(searchParams.get("limit") || "5")));

    const { data, error } = await supabase
      .from("vw_emprendedores_publico")
      .select(
        `
        estado_publicacion,
        nivel_cobertura,
        comuna_base_slug,
        comunas_cobertura_slugs_arr,
        categoria_slug_final
      `
      )
      .eq("estado_publicacion", "publicado");

    if (error) {
      // eslint-disable-next-line no-console
      console.error("[tags-populares] supabase", error.message);
      return emptyOk();
    }

    const rows: Row[] = (data || []).map((row: Record<string, unknown>) => ({
      categoria_slug_final: (row.categoria_slug_final as string) ?? null,
      comuna_base_slug: (row.comuna_base_slug as string) ?? null,
      nivel_cobertura: (row.nivel_cobertura as string) ?? null,
      comunas_cobertura_slugs_arr: (row.comunas_cobertura_slugs_arr as string[]) ?? null,
    }));

    const inScope = comuna
      ? rows.filter((item) => resolveBucket(item, comuna) !== "general")
      : rows;

    const countByTag: Record<string, number> = {};

    for (const item of inScope) {
      const tag = norm(item.categoria_slug_final);
      if (!tag) continue;
      countByTag[tag] = (countByTag[tag] || 0) + 1;
    }

    const tags = Object.entries(countByTag)
      .filter(([, count]) => count > 0)
      .map(([tag, count]) => ({
        tag: tagToLabel(tag),
        tagSlug: tag,
        count,
      }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
      .slice(0, limit);

    return NextResponse.json({ ok: true, tags });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[tags-populares]", e);
    return emptyOk();
  }
}
