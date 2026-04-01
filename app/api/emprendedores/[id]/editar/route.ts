// app/api/emprendedores/[id]/editar/route.ts
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { created, badRequest, notFound, serverError } from "@/lib/http";
import { validatePatchPayload } from "@/lib/publicarValidation";
import { classifyBusiness } from "@/lib/classifyBusiness";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const validation = validatePatchPayload(body);

    if (!validation.valid) {
      return badRequest("Datos inválidos", validation.errors);
    }

    const supabase = getSupabaseAdmin();

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

    const { data, error } = await supabase
      .from("postulaciones_emprendedores")
      .insert({
        tipo_postulacion: "edicion_publicado",
        emprendedor_id: id,

        ...merged,

        categoria_ia: classification.categoria_ia,
        subcategoria_ia: classification.subcategoria_ia,
        etiquetas_ia: classification.etiquetas_ia,
        confianza_ia: classification.confianza_ia,
        observacion_ia: classification.observacion_ia,

        estado: "pendiente_revision",
      })
      .select("id, estado")
      .single();

    if (error) {
      return serverError("No se pudo crear la edición pendiente", error.message);
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