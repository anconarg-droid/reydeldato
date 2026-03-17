import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CommuneActivityRow = {
  id: string;
  commune_slug: string;
  views: number;
  shares: number;
  invites: number;
  contributors: number;
  updated_at: string;
};

/** Obtiene la actividad de una comuna. Si no existe, devuelve ceros. */
export async function getCommuneActivity(slug: string | null): Promise<CommuneActivityRow | null> {
  if (!slug || typeof slug !== "string" || slug.trim() === "") return null;

  const supabase = createSupabaseServerClient();
  const normalized = slug.trim().toLowerCase();

  const { data, error } = await supabase
    .from("commune_activity")
    .select("id, commune_slug, views, shares, invites, contributors, updated_at")
    .eq("commune_slug", normalized)
    .maybeSingle();

  if (error) {
    console.error("[commune-activity] getCommuneActivity error:", error);
    return null;
  }

  return data as CommuneActivityRow | null;
}

/** Incrementa un campo de actividad (views, shares, invites, contributors). Crea la fila si no existe. */
export async function incrementCommuneActivity(
  slug: string | null,
  field: "views" | "shares" | "invites" | "contributors"
): Promise<void> {
  if (!slug || typeof slug !== "string" || slug.trim() === "") return;

  const supabase = createSupabaseServerClient();
  const normalized = slug.trim().toLowerCase();

  const { error } = await supabase.rpc("increment_commune_activity", {
    p_field: field,
    p_slug: normalized,
  });

  if (error) {
    console.error("[commune-activity] incrementCommuneActivity error:", error);
  }
}
