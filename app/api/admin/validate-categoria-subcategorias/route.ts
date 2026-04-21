import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { badRequest, ok, serverError } from "@/lib/http";
import {
  normalizeTaxonomiaUuid,
  normalizeTaxonomiaUuidList,
  validateCategoriaSubcategorias,
} from "@/lib/validateCategoriaSubcategorias";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  categoria_id?: unknown;
  subcategorias_ids?: unknown;
};

/**
 * Misma regla que al aprobar: subs obligatorias si hay categoría, todas deben existir y coincidir en categoria_id.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const categoriaId = normalizeTaxonomiaUuid(body.categoria_id);
    const subcategoriasIds = normalizeTaxonomiaUuidList(body.subcategorias_ids);

    const supabase = getSupabaseAdmin({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    });
    const result = await validateCategoriaSubcategorias(
      supabase,
      categoriaId,
      subcategoriasIds,
      { requireAprobacionCompleta: true }
    );

    if (!result.ok) {
      return badRequest(result.error);
    }

    return ok({ ok: true });
  } catch (e) {
    return serverError(
      "Error validando taxonomía",
      e instanceof Error ? e.message : String(e)
    );
  }
}
