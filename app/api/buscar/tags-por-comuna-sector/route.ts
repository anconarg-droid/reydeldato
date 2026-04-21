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
  | "regional"
  | "nacional"
  | "general";

function resolveBucket(
  item: {
    comuna_base_slug?: string | null;
    comuna_base_nombre?: string | null;
    nivel_cobertura?: string | null;
    comunas_cobertura_slugs_arr?: string[] | null;
  },
  comunaBuscada: string
): Bucket {
  const comunaRaw = s(comunaBuscada);
  const comunaSlugLike = norm(comunaRaw);
  const comunaNameLike = norm(comunaRaw.replace(/-/g, " "));

  if (!comunaSlugLike && !comunaNameLike) return "general";

  const comunaBaseSlug = norm(item.comuna_base_slug);
  const nivel = norm(item.nivel_cobertura);
  const coberturaComunas = arr(item.comunas_cobertura_slugs_arr).map(norm);

  if (comunaSlugLike && comunaBaseSlug === comunaSlugLike) return "exacta";
  if (nivel === "varias_comunas" && comunaSlugLike && coberturaComunas.includes(comunaSlugLike)) {
    return "cobertura_comuna";
  }
  if (nivel === "regional" || nivel === "varias_regiones") return "regional";
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
  nivel_cobertura: string | null;
  comunas_cobertura_slugs_arr: string[] | null;
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
      .from("vw_emprendedores_publico")
      .select(
        `
        nivel_cobertura,
        comuna_base_nombre,
        comuna_base_slug,
        comunas_cobertura_slugs_arr,
        subcategorias_slugs
      `
      )
      .eq("estado_publicacion", "publicado")
      .eq("categoria_slug_final", sector);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    const rows: Row[] = (data || []).map((row: any) => ({
      tags_slugs: row.subcategorias_slugs ?? null,
      comuna_base_slug: row.comuna_base_slug ?? null,
      comuna_base_nombre: row.comuna_base_nombre ?? null,
      nivel_cobertura: row.nivel_cobertura ?? null,
      comunas_cobertura_slugs_arr: row.comunas_cobertura_slugs_arr ?? null,
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
