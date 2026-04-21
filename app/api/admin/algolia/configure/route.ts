import { NextRequest, NextResponse } from "next/server";
import { getAlgoliaAdminIndex } from "@/lib/algoliaServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INDEX_NAME = process.env.ALGOLIA_INDEX_EMPRENDEDORES || "emprendedores";

export async function POST(_req: NextRequest) {
  try {
    const index = getAlgoliaAdminIndex(INDEX_NAME);

    await index.setSettings({
      searchableAttributes: [
        "nombre",
        "descripcion_corta",
        "descripcion_larga",
        "subcategorias_nombres_arr",
        "keywords",
      ],
      typoTolerance: true,
      ignorePlurals: true,
    });

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
        "Configuración Algolia aplicada (searchableAttributes, typoTolerance, ignorePlurals, sinónimos básicos).",
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

