// app/api/home/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function requiredEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Falta variable de entorno: ${name}`);
  return v;
}

export async function GET() {
  try {
    const SUPABASE_URL = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
    const SERVICE_KEY = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false },
    });

    // ✅ Categorías (ajusta columnas si tu tabla se llama distinto)
    const { data: cats, error: errCats } = await supabase
      .from("categorias")
      .select("id, slug, nombre")
      .order("nombre", { ascending: true });

    if (errCats) {
      return NextResponse.json({ ok: false, error: errCats.message }, { status: 500 });
    }

    // Taxonomía v1: no exponer "Otros" como categoría pública
    const catsPublic = (cats ?? []).filter((c: { slug?: string }) => c.slug !== "otros");
    const catIds = catsPublic.map((c) => c.id);

    // ✅ Subcategorías destacadas (3–4 por categoría)
    const { data: subs, error: errSubs } = await supabase
      .from("subcategorias")
      .select("id, slug, nombre, categoria_id, is_destacada, orden_destacada")
      .in("categoria_id", catIds.length ? catIds : ["00000000-0000-0000-0000-000000000000"])
      .eq("is_destacada", true)
      .order("orden_destacada", { ascending: true })
      .order("nombre", { ascending: true });

    if (errSubs) {
      return NextResponse.json({ ok: false, error: errSubs.message }, { status: 500 });
    }

    // agrupa subcategorías por categoría (limit 4)
    const byCat = new Map<string, any[]>();
    for (const s of subs ?? []) {
      const key = String(s.categoria_id);
      const arr = byCat.get(key) ?? [];
      if (arr.length < 4) arr.push({ id: s.id, slug: s.slug, nombre: s.nombre });
      byCat.set(key, arr);
    }

    const payload = catsPublic.map((c) => ({
      id: c.id,
      slug: c.slug,
      nombre: c.nombre,
      sub_destacadas: byCat.get(String(c.id)) ?? [],
    }));

    return NextResponse.json({ ok: true, categorias: payload });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Error" }, { status: 500 });
  }
}