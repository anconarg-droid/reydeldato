import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function s(v: any): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function arr(v: any): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x: any) => s(x)).filter(Boolean);
}

const MAX_SIMILARES = 6;

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const params = await context.params;
    const slug = s(params?.slug);

    if (!slug) {
      return NextResponse.json(
        { ok: false, error: "Slug requerido" },
        { status: 400 }
      );
    }

    const { data: actual, error: actualError } = await supabase
      .from("vw_emprendedores_algolia_final")
      .select("*")
      .eq("slug", slug)
      .limit(1)
      .maybeSingle();

    if (actualError) {
      return NextResponse.json(
        { ok: false, error: actualError.message },
        { status: 500 }
      );
    }

    if (!actual) {
      return NextResponse.json(
        { ok: false, error: "Emprendimiento no encontrado" },
        { status: 404 }
      );
    }

    const row = actual as Record<string, unknown>;
    const comunaSlug = s(row.comuna_base_slug);
    const comunaNombre = s(row.comuna_base_nombre);
    const categoriaSlug = s(row.categoria_slug);
    const categoriaNombre = s(row.categoria_nombre);
    const subcategoriasSlugs = arr(row.subcategorias_slugs_arr);
    const subcategoriaSlug = subcategoriasSlugs[0] || "";
    const regionNombre = s(row.region_nombre);

    const used = new Set<string>([slug]);
    const collected: any[] = [];

    function add(rows: any[] | null) {
      if (!rows) return;
      for (const r of rows) {
        const sl = s(r.slug);
        if (!sl || used.has(sl)) continue;
        used.add(sl);
        collected.push(r);
        if (collected.length >= MAX_SIMILARES) return;
      }
    }

    const need = () => MAX_SIMILARES - collected.length;
    if (need() <= 0) {
      return buildResponse(collected);
    }

    // 1) misma subcategoría + misma comuna (filtrar en memoria si hace falta)
    if (subcategoriaSlug && (comunaSlug || comunaNombre)) {
      let q = supabase
        .from("vw_emprendedores_algolia_final")
        .select("*")
        .neq("slug", slug)
        .limit(MAX_SIMILARES * 2);
      if (comunaSlug) q = q.eq("comuna_base_slug", comunaSlug);
      else if (comunaNombre) q = q.eq("comuna_base_nombre", comunaNombre);
      const { data } = await q;
      const list = (data || []).filter((r: any) =>
        arr(r.subcategorias_slugs_arr).includes(subcategoriaSlug)
      );
      add(list.slice(0, need()));
    }

    // 2) misma categoría + misma comuna
    if (need() > 0 && (categoriaSlug || categoriaNombre) && (comunaSlug || comunaNombre)) {
      let q = supabase
        .from("vw_emprendedores_algolia_final")
        .select("*")
        .neq("slug", slug)
        .limit(need() + used.size);
      if (categoriaSlug) q = q.eq("categoria_slug", categoriaSlug);
      else if (categoriaNombre) q = q.eq("categoria_nombre", categoriaNombre);
      if (comunaSlug) q = q.eq("comuna_base_slug", comunaSlug);
      else if (comunaNombre) q = q.eq("comuna_base_nombre", comunaNombre);
      const { data } = await q;
      add((data || []).filter((r: any) => !used.has(s(r.slug))));
    }

    // 3) misma subcategoría en la región
    if (need() > 0 && subcategoriaSlug && regionNombre) {
      const { data, error: errRegion } = await supabase
        .from("vw_emprendedores_algolia_final")
        .select("*")
        .eq("region_nombre", regionNombre)
        .neq("slug", slug)
        .limit(MAX_SIMILARES * 2);
      if (!errRegion && data) {
        const list = data.filter((r: any) =>
          arr(r.subcategorias_slugs_arr).includes(subcategoriaSlug)
        );
        add(list.slice(0, need()));
      }
    }

    // 4) misma categoría en la región
    if (need() > 0 && (categoriaSlug || categoriaNombre) && regionNombre) {
      let q = supabase
        .from("vw_emprendedores_algolia_final")
        .select("*")
        .eq("region_nombre", regionNombre)
        .neq("slug", slug)
        .limit(MAX_SIMILARES * 2);
      if (categoriaSlug) q = q.eq("categoria_slug", categoriaSlug);
      else if (categoriaNombre) q = q.eq("categoria_nombre", categoriaNombre);
      const { data, error: errCatRegion } = await q;
      if (!errCatRegion && data) {
        add(data.filter((r: any) => !used.has(s(r.slug))));
      }
    }

    // 5) fallback: solo misma comuna
    if (need() > 0 && (comunaSlug || comunaNombre)) {
      let q = supabase
        .from("vw_emprendedores_algolia_final")
        .select("*")
        .neq("slug", slug)
        .limit(need() + used.size);
      if (comunaSlug) q = q.eq("comuna_base_slug", comunaSlug);
      else q = q.eq("comuna_base_nombre", comunaNombre);
      const { data } = await q;
      add(data || []);
    }

    // 6) fallback final: cualquier publicado
    if (collected.length === 0) {
      const { data } = await supabase
        .from("vw_emprendedores_algolia_final")
        .select("*")
        .neq("slug", slug)
        .limit(MAX_SIMILARES);
      add(data || []);
    }

    return buildResponse(collected.slice(0, MAX_SIMILARES));
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Error interno" },
      { status: 500 }
    );
  }
}

function buildResponse(items: any[]) {
  const out = items.map((item) => ({
    id: item.id ?? null,
    slug: s(item.slug),
    nombre: s(item.nombre),
    descripcion_corta: s(item.descripcion_corta),
    foto_principal_url:
      s(item.foto_principal_url) ||
      s(item.foto_principal) ||
      s(item.imagen_url) ||
      s(item.imagen) ||
      s(item.foto) ||
      "",
    comuna_base_nombre: s(item.comuna_base_nombre),
    categoria_nombre: s(item.categoria_nombre),
    whatsapp: s(item.whatsapp),
    plan_activo: (item as any).plan_activo === true,
    plan_expira_at: (item as any).plan_expira_at ?? null,
    trial_expira_at: (item as any).trial_expira_at ?? (item as any).trial_expira ?? null,
    created_at: (item as any).created_at ?? null,
  }));

  return NextResponse.json({
    ok: true,
    items: out,
  });
}
