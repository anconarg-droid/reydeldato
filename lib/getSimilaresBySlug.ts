import { createSupabaseServerPublicClient } from "@/lib/supabase/server";

function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function arr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x: unknown) => s(x)).filter(Boolean);
}

/** Mínimo de cards buscado antes de pasar al siguiente nivel; máximo devuelto. */
const TARGET_MIN = 4;
const MAX_SIMILARES = 8;
const FETCH_CAP = 80;

type Tier = 1 | 2 | 3;

export type SimilaresMeta = {
  comunaNombre: string;
  comunaSlug: string;
  subcategoriaNombre: string;
  categoriaNombre: string;
  /** 1 = subcategoría, 2 = categoría (“hogar”), 3 = solo comuna */
  titleLevel: 1 | 2 | 3;
};

export type Similar = {
  nombre: string;
  slug: string;
  categoria_nombre?: string;
  comuna_base_nombre?: string;
  foto_principal_url?: string;
  descripcion_corta?: string;
  subcategorias_nombres_arr?: string[];
  cobertura_tipo?: string;
  whatsapp?: string;
  plan_activo?: boolean;
  plan_expira_at?: string | null;
  trial_expira_at?: string | null;
  created_at?: string | null;
};

function buildResponse(
  items: Record<string, unknown>[],
  meta: SimilaresMeta | null
): { items: Similar[]; meta: SimilaresMeta | null } {
  const out = items.map((item) => ({
    nombre: s(item.nombre) || s(item.nombre_emprendimiento),
    slug: s(item.slug),
    categoria_nombre: s(item.categoria_nombre) || undefined,
    comuna_base_nombre: s(item.comuna_base_nombre) || undefined,
    foto_principal_url:
      s(item.foto_principal_url) ||
      s(item.foto_principal) ||
      s(item.imagen_url) ||
      s(item.imagen) ||
      s(item.foto) ||
      undefined,
    descripcion_corta: s(item.descripcion_corta) || s(item.frase_negocio) || undefined,
    subcategorias_nombres_arr: arr(item.subcategorias_nombres_arr),
    cobertura_tipo: s(item.cobertura_tipo || item.nivel_cobertura || "") || undefined,
    whatsapp: s(item.whatsapp_principal) || s(item.whatsapp) || undefined,
    plan_activo: item.plan_activo === true,
    plan_expira_at: (item.plan_expira_at as string) ?? null,
    trial_expira_at: (item.trial_expira_at as string) ?? (item.trial_expira as string) ?? null,
    created_at: (item.created_at as string) ?? null,
  }));

  return { items: out, meta };
}

export async function getSimilaresBySlug(actualSlug: string): Promise<{
  items: Similar[];
  meta: SimilaresMeta | null;
}> {
  try {
    const supabase = createSupabaseServerPublicClient();
    const slug = s(actualSlug);
    if (!slug) return { items: [], meta: null };

    const { data: actual, error: actualError } = await supabase
      .from("vw_emprendedores_publico")
      .select(
        "slug, comuna_base_slug, comuna_base_nombre, categoria_slug_final, categoria_nombre, subcategorias_slugs, subcategorias_nombres_arr"
      )
      .eq("slug", slug)
      .eq("estado_publicacion", "publicado")
      .limit(1)
      .maybeSingle();

    if (actualError || !actual) return { items: [], meta: null };

    const row = actual as Record<string, unknown>;
    const comunaSlug = s(row.comuna_base_slug);
    const comunaNombre = s(row.comuna_base_nombre);
    const categoriaSlug = s(row.categoria_slug_final);
    const categoriaNombre = s(row.categoria_nombre);
    const subcategoriasSlugs = arr(row.subcategorias_slugs);
    const subcategoriaSlug = subcategoriasSlugs[0] || "";
    const subcategoriaNombreTitulo =
      arr(row.subcategorias_nombres_arr)[0] || "";

    const used = new Set<string>([slug]);
    const collected: Record<string, unknown>[] = [];
    let hadTier1 = false;
    let hadTier2 = false;

    function addRows(rows: unknown[] | null | undefined, tier: Tier) {
      if (!rows?.length) return;
      for (const r of rows) {
        if (collected.length >= MAX_SIMILARES) return;
        const rec = r as Record<string, unknown>;
        const sl = s(rec.slug);
        if (!sl || used.has(sl)) continue;
        used.add(sl);
        collected.push(rec);
        if (tier === 1) hadTier1 = true;
        if (tier === 2) hadTier2 = true;
      }
    }

    // 1) Misma subcategoría + misma comuna
    if (subcategoriaSlug && (comunaSlug || comunaNombre)) {
      let q = supabase
        .from("vw_emprendedores_publico")
        .select(
          "nombre, slug, categoria_nombre, comuna_base_nombre, foto_principal_url, descripcion_corta, frase_negocio, subcategorias_nombres_arr, cobertura_tipo, whatsapp_principal, plan_activo, plan_expira_at, trial_expira_at, created_at, estado_publicacion, comuna_base_slug, categoria_slug_final, subcategorias_slugs"
        )
        .neq("slug", slug)
        .eq("estado_publicacion", "publicado")
        .limit(FETCH_CAP);
      if (comunaSlug) q = q.eq("comuna_base_slug", comunaSlug);
      else q = q.eq("comuna_base_nombre", comunaNombre);
      const { data, error } = await q;
      if (error) return { items: [], meta: null };
      const list = (data || []).filter((r: Record<string, unknown>) =>
        arr(r.subcategorias_slugs).includes(subcategoriaSlug)
      );
      addRows(list, 1);
    }

    // 2) Misma categoría + comuna (si hay menos de TARGET_MIN)
    if (
      collected.length < TARGET_MIN &&
      (categoriaSlug || categoriaNombre) &&
      (comunaSlug || comunaNombre)
    ) {
      let q = supabase
        .from("vw_emprendedores_publico")
        .select(
          "nombre, slug, categoria_nombre, comuna_base_nombre, foto_principal_url, descripcion_corta, frase_negocio, subcategorias_nombres_arr, cobertura_tipo, whatsapp_principal, plan_activo, plan_expira_at, trial_expira_at, created_at, estado_publicacion, comuna_base_slug, categoria_slug_final, subcategorias_slugs"
        )
        .neq("slug", slug)
        .eq("estado_publicacion", "publicado")
        .limit(FETCH_CAP);
      if (categoriaSlug) q = q.eq("categoria_slug_final", categoriaSlug);
      else q = q.eq("categoria_nombre", categoriaNombre);
      if (comunaSlug) q = q.eq("comuna_base_slug", comunaSlug);
      else q = q.eq("comuna_base_nombre", comunaNombre);
      const { data, error } = await q;
      if (error) return { items: [], meta: null };
      addRows(
        (data || []).filter((r: Record<string, unknown>) => !used.has(s(r.slug))),
        2
      );
    }

    // 3) Todos los negocios de la comuna (si aún hay menos de TARGET_MIN)
    if (collected.length < TARGET_MIN && (comunaSlug || comunaNombre)) {
      let q = supabase
        .from("vw_emprendedores_publico")
        .select(
          "nombre, slug, categoria_nombre, comuna_base_nombre, foto_principal_url, descripcion_corta, frase_negocio, subcategorias_nombres_arr, cobertura_tipo, whatsapp_principal, plan_activo, plan_expira_at, trial_expira_at, created_at, estado_publicacion, comuna_base_slug, categoria_slug_final, subcategorias_slugs"
        )
        .neq("slug", slug)
        .eq("estado_publicacion", "publicado")
        .limit(FETCH_CAP);
      if (comunaSlug) q = q.eq("comuna_base_slug", comunaSlug);
      else q = q.eq("comuna_base_nombre", comunaNombre);
      const { data, error } = await q;
      if (error) return { items: [], meta: null };
      addRows(
        (data || []).filter((r: Record<string, unknown>) => !used.has(s(r.slug))),
        3
      );
    }

    const slice = collected.slice(0, MAX_SIMILARES);
    if (slice.length === 0) return { items: [], meta: null };

    const titleLevel: 1 | 2 | 3 = hadTier1 ? 1 : hadTier2 ? 2 : 3;
    const meta: SimilaresMeta = {
      comunaNombre,
      comunaSlug,
      subcategoriaNombre: subcategoriaNombreTitulo,
      categoriaNombre,
      titleLevel,
    };

    return buildResponse(slice, meta);
  } catch {
    return { items: [], meta: null };
  }
}

