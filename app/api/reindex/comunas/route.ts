import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import algoliasearch from "algoliasearch";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret");

    if (secret !== process.env.REINDEX_SECRET) {
      return NextResponse.json({ ok: false, error: "No autorizado" });
    }

    // =============================
    // SUPABASE (SERVER)
    // =============================
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // =============================
    // ALGOLIA (SERVER)
    // =============================
    const client = algoliasearch(
      process.env.ALGOLIA_APP_ID!,
      process.env.ALGOLIA_ADMIN_KEY!
    );

    const index = client.initIndex(
      process.env.ALGOLIA_INDEX_COMUNAS!
    );

    // =============================
    // TRAER COMUNAS + REGION
    // =============================
    const { data: comunas, error } = await supabase
      .from("comunas")
      .select(`
        id,
        nombre,
        slug,
        region_id,
        regiones (
          slug
        )
      `);

    if (error) {
      return NextResponse.json({ ok: false, error });
    }

    if (!comunas) {
      return NextResponse.json({ ok: false, error: "Sin datos" });
    }

    // =============================
    // TRANSFORMAR ESTRUCTURA
    // =============================
    const records = comunas.map((c: any) => {
      const regionSlug = c.regiones?.slug || null;

      return {
        objectID: c.id,
        id: c.id,
        nombre: c.nombre,
        slug: c.slug,
        region_id: c.region_id,
        region_slug: regionSlug,
        country_slug: "chile",

        // Claves territoriales estructurales
        comuna_key: `/chile/${regionSlug}/${c.slug}`,
        region_key: `/chile/${regionSlug}`,
        country_key: `/chile`
      };
    });

    // =============================
    // SUBIR A ALGOLIA
    // =============================
    await index.saveObjects(records);

    return NextResponse.json({
      ok: true,
      total_indexadas: records.length
    });

  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      error: e.message
    });
  }
}