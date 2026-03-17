// app/api/comunas/resolve/route.ts
import { NextResponse } from "next/server";
import algoliasearch from "algoliasearch";

const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID!;
const ALGOLIA_SEARCH_KEY = process.env.ALGOLIA_SEARCH_KEY!;
const INDEX_COMUNAS = process.env.ALGOLIA_INDEX_COMUNAS || "comunas";

function norm(str: string | null | undefined): string {
  return (str ?? "").trim();
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = norm(searchParams.get("q") || "");

    if (!q) {
      return NextResponse.json({ ok: true, found: false });
    }

    const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);
    const index = client.initIndex(INDEX_COMUNAS);

    // Buscamos por el campo "search_text" que tú ya tienes (huechuraba region metropolitana, etc.)
    const res = await index.search(q, {
      hitsPerPage: 1,
      typoTolerance: true,
      ignorePlurals: true,
      removeStopWords: ["es"],
    });

    const hit: any = res.hits?.[0];
    if (!hit) {
      return NextResponse.json({ ok: true, found: false });
    }

    const slug = String(hit.slug || "");
    const nombre = String(hit.nombre || hit.display_name || "");

    if (!slug) {
      return NextResponse.json({ ok: true, found: false });
    }

    return NextResponse.json({
      ok: true,
      found: true,
      slug,
      nombre,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "error" }, { status: 500 });
  }
}