import { NextRequest, NextResponse } from "next/server";
import algoliasearch from "algoliasearch";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Falta variable de entorno: ${name}`);
  return v;
}

function getClient() {
  const appId = requireEnv("ALGOLIA_APP_ID");
  const key = requireEnv("ALGOLIA_SEARCH_KEY");
  return algoliasearch(appId, key);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const comuna = (searchParams.get("comuna") ?? "").trim().toLowerCase();

  if (!q) return NextResponse.json({ ok: true, q, comuna, suggestions: [] });

  const client = getClient();
  const indexName = process.env.ALGOLIA_INDEX_EMPRENDEDORES ?? "emprendedores";
  const index = client.initIndex(indexName);

  // Sugerencias: nombres, subcategorías, etc (lo mínimo para partir)
  const res = await index.search<any>(q, {
    hitsPerPage: 8,
    attributesToRetrieve: ["nombre", "slug", "subcategorias_nombres", "subcategorias_slugs", "categoria_nombre", "categoria_slug"],
    // si quieres sugerencias locales: solo para mejorar UX, no para filtrar duro aquí
    // facetFilters: comuna ? [[`comuna_base_slug:${comuna}`]] : undefined,
  });

  const suggestions = res.hits.map((h: any) => ({
    type: "emprendedor",
    label: h.nombre,
    slug: h.slug,
  }));

  return NextResponse.json({ ok: true, q, comuna, suggestions });
}