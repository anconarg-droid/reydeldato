/**
 * Tags (subservicios) más usados en emprendimientos de un sector.
 * Para chips de navegación interna del sector en /buscar?sector=<slug>.
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

function tagToLabel(tag: string): string {
  const t = s(tag).replace(/_/g, " ").trim();
  if (!t) return tag;
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sector = s(searchParams.get("sector")).toLowerCase();
    const limit = Math.min(12, Math.max(1, Number(searchParams.get("limit") || "8")));

    if (!sector) {
      return NextResponse.json({ ok: true, tags: [] });
    }

    const { data, error } = await supabase
      .from("emprendedores")
      .select("tags_slugs")
      .eq("estado_publicacion", "publicado")
      .eq("sector_slug", sector);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    const countByTag: Record<string, number> = {};
    for (const row of data || []) {
      const tags = arr((row as any).tags_slugs).map((t) => norm(t)).filter(Boolean);
      for (const tag of tags) {
        countByTag[tag] = (countByTag[tag] || 0) + 1;
      }
    }

    const tags = Object.entries(countByTag)
      .filter(([, count]) => count > 0)
      .map(([tag, count]) => ({
        tag: tagToLabel(tag),
        tagSlug: tag,
        count,
      }))
      .sort((a, b) => b.count - a.count)
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
