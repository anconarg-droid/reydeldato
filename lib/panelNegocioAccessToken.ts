import type { SupabaseClient } from "@supabase/supabase-js";
import {
  POSTULACIONES_MODERACION_COLUMNS,
  postulacionesEmprendedoresSelectWithColumnRetry,
} from "@/lib/loadPostulacionesModeracion";
import { loadEmprendedorPorTokenValido } from "@/lib/revisarMagicLink";

export type PostulacionPanelPorTokenRow = Record<string, unknown>;

export type ResolvedPanelNegocioFromAccessToken =
  | { mode: "emprendedor_id"; emprendedorId: string }
  | { mode: "postulacion_solo"; post: PostulacionPanelPorTokenRow };

/**
 * Postulación accesible por `access_token` + expiración (misma semántica que borrador / emprendedor).
 */
export async function loadPostulacionEmprendedorPorAccessTokenValido(
  supabase: SupabaseClient,
  token: string
): Promise<PostulacionPanelPorTokenRow | null> {
  const t = String(token ?? "").trim();
  if (t.length < 8) return null;

  const now = new Date().toISOString();
  const cols = [...POSTULACIONES_MODERACION_COLUMNS, "access_token", "access_token_expira_at"];
  const { data, error } = await postulacionesEmprendedoresSelectWithColumnRetry(
    supabase,
    cols,
    async (selectStr) =>
      supabase
        .from("postulaciones_emprendedores")
        .select(selectStr)
        .eq("access_token", t)
        .not("access_token_expira_at", "is", null)
        .gt("access_token_expira_at", now)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle()
  );

  if (error || !data || typeof data !== "object") return null;
  return data as PostulacionPanelPorTokenRow;
}

/**
 * Resuelve carga de negocio del panel cuando solo hay `access_token`:
 * - Token en `emprendedores` → id de ficha.
 * - Token en `postulaciones_emprendedores` con `emprendedor_id` → id de ficha publicada/borrador.
 * - Solo postulación (sin ficha) → modo `postulacion_solo`.
 */
export async function resolvePanelNegocioFromAccessToken(
  supabase: SupabaseClient,
  token: string
): Promise<ResolvedPanelNegocioFromAccessToken | null> {
  const t = String(token ?? "").trim();
  if (t.length < 8) return null;

  const emp = await loadEmprendedorPorTokenValido(supabase, t);
  if (emp?.id) {
    const id = String(emp.id).trim();
    if (id) return { mode: "emprendedor_id", emprendedorId: id };
  }

  const post = await loadPostulacionEmprendedorPorAccessTokenValido(supabase, t);
  if (!post) return null;

  const eid =
    post.emprendedor_id != null ? String(post.emprendedor_id).trim() : "";
  if (eid) return { mode: "emprendedor_id", emprendedorId: eid };

  return { mode: "postulacion_solo", post };
}

/**
 * Resuelve `emprendedor_id` para métricas del panel cuando el cliente envía solo `access_token`.
 */
export async function resolveEmprendedorIdForPanelMetrics(
  supabase: SupabaseClient,
  token: string
): Promise<string | null> {
  const r = await resolvePanelNegocioFromAccessToken(supabase, token);
  if (!r) return null;
  if (r.mode === "emprendedor_id") return r.emprendedorId;
  return null;
}
