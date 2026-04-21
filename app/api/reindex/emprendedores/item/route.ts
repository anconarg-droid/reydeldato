import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { indexarEmprendedor } from "@/lib/algolia";
import { fetchEmprendedorRowFromAlgoliaViews } from "@/lib/algoliaEmprendedoresReindexSource";
import { isPostgrestMissingRelationError } from "@/lib/postgrestUnknownColumn";

export const runtime = "nodejs";

function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Reindex puntual de un emprendedor (GET).
 * Siempre responde **200** con `{ ok: boolean, ... }` para que el flujo admin
 * pueda distinguir publicación en BD (ya hecha) vs éxito de Algolia sin usar HTTP 500.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const slug = s(url.searchParams.get("slug"));
    const id = s(url.searchParams.get("id"));

    if (!slug && !id) {
      return NextResponse.json(
        {
          ok: false,
          reason: "bad_request",
          message: "Debes enviar slug o id",
        },
        { status: 200 }
      );
    }

    const objectID = slug || id;

    const { data, error, viewUsed, viewsAttempted } =
      await fetchEmprendedorRowFromAlgoliaViews(supabase, { id: id || undefined, slug: slug || undefined });

    if (error) {
      const missingRel = isPostgrestMissingRelationError(error);
      console.warn("[reindex/emprendedores/item] Lectura vista Algolia falló (la BD del emprendedor no se modifica aquí):", {
        message: error.message,
        code: (error as { code?: string }).code,
        viewsAttempted,
        missingRelation: missingRel,
      });
      return NextResponse.json(
        {
          ok: false,
          reason: missingRel ? "algolia_source_view_missing" : "supabase_read_error",
          message: String(error.message ?? "Error al leer vista de indexación"),
          viewsAttempted,
          objectID,
        },
        { status: 200 }
      );
    }

    if (!data) {
      return NextResponse.json({
        ok: true,
        action: "deleted_from_algolia",
        objectID,
        viewUsed,
      });
    }

    const estadoPublicacion = s((data as { estado_publicacion?: unknown }).estado_publicacion);
    if (estadoPublicacion !== "publicado") {
      await indexarEmprendedor({ ...data, estado_publicacion: estadoPublicacion });

      return NextResponse.json({
        ok: true,
        action: "skipped_not_published",
        objectID: s(data.slug) || s(data.id),
        estado_publicacion: estadoPublicacion,
        viewUsed,
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
      viewUsed,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[reindex/emprendedores/item] Error no controlado (no afecta publicación en BD):", msg);
    return NextResponse.json(
      {
        ok: false,
        reason: "unhandled",
        message: msg || "No se pudo reindexar el emprendimiento",
      },
      { status: 200 }
    );
  }
}
