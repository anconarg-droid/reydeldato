import { NextResponse } from "next/server";
import algoliasearch from "algoliasearch";
import { createClient } from "@supabase/supabase-js";
import { indexarEmprendedor } from "@/lib/algolia";
import { applyEmprendedoresIndexSettings } from "@/lib/algoliaIndexSettings";
import { EMPRENDEDORES_INDEXACION_VIEW_DEFAULT } from "@/lib/algoliaEmprendedoresReindexSource";

export const runtime = "nodejs";

function chunk(xs: unknown[], size = 500) {
  const out: unknown[][] = [];
  for (let i = 0; i < xs.length; i += size) {
    out.push(xs.slice(i, i + size));
  }
  return out;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const algolia = algoliasearch(
  process.env.ALGOLIA_APP_ID!,
  process.env.ALGOLIA_ADMIN_KEY!
);

const INDEX_NAME = process.env.ALGOLIA_INDEX_EMPRENDEDORES || "emprendedores";

async function getAllPublishedRows() {
  const pageSize = 1000;
  let from = 0;
  const all: Record<string, unknown>[] = [];

  while (true) {
    const { data, error } = await supabase
      .from(EMPRENDEDORES_INDEXACION_VIEW_DEFAULT)
      .select("*")
      .eq("estado_publicacion", "publicado")
      .range(from, from + pageSize - 1);

    if (error) throw error;

    if (!data || data.length === 0) break;

    all.push(...(data as Record<string, unknown>[]));

    if (data.length < pageSize) break;

    from += pageSize;
  }

  return all;
}

export async function GET() {
  try {
    const rows = await getAllPublishedRows();

    console.log("SUPABASE_ROWS", rows.length);
    if (rows.length > 0) {
      console.log(
        `[reindex-emprendedores] first raw row from ${EMPRENDEDORES_INDEXACION_VIEW_DEFAULT}:`,
        rows[0]
      );
    }

    const index = algolia.initIndex(INDEX_NAME);
    await index.clearObjects();

    for (const part of chunk(rows, 500)) {
      await indexarEmprendedor(part as Record<string, unknown>[]);
    }

    await applyEmprendedoresIndexSettings(index);

    console.log("ALGOLIA_SAVE_DONE");

    return NextResponse.json({
      ok: true,
      total_supabase: rows.length,
      total_algolia: rows.length,
      sample: rows[0] || null,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        ok: false,
        error: "unhandled_exception",
        message: msg,
      },
      { status: 500 }
    );
  }
}
