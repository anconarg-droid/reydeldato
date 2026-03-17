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

type Row = {
  id: string;
  nombre: string | null;
  descripcion_corta: string | null;
  descripcion_larga: string | null;
  comuna_base_slug: string | null;
  comuna_base_nombre: string | null;
  categoria_slug: string | null;
  subcategoria_slug: string | null;
  keywords: string[] | null;
  search_text: string | null;
  publicado: boolean | null;
  estado_publicacion: string | null;
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const q = s(searchParams.get("q"));
    const comuna = s(searchParams.get("comuna"));
    const sector = s(searchParams.get("sector"));
    const categoria = s(searchParams.get("categoria"));
    const limit = Math.max(
      1,
      Math.min(Number(searchParams.get("limit") || "30"), 200)
    );
    const offset = Math.max(0, Number(searchParams.get("offset") || "0"));

    const hasAnyFilter = Boolean(q || comuna || sector || categoria);

    if (!hasAnyFilter) {
      return NextResponse.json({
        ok: true,
        total: 0,
        items: [],
      });
    }

    const categoriaFiltro = sector || categoria;
    const categoriaNorm = categoriaFiltro ? norm(categoriaFiltro) : "";
    const comunaNorm = comuna ? norm(comuna).replace(/\s+/g, "-") : "";
    const qLike = q ? `%${q}%` : "";

    const baseSelect = `
      id,
      nombre,
      descripcion_corta,
      descripcion_larga,
      comuna_base_slug,
      comuna_base_nombre,
      categoria_slug,
      subcategoria_slug,
      keywords,
      search_text,
      publicado,
      estado_publicacion
    `;

    let query = supabase
      .from("vw_emprendedores_algolia_final")
      .select(baseSelect, { count: "exact" })
      .eq("estado_publicacion", "publicado");

    if (categoriaNorm) {
      query = query.eq("categoria_slug", categoriaNorm);
    }

    if (comunaNorm) {
      query = query.eq("comuna_base_slug", comunaNorm);
    }

    if (qLike) {
      query = query.ilike("search_text", qLike);
    }

    query = query
      .order("publicado", { ascending: false })
      .order("nombre", { ascending: true })
      .range(offset, offset + limit - 1);

    let res = await query;

    // Fallback si comuna_base_slug no existe
    if (
      res.error &&
      comuna &&
      /column .*comuna_base_slug.* does not exist/i.test(res.error.message)
    ) {
      let q2 = supabase
        .from("vw_emprendedores_algolia_final")
        .select(baseSelect, { count: "exact" })
        .eq("estado_publicacion", "publicado");

      if (categoriaNorm) q2 = q2.eq("categoria_slug", categoriaNorm);
      if (qLike) q2 = q2.ilike("search_text", qLike);

      q2 = q2.ilike("comuna_base_nombre", `%${comuna}%`);

      res = await q2
        .order("publicado", { ascending: false })
        .order("nombre", { ascending: true })
        .range(offset, offset + limit - 1);
    }

    // Fallback si search_text no existe
    if (
      res.error &&
      qLike &&
      /column .*search_text.* does not exist/i.test(res.error.message)
    ) {
      let q3 = supabase
        .from("vw_emprendedores_algolia_final")
        .select(baseSelect, { count: "exact" })
        .eq("estado_publicacion", "publicado");

      if (categoriaNorm) q3 = q3.eq("categoria_slug", categoriaNorm);
      if (comunaNorm) q3 = q3.eq("comuna_base_slug", comunaNorm);

      q3 = q3.or(
        [
          `nombre.ilike.${qLike}`,
          `descripcion_corta.ilike.${qLike}`,
          `descripcion_larga.ilike.${qLike}`,
          `categoria_slug.ilike.${qLike}`,
          `subcategoria_slug.ilike.${qLike}`,
        ].join(",")
      );

      res = await q3
        .order("publicado", { ascending: false })
        .order("nombre", { ascending: true })
        .range(offset, offset + limit - 1);
    }

    if (res.error) {
      console.error("GET /api/buscar error:", res.error);
      return NextResponse.json(
        { ok: false, error: res.error.message },
        { status: 500 }
      );
    }

    const rows: Row[] = Array.isArray(res.data) ? (res.data as Row[]) : [];

    const items = rows.map((r) => ({
      id: s(r.id),
      slug: s(r.id),
      nombre: s(r.nombre),
      descripcion_corta: s(r.descripcion_corta) || null,
      descripcion_larga: s(r.descripcion_larga) || null,
      foto_principal_url: null,
      comuna_slug: s(r.comuna_base_slug) || null,
      comuna_nombre: s(r.comuna_base_nombre) || null,
      categoria_slug_final: s(r.categoria_slug) || null,
      subcategoria_slug_final: s(r.subcategoria_slug) || null,
      keywords: arr(r.keywords),
      search_text: s(r.search_text) || null,
      public: r.publicado === true,
    }));

    return NextResponse.json({
      ok: true,
      total: res.count ?? items.length,
      items,
    });
  } catch (error) {
    console.error("GET /api/buscar fatal:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Error inesperado en búsqueda.",
      },
      { status: 500 }
    );
  }
}