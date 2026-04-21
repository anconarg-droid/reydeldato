import { NextResponse } from "next/server";
import { createSupabaseServerPublicClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slugify";

export const dynamic = "force-dynamic";

/**
 * Resuelve si un término coincide con el slug de una subcategoría activa (p. ej. para URL `?subcategoria=` vs `?q=`).
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const raw = (url.searchParams.get("slug") ?? url.searchParams.get("q") ?? "").trim();
    const slug = slugify(raw);
    if (!slug) {
      return NextResponse.json({ ok: true, slug: null });
    }

    const supabase = createSupabaseServerPublicClient();
    const { data, error } = await supabase
      .from("subcategorias")
      .select("slug")
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const resolved = data?.slug != null ? String(data.slug) : null;
    return NextResponse.json({ ok: true, slug: resolved });
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
