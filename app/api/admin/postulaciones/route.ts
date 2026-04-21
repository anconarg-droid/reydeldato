// app/api/admin/postulaciones/route.ts
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { badRequest, ok, serverError } from "@/lib/http";
import { loadPostulacionesPorEstado } from "@/lib/loadPostulacionesModeracion";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get("estado") ?? "pendiente_revision";

    const allowed = new Set([
      "todos",
      "borrador",
      "pendiente_revision",
      "aprobada",
      "rechazada",
    ]);
    if (!allowed.has(estado)) {
      return badRequest(`Parámetro estado no válido: ${estado}`);
    }

    const supabase = getSupabaseAdmin({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    });

    const { items, error } = await loadPostulacionesPorEstado(supabase, estado);

    if (error) {
      return serverError("No se pudo cargar la cola de revisión", error.message);
    }

    return ok({
      ok: true,
      items,
    });
  } catch (error) {
    return serverError(
      "Error inesperado al listar postulaciones",
      error instanceof Error ? error.message : String(error)
    );
  }
}
