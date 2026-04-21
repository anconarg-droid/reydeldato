// app/api/suggest/q/route.ts
import { NextResponse } from "next/server";
import algoliasearch from "algoliasearch";
import { resolveQueryFromBusquedaSinonimos } from "@/lib/busquedaSinonimosResolve";
import { createSupabaseServerPublicClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function s(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function env(name: string) {
  const v = process.env[name];
  return v && v.trim().length ? v.trim() : "";
}

function norm(v: unknown): string {
  return s(v)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function prettyTagSlug(slug: string): string {
  const base = s(slug).replace(/_/g, " ").trim();
  if (!base) return "";
  const lower = base.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = s(url.searchParams.get("q"));

    if (!q || q.length < 2) return NextResponse.json({ ok: true, items: [] });

    const supabase = createSupabaseServerPublicClient();
    const qResolved =
      (await resolveQueryFromBusquedaSinonimos(supabase, q)) || q;

    const appId = env("ALGOLIA_APP_ID") || env("NEXT_PUBLIC_ALGOLIA_APP_ID");
    const searchKey = env("ALGOLIA_SEARCH_KEY") || env("NEXT_PUBLIC_ALGOLIA_SEARCH_KEY");
    const indexName = env("ALGOLIA_INDEX_EMPRENDEDORES") || "emprendedores";

    if (!appId || !searchKey) {
      return NextResponse.json({ ok: false, error: "Faltan env Algolia (APP_ID/SEARCH_KEY)" }, { status: 500 });
    }

    const client = algoliasearch(appId, searchKey);
    const index = client.initIndex(indexName);

    const res = await index.search(qResolved, {
      hitsPerPage: 20,
      attributesToRetrieve: [
        "nombre",
        "categoria_nombre",
        "subcategorias_nombres_arr",
        "tags_slugs",
        "comuna_base_nombre",
      ],
      typoTolerance: true,
      removeWordsIfNoResults: "lastWords",
      advancedSyntax: true,
    });

    const queryNorm = norm(qResolved);

    const setTags = new Set<string>();
    const setComunas = new Set<string>();
    const setText = new Set<string>();

    for (const h of res.hits as any[]) {
      if (h?.nombre) setText.add(String(h.nombre));
      if (h?.categoria_nombre) setText.add(String(h.categoria_nombre));
      if (Array.isArray(h?.subcategorias_nombres_arr)) {
        for (const x of h.subcategorias_nombres_arr) if (x) setText.add(String(x));
      }

      if (Array.isArray(h?.tags_slugs)) {
        for (const tag of h.tags_slugs as any[]) {
          const pretty = prettyTagSlug(tag);
          if (!pretty) continue;
          // pequeño filtro: que incluya algo del query
          if (!queryNorm || norm(pretty).includes(queryNorm)) {
            setTags.add(pretty);
          }
        }
      }

      if (h?.comuna_base_nombre) {
        const comuna = String(h.comuna_base_nombre);
        if (!queryNorm || norm(comuna).includes(queryNorm)) {
          setComunas.add(comuna);
        }
      }

    }

    // orden de prioridad: tags > comunas > nombres/categorías
    const ordered: string[] = [];

    for (const t of setTags) ordered.push(t);
    for (const t of setComunas) ordered.push(t);
    for (const t of setText) ordered.push(t);

    // también sugerimos “lo que escribió” al inicio
    ordered.unshift(q);

    const items = Array.from(
      new Set(
        ordered
          .map((t) => t.trim())
          .filter(Boolean)
      )
    )
      .slice(0, 10)
      .map((t) => ({ text: t }));

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Error" }, { status: 500 });
  }
}