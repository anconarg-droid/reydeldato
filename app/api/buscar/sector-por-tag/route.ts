/**
 * Devuelve el sector_slug (categoría padre) de una subcategoría/tag.
 * Usado para mantener abierta la categoría correcta en la columna izquierda cuando hay subcategoría activa.
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizarSlug } from "@/lib/slugify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function s(v: unknown) {
  return String(v ?? "").trim();
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tag = normalizarSlug(searchParams.get("tag") || "");

    if (!tag) {
      return NextResponse.json({ ok: true, sector_slug: null });
    }

    const [byTags, bySubcats] = await Promise.all([
      supabase
        .from("emprendedores")
        .select("sector_slug")
        .eq("estado_publicacion", "publicado")
        .contains("tags_slugs", [tag])
        .limit(1)
        .maybeSingle(),
      supabase
        .from("emprendedores")
        .select("sector_slug")
        .eq("estado_publicacion", "publicado")
        .contains("subcategorias_slugs", [tag])
        .limit(1)
        .maybeSingle(),
    ]);

    const sector =
      (byTags.data as { sector_slug?: string } | null)?.sector_slug ||
      (bySubcats.data as { sector_slug?: string } | null)?.sector_slug ||
      null;

    return NextResponse.json({ ok: true, sector_slug: sector });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Error inesperado" },
      { status: 500 }
    );
  }
}
