/**
 * @deprecated Usa `GET /api/reindex/emprendedores` o `lib/scripts/reindex-algolia.ts`.
 * Este script lee `public_emprendedores_search`, que no está versionada en migraciones del repo
 * y puede no existir en la base.
 */
import "dotenv/config";
import algoliasearch from "algoliasearch";
import { createClient } from "@supabase/supabase-js";

type ViewRow = {
  id: string;
  slug: string;
  nombre: string;
  descripcion_corta: string | null;
  descripcion_larga: string | null;
  foto_principal_url: string | null;
  whatsapp?: string | null;
  instagram?: string | null;

  categoria_id: string | null;
  categoria_nombre: string | null;
  categoria_slug: string | null;

  subcategorias_nombres_arr: string[] | null;
  subcategorias_slugs_arr: string[] | null;

  comuna_base_id: string | null;
  comuna_base_nombre: string | null;
  comuna_base_slug: string | null;

  region_id: string | null;
  region_nombre: string | null;
  region_slug: string | null;

  nivel_cobertura: string | null;
  coverage_keys: string[] | null;
  coverage_labels: string[] | null;

  tipo_actividad: string | null;
  sector_slug: string | null;
  tags_slugs: string[] | null;
  keywords_clasificacion: string[] | null;

  estado_publicacion: string | null;
  activo: boolean | null;

  comunas_cobertura_slugs_arr: string[] | null;
  regiones_cobertura_slugs_arr: string[] | null;

  search_text: string | null;
};

function reqEnv(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v.trim();
}

function cleanString(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function cleanStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => cleanString(x))
    .filter(Boolean);
}

async function main() {
  const supabaseUrl = reqEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseServiceKey = reqEnv("SUPABASE_SERVICE_ROLE_KEY");

  const algoliaAppId = reqEnv("ALGOLIA_APP_ID");
  const algoliaAdminKey = reqEnv("ALGOLIA_ADMIN_KEY");
  const algoliaIndexName =
    process.env.ALGOLIA_INDEX_EMPRENDEDORES?.trim() || "emprendedores";

  console.log("[reindex-algolia] Using index:", algoliaIndexName);

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const algoliaClient = algoliasearch(algoliaAppId, algoliaAdminKey);
  const index = algoliaClient.initIndex(algoliaIndexName);

  console.log("[reindex-algolia] Fetching data from view public_emprendedores_search…");

  const { data, error } = await supabase
    .from("public_emprendedores_search")
    .select("*")
    .eq("estado_publicacion", "publicado")
    .is("activo", true);

  if (error) {
    console.error("[reindex-algolia] Error querying view:", error.message);
    process.exit(1);
  }

  const rows = (data || []) as ViewRow[];
  console.log(`[reindex-algolia] Retrieved ${rows.length} rows from view.`);

  const objects = rows.map((row) => {
    const subcategoriasNombres = cleanStringArray(row.subcategorias_nombres_arr);
    const coverageKeys = cleanStringArray(row.coverage_keys);
    const coverageLabels = cleanStringArray(row.coverage_labels);
    const tagsSlugs = cleanStringArray(row.tags_slugs);
    const keywordsClasif = cleanStringArray(row.keywords_clasificacion);

    return {
      objectID: cleanString(row.id),
      slug: cleanString(row.slug),
      nombre: cleanString(row.nombre),
      descripcion_corta: cleanString(row.descripcion_corta),
      descripcion_larga: cleanString(row.descripcion_larga),
      // comuna_slug pedido por el buscador (alias seguro)
      comuna_slug: cleanString(row.comuna_base_slug),
      comuna_base_slug: cleanString(row.comuna_base_slug),
      comuna_base_nombre: cleanString(row.comuna_base_nombre),

      foto_principal_url: cleanString(row.foto_principal_url),
      whatsapp: cleanString(row.whatsapp),
      instagram: cleanString(row.instagram),
      web: cleanString((row as any).web),
      coverage_keys: coverageKeys,
      coverage_labels: coverageLabels,
      tipo_actividad: cleanString(row.tipo_actividad),
      sector_slug: cleanString(row.sector_slug),
      tags_slugs: tagsSlugs,
      keywords_clasificacion: keywordsClasif,
      estado_publicacion: cleanString(row.estado_publicacion),
      search_text: [
        cleanString(row.nombre),
        cleanString(row.descripcion_corta),
        cleanString(row.descripcion_larga),
        ...tagsSlugs,
        ...keywordsClasif,
        cleanString(row.sector_slug),
      ].join(" "),
    };
  });

  console.log(
    `[reindex-algolia] Sending ${objects.length} objects to Algolia index ${algoliaIndexName}…`
  );

  try {
    const res = await index.replaceAllObjects(objects, {
      autoGenerateObjectIDIfNotExist: false,
    });
    console.log("[reindex-algolia] Algolia taskIDs:", res.taskIDs);
    console.log("[reindex-algolia] Done.");
  } catch (err) {
    console.error("[reindex-algolia] Error sending data to Algolia:", err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[reindex-algolia] Unhandled error:", err);
  process.exit(1);
});

