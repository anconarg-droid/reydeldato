import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import algoliasearch from "algoliasearch";
import { createClient } from "@supabase/supabase-js";
import { indexarEmprendedor } from "@/lib/algolia";
import { EMPRENDEDORES_INDEXACION_VIEW_DEFAULT } from "@/lib/algoliaEmprendedoresReindexSource";

function req(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta variable de entorno: ${name}`);
  return value;
}

async function run() {
  const supabaseUrl = req("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseServiceKey = req("SUPABASE_SERVICE_ROLE_KEY");
  const algoliaAppId = req("ALGOLIA_APP_ID");
  const algoliaAdminKey = req("ALGOLIA_ADMIN_KEY");
  const algoliaIndexName = req("ALGOLIA_INDEX_NAME");

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const algoliaClient = algoliasearch(algoliaAppId, algoliaAdminKey);
  const index = algoliaClient.initIndex(algoliaIndexName);

  const { data, error } = await supabase
    .from(EMPRENDEDORES_INDEXACION_VIEW_DEFAULT)
    .select("*")
    .eq("estado_publicacion", "publicado");

  if (error) {
    throw new Error(
      `Error consultando ${EMPRENDEDORES_INDEXACION_VIEW_DEFAULT}: ${error.message}`
    );
  }

  const rows = (data || []) as Record<string, unknown>[];

  await index.clearObjects();
  await indexarEmprendedor(rows);

  /** Alineado con los atributos que emite `lib/algolia.ts` (`toAlgoliaRecord`). */
  await index.setSettings({
    searchableAttributes: [
      "unordered(nombre)",
      "unordered(descripcion_corta)",
      "unordered(descripcion_larga)",
      "unordered(keywords)",
      "unordered(comuna)",
      "unordered(cobertura)",
      "unordered(comunas)",
      "unordered(modalidades)",
    ],
    attributesForFaceting: [
      "filterOnly(categoria_slug)",
      "filterOnly(subcategoria_slug)",
    ],
    customRanking: ["desc(publicado)"],
    attributesToSnippet: ["descripcion_corta:20", "descripcion_larga:30"],
    attributesToHighlight: ["nombre", "descripcion_corta", "descripcion_larga"],
  });

  console.log(`Indexados ${rows.length} emprendimientos en Algolia.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
