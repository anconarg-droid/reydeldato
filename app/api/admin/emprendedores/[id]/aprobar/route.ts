import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  adminPublishEmprendedorFicha,
  triggerReindexEmprendedorAlgolia,
} from "@/app/api/_lib/adminPublishEmprendedorFicha";
import { notifyEmprendimientoAprobadoEmail } from "@/app/api/_lib/notifyEmprendimientoAprobadoEmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function s(v: unknown): string {
  return String(v ?? "").trim();
}

/**
 * POST /api/admin/emprendedores/[id]/aprobar — marca la ficha como publicada (única vía admin).
 * En BD solo existe `estado_publicacion = 'publicado'` (no hay columna booleana `publicado`).
 */
export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idRaw } = await context.params;
    const id = s(idRaw);
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Falta id de emprendimiento." },
        { status: 400 }
      );
    }

    const result = await adminPublishEmprendedorFicha(supabase, id);
    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: result.error,
          reason: result.reason,
          ...(result.detail ? { detail: result.detail } : {}),
        },
        { status: result.status }
      );
    }

    const reindexAlgolia = await triggerReindexEmprendedorAlgolia(result.id);

    const { fichaPublicaUrl, panelUrl } = await notifyEmprendimientoAprobadoEmail(
      supabase,
      result.id,
      { nombreFallback: result.nombre }
    );

    return NextResponse.json({
      ok: true,
      estado: "publicado",
      message: "Ficha publicada.",
      /** Éxito de persistencia en BD (independiente de Algolia). */
      publicacion: { ok: true, estado_publicacion: "publicado" as const },
      item: {
        id: result.id,
        nombre: result.nombre,
        estado_publicacion: "publicado",
      },
      /** Resultado aparte: fallos aquí no revierten la publicación. */
      reindexAlgolia,
      links: {
        fichaPublicaUrl,
        panelUrl,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Error inesperado al publicar.",
      },
      { status: 500 }
    );
  }
}
