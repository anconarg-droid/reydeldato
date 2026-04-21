import { NextResponse } from "next/server";
import { createSupabaseServerPublicClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createSupabaseServerPublicClient();

    const [catRes, subRes] = await Promise.all([
      supabase
        .from("categorias")
        .select("id, nombre, slug")
        .order("nombre"),
      supabase
        .from("subcategorias")
        .select("id, nombre, slug, categoria_id")
        .eq("activo", true)
        .order("nombre"),
    ]);

    if (catRes.error) throw catRes.error;
    if (subRes.error) throw subRes.error;

    const categoriasRaw = (catRes.data || []) as Array<{ id: string; nombre: string; slug: string }>;
    // Taxonomía v1: "Otros" es solo fallback interno; no se expone como categoría pública (filtro por slug para no depender de migración)
    const categorias = categoriasRaw.filter((c) => c.slug !== "otros");
    const subcategorias = (subRes.data || []) as Array<{
      id: string;
      nombre: string;
      slug: string;
      categoria_id: string;
    }>;

    const subPorCategoria = subcategorias.reduce<Record<string, Array<{ nombre: string; slug: string }>>>(
      (acc, sub) => {
        const cid = sub.categoria_id;
        if (!acc[cid]) acc[cid] = [];
        acc[cid].push({ nombre: sub.nombre, slug: sub.slug });
        return acc;
      },
      {}
    );

    const items = categorias.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      slug: c.slug,
      subcategorias: subPorCategoria[c.id] || [],
    }));

    return NextResponse.json({
      ok: true,
      items,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Error cargando categorías",
      },
      { status: 500 }
    );
  }
}
