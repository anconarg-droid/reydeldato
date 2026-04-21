import type { SupabaseClient } from "@supabase/supabase-js";
import { modalidadesAtencionInputsToDbUnique } from "@/lib/modalidadesAtencion";
import {
  parseLocalesPatchInput,
  localesFromPostulacionRowForGet,
  replaceEmprendedorLocales,
  resolveLocalesComunaIds,
  validateLocalesRules,
  type ResolvedLocalRow,
} from "@/lib/emprendedorLocalesDb";
import { countLocalesFisicosValidosEmprendedor } from "@/app/api/_lib/localFisicoPublicacionAdmin";

function s(v: unknown): string {
  return String(v ?? "").trim();
}

/**
 * Sincroniza `emprendedor_locales` desde una fila de `postulaciones_emprendedores`
 * (JSON `locales` o columnas legacy `direccion` + comuna base).
 * Misma lógica que el flujo de aprobación de postulaciones.
 */
export async function syncEmprendedorLocalesDesdePostulacionRow(
  supabase: SupabaseClient,
  emprendedorId: string,
  p: Record<string, unknown>,
  comunaSlug: string,
  modalidadesAtencion: string[]
): Promise<{ ok: true } | { ok: false; message: string }> {
  const eid = s(emprendedorId);
  if (!eid) return { ok: false, message: "emprendedor_id inválido" };

  const modsDb = modalidadesAtencionInputsToDbUnique(modalidadesAtencion);
  const hasLocalFisico = modsDb.includes("local_fisico");

  if (!hasLocalFisico) {
    return replaceEmprendedorLocales(supabase, eid, []);
  }

  const finishLocalesLocalFisico = async (
    resolvedRows: ResolvedLocalRow[]
  ): Promise<{ ok: true } | { ok: false; message: string }> => {
    if (resolvedRows.length > 0) {
      return replaceEmprendedorLocales(supabase, eid, resolvedRows);
    }
    const existingValid = await countLocalesFisicosValidosEmprendedor(supabase, eid);
    if (existingValid > 0) {
      return { ok: true };
    }
    return {
      ok: false,
      message:
        "La postulación declara local físico pero no hay dirección (campos dirección/locales vacíos). Completá la dirección en la postulación o pedí al postulante que la agregue antes de aprobar.",
    };
  };

  const rawLocales = (p as { locales?: unknown }).locales;
  if (Array.isArray(rawLocales)) {
    const parsed = parseLocalesPatchInput(rawLocales);
    if (parsed === null) {
      return { ok: false, message: "Formato de locales inválido en la postulación." };
    }
    const errL = validateLocalesRules(parsed, { allowEmpty: true, requireNonEmpty: false });
    if (errL) return { ok: false, message: errL };
    const resolved = await resolveLocalesComunaIds(supabase, parsed);
    if (!resolved.ok) {
      return { ok: false, message: resolved.message };
    }
    return finishLocalesLocalFisico(resolved.rows);
  }

  const localRows = localesFromPostulacionRowForGet(
    {
      direccion: p.direccion,
      direccion_referencia: p.direccion_referencia,
    },
    comunaSlug
  );

  const errLegacy = validateLocalesRules(localRows, {
    allowEmpty: true,
    requireNonEmpty: false,
  });
  if (errLegacy) {
    return { ok: false, message: errLegacy };
  }

  const resolved = await resolveLocalesComunaIds(supabase, localRows);
  if (!resolved.ok) {
    return { ok: false, message: resolved.message };
  }

  return finishLocalesLocalFisico(resolved.rows);
}

/**
 * Si el pivot `emprendedor_locales` no tiene filas válidas pero existe una postulación
 * activa (`borrador` / `pendiente_revision`) con direcciones, las persiste.
 * Usado por publicación admin directa (`/api/admin/emprendedores/[id]/aprobar`) cuando
 * el postulante guardó locales solo en la postulación y aún no en el pivot.
 */
export async function ensureLocalesPivotFromPostulacionActivaIfEmpty(
  supabase: SupabaseClient,
  emprendedorId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const eid = s(emprendedorId);
  if (!eid) return { ok: true };

  const existingValid = await countLocalesFisicosValidosEmprendedor(supabase, eid);
  if (existingValid >= 1) return { ok: true };

  /**
   * Tras moderación, `edicion_publicado` pasa a `aprobada` mientras la ficha sigue `en_revision`
   * hasta publicar desde revisión. Esas filas tienen `locales` pero antes no se consideraban aquí.
   */
  const { data: post, error } = await supabase
    .from("postulaciones_emprendedores")
    .select(
      "id, tipo_postulacion, estado, locales, modalidades_atencion, comuna_base_id, direccion, direccion_referencia, updated_at"
    )
    .eq("emprendedor_id", eid)
    .in("tipo_postulacion", ["nuevo", "edicion_publicado"])
    .in("estado", ["borrador", "pendiente_revision", "aprobada"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("[ensureLocalesPivotFromPostulacionActivaIfEmpty]", error.message);
    return { ok: true };
  }
  if (!post || typeof post !== "object") return { ok: true };

  const p = post as Record<string, unknown>;
  let comunaSlug = "";
  const comunaBaseId = p.comuna_base_id;
  if (comunaBaseId != null && String(comunaBaseId).trim() !== "") {
    const { data: comunaRow } = await supabase
      .from("comunas")
      .select("slug")
      .eq("id", comunaBaseId)
      .maybeSingle();
    comunaSlug = s((comunaRow as { slug?: unknown } | null)?.slug);
  }

  const modalidadesAtencion = Array.isArray(p.modalidades_atencion)
    ? (p.modalidades_atencion as unknown[]).map((x) => String(x))
    : [];

  return syncEmprendedorLocalesDesdePostulacionRow(
    supabase,
    eid,
    p,
    comunaSlug,
    modalidadesAtencion
  );
}
