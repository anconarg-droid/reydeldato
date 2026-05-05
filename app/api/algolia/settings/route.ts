import { getAlgoliaAdminIndex } from "@/lib/algoliaServer";
import { applyEmprendedoresIndexSettings } from "@/lib/algoliaIndexSettings";

const INDEX_NAME =
  process.env.ALGOLIA_INDEX_EMPRENDEDORES ||
  process.env.NEXT_PUBLIC_ALGOLIA_INDEX_EMPRENDEDORES ||
  "emprendedores";

export async function GET() {
  const index = getAlgoliaAdminIndex(INDEX_NAME);
  await applyEmprendedoresIndexSettings(index);
  return Response.json({ ok: true, index: INDEX_NAME });
}

