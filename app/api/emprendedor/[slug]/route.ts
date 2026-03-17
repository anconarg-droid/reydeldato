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

    const { data, error } = await supabase
      .from("vw_emprendedor_ficha")
      .select("*")
      .eq("slug", slug)
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

    const viewRow = data as Record<string, unknown>;
    const id = viewRow.id ?? null;

    let planFromTable: {
      plan_activo?: boolean;
      plan_expira_at?: string | null;
      trial_expira_at?: string | null;
      trial_inicia_at?: string | null;
      plan_inicia_at?: string | null;
      trial_expira?: string | null;
      created_at?: string | null;
      direccion?: string | null;
      modalidades_atencion_arr?: unknown;
      frase_negocio?: string | null;
    } | null = null;

    let localesFicha: { nombre_local: string | null; direccion: string; comuna_nombre: string; comuna_slug: string; es_principal: boolean }[] = [];

    if (id != null) {
      const { data: planRow, error: planErr } = await supabase
        .from("emprendedores")
        .select("plan_activo, plan_expira_at, trial_expira_at, trial_inicia_at, plan_inicia_at, plan_expira_at, trial_expira, created_at, direccion, modalidades_atencion_arr, frase_negocio")
        .eq("id", id)
        .maybeSingle();
      if (!planErr && planRow) planFromTable = planRow as typeof planFromTable;

      const { data: localesRows } = await supabase
        .from("emprendedor_locales")
        .select("nombre_local, direccion, es_principal, comunas(nombre, slug)")
        .eq("emprendedor_id", id)
        .order("es_principal", { ascending: false });
      if (Array.isArray(localesRows)) {
        localesFicha = localesRows.map((row: any) => ({
          nombre_local: row.nombre_local ? s(row.nombre_local) : null,
          direccion: s(row.direccion),
          comuna_nombre: s(row.comunas?.nombre ?? ""),
          comuna_slug: s(row.comunas?.slug ?? ""),
          es_principal: row.es_principal === true,
        }));
      }
    }

    const planActivo = planFromTable?.plan_activo === true || viewRow.plan_activo === true;
    const planExpiraAt = planFromTable?.plan_expira_at ?? viewRow.plan_expira_at ?? null;
    const trialExpiraAt = planFromTable?.trial_expira_at ?? viewRow.trial_expira_at ?? viewRow.trial_expira ?? null;
    const trialIniciaAt = planFromTable?.trial_inicia_at ?? viewRow.trial_inicia_at ?? null;
    const planIniciaAt = planFromTable?.plan_inicia_at ?? viewRow.plan_inicia_at ?? null;
    const trialExpira = planFromTable?.trial_expira ?? viewRow.trial_expira ?? null;
    const createdAt = planFromTable?.created_at ?? viewRow.created_at ?? null;

    const item = {
      id: data.id ?? null,
      slug: s(data.slug),
      nombre: s(data.nombre),

      descripcion_corta: s(data.descripcion_corta),
      descripcion_larga: s(data.descripcion_larga),
      frase_negocio: s(planFromTable?.frase_negocio ?? ""),

      categoria_id: data.categoria_id ?? null,
      categoria_nombre: s(data.categoria_nombre),
      categoria_slug: s(data.categoria_slug),

      subcategorias_nombres_arr: arr(data.subcategorias_nombres_arr),
      subcategorias_slugs_arr: arr(data.subcategorias_slugs_arr),

      comuna_base_id: data.comuna_base_id ?? null,
      comuna_nombre: s(data.comuna_nombre),
      comuna_slug: s(data.comuna_slug),

      region_id: data.region_id ?? null,
      region_nombre: s(data.region_nombre),
      region_slug: s(data.region_slug),

      cobertura_tipo: s(data.cobertura_tipo),
      cobertura_comunas_arr: arr(data.cobertura_comunas_arr),
      cobertura_comunas_slugs_arr: arr(data.cobertura_comunas_slugs_arr),

      modalidades_atencion_arr: arr(planFromTable?.modalidades_atencion_arr ?? data.modalidades_atencion_arr),

      whatsapp: s(data.whatsapp),
      instagram: s(data.instagram),
      sitio_web: s(data.sitio_web),
      email: s(data.email),
      direccion: s(planFromTable?.direccion ?? data.direccion),

      responsable_nombre: s(data.responsable_nombre),
      mostrar_responsable: b(data.mostrar_responsable),

      foto_principal_url: s(data.foto_principal_url),
      galeria_urls_arr: arr(data.galeria_urls_arr),

      estado_publicacion: s(data.estado_publicacion),
      destacado: b(data.destacado),
      updated_at: data.updated_at ?? null,
      plan: s(viewRow.plan),
      trial_expira: trialExpira ?? trialExpiraAt ?? null,
      created_at: createdAt ?? null,
      trial_inicia_at: trialIniciaAt ?? null,
      trial_expira_at: trialExpiraAt ?? trialExpira ?? null,
      plan_tipo: (viewRow.plan_tipo as string) ?? null,
      plan_periodicidad: (viewRow.plan_periodicidad as string) ?? null,
      plan_activo: planActivo,
      plan_inicia_at: planIniciaAt ?? null,
      plan_expira_at: planExpiraAt ?? null,

      // Nueva clasificación V1 (opcionales; la vista puede no exponerlas aún)
      tipo_actividad: (viewRow.tipo_actividad as string) ?? null,
      sector_slug: s(viewRow.sector_slug) || null,
      tags_slugs: arr(viewRow.tags_slugs)?.length
        ? arr(viewRow.tags_slugs)
        : null,
      clasificacion_confianza:
        viewRow.clasificacion_confianza != null
          ? Number(viewRow.clasificacion_confianza)
          : null,

      // Subcategoría final/sugerida (si la vista ya las expone)
      subcategoria_final: s(viewRow.subcategoria_final),
      subcategoria_final_nombre: s(viewRow.subcategoria_final_nombre),
      subcategoria_final_slug: s(viewRow.subcategoria_final_slug),
      subcategoria_sugerida: s(viewRow.subcategoria_sugerida),
      subcategoria_sugerida_nombre: s(viewRow.subcategoria_sugerida_nombre),
      subcategoria_sugerida_slug: s(viewRow.subcategoria_sugerida_slug),

      // aliases temporales para compatibilidad con tu page.tsx actual
      web: s(data.sitio_web),
      nivel_cobertura: s(data.cobertura_tipo),
      comunas_cobertura_nombres_arr: arr(data.cobertura_comunas_arr),
      modalidades_atencion: arr(data.modalidades_atencion_arr),
      galeria_urls: arr(data.galeria_urls_arr),

      // Locales físicos (para ficha: 1 local = dirección principal; 2–3 = bloque "Locales físicos")
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