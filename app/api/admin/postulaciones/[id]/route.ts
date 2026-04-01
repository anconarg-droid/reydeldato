// app/api/admin/postulaciones/[id]/route.ts
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { ok, notFound, serverError } from "@/lib/http";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function buildDiff(current: Record<string, unknown>, proposed: Record<string, unknown>) {
  const keys = [
    "nombre",
    "whatsapp",
    "comuna_base_id",
    "descripcion_corta",
    "cobertura_tipo",
    "cobertura_comunas",
    "modalidades",
    "foto_principal_url",
    "galeria_urls",
    "instagram",
    "web",
    "email",
    "direccion",
  ];

  const diff = keys
    .map((key) => {
      const before = current?.[key] ?? null;
      const after = proposed?.[key] ?? null;
      const changed = JSON.stringify(before) !== JSON.stringify(after);

      return changed ? { field: key, before, after } : null;
    })
    .filter(Boolean);

  return diff;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = getSupabaseAdmin();

    const { data: postulacion, error: postError } = await supabase
      .from("postulaciones_emprendedores")
      .select("*")
      .eq("id", id)
      .single();

    if (postError || !postulacion) {
      return notFound("Postulación no encontrada");
    }

    let actual = null;
    let diff = null;

    if (postulacion.tipo_postulacion === "edicion_publicado" && postulacion.emprendedor_id) {
      const { data: emprendedorActual } = await supabase
        .from("emprendedores")
        .select("*")
        .eq("id", postulacion.emprendedor_id)
        .single();

      actual = emprendedorActual ?? null;

      if (actual) {
        diff = buildDiff(actual, postulacion as Record<string, unknown>);
      }
    }

    return ok({
      ok: true,
      postulacion,
      actual,
      diff,
    });
  } catch (error) {
    return serverError(
      "Error inesperado al cargar la postulación",
      error instanceof Error ? error.message : String(error)
    );
  }
}