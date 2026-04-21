import type { SupabaseClient } from "@supabase/supabase-js";

function trimStr(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

/**
 * termino_input (trim + lowercase) -> termino_canonico si hay fila activa;
 * si no hay coincidencia o error, el texto recortado original.
 */
export async function resolveQueryFromBusquedaSinonimos(
  supabase: SupabaseClient,
  userQuery: string,
  onLookupError?: (message: string) => void
): Promise<string> {
  const trimmed = trimStr(userQuery);
  if (!trimmed) return "";

  const terminoInputKey = trimmed.toLowerCase();

  try {
    const { data, error } = await supabase
      .from("busqueda_sinonimos")
      .select("termino_canonico")
      .eq("termino_input", terminoInputKey)
      .eq("activo", true)
      .limit(1)
      .maybeSingle();

    if (error) {
      onLookupError?.(error.message);
      return trimmed;
    }

    const canon = trimStr(
      (data as { termino_canonico?: unknown } | null)?.termino_canonico
    );
    if (canon) return canon;
    return trimmed;
  } catch {
    return trimmed;
  }
}
