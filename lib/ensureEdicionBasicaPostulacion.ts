import { randomUUID } from "crypto";
import { normalizeDescripcionCorta } from "@/lib/descripcionProductoForm";
import { modalidadesAtencionInputsToDbUnique } from "@/lib/modalidadesAtencion";
import type { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { ESTADO_PUBLICACION } from "@/lib/estadoPublicacion";

type AdminSupabase = ReturnType<typeof getSupabaseAdmin>;

function s(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

/** Valores de cobertura que entiende el formulario / PATCH de borrador (`solo_mi_comuna`, no `solo_comuna`). */
function coberturaTipoEmprendedorAFormulario(raw: unknown): string {
  const t = s(raw).toLowerCase();
  if (t === "solo_comuna" || t === "comuna" || t === "solo_mi_comuna") {
    return "solo_mi_comuna";
  }
  return t;
}

const BORRADOR_ACCESS_TOKEN_DIAS = 30;

export function isEdicionBasicaUrlFlag(raw: string | null | undefined): boolean {
  const v = String(raw ?? "")
    .trim()
    .toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "si";
}

/**
 * Resuelve `emprendedor_id` cuando `candidateId` es el UUID del emprendedor o el id de una postulación enlazada.
 */
async function resolveEmprendedorId(
  supabase: AdminSupabase,
  candidateId: string
): Promise<string | null> {
  const cid = s(candidateId);
  if (!cid) return null;

  const { data: empProbe } = await supabase
    .from("emprendedores")
    .select("id")
    .eq("id", cid)
    .maybeSingle();
  if (empProbe && typeof (empProbe as { id?: unknown }).id === "string") {
    return s((empProbe as { id: string }).id);
  }

  const { data: post } = await supabase
    .from("postulaciones_emprendedores")
    .select("emprendedor_id")
    .eq("id", cid)
    .maybeSingle();
  const eid = s((post as { emprendedor_id?: unknown } | null)?.emprendedor_id);
  return eid || null;
}

/**
 * Crea o reutiliza una fila en `postulaciones_emprendedores` con `tipo_postulacion = edicion_basica`
 * (staging de datos básicos; no modifica `emprendedores` hasta que admin apruebe).
 */
export async function ensureEdicionBasicaPostulacionId(
  supabase: AdminSupabase,
  candidateId: string
): Promise<
  | { ok: true; postulacionId: string }
  | { ok: false; kind: "not_found" | "not_publicado" | "db"; message: string }
> {
  const empId = await resolveEmprendedorId(supabase, candidateId);
  if (!empId) {
    return { ok: false, kind: "not_found", message: "Emprendimiento no encontrado." };
  }

  const { data: emp, error: empErr } = await supabase
    .from("emprendedores")
    .select(
      [
        "id",
        "nombre",
        "nombre_emprendimiento",
        "email",
        "whatsapp",
        "whatsapp_principal",
        "frase_negocio",
        "descripcion_libre",
        "comuna_id",
        "cobertura_tipo",
        "comunas_cobertura",
        "regiones_cobertura",
        "categoria_id",
        "estado_publicacion",
        "nombre_responsable",
        "mostrar_responsable_publico",
        "instagram",
        "sitio_web",
        "foto_principal_url",
      ].join(", ")
    )
    .eq("id", empId)
    .maybeSingle();

  if (empErr || !emp) {
    return {
      ok: false,
      kind: "not_found",
      message: empErr?.message || "Emprendimiento no encontrado.",
    };
  }

  const empRec = emp as unknown as Record<string, unknown>;
  if (s(empRec.estado_publicacion).toLowerCase() !== ESTADO_PUBLICACION.publicado) {
    return {
      ok: false,
      kind: "not_publicado",
      message: "Solo se pueden editar datos básicos de emprendimientos ya publicados.",
    };
  }

  const { data: existRows, error: existErr } = await supabase
    .from("postulaciones_emprendedores")
    .select("id")
    .eq("emprendedor_id", empId)
    .eq("tipo_postulacion", "edicion_basica")
    .in("estado", ["borrador", "pendiente_revision"])
    .order("updated_at", { ascending: false })
    .limit(1);

  if (existErr) {
    return {
      ok: false,
      kind: "db",
      message: existErr.message || "No se pudo consultar postulaciones de edición.",
    };
  }

  const existingId = s((existRows?.[0] as { id?: unknown } | undefined)?.id);
  if (existingId) {
    return { ok: true, postulacionId: existingId };
  }

  const { data: subRows, error: subErr } = await supabase
    .from("emprendedor_subcategorias")
    .select("subcategoria_id")
    .eq("emprendedor_id", empId);
  if (subErr) {
    return { ok: false, kind: "db", message: subErr.message };
  }
  const subcategorias_ids = (subRows ?? [])
    .map((r) => s((r as { subcategoria_id?: unknown }).subcategoria_id))
    .filter(Boolean);

  const { data: modRows, error: modErr } = await supabase
    .from("emprendedor_modalidades")
    .select("modalidad")
    .eq("emprendedor_id", empId);
  if (modErr) {
    return { ok: false, kind: "db", message: modErr.message };
  }
  const modalidadesRaw = (modRows ?? []).map((r) =>
    s((r as { modalidad?: unknown }).modalidad)
  );
  const modalidades_atencion = modalidadesAtencionInputsToDbUnique(modalidadesRaw);

  const nombreEmp = s(empRec.nombre_emprendimiento) || s(empRec.nombre);
  const whatsapp = s(empRec.whatsapp_principal) || s(empRec.whatsapp);
  const fraseRaw = s(empRec.frase_negocio);
  const frase_negocio = fraseRaw ? normalizeDescripcionCorta(fraseRaw) : "";

  const token = randomUUID();
  const expiraAt = new Date(
    Date.now() + BORRADOR_ACCESS_TOKEN_DIAS * 24 * 60 * 60 * 1000
  ).toISOString();

  const insertPayload: Record<string, unknown> = {
    estado: "borrador",
    tipo_postulacion: "edicion_basica",
    emprendedor_id: empId,
    paso_actual: 1,
    access_token: token,
    access_token_expira_at: expiraAt,
    nombre_emprendimiento: nombreEmp || "Emprendimiento",
    email: s(empRec.email) || null,
    whatsapp_principal: whatsapp || null,
    frase_negocio: frase_negocio || null,
    descripcion_libre: s(empRec.descripcion_libre) || null,
    comuna_base_id: empRec.comuna_id ?? null,
    cobertura_tipo: coberturaTipoEmprendedorAFormulario(empRec.cobertura_tipo),
    comunas_cobertura: Array.isArray(empRec.comunas_cobertura)
      ? empRec.comunas_cobertura
      : [],
    regiones_cobertura: Array.isArray(empRec.regiones_cobertura)
      ? empRec.regiones_cobertura
      : [],
    categoria_id: empRec.categoria_id ?? null,
    subcategorias_ids: subcategorias_ids.length ? subcategorias_ids : null,
    modalidades_atencion: modalidades_atencion.length ? modalidades_atencion : null,
    nombre_responsable: s(empRec.nombre_responsable) || null,
    mostrar_responsable_publico: empRec.mostrar_responsable_publico === true,
    instagram: s(empRec.instagram) || null,
    sitio_web: s(empRec.sitio_web) || null,
    foto_principal_url: s(empRec.foto_principal_url) || null,
  };

  const { data: ins, error: insErr } = await supabase
    .from("postulaciones_emprendedores")
    .insert(insertPayload)
    .select("id")
    .single();

  if (insErr || !ins || (ins as { id?: unknown }).id == null) {
    console.error("[ensureEdicionBasicaPostulacion] insert:", insErr?.message);
    return {
      ok: false,
      kind: "db",
      message: insErr?.message || "No se pudo crear la solicitud de edición.",
    };
  }

  return { ok: true, postulacionId: s((ins as { id: unknown }).id) };
}
