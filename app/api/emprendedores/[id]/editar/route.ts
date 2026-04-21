// app/api/emprendedores/[id]/editar/route.ts
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { created, badRequest, notFound, serverError } from "@/lib/http";
import { validatePatchPayload } from "@/lib/publicarValidation";
import { classifyBusiness } from "@/lib/classifyBusiness";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function s(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const validation = validatePatchPayload(body);

    if (!validation.valid) {
      return badRequest("Datos inválidos", validation.errors);
    }

    const supabase = getSupabaseAdmin({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    });

    const { data: current, error: currentError } = await supabase
      .from("emprendedores")
      .select("*")
      .eq("id", id)
      .single();

    if (currentError || !current) {
      return notFound("Emprendimiento no encontrado");
    }

    const patch = validation.data;

    const merged = {
      nombre: patch.nombre ?? current.nombre,
      whatsapp: patch.whatsapp ?? current.whatsapp,
      comuna_base_id: patch.comuna_base_id ?? current.comuna_base_id,
      descripcion_corta: patch.descripcion_corta ?? current.descripcion_corta,
      cobertura_tipo: patch.cobertura_tipo ?? current.cobertura_tipo,
      cobertura_comunas: patch.cobertura_comunas ?? current.cobertura_comunas,
      modalidades: patch.modalidades ?? current.modalidades,
      foto_principal_url: patch.foto_principal_url ?? current.foto_principal_url,
      galeria_urls: patch.galeria_urls ?? current.galeria_urls,
      instagram: patch.instagram ?? current.instagram,
      web: patch.web ?? current.web,
      email: patch.email ?? current.email,
      direccion: patch.direccion ?? current.direccion,
    };

    const classification = await classifyBusiness({
      nombre: merged.nombre,
      descripcion_corta: merged.descripcion_corta,
      comuna_base_id: merged.comuna_base_id,
      cobertura_tipo: merged.cobertura_tipo,
      modalidades: merged.modalidades ?? null,
    });

    const postRow = {
      tipo_postulacion: "edicion_publicado" as const,
      emprendedor_id: id,
      nombre_emprendimiento: s(merged.nombre),
      whatsapp_principal: s(merged.whatsapp),
      frase_negocio: s(merged.descripcion_corta),
      comuna_base_id: merged.comuna_base_id,
      cobertura_tipo: merged.cobertura_tipo,
      comunas_cobertura: Array.isArray(merged.cobertura_comunas)
        ? merged.cobertura_comunas
        : [],
      modalidades_atencion: Array.isArray(merged.modalidades) ? merged.modalidades : [],
      foto_principal_url: merged.foto_principal_url ?? null,
      galeria_urls: Array.isArray(merged.galeria_urls) ? merged.galeria_urls : null,
      instagram: merged.instagram ?? null,
      sitio_web: merged.web ?? null,
      email: merged.email ?? null,
      direccion: merged.direccion ?? null,
      categoria_ia: classification.categoria_ia,
      subcategoria_ia: classification.subcategoria_ia,
      etiquetas_ia: classification.etiquetas_ia,
      confianza_ia: classification.confianza_ia,
      observacion_ia: classification.observacion_ia,
      estado: "pendiente_revision" as const,
      updated_at: new Date().toISOString(),
    };

    const { data: activeList, error: activeErr } = await supabase
      .from("postulaciones_emprendedores")
      .select("id")
      .eq("emprendedor_id", id)
      .eq("tipo_postulacion", "edicion_publicado")
      .in("estado", ["borrador", "pendiente_revision"])
      .order("updated_at", { ascending: false })
      .limit(1);

    if (activeErr) {
      return serverError("No se pudo consultar postulaciones activas", activeErr.message);
    }

    const active = Array.isArray(activeList) ? activeList[0] : activeList;
    const activeId =
      active && typeof active === "object" && "id" in active && (active as { id: unknown }).id
        ? s((active as { id: unknown }).id)
        : "";

    let data: { id: string; estado: string } | null = null;
    let error: { message: string } | null = null;

    if (activeId) {
      const up = await supabase
        .from("postulaciones_emprendedores")
        .update(postRow)
        .eq("id", activeId)
        .select("id, estado")
        .single();
      data = up.data as { id: string; estado: string } | null;
      error = up.error;
    } else {
      const ins = await supabase.from("postulaciones_emprendedores").insert(postRow).select("id, estado").single();
      data = ins.data as { id: string; estado: string } | null;
      error = ins.error;
    }

    if (error) {
      return serverError("No se pudo guardar la edición pendiente", error.message);
    }

    if (!data?.id) {
      return serverError("No se pudo guardar la edición pendiente", "Sin id de postulación");
    }

    return created({
      ok: true,
      postulacion_id: data.id,
      estado: data.estado,
      message: "Tus cambios fueron enviados para revisión.",
    });
  } catch (error) {
    return serverError(
      "Error inesperado al crear la edición pendiente",
      error instanceof Error ? error.message : String(error)
    );
  }
}