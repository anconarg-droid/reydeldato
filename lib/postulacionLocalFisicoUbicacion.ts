import type { SupabaseClient } from "@supabase/supabase-js";
import { countLocalesFisicosValidosEmprendedor } from "@/app/api/_lib/localFisicoPublicacionAdmin";
import { parseLocalesPatchInput } from "@/lib/emprendedorLocalesDb";
import { modalidadesAtencionInputsToDbUnique } from "@/lib/modalidadesAtencion";

export const MSG_LOCAL_FISICO_SIN_UBICACION =
  "Si ofrecés atención en local físico, completá la dirección o los locales antes de guardar.";

function textoUbicacionLegacy(direccion: unknown, referencia: unknown): string {
  const d = String(direccion ?? "").trim();
  const r = String(referencia ?? "").trim();
  return d || r;
}

/**
 * Regla de postulación: con `local_fisico` debe haber texto de ubicación (dirección/referencia)
 * o al menos un ítem válido en `locales` (JSON).
 */
export function ubicacionSuficienteParaLocalFisicoPostulacion(args: {
  modalidadesDb: string[];
  direccion?: unknown;
  direccion_referencia?: unknown;
  locales?: unknown;
}): boolean {
  if (!args.modalidadesDb.includes("local_fisico")) return true;
  if (textoUbicacionLegacy(args.direccion, args.direccion_referencia)) return true;
  if (Array.isArray(args.locales) && args.locales.length > 0) {
    const parsed = parseLocalesPatchInput(args.locales);
    if (parsed && parsed.length > 0) return true;
  }
  return false;
}

/**
 * Igual que {@link ubicacionSuficienteParaLocalFisicoPostulacion}, pero si la postulación
 * no trae datos y el emprendedor ya tiene locales físicos válidos en BD, permite el PATCH
 * (p. ej. edición que no toca modalidad ni dirección).
 */
export async function assertPostulacionLocalFisicoUbicacion(args: {
  supabase: SupabaseClient;
  emprendedorId: string | null;
  modalidadesDb: string[];
  direccion?: unknown;
  direccion_referencia?: unknown;
  locales?: unknown;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!args.modalidadesDb.includes("local_fisico")) return { ok: true };
  if (
    ubicacionSuficienteParaLocalFisicoPostulacion({
      modalidadesDb: args.modalidadesDb,
      direccion: args.direccion,
      direccion_referencia: args.direccion_referencia,
      locales: args.locales,
    })
  ) {
    return { ok: true };
  }
  const eid = String(args.emprendedorId ?? "").trim();
  if (eid) {
    const n = await countLocalesFisicosValidosEmprendedor(args.supabase, eid);
    if (n > 0) return { ok: true };
  }
  return { ok: false, message: MSG_LOCAL_FISICO_SIN_UBICACION };
}

export function modalidadesDbDesdePatchYOExistente(
  patch: Record<string, unknown>,
  existing: Record<string, unknown>
): string[] {
  const modsPatch = Array.isArray(patch.modalidades_atencion)
    ? patch.modalidades_atencion.map((x) => String(x))
    : null;
  const modsExisting = Array.isArray(existing.modalidades_atencion)
    ? existing.modalidades_atencion.map((x) => String(x))
    : [];
  return modalidadesAtencionInputsToDbUnique(
    modsPatch && modsPatch.length ? modsPatch : modsExisting
  );
}

export function pickPostulacionCampoEfectivo(
  patch: Record<string, unknown>,
  existing: Record<string, unknown>,
  field: string
): unknown {
  if (Object.prototype.hasOwnProperty.call(patch, field)) {
    return patch[field];
  }
  return existing[field];
}
