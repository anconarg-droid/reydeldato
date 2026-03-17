import dotenv from "dotenv"
dotenv.config({ path: ".env.local" })
import algoliasearch from "algoliasearch";
import { createClient } from "@supabase/supabase-js";
import { indexarEmprendedor } from "@/lib/algolia";

type AlgoliaRow = {
  id: string;
  slug: string;
  nombre: string;
  descripcion_corta: string | null;
  descripcion_larga: string | null;

  categoria_nombre: string | null;
  categoria_slug: string | null;

  comuna_base_nombre: string | null;
  comuna_base_slug: string | null;
  region_nombre: string | null;

  nivel_cobertura: string | null;
  foto_principal_url: string | null;

  whatsapp: string | null;
  instagram: string | null;
  web: string | null;
  email: string | null;

  subcategorias_nombres_arr: string[] | null;
  subcategorias_slugs_arr: string[] | null;

  comunas_cobertura_nombres_arr: string[] | null;
  comunas_cobertura_slugs_arr: string[] | null;

  regiones_cobertura_nombres_arr: string[] | null;
  regiones_cobertura_slugs_arr: string[] | null;

  modalidades_atencion: string[] | null;
  keywords: string[] | null;
  servicios: string[] | null;

  search_text: string | null;
  keywords_text: string | null;

  publicado: boolean | null;
  estado: string | null;
  estado_publicacion: string | null;
};

function req(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta variable de entorno: ${name}`);
  return value;
}

function cleanArray(value: string[] | null | undefined): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((x) => String(x).trim()).filter(Boolean);
}

function cleanText(value: unknown): string {
  return String(value ?? "").trim();
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
    .from("vw_emprendedores_algolia_final")
    .select("*")
    .or("publicado.eq.true,estado.eq.aprobado,estado_publicacion.eq.aprobado");

  if (error) {
    throw new Error(`Error consultando vista final: ${error.message}`);
  }

  const rows = (data || []) as AlgoliaRow[];

  const objects = rows.map((row) => ({
    objectID: row.id,
    id: row.id,
    slug: cleanText(row.slug),
    nombre: cleanText(row.nombre),

    descripcion_corta: cleanText(row.descripcion_corta),
    descripcion_larga: cleanText(row.descripcion_larga),

    categoria_nombre: cleanText(row.categoria_nombre),
    categoria_slug: cleanText(row.categoria_slug),

    comuna_base_nombre: cleanText(row.comuna_base_nombre),
    comuna_base_slug: cleanText(row.comuna_base_slug),
    region_nombre: cleanText(row.region_nombre),

    nivel_cobertura: cleanText(row.nivel_cobertura),

    foto_principal_url: cleanText(row.foto_principal_url),

    whatsapp: cleanText(row.whatsapp),
    instagram: cleanText(row.instagram),
    web: cleanText(row.web),
    email: cleanText(row.email),

    subcategorias_nombres_arr: cleanArray(row.subcategorias_nombres_arr),
    subcategorias_slugs_arr: cleanArray(row.subcategorias_slugs_arr),

    comunas_cobertura_nombres_arr: cleanArray(row.comunas_cobertura_nombres_arr),
    comunas_cobertura_slugs_arr: cleanArray(row.comunas_cobertura_slugs_arr),

    regiones_cobertura_nombres_arr: cleanArray(row.regiones_cobertura_nombres_arr),
    regiones_cobertura_slugs_arr: cleanArray(row.regiones_cobertura_slugs_arr),

    modalidades_atencion: cleanArray(row.modalidades_atencion),
    keywords: cleanArray(row.keywords),
    servicios: cleanArray(row.servicios),

    keywords_text: cleanText(row.keywords_text),
    search_text: cleanText(row.search_text),

    publicado: !!row.publicado,
    estado: cleanText(row.estado),
    estado_publicacion: cleanText(row.estado_publicacion),
  }));

  await index.clearObjects();
  await indexarEmprendedor(objects);

  await index.setSettings({
    searchableAttributes: [
      "unordered(nombre)",
      "unordered(search_text)",
      "unordered(keywords_text)",
      "unordered(categoria_nombre)",
      "unordered(subcategorias_nombres_arr)",
      "unordered(comuna_base_nombre)",
      "unordered(region_nombre)",
      "unordered(servicios)",
      "unordered(keywords)",
    ],
    attributesForFaceting: [
      "filterOnly(categoria_slug)",
      "filterOnly(subcategorias_slugs_arr)",
      "filterOnly(comuna_base_slug)",
      "filterOnly(comunas_cobertura_slugs_arr)",
      "filterOnly(regiones_cobertura_slugs_arr)",
      "filterOnly(nivel_cobertura)",
      "filterOnly(modalidades_atencion)",
    ],
    customRanking: [
      "desc(publicado)",
    ],
    attributesToSnippet: [
      "descripcion_corta:20",
      "descripcion_larga:30",
    ],
    attributesToHighlight: [
      "nombre",
      "descripcion_corta",
      "search_text",
      "keywords_text",
    ],
  });

  console.log(`Indexados ${objects.length} emprendimientos en Algolia.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});