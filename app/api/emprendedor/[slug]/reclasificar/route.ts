import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { classifyAndAssignBusiness } from "@/lib/classifyBusiness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * POST /api/emprendedor/[slug]/reclasificar
 * Re-ejecuta clasificación automática para el emprendimiento (actualización).
 * Lee descripcion_negocio / descripcion_corta / descripcion_larga y keywords_usuario_json de la fila,
 * ejecuta IA, asigna subcategorías o marca pendiente de revisión.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    if (!slug?.trim()) {
      return NextResponse.json(
        { ok: false, error: "missing_slug", message: "Falta slug del emprendimiento" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const { data: emp, error: fetchError } = await supabase
      .from("emprendedores")
      .select("id")
      .eq("slug", slug.trim())
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json(
        { ok: false, error: "db_error", message: fetchError.message },
        { status: 500 }
      );
    }

    if (!emp?.id) {
      return NextResponse.json(
        { ok: false, error: "not_found", message: "Emprendimiento no encontrado" },
        { status: 404 }
      );
    }

    const result = await classifyAndAssignBusiness(supabase, emp.id);

    if (!result.ok && result.error && !result.needsManualReview) {
      return NextResponse.json(
        { ok: false, error: "classification_error", message: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: result.ok,
      subcategoriasAssigned: result.subcategoriasAssigned,
      principalId: result.principalId,
      needsManualReview: result.needsManualReview,
      estado_publicacion: result.estado_publicacion,
      motivo_verificacion: result.motivo_verificacion,
      message: result.ok
        ? "Clasificación aplicada correctamente."
        : result.needsManualReview
          ? "No se encontró subcategoría; quedó pendiente de revisión manual."
          : result.error,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: "unexpected_error",
        message: err instanceof Error ? err.message : "Error inesperado al reclasificar",
      },
      { status: 500 }
    );
  }
}
