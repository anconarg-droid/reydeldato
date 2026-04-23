import algoliasearch from "algoliasearch";
import { createAlgoliaFetchRequester } from "@/lib/algoliaFetchRequester";

function envOrThrow(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export function getAlgoliaAdminIndex(indexName: string) {
  const appId = envOrThrow("ALGOLIA_APP_ID");
  const adminKey = envOrThrow("ALGOLIA_ADMIN_KEY");
  const client = algoliasearch(appId, adminKey, {
    requester: createAlgoliaFetchRequester(),
  });
  return client.initIndex(indexName);
}