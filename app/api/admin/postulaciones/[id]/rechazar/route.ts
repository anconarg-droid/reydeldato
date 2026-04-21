// app/api/admin/postulaciones/[id]/rechazar/route.ts
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { ok, badRequest, notFound, serverError } from "@/lib/http";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const motivo = body?.motivo_rechazo?.trim();

    if (!motivo) {
      return badRequest("motivo_rechazo es obligatorio");
    }

    const supabase = getSupabaseAdmin({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    });

    const { data: postulacion, error: postError } = await supabase
      .from("postulaciones_emprendedores")
      .select("id, estado")
      .eq("id", id)
      .single();

    if (postError || !postulacion) {
      return notFound("Postulación no encontrada");
    }

    if (postulacion.estado !== "pendiente_revision") {
      return badRequest("Solo se pueden rechazar postulaciones pendientes");
    }

    const { data: updatedRows, error } = await supabase
      .from("postulaciones_emprendedores")
      .update({
        estado: "rechazada",
        motivo_rechazo: motivo,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id, estado, motivo_rechazo, updated_at");

    if (error) {
      return serverError("No se pudo rechazar la postulación", error.message);
    }

    if (!updatedRows?.length) {
      return serverError(
        "No se actualizó la postulación (0 filas). Revisa id, RLS o columnas (motivo_rechazo).",
        { step: "postulaciones_emprendedores.update_rechazo", rows: 0 }
      );
    }

    return ok({
      ok: true,
      message: "Postulación rechazada correctamente.",
    });
  } catch (error) {
    return serverError(
      "Error inesperado al rechazar la postulación",
      error instanceof Error ? error.message : String(error)
    );
  }
}