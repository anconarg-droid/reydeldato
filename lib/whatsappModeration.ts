/**
 * Detección de WhatsApp que aparece en más de 3 fichas (para moderación futura).
 * Usa la vista vw_whatsapp_mas_de_tres_fichas.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type WhatsAppEnMasDeTresFichas = {
  whatsapp_normalizado: string;
  cantidad_fichas: number;
};

/**
 * Devuelve los números WhatsApp (normalizados) que aparecen en más de 3
 * emprendimientos publicados. Útil para revisión o moderación.
 */
export async function getWhatsAppEnMasDeTresFichas(
  supabase: SupabaseClient
): Promise<{ ok: true; data: WhatsAppEnMasDeTresFichas[] } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("vw_whatsapp_mas_de_tres_fichas")
    .select("whatsapp_normalizado, cantidad_fichas");

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, data: (data ?? []) as WhatsAppEnMasDeTresFichas[] };
}
