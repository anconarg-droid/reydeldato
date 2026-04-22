import { NextRequest, NextResponse } from "next/server";
import { getAlgoliaAdminIndex } from "@/lib/algoliaServer";
import { applyEmprendedoresIndexSettings } from "@/lib/algoliaIndexSettings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INDEX_NAME = process.env.ALGOLIA_INDEX_EMPRENDEDORES || "emprendedores";

/**
 * Aplica settings canónicos (`lib/algoliaIndexSettings.ts`) + sinónimos de ejemplo.
 * No definir otro `setSettings` fuera del módulo único.
 */
export async function POST(_req: NextRequest) {
  try {
    const index = getAlgoliaAdminIndex(INDEX_NAME);

    await applyEmprendedoresIndexSettings(index);

    await index.saveSynonyms(
      [
        {
          objectID: "syn-gasfiter-plomero",
          type: "synonym",
          synonyms: ["gasfiter", "plomero"],
        },
        {
          objectID: "syn-mecanico-mecánico",
          type: "synonym",
          synonyms: ["mecanico", "mecánico"],
        },
        {
          objectID: "syn-auto-automovil",
          type: "synonym",
          synonyms: ["auto", "automóvil"],
        },
      ],
      { replaceExistingSynonyms: false }
    );

    return NextResponse.json({
      ok: true,
      index: INDEX_NAME,
      message:
        "Settings canónicos (algoliaIndexSettings) + sinónimos básicos aplicados.",
    });
  } catch (err) {
    console.error("[admin/algolia/configure]", err);
    return NextResponse.json(
      {
        ok: false,
        error: "algolia_config_error",
        message: err instanceof Error ? err.message : "Error configurando Algolia",
      },
      { status: 500 }
    );
  }
}

