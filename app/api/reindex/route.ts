import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import algoliasearch from "algoliasearch";
import {
  countGaleriaPivotByEmprendedorIds,
  normalizeEmprendedorId,
} from "@/lib/emprendedorGaleriaPivot";
import { fichaPublicaEsMejoradaDesdeBusqueda } from "@/lib/estadoFicha";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const algolia = algoliasearch(
  process.env.ALGOLIA_APP_ID!,
  process.env.ALGOLIA_ADMIN_KEY!
);

const index = algolia.initIndex(
  process.env.ALGOLIA_INDEX_EMPRENDEDORES || "emprendedores"
);

function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function uniq<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return uniq(
      value.map((x) => s(x)).filter(Boolean)
    );
  }

  const txt = s(value);
  if (!txt) return [];

  return uniq(
    txt
      .split("|")
      .map((x) => x.trim())
      .filter(Boolean)
  );
}

function buildSearchText(row: Record<string, unknown>): string {
  const existing = s(row.search_text);
  if (existing) return existing;

  const keywordsArr = asStringArray(row.keywords ?? row.palabras_clave);
  const parts = [
    s(row.nombre),
    s(row.descripcion_corta),
    s(row.descripcion_larga),
    s(row.categoria_nombre),
    ...asStringArray(row.subcategorias_nombres_arr),
    ...keywordsArr,
    s(row.comuna_base_nombre),
    ...asStringArray(row.tags_slugs),
  ];
  return parts.filter(Boolean).join(" ");
}

function transformRow(row: any, galeriaPivotByEmpId: Map<string, number>) {
  const subcategoriasNombresArr = asStringArray(
    row.subcategorias_nombres_arr
  );
  const subcategoriasSlugsArr = asStringArray(
    row.subcategorias_slugs_arr ?? row.subcategorias_slugs
  );

  const comunasCoberturaNombresArr = asStringArray(
    row.comunas_cobertura_nombres_arr
  );
  const comunasCoberturaSlugsArr = asStringArray(
    row.comunas_cobertura_slugs_arr
  );

  const regionesCoberturaNombresArr = asStringArray(
    row.regiones_cobertura_nombres_arr
  );
  const regionesCoberturaSlugsArr = asStringArray(
    row.regiones_cobertura_slugs_arr
  );

  const serviciosArr = asStringArray(row.servicios);
  const keywordsArr = asStringArray(row.keywords ?? row.palabras_clave);

  const modalidadesAtencionArr = asStringArray(
    row.modalidades_atencion_arr ?? row.modalidades_atencion
  );

  const galeriaUrlsArr = asStringArray(row.galeria_urls ?? row.galeria_urls_arr);

  const estadoPublicacion = s(row.estado_publicacion);

  return {
    objectID: s(row.id || row.objectID),
    id: s(row.id),
    slug: s(row.slug),
    nombre: s(row.nombre),

    descripcion_corta: s(row.descripcion_corta),
    descripcion_larga: s(row.descripcion_larga),

    categoria_id: s(row.categoria_id),
    categoria_nombre: s(row.categoria_nombre),
    categoria_slug: s(row.categoria_slug ?? row.categoria_slug_final),

    comuna_base_id: s(row.comuna_base_id),
    comuna_base_nombre: s(row.comuna_base_nombre),
    comuna_base_slug: s(row.comuna_base_slug),
    region_nombre: s(row.region_nombre),
    region_slug: s(row.region_slug),

    nivel_cobertura: s(row.nivel_cobertura),

    foto_principal_url: s(row.foto_principal_url),
    galeria_urls: galeriaUrlsArr,

    whatsapp: s(row.whatsapp ?? row.whatsapp_principal),
    instagram: s(row.instagram),
    web: s(row.web ?? row.sitio_web),
    email: s(row.email),

    direccion: s(row.direccion),
    zona_sector: s(row.zona_sector),

    responsable_nombre: s(row.responsable_nombre),
    mostrar_responsable: !!row.mostrar_responsable,
    responsable_publico: s(row.responsable_publico),

    plan: s(row.plan),
    estado_publicacion: estadoPublicacion,
    publicado: estadoPublicacion === "publicado",

    subcategorias_nombres_arr: subcategoriasNombresArr,
    subcategorias_slugs_arr: subcategoriasSlugsArr,

    comunas_cobertura_nombres_arr: comunasCoberturaNombresArr,
    comunas_cobertura_slugs_arr: comunasCoberturaSlugsArr,

    regiones_cobertura_nombres_arr: regionesCoberturaNombresArr,
    regiones_cobertura_slugs_arr: regionesCoberturaSlugsArr,

    servicios: serviciosArr,
    keywords: keywordsArr,
    modalidades_atencion: modalidadesAtencionArr,

    search_text: buildSearchText(row as Record<string, unknown>),
    keywords_text:
      s(row.keywords_text) ||
      keywordsArr.join(" ").trim(),

    nivel_rank: Number(row.nivel_rank ?? 9999),

    sector_slug: s(row.sector_slug),
    tipo_actividad: s(row.tipo_actividad),
    tags_slugs: asStringArray(row.tags_slugs),
    clasificacion_confianza:
      row.clasificacion_confianza == null || row.clasificacion_confianza === ""
        ? null
        : Number(row.clasificacion_confianza),

    ficha_mejorada_contenido: fichaPublicaEsMejoradaDesdeBusqueda(
      row as Record<string, unknown>,
      null,
      galeriaPivotByEmpId.get(normalizeEmprendedorId(row.id)) ?? 0
    ),
  };
}

export async function GET() {
  try {
    const pageSize = 1000;
    let from = 0;
    let allRows: any[] = [];

    while (true) {
      const to = from + pageSize - 1;

      const { data, error } = await supabase
        .from("vw_emprendedores_busqueda_v2")
        .select("*")
        .range(from, to);

      if (error) {
        return NextResponse.json(
          {
            ok: false,
            error: "supabase_error",
            message: error.message,
            from,
            to,
          },
          { status: 500 }
        );
      }

      const rows = data || [];
      allRows = allRows.concat(rows);

      if (rows.length < pageSize) break;
      from += pageSize;
    }

    const galeriaPivotByEmpId = await countGaleriaPivotByEmprendedorIds(
      supabase,
      allRows.map((r) => r.id)
    );

    const objects = allRows
      .map((row) => transformRow(row, galeriaPivotByEmpId))
      .filter(
        (item) =>
          item.objectID &&
          item.slug &&
          item.nombre &&
          item.categoria_slug &&
          item.comuna_base_slug &&
          item.estado_publicacion === "publicado"
      );

    await index.replaceAllObjects(objects, {
      autoGenerateObjectIDIfNotExist: false,
    });

    await index.setSettings({
      attributesForFaceting: [
        "filterOnly(categoria_slug)",
        "filterOnly(comuna_base_slug)",
        "filterOnly(comunas_cobertura_slugs_arr)",
        "filterOnly(regiones_cobertura_slugs_arr)",
        "filterOnly(subcategorias_slugs_arr)",
        "filterOnly(nivel_cobertura)",
        "filterOnly(publicado)",
        "filterOnly(estado_publicacion)",
        "filterOnly(sector_slug)",
        "filterOnly(tipo_actividad)",
        "filterOnly(tags_slugs)",
        "filterOnly(ficha_mejorada_contenido)",
      ],
      searchableAttributes: [
        "unordered(nombre)",
        "descripcion_corta",
        "search_text",
        "unordered(tags_slugs)",
        "descripcion_larga",
        "unordered(subcategorias_nombres_arr)",
        "unordered(keywords)",
        "categoria_nombre",
        "keywords_text",
        "comuna_base_nombre",
        "region_nombre",
      ],
      customRanking: ["asc(nivel_rank)"],
      attributesToRetrieve: [
        "objectID",
        "id",
        "slug",
        "nombre",
        "descripcion_corta",
        "descripcion_larga",
        "categoria_id",
        "categoria_nombre",
        "categoria_slug",
        "comuna_base_id",
        "comuna_base_nombre",
        "comuna_base_slug",
        "region_nombre",
        "region_slug",
        "nivel_cobertura",
        "foto_principal_url",
        "galeria_urls",
        "whatsapp",
        "instagram",
        "web",
        "email",
        "direccion",
        "zona_sector",
        "responsable_nombre",
        "mostrar_responsable",
        "responsable_publico",
        "plan",
        "estado_publicacion",
        "publicado",
        "subcategorias_nombres_arr",
        "subcategorias_slugs_arr",
        "comunas_cobertura_nombres_arr",
        "comunas_cobertura_slugs_arr",
        "regiones_cobertura_nombres_arr",
        "regiones_cobertura_slugs_arr",
        "servicios",
        "keywords",
        "modalidades_atencion",
        "search_text",
        "keywords_text",
        "nivel_rank",
        "sector_slug",
        "tipo_actividad",
        "tags_slugs",
        "clasificacion_confianza",
        "ficha_mejorada_contenido",
      ],
    });

    return NextResponse.json({
      ok: true,
      total_supabase: allRows.length,
      total_algolia: objects.length,
      index: process.env.ALGOLIA_INDEX_EMPRENDEDORES || "emprendedores",
      sample: objects.slice(0, 3).map((x) => ({
        nombre: x.nombre,
        slug: x.slug,
        categoria_slug: x.categoria_slug,
        comuna_base_slug: x.comuna_base_slug,
        estado_publicacion: x.estado_publicacion,
        subcategorias_slugs_arr: x.subcategorias_slugs_arr,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: "reindex_error",
        message: err instanceof Error ? err.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}