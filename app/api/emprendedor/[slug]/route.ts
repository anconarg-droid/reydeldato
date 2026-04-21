import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerPublicClient } from "@/lib/supabase/server";
import {
  planPeriodicidadDesdeEmprendedorRow,
  planTipoComercialDesdeEmprendedorRow,
} from "@/lib/emprendedorPlanCamposCompat";
import { direccionCallePrincipalDesdeLocales } from "@/lib/emprendedorLocalesFichaPublica";
import { emprendedorFichaVisiblePublicamente } from "@/lib/estadoPublicacion";
import { fetchGaleriaImagenesUrlsPublicas } from "@/lib/emprendedorGaleriaPivot";

export const dynamic = "force-dynamic";

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

/** Evita respuestas cacheadas cuando la ficha pasa por revisión / cambia visibilidad. */
const NO_STORE_JSON_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0, must-revalidate",
  Pragma: "no-cache",
} as const;

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
        { status: 400, headers: NO_STORE_JSON_HEADERS }
      );
    }

    const supabase = createSupabaseServerPublicClient();

    const { data, error } = await supabase
      .from("vw_emprendedores_publico")
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
        { status: 500, headers: NO_STORE_JSON_HEADERS }
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
        { status: 404, headers: NO_STORE_JSON_HEADERS }
      );
    }

    if (!emprendedorFichaVisiblePublicamente(data.estado_publicacion)) {
      return NextResponse.json(
        {
          ok: false,
          error: "no_publicado",
          message: "Esta ficha no está publicada.",
          slug,
        },
        { status: 404, headers: NO_STORE_JSON_HEADERS }
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

    const subcategoriasNombresArr = arr(row.subcategorias_nombres_arr);
    const subcategoriasSlugsArr = arr(row.subcategorias_slugs);
    const principalSubNombre = subcategoriasNombresArr[0] || "";
    const principalSubSlug = subcategoriasSlugsArr[0] || "";

    const modalidadesAtencionArr = arr(row.modalidades_atencion_arr);
    const galeriaUrlsArr = id
      ? await fetchGaleriaImagenesUrlsPublicas(supabase, id)
      : [];

    const coberturaComunasArr = arr(row.comunas_cobertura_nombres_arr);
    const coberturaComunasSlugsArr = arr(row.comunas_cobertura_slugs_arr);

    const coberturaRegionesArr = arr(row.regiones_cobertura_nombres_arr);
    const coberturaRegionesSlugsArr = arr(row.regiones_cobertura_slugs_arr);

    const localesFicha = Array.isArray(row.locales) ? (row.locales as any[]) : [];
    const direccionDesdeLocales = direccionCallePrincipalDesdeLocales(localesFicha);

    const item = {
      id: row.id ?? null,
      slug: s(row.slug),
      nombre: s(row.nombre_emprendimiento),
      nombre_emprendimiento: s(row.nombre_emprendimiento),

      descripcion_corta: s(row.descripcion_corta || row.frase_negocio),
      descripcion_larga: s(row.descripcion_larga || row.descripcion_libre),
      frase_negocio: s(row.frase_negocio),

      categoria_id: row.categoria_id ?? null,
      categoria_nombre: categoriaNombre,
      categoria_slug: categoriaSlug,
      categoria_slug_final: s(row.categoria_slug_final),

      subcategorias_nombres_arr: subcategoriasNombresArr,
      subcategorias_slugs_arr: subcategoriasSlugsArr,

      subcategoria_principal_nombre: principalSubNombre,
      subcategoria_principal_slug: principalSubSlug,
      subcategorias_slugs: arr(row.subcategorias_slugs).length
        ? arr(row.subcategorias_slugs)
        : subcategoriasSlugsArr,
      subcategoria_slug_final: s(row.subcategoria_slug_final),

      comuna_id: row.comuna_id ?? null,
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
      whatsapp_secundario: s(row.whatsapp_secundario),
      instagram: s(row.instagram),
      sitio_web: s(row.sitio_web),
      responsable_nombre: s(row.nombre_responsable),
      mostrar_responsable: Boolean(s(row.nombre_responsable)),
      direccion: direccionDesdeLocales,
      /** Alias; misma regla que `direccion` (solo desde `emprendedor_locales`). */
      direccion_local: direccionDesdeLocales,

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
      plan_tipo: planTipoComercialDesdeEmprendedorRow(
        row as Record<string, unknown>
      ),
      plan_periodicidad: planPeriodicidadDesdeEmprendedorRow(
        row as Record<string, unknown>
      ),
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

    return NextResponse.json(
      {
        ok: true,
        item,
      },
      { headers: NO_STORE_JSON_HEADERS }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "unexpected_error",
        message:
          error instanceof Error ? error.message : "Error inesperado",
      },
      { status: 500, headers: NO_STORE_JSON_HEADERS }
    );
  }
}