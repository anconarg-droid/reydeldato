import algoliasearch from "algoliasearch";

export function getAlgoliaClient() {
  const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID || "";
  const ALGOLIA_ADMIN_KEY = process.env.ALGOLIA_ADMIN_KEY || "";

  if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_KEY) {
    throw new Error("Faltan ALGOLIA_APP_ID o ALGOLIA_ADMIN_KEY en env.");
  }

  return algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);
}

export function getIndexEmprendedores() {
  const INDEX_EMPRENDEDORES =
    process.env.ALGOLIA_INDEX_EMPRENDEDORES ||
    process.env.ALGOLIA_INDEX_NAME ||
    "emprendedores";

  const client = getAlgoliaClient();
  return client.initIndex(INDEX_EMPRENDEDORES);
}