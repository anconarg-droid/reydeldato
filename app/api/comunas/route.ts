import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // 🔹 Agrupamos comunas desde emprendedores publicados
    const { data, error } = await supabase
      .from("emprendedores")
      .select("comuna_base_slug")
      .eq("publicado", true);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const map = new Map<string, number>();

    for (const row of data || []) {
      const slug = (row.comuna_base_slug || "").trim();
      if (!slug) continue;

      map.set(slug, (map.get(slug) || 0) + 1);
    }

    const items = Array.from(map.entries()).map(([slug, total]) => ({
      slug,
      nombre: slug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      total,
    }));

    // Orden simple por volumen (mejores comunas arriba)
    items.sort((a, b) => b.total - a.total);

    return NextResponse.json({
      ok: true,
      items,
    });

  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "Error cargando comunas" },
      { status: 500 }
    );
  }
}