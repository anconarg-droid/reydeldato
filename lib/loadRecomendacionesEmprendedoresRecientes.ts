import { createSupabaseServerPublicClient } from "@/lib/supabase/server";
import { getSupabaseAdminFromEnv } from "@/lib/supabaseAdmin";

export type RecomendacionEmprendedorListItem = {
  id: string;
  nombre_emprendimiento: string;
  servicio: string | null;
  created_at: string | null;
};

/**
 * Últimas recomendaciones guardadas para una comuna (`recomendaciones_emprendedores.comuna_id`).
 * Usa service_role si está en env (evita RLS que suele bloquear SELECT con anon); si no, intenta anon.
 * No expone WhatsApp en el tipo (privacidad en UI pública).
 */
export async function loadRecomendacionesEmprendedoresRecientes(
  comunaId: number,
  limit = 8
): Promise<RecomendacionEmprendedorListItem[]> {
  if (!Number.isFinite(comunaId) || comunaId <= 0) return [];

  const selectCols = "id, nombre_emprendimiento, servicio, created_at";

  try {
    const admin = getSupabaseAdminFromEnv();
    const { data, error } = await admin
      .from("recomendaciones_emprendedores")
      .select(selectCols)
      .eq("comuna_id", comunaId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!error && Array.isArray(data)) {
      return data.map((row) => ({
        id: String((row as { id?: unknown }).id ?? ""),
        nombre_emprendimiento: String(
          (row as { nombre_emprendimiento?: unknown }).nombre_emprendimiento ?? ""
        ).trim(),
        servicio:
          (row as { servicio?: unknown }).servicio != null
            ? String((row as { servicio?: unknown }).servicio).trim() || null
            : null,
        created_at:
          (row as { created_at?: unknown }).created_at != null
            ? String((row as { created_at?: unknown }).created_at)
            : null,
      }));
    }
    if (error && process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.warn("[recomendaciones] admin read:", error.message);
    }
  } catch {
    /* sin service role en local */
  }

  const sb = createSupabaseServerPublicClient();
  const { data, error } = await sb
    .from("recomendaciones_emprendedores")
    .select(selectCols)
    .eq("comuna_id", comunaId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.warn("[recomendaciones] anon read:", error.message);
    }
    return [];
  }

  return (data ?? []).map((row) => ({
    id: String((row as { id?: unknown }).id ?? ""),
    nombre_emprendimiento: String(
      (row as { nombre_emprendimiento?: unknown }).nombre_emprendimiento ?? ""
    ).trim(),
    servicio:
      (row as { servicio?: unknown }).servicio != null
        ? String((row as { servicio?: unknown }).servicio).trim() || null
        : null,
    created_at:
      (row as { created_at?: unknown }).created_at != null
        ? String((row as { created_at?: unknown }).created_at)
        : null,
  }));
}
