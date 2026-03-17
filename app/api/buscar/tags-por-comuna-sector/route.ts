/**
 * Tags (subcategorías) con cantidad de emprendimientos por sector en una comuna.
 * Misma lógica territorial que /api/buscar y sectores-por-comuna (resolveBucket !== "general").
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function s(v: unknown) {
  return String(v ?? "").trim();
}

function norm(v: unknown) {
  return s(v)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function arr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => s(x)).filter(Boolean);
}

type Bucket =
  | "exacta"
  | "cobertura_comuna"
  | "varias_regiones"
  | "nacional"
  | "general";

function resolveBucket(
  item: {
    comuna_base_slug?: string | null;
    comuna_base_nombre?: string | null;
    coverage_labels?: string[] | null;
    coverage_keys?: string[] | null;
    nivel_cobertura?: string | null;
  },
  comunaBuscada: string
): Bucket {
  const comunaRaw = s(comunaBuscada);
  const comunaSlugLike = norm(comunaRaw);
  const comunaNameLike = norm(comunaRaw.replace(/-/g, " "));

  if (!comunaSlugLike && !comunaNameLike) return "general";

  const comunaBaseSlug = norm(item.comuna_base_slug);
  const comunaBaseNombre = norm(item.comuna_base_nombre);
  const coverageLabels = arr(item.coverage_labels).map(norm);
  const coverageKeys = arr(item.coverage_keys).map(norm);
  const nivel = s(item.nivel_cobertura);

  if (
    (comunaSlugLike && comunaBaseSlug === comunaSlugLike) ||
    (comunaNameLike && comunaBaseNombre === comunaNameLike)
  ) {
    return "exacta";
  }
  if (
    coverageLabels.includes(comunaSlugLike) ||
    coverageLabels.includes(comunaNameLike)
  ) {
    return "cobertura_comuna";
  }
  if (coverageKeys.includes(comunaSlugLike)) return "cobertura_comuna";
  if (
    coverageLabels.some(
      (label) =>
        (comunaSlugLike && label.includes(comunaSlugLike)) ||
        (comunaNameLike && label.includes(comunaNameLike))
    )
  ) {
    return "cobertura_comuna";
  }
  if (nivel === "varias_regiones") return "varias_regiones";
  if (nivel === "nacional") return "nacional";
  return "general";
}

function tagToLabel(tag: string): string {
  const t = s(tag).replace(/_/g, " ").trim();
  if (!t) return tag;
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

type Row = {
  tags_slugs: string[] | null;
  comuna_base_slug: string | null;
  comuna_base_nombre: string | null;
  coverage_labels: string[] | null;
  coverage_keys: string[] | null;
  nivel_cobertura: string | null;
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const comuna = s(searchParams.get("comuna"));
    const sector = s(searchParams.get("sector")).toLowerCase();

    if (!comuna || !sector) {
      return NextResponse.json({ ok: true, tags: [] });
    }

    const { data, error } = await supabase
      .from("emprendedores")
      .select(
        `
        tags_slugs,
        nivel_cobertura,
        coverage_keys,
        coverage_labels,
        comunas!emprendedores_comuna_base_id_fkey ( nombre, slug )
      `
      )
      .eq("estado_publicacion", "publicado")
      .eq("sector_slug", sector);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    const rows: Row[] = (data || []).map((row: any) => ({
      tags_slugs: row.tags_slugs ?? null,
      comuna_base_slug: row.comunas?.slug ?? null,
      comuna_base_nombre: row.comunas?.nombre ?? null,
      coverage_labels: row.coverage_labels ?? null,
      coverage_keys: row.coverage_keys ?? null,
      nivel_cobertura: row.nivel_cobertura ?? null,
    }));

    const inComuna = rows.filter(
      (item) => resolveBucket(item, comuna) !== "general"
    );

    const countByTag: Record<string, number> = {};
    for (const item of inComuna) {
      const tags = arr(item.tags_slugs).map((t) => norm(t)).filter(Boolean);
      for (const tag of tags) {
        countByTag[tag] = (countByTag[tag] || 0) + 1;
      }
    }

    const tags = Object.entries(countByTag)
      .map(([tagSlug, count]) => ({
        tagSlug,
        label: tagToLabel(tagSlug),
        count,
      }))
      .sort((a, b) => b.count - a.count);

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
