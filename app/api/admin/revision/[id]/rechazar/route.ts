import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { badRequest, notFound, ok, serverError } from "@/lib/http";
import { ESTADO_PUBLICACION } from "@/lib/estadoPublicacion";
import { syncEmprendedorToAlgoliaWithSupabase } from "@/lib/algoliaSyncEmprendedor";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function s(v: unknown): string {
  return String(v ?? "").trim();
}

/**
 * Rechaza la revisión pendiente: la ficha vuelve a visible como publicada sin aplicar
 * de nuevo los datos de la postulación (el borrador aprobado sigue en BD para edición).
 */
export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const postulacionId = s(id);
    if (!postulacionId) {
      return badRequest("Falta id de postulación.");
    }

    const supabase = getSupabaseAdmin({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    });

    const { data: post, error: postErr } = await supabase
      .from("postulaciones_emprendedores")
      .select("id, estado, tipo_postulacion, emprendedor_id")
      .eq("id", postulacionId)
      .maybeSingle();

    if (postErr || !post) {
      return notFound("Postulación no encontrada");
    }

    if (s(post.estado) !== "aprobada") {
      return badRequest("Solo se puede rechazar una revisión sobre postulación en estado aprobada.");
    }

    if (s(post.tipo_postulacion) !== "edicion_publicado") {
      return badRequest("Solo aplica a ediciones de ficha ya publicada.");
    }

    const eid = s(post.emprendedor_id);
    if (!eid) {
      return badRequest("La postulación no tiene emprendedor vinculado.");
    }

    const { data: emp, error: empErr } = await supabase
      .from("emprendedores")
      .select("id, estado_publicacion")
      .eq("id", eid)
      .maybeSingle();

    if (empErr || !emp) {
      return notFound("Emprendimiento no encontrado");
    }

    if (s(emp.estado_publicacion) !== ESTADO_PUBLICACION.en_revision) {
      return badRequest(
        'El emprendimiento no está en "en_revision"; no hay revisión activa que rechazar.'
      );
    }

    const now = new Date().toISOString();
    const { error: upErr } = await supabase
      .from("emprendedores")
      .update({
        estado_publicacion: ESTADO_PUBLICACION.publicado,
        updated_at: now,
      })
      .eq("id", eid);

    if (upErr) {
      return serverError("No se pudo actualizar el estado del emprendimiento", upErr.message);
    }

    syncEmprendedorToAlgoliaWithSupabase(supabase, eid).catch(() => {});

    return ok({
      ok: true,
      message:
        "Revisión descartada: la ficha volvió a estado publicado en el sitio. Los datos del borrador siguen en la postulación por si quieres ajustarlos.",
      emprendedor_id: eid,
    });
  } catch (error) {
    return serverError(
      "Error inesperado al rechazar la revisión",
      error instanceof Error ? error.message : String(error)
    );
  }
}
