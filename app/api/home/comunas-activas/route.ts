import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data: activas, error: errActivas } = await supabase
      .from("comunas_activas")
      .select("comuna_slug, comuna_nombre, orden")
      .eq("activa", true)
      .order("orden", { ascending: true })
      .order("comuna_nombre", { ascending: true });

    if (errActivas) {
      return NextResponse.json(
        { ok: false, error: errActivas.message, items: [] },
        { status: 500 }
      );
    }

    const slugs = (activas || []).map((r: any) => String(r.comuna_slug || "").trim()).filter(Boolean);
    if (slugs.length === 0) {
      return NextResponse.json({ ok: true, items: [] });
    }

    const { data: comunasRows } = await supabase.from("comunas").select("id, slug, nombre").in("slug", slugs);
    const idBySlug = new Map<string, string>();
    const nombreBySlug = new Map<string, string>();
    for (const c of comunasRows || []) {
      const slug = String(c.slug || "").trim();
      idBySlug.set(slug, c.id);
      nombreBySlug.set(slug, c.nombre || slug);
    }

    const { data: counts } = await supabase
      .from("emprendedores")
      .select("comuna_base_id")
      .eq("estado_publicacion", "publicado");

    const countByComunaId = new Map<string, number>();
    for (const row of counts || []) {
      const id = String(row.comuna_base_id || "");
      if (!id) continue;
      countByComunaId.set(id, (countByComunaId.get(id) || 0) + 1);
    }

    const items = (activas || []).map((r: any) => {
      const slug = String(r.comuna_slug || "").trim();
      const nombre = String(r.comuna_nombre || nombreBySlug.get(slug) || slug).trim();
      const id = idBySlug.get(slug);
      const count = id ? countByComunaId.get(id) || 0 : 0;
      return { slug, nombre, count };
    });

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Error", items: [] },
      { status: 500 }
    );
  }
}
