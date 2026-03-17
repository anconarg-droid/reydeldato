import { NextResponse } from "next/server";
import algoliasearch from "algoliasearch";
import { createClient } from "@supabase/supabase-js";
import { indexarEmprendedor } from "@/lib/algolia";

export const runtime = "nodejs";

function s(v: any): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function arr(v: any): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter(Boolean).map((x) => String(x).trim());
}

function chunk(xs: any[], size = 500) {
  const out = [];
  for (let i = 0; i < xs.length; i += size) {
    out.push(xs.slice(i, i + size));
  }
  return out;
}

function nivelRank(nivel: any) {
  const n = s(nivel).toLowerCase();

  if (n === "solo_mi_comuna") return 0;
  if (n === "comunas") return 1;
  if (n === "varias_regiones") return 2;
  if (n === "nacional") return 3;

  return 9;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const algolia = algoliasearch(
  process.env.ALGOLIA_APP_ID!,
  process.env.ALGOLIA_ADMIN_KEY!
);

const INDEX_NAME = process.env.ALGOLIA_INDEX_EMPRENDEDORES || "emprendedores";

async function getAllRows() {
  const pageSize = 1000;
  let from = 0;
  let all: any[] = [];

  while (true) {
    const { data, error } = await supabase
      .from("vw_emprendedores_algolia_final")
      .select("*")
      .range(from, from + pageSize - 1);

    if (error) throw error;

    if (!data || data.length === 0) break;

    all = all.concat(data);

    if (data.length < pageSize) break;

    from += pageSize;
  }

  return all;
}

export async function GET() {
  try {
    const rows = await getAllRows();

    console.log("SUPABASE_ROWS", rows.length);
    if (rows.length > 0) {
      console.log(
        "[reindex-emprendedores] first raw row from vw_emprendedores_algolia_final:",
        rows[0]
      );
    }

    const objects = rows
      .map((row: any) => {
        const nivel = s(row?.nivel_cobertura);
        const tagsSlugs = arr(row?.tags_slugs);
        const keywordsClasif = arr(row?.keywords_clasificacion);
        const coverageKeys = arr((row as any)?.coverage_keys);
        const coverageLabels = arr((row as any)?.coverage_labels);
        const estadoPublicacion = s((row as any)?.estado_publicacion);

        const idStr = s(row?.id);
        const slugStr = s(row?.slug);

        const impresiones =
          row?.impresiones_busqueda != null
            ? Number(row.impresiones_busqueda)
            : 0;

        const createdAt = row?.created_at ?? null;

        const foto =
          s((row as any)?.foto_principal_url) ||
          "/placeholder-emprendedor.jpg";

        const comunaBaseSlug = s(row?.comuna_base_slug);
        const comunaBaseNombre = s(row?.comuna_base_nombre);
        const sectorSlug = s(row?.sector_slug);
        const tagsNombres = arr((row as any)?.tags_nombres);
        const sectorNombre = s((row as any)?.sector_nombre);

        // search_text: sector, tags, keywords, nombre del rubro y descripciones para búsqueda
        const searchTextParts = [
          sectorSlug,
          sectorNombre,
          ...tagsSlugs,
          ...tagsNombres,
          ...keywordsClasif,
          s(row?.nombre),
          s(row?.descripcion_corta),
          s(row?.descripcion_larga),
          comunaBaseNombre,
        ].filter(Boolean);

        return {
          // objectID obligatorio para Algolia: usamos el id real; si faltara, caemos al slug.
          objectID: idStr || slugStr,

          id: idStr,
          slug: slugStr,
          nombre: s(row?.nombre),

          descripcion_corta: s(row?.descripcion_corta),
          descripcion_larga: s(row?.descripcion_larga),
          foto_principal_url: foto,

          // Contacto básico
          whatsapp: s((row as any)?.whatsapp),
          instagram: s((row as any)?.instagram),
          sitio_web: s((row as any)?.sitio_web),
          email: s((row as any)?.email),

          // comuna_slug pedido por el buscador (alias seguro)
          comuna_slug: comunaBaseSlug,
          comuna_base_slug: comunaBaseSlug,
          comuna_base_nombre: comunaBaseNombre,

          coverage_keys: coverageKeys,
          coverage_labels: coverageLabels,

          nivel_cobertura: nivel,
          nivel_rank: nivelRank(nivel),
          estado_publicacion: estadoPublicacion,
          publicado: estadoPublicacion === "publicado",

          // Nuevos campos de clasificación V1
          tipo_actividad: s(row?.tipo_actividad),
          sector_slug: sectorSlug,
          tags_slugs: tagsSlugs,
          keywords_clasificacion: keywordsClasif,
          clasificacion_confianza:
            row?.clasificacion_confianza != null
              ? Number(row.clasificacion_confianza)
              : null,

          // Métricas simples (para ranking/analytics)
          impresiones_busqueda: impresiones,
          created_at: createdAt,

          // Búsqueda: sector, tags, keywords, nombre del rubro y descripciones
          search_text: searchTextParts.join(" ").trim(),
        };
      })
    // No descartar registros si estado_publicacion viene null/incompleto.
    // Solo filtramos explícitamente cuando está seteado y es distinto de "publicado".
    .filter((obj: any) => {
      const estado = s((obj as any)?.estado_publicacion);
      if (!estado) return true;
      return estado === "publicado";
      });

    console.log("ALGOLIA_OBJECTS", objects.length);
    console.log("FIRST_OBJECT", objects[0]);

    console.log("SENDING_TO_ALGOLIA", objects.length);

    // Indexación centralizada
    // Nota: no indexa si estado_publicacion !== "publicado"
    const index = algolia.initIndex(INDEX_NAME);
    await index.clearObjects();
    for (const part of chunk(objects, 500)) {
      await indexarEmprendedor(part);
    }

    console.log("ALGOLIA_SAVE_DONE");

    return NextResponse.json({
      ok: true,
      total_supabase: rows.length,
      total_algolia: objects.length,
      sample: objects[0] || null
    });

  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "unhandled_exception",
        message: e?.message || String(e),
      },
      { status: 500 }
    );
  }
}