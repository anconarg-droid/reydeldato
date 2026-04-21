import { createSupabaseServerPublicClient } from "@/lib/supabase/server";
import { getSupabaseAdminFromEnv } from "@/lib/supabaseAdmin";

/**
 * Total de filas en `comuna_interes` para un slug (apoyo agregado, sin datos personales en UI).
 * Prefiere service_role si existe (RLS suele bloquear SELECT con anon).
 */
export async function loadComunaInteresCount(comunaSlug: string): Promise<number> {
  const slug = String(comunaSlug || "").trim().toLowerCase();
  if (!slug) return 0;

  try {
    const admin = getSupabaseAdminFromEnv();
    const { count, error } = await admin
      .from("comuna_interes")
      .select("*", { count: "exact", head: true })
      .eq("comuna_slug", slug);

    if (!error && typeof count === "number") return Math.max(0, count);
  } catch {
    /* sin service role */
  }

  const sb = createSupabaseServerPublicClient();
  const { count, error } = await sb
    .from("comuna_interes")
    .select("*", { count: "exact", head: true })
    .eq("comuna_slug", slug);

  if (error || typeof count !== "number") return 0;
  return Math.max(0, count);
}
