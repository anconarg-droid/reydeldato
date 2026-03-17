import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const res = await fetch(
      `${url}/rest/v1/categorias?select=id,nombre,slug&order=nombre`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
      }
    );

    const categoriasRaw = await res.json();
    // Taxonomía v1: no exponer "Otros" como categoría pública (filtro por slug para no depender de migración)
    const categorias = Array.isArray(categoriasRaw)
      ? categoriasRaw.filter((c: { slug?: string }) => c.slug !== "otros")
      : [];

    const result = await Promise.all(
      categorias.map(async (cat: any) => {
        const r = await fetch(
          `${url}/rest/v1/subcategorias?select=nombre,slug&categoria_id=eq.${cat.id}&limit=4`,
          {
            headers: {
              apikey: key,
              Authorization: `Bearer ${key}`,
            },
          }
        );

        const subs = await r.json();

        return {
          nombre: cat.nombre,
          slug: cat.slug,
          subs,
        };
      })
    );

    return NextResponse.json({
      ok: true,
      items: result,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e.message },
      { status: 500 }
    );
  }
}