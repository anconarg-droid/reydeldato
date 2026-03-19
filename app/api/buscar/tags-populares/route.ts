/**
 * Tags/categorías populares para el buscador.
 * Usa solo columnas que sí existen en vw_emprendedores_algolia_final.
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

/**
 * coverage_keys viene con paths tipo:
 * "/chile/metropolitana/maipu"
 * Entonces verificamos por inclusión del slug buscado.
 */
function resolveBucket(
  item: {
    comuna_base_slug?: string | null;
    nivel_cobertura?: string | null;
    coverage_keys?: string[] | null;
  },
  comunaBuscada: string
): Bucket {
  const buscada = norm(comunaBuscada);
  if (!buscada) return "general";

  const baseSlug = norm(item.comuna_base_slug);
  const nivel = norm(item.nivel_cobertura);
  const coverageKeys = arr(item.coverage_keys).map(norm);

  if (baseSlug === buscada) return "exacta";

  if (
    nivel === "varias_comunas" &&
    coverageKeys.some((k) => k.includes(`/${buscada}`) || k.endsWith(buscada))
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
  categoria_slug: string | null;
  comuna_base_slug: string | null;
  nivel_cobertura: string | null;
  coverage_keys: string[] | null;
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const comuna = s(searchParams.get("comuna"));
    const limit = Math.min(10, Math.max(1, Number(searchParams.get("limit") || "5")));

    const { data, error } = await supabase
      .from("vw_emprendedores_algolia_final")
      .select(`
        publicado,
        nivel_cobertura,
        comuna_base_slug,
        coverage_keys,
        categoria_slug
      `)
      .eq("publicado", true);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    const rows: Row[] = (data || []).map((row: any) => ({
      categoria_slug: row.categoria_slug ?? null,
      comuna_base_slug: row.comuna_base_slug ?? null,
      nivel_cobertura: row.nivel_cobertura ?? null,
      coverage_keys: row.coverage_keys ?? null,
    }));

    const inScope = comuna
      ? rows.filter((item) => resolveBucket(item, comuna) !== "general")
      : rows;

    const countByTag: Record<string, number> = {};

    for (const item of inScope) {
      const tag = norm(item.categoria_slug);
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
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Error inesperado",
      },
      { status: 500 }
    );
  }
}