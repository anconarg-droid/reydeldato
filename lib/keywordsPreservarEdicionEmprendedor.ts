import type { SupabaseClient } from "@supabase/supabase-js";
import { readKeywordsUsuarioPreferJson } from "@/lib/keywordsUsuarioPostulacion";

function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

/** Dedupe sin cambiar mayúsculas (conserva la primera forma vista). */
export function dedupeKeywordsDisplayPreserveCase(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list) {
    const t = s(item);
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

/** Valor de columna `emprendedores.keywords_finales` (text[] o JSON string). */
export function parseKeywordsFinalesEmprendedorDbValue(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return dedupeKeywordsDisplayPreserveCase(
      (raw as unknown[]).map((x) => s(x)).filter(Boolean)
    );
  }
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return dedupeKeywordsDisplayPreserveCase(
          (parsed as unknown[]).map((x) => s(x)).filter(Boolean)
        );
      }
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Lee `keywords_finales` y palabras clave de usuario vigentes en `emprendedores`
 * para reutilizarlos al aprobar una postulación `edicion_publicado` cuando el borrador
 * no trae esos campos (evita que solo `etiquetas_ia` reemplace lo ya publicado).
 */
export async function loadKeywordsPublicadosEmprendedorParaPreservarEdicion(
  supabase: SupabaseClient,
  emprendedorId: string
): Promise<{ finales: string[]; usuario: string[] }> {
  const eid = s(emprendedorId);
  if (!eid) return { finales: [], usuario: [] };

  const { data, error } = await supabase
    .from("emprendedores")
    .select("keywords_finales, keywords_usuario_json, keywords_usuario")
    .eq("id", eid)
    .maybeSingle();

  if (error || !data) return { finales: [], usuario: [] };

  const row = data as Record<string, unknown>;
  const usuario = readKeywordsUsuarioPreferJson(row);
  const finales = parseKeywordsFinalesEmprendedorDbValue(row.keywords_finales);

  return { finales, usuario };
}
