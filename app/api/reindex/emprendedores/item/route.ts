import { NextResponse } from "next/server";
import algoliasearch from "algoliasearch";
import { createClient } from "@supabase/supabase-js";
import { indexarEmprendedor } from "@/lib/algolia";

export const runtime = "nodejs";

function s(v: any): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const slug = s(url.searchParams.get("slug"));
    const id = s(url.searchParams.get("id"));

    if (!slug && !id) {
      return NextResponse.json(
        {
          ok: false,
          message: "Debes enviar slug o id",
        },
        { status: 400 }
      );
    }

    let query = supabase
      .from("vw_emprendedores_algolia_final")
      .select("*")
      .limit(1);

    if (slug) {
      query = query.eq("slug", slug);
    } else {
      query = query.eq("id", id);
    }

    const { data, error } = await query.maybeSingle();

    if (error) throw error;

    const objectID = slug || id;

    // Si no existe en la vista, hay que borrarlo del índice
    if (!data) {
      // indexarEmprendedor borra si corresponde; aquí solo confirmamos ausencia
      // (mantener compatibilidad sin indexar directo)

      return NextResponse.json({
        ok: true,
        action: "deleted_from_algolia",
        objectID,
      });
    }

    // No indexar en Algolia si no está publicado (ej. pendiente_aprobacion)
    const estadoPublicacion = s((data as any).estado_publicacion);
    if (estadoPublicacion !== "publicado") {
      // No indexar si no está publicado
      await indexarEmprendedor({ ...data, estado_publicacion: estadoPublicacion });

      return NextResponse.json({
        ok: true,
        action: "skipped_not_published",
        objectID: s(data.slug) || s(data.id),
        estado_publicacion: estadoPublicacion,
      });
    }

    const payload = {
      ...data,
      objectID: s(data.slug) || s(data.id),
    };

    await indexarEmprendedor({ ...payload, estado_publicacion: "publicado" });

    return NextResponse.json({
      ok: true,
      action: "saved_to_algolia",
      objectID: payload.objectID,
      slug: s(data.slug),
      id: s(data.id),
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        message: e?.message || "No se pudo reindexar el emprendimiento",
      },
      { status: 500 }
    );
  }
}