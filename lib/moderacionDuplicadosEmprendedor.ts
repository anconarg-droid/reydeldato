import type { PostulacionModeracionItem } from "@/lib/loadPostulacionesModeracion";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  maskWhatsappForModeracion,
  normalizeWhatsappForComparison,
} from "@/lib/normalizeWhatsappForComparison";

type AdminClient = ReturnType<typeof getSupabaseAdmin>;

function s(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

export type PosibleDuplicadoEmprendedorModeracion = {
  id: string;
  nombre_emprendimiento: string;
  slug: string;
  comuna: { nombre: string; slug: string };
  whatsapp_mascarado: string;
};

type EmpRow = {
  id?: unknown;
  nombre_emprendimiento?: unknown;
  slug?: unknown;
  whatsapp_principal?: unknown;
  comuna_id?: unknown;
};

/**
 * Candidatos publicados por comuna (consulta mínima; sin joins ni columnas extra).
 */
export async function loadPublishedEmprendedoresForComunaIds(
  supabase: AdminClient,
  comunaIds: string[]
): Promise<EmpRow[]> {
  const uniqueComunaIds = [...new Set(comunaIds.map((x) => s(x)).filter(Boolean))];
  if (!uniqueComunaIds.length) return [];

  const { data, error } = await supabase
    .from("emprendedores")
    .select("id, nombre_emprendimiento, slug, whatsapp_principal, comuna_id")
    .eq("estado_publicacion", "publicado")
    .in("comuna_id", uniqueComunaIds);

  if (error) {
    console.warn(
      "[moderacionDuplicados] loadPublishedEmprendedoresForComunaIds:",
      error.message
    );
    return [];
  }

  return (data ?? []) as EmpRow[];
}

export function groupEmprendedoresByComunaId(rows: EmpRow[]): Map<string, EmpRow[]> {
  const map = new Map<string, EmpRow[]>();
  for (const row of rows) {
    const cid = s(row.comuna_id);
    if (!cid) continue;
    const list = map.get(cid) ?? [];
    list.push(row);
    map.set(cid, list);
  }
  return map;
}

/**
 * Misma comuna (id en comunas) + mismo WhatsApp normalizado.
 */
export function findPosiblesDuplicadosEmprendedor(
  item: PostulacionModeracionItem,
  byComuna: Map<string, EmpRow[]>
): PosibleDuplicadoEmprendedorModeracion[] {
  const waPost = normalizeWhatsappForComparison(item.whatsapp_principal ?? "");
  const cid = s(item.comuna_base_id);
  if (!waPost || !cid) return [];

  const candidates = byComuna.get(cid) ?? [];
  const selfEmp = s(item.emprendedor_id);
  const out: PosibleDuplicadoEmprendedorModeracion[] = [];

  for (const e of candidates) {
    const eid = s(e.id);
    if (!eid) continue;
    if (selfEmp && selfEmp === eid) continue;

    const waEmp = normalizeWhatsappForComparison(s(e.whatsapp_principal));
    if (waEmp !== waPost) continue;

    const rawWa = s(e.whatsapp_principal);
    out.push({
      id: eid,
      nombre_emprendimiento: s(e.nombre_emprendimiento) || "Sin nombre",
      slug: s(e.slug),
      comuna: {
        nombre: s(item.comuna?.nombre) || "—",
        slug: s(item.comuna?.slug),
      },
      whatsapp_mascarado: maskWhatsappForModeracion(rawWa),
    });
  }

  return out;
}

export async function attachPosiblesDuplicadosModeracion(
  supabase: AdminClient,
  items: PostulacionModeracionItem[]
): Promise<PostulacionModeracionItem[]> {
  if (!items.length) return items;

  const comunaIds = items.map((it) => s(it.comuna_base_id)).filter(Boolean);
  const published = await loadPublishedEmprendedoresForComunaIds(supabase, comunaIds);
  const byComuna = groupEmprendedoresByComunaId(published);

  return items.map((it) => ({
    ...it,
    posibles_duplicados: findPosiblesDuplicadosEmprendedor(it, byComuna),
  }));
}
