import algoliasearch from "algoliasearch";

const appId = process.env.ALGOLIA_APP_ID!;
const adminKey = process.env.ALGOLIA_ADMIN_KEY!;
const indexName = process.env.ALGOLIA_INDEX_EMPRENDEDORES_PUBLICOS!;

if (!appId || !adminKey || !indexName) {
  throw new Error("Faltan variables de entorno de Algolia (SERVER)");
}

const client = algoliasearch(appId, adminKey);

export const emprendedoresIndex = client.initIndex(indexName);