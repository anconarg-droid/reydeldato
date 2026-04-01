import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function arr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => (x == null ? "" : String(x).trim()))
    .filter(Boolean);
}

function s(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function b(v: unknown): boolean {
  return v === true;
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;

    if (!slug?.trim()) {
      return NextResponse.json(
        {
          ok: false,
          error: "missing_slug",
          message: "Falta slug",
        },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // 1) Emprendedor base directo desde tabla
    const { data, error } = await supabase
      .from("emprendedores")
      .select("*")
      .eq("slug", slug)
      .eq("estado_publicacion", "publicado")
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: "db_error",
          message: error.message,
          slug,
        },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          ok: false,
          error: "not_found",
          message: "Emprendimiento no encontrado",
          slug,
        },
        { status: 404 }
      );
    }

    const row = data as Record<string, unknown>;
    const id = row.id ?? null;

    // 2) Comuna base
    let comunaNombre = "";
    let comunaSlug = "";
    let regionId: number | null = null;
    let regionNombre = "";
    let regionSlug = "";

    if (row.comuna_id != null) {
      const { data: comunaRow } = await supabase
        .from("comunas")
        .select("id, nombre, slug, region_id")
        .eq("id", row.comuna_id)
        .maybeSingle();

      if (comunaRow) {
        comunaNombre = s((comunaRow as any).nombre);
        comunaSlug = s((comunaRow as any).slug);
        regionId = Number((comunaRow as any).region_id ?? null);

        if (regionId) {
          const { data: regionRow } = await supabase
            .from("regiones")
            .select("id, nombre, slug")
            .eq("id", regionId)
            .maybeSingle();

          if (regionRow) {
            regionNombre = s((regionRow as any).nombre);
            regionSlug = s((regionRow as any).slug);
          }
        }
      }
    }

    // 3) Categoría
    let categoriaNombre = "";
    let categoriaSlug = "";

    if (row.categoria_id != null) {
      const { data: categoriaRow } = await supabase
        .from("categorias")
        .select("id, nombre, slug")
        .eq("id", row.categoria_id)
        .maybeSingle();

      if (categoriaRow) {
        categoriaNombre = s((categoriaRow as any).nombre);
        categoriaSlug = s((categoriaRow as any).slug);
      }
    }

    // 4) Subcategoría principal
    const principalSubId = s(row.subcategoria_principal_id);
    let principalSubNombre = "";
    let principalSubSlug = "";

    if (principalSubId) {
      const { data: subRow } = await supabase
        .from("subcategorias")
        .select("id, nombre, slug")
        .eq("id", principalSubId)
        .maybeSingle();

      if (subRow) {
        principalSubNombre = s((subRow as any).nombre);
        principalSubSlug = s((subRow as any).slug);
      }
    }

    // 5) Subcategorías relacionadas
    let subcategoriasNombresArr: string[] = [];
    let subcategoriasSlugsArr: string[] = [];

    if (id != null) {
      const { data: subRows } = await supabase
        .from("emprendedor_subcategorias")
        .select("subcategoria_id, subcategorias(nombre, slug)")
        .eq("emprendedor_id", id);

      if (Array.isArray(subRows)) {
        subcategoriasNombresArr = subRows
          .map((r: any) => s(r.subcategorias?.nombre))
          .filter(Boolean);

        subcategoriasSlugsArr = subRows
          .map((r: any) => s(r.subcategorias?.slug))
          .filter(Boolean);
      }
    }

    // 6) Modalidades
    let modalidadesAtencionArr: string[] = [];

    if (id != null) {
      const { data: modalidadesRows } = await supabase
        .from("emprendedor_modalidades")
        .select("modalidad")
        .eq("emprendedor_id", id);

      if (Array.isArray(modalidadesRows)) {
        modalidadesAtencionArr = modalidadesRows
          .map((r: any) => s(r.modalidad))
          .filter(Boolean);
      }
    }

    // 7) Galería
    let galeriaUrlsArr: string[] = [];

    if (id != null) {
      const { data: galeriaRows } = await supabase
        .from("emprendedor_galeria")
        .select("imagen_url")
        .eq("emprendedor_id", id);

      if (Array.isArray(galeriaRows)) {
        galeriaUrlsArr = galeriaRows
          .map((r: any) => s(r.imagen_url))
          .filter(Boolean);
      }
    }

    // 8) Cobertura comunas (misma tabla que aprobar / panel / vista Algolia)
    let coberturaComunasArr: string[] = [];
    let coberturaComunasSlugsArr: string[] = [];

    if (id != null) {
      const { data: coberturaComunasRows } = await supabase
        .from("emprendedor_comunas_cobertura")
        .select("comuna_id, comunas(nombre, slug)")
        .eq("emprendedor_id", id);

      if (Array.isArray(coberturaComunasRows)) {
        coberturaComunasArr = coberturaComunasRows
          .map((r: any) => s(r.comunas?.nombre))
          .filter(Boolean);

        coberturaComunasSlugsArr = coberturaComunasRows
          .map((r: any) => s(r.comunas?.slug))
          .filter(Boolean);
      }
    }

    // 9) Cobertura regiones (tabla canónica; antes la ficha no las exponía)
    let coberturaRegionesArr: string[] = [];
    let coberturaRegionesSlugsArr: string[] = [];

    if (id != null) {
      const { data: coberturaRegionesRows } = await supabase
        .from("emprendedor_regiones_cobertura")
        .select("region_id, regiones(nombre, slug)")
        .eq("emprendedor_id", id);

      if (Array.isArray(coberturaRegionesRows)) {
        coberturaRegionesArr = coberturaRegionesRows
          .map((r: any) => s(r.regiones?.nombre))
          .filter(Boolean);

        coberturaRegionesSlugsArr = coberturaRegionesRows
          .map((r: any) => s(r.regiones?.slug))
          .filter(Boolean);
      }
    }

    // 10) Locales físicos
    let localesFicha: {
      nombre_local: string | null;
      direccion: string;
      comuna_nombre: string;
      comuna_slug: string;
      es_principal: boolean;
    }[] = [];

    if (id != null) {
      const { data: localesRows } = await supabase
        .from("emprendedor_locales")
        .select("nombre_local, direccion, es_principal, comunas(nombre, slug)")
        .eq("emprendedor_id", id)
        .order("es_principal", { ascending: false });

      if (Array.isArray(localesRows)) {
        localesFicha = localesRows.map((r: any) => ({
          nombre_local: r.nombre_local ? s(r.nombre_local) : null,
          direccion: s(r.direccion),
          comuna_nombre: s(r.comunas?.nombre),
          comuna_slug: s(r.comunas?.slug),
          es_principal: r.es_principal === true,
        }));
      }
    }

    const item = {
      id: row.id ?? null,
      slug: s(row.slug),
      nombre: s(row.nombre_emprendimiento),

      descripcion_corta: s(row.descripcion_corta || row.frase_negocio),
      descripcion_larga: s(row.descripcion_larga || row.descripcion_libre),
      frase_negocio: s(row.frase_negocio),

      categoria_id: row.categoria_id ?? null,
      categoria_nombre: categoriaNombre,
      categoria_slug: categoriaSlug,
      categoria_slug_final: s(row.categoria_slug_final),

      subcategorias_nombres_arr: subcategoriasNombresArr,
      subcategorias_slugs_arr: subcategoriasSlugsArr,

      subcategoria_principal_id: principalSubId || null,
      subcategoria_principal_nombre: principalSubNombre,
      subcategoria_principal_slug: principalSubSlug,
      subcategorias_slugs: arr(row.subcategorias_slugs).length
        ? arr(row.subcategorias_slugs)
        : subcategoriasSlugsArr,
      subcategoria_slug_final: s(row.subcategoria_slug_final),

      comuna_base_id: row.comuna_id ?? null,
      comuna_nombre: comunaNombre,
      comuna_slug: comunaSlug,

      region_id: regionId,
      region_nombre: regionNombre,
      region_slug: regionSlug,

      cobertura_tipo: s(row.cobertura_tipo),
      cobertura_comunas_arr: coberturaComunasArr,
      cobertura_comunas_slugs_arr: coberturaComunasSlugsArr,
      comunas_cobertura: coberturaComunasArr,

      cobertura_regiones_arr: coberturaRegionesArr,
      cobertura_regiones_slugs_arr: coberturaRegionesSlugsArr,
      regiones_cobertura_nombres_arr: coberturaRegionesArr,
      regiones_cobertura_slugs_arr: coberturaRegionesSlugsArr,

      modalidad_atencion: modalidadesAtencionArr,
      modalidades_atencion_arr: modalidadesAtencionArr,
      modalidades_atencion: modalidadesAtencionArr,

      whatsapp: s(row.whatsapp_principal),
      instagram: s(row.instagram),
      sitio_web: s(row.sitio_web),
      email: s(row.email),
      direccion: s(row.direccion),

      responsable_nombre: s(row.nombre_responsable),
      mostrar_responsable: b(row.mostrar_responsable_publico),

      foto_principal_url: s(row.foto_principal_url),
      galeria_urls_arr: galeriaUrlsArr,

      estado_publicacion: s(row.estado_publicacion),
      destacado: b(row.destacado),
      updated_at: row.updated_at ?? null,

      plan: s(row.plan),
      trial_expira: row.trial_expira ?? row.trial_expira_at ?? null,
      created_at: row.created_at ?? null,
      trial_inicia_at: row.trial_inicia_at ?? null,
      trial_expira_at: row.trial_expira_at ?? row.trial_expira ?? null,
      plan_tipo: (row.plan_tipo as string) ?? null,
      plan_periodicidad: (row.plan_periodicidad as string) ?? null,
      plan_activo: row.plan_activo === true,
      plan_inicia_at: row.plan_inicia_at ?? null,
      plan_expira_at: row.plan_expira_at ?? null,

      tipo_actividad: (row.tipo_actividad as string) ?? null,
      sector_slug: s(row.sector_slug) || null,
      tags_slugs: arr(row.tags_slugs).length ? arr(row.tags_slugs) : null,
      clasificacion_confianza:
        row.clasificacion_confianza != null
          ? Number(row.clasificacion_confianza)
          : null,

      keywords: arr(row.keywords).length
        ? arr(row.keywords)
        : arr(row.palabras_clave),
      keywords_finales: arr(row.keywords_finales),

      // aliases temporales
      web: s(row.sitio_web),
      nivel_cobertura: s(row.cobertura_tipo),
      comunas_cobertura_nombres_arr: coberturaComunasArr,
      galeria_urls: galeriaUrlsArr,
      comuna_base_nombre: comunaNombre,
      comuna_base_slug: comunaSlug,

      locales: localesFicha,
    };

    return NextResponse.json({
      ok: true,
      item,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "unexpected_error",
        message:
          error instanceof Error ? error.message : "Error inesperado",
      },
      { status: 500 }
    );
  }
}