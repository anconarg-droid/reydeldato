import type { SupabaseClient } from "@supabase/supabase-js";
import {
  normalizeTaxonomiaUuid,
  normalizeTaxonomiaUuidList,
} from "@/lib/validateCategoriaSubcategorias";

function s(v: unknown): string {
  return v === null || v === undefined ? "" : String(v).trim();
}

export type ClasificacionPublicadaEmprendedor = {
  categoria_id: string | null;
  subcategorias_ids: string[];
};

/** Normaliza ids para comparar sets de subcategorías (sin importar orden). */
export function subcategoriasIdsMismoConjunto(a: string[], b: string[]): boolean {
  const norm = (ids: string[]) =>
    [...new Set(ids.map((x) => s(x).replace(/-/g, "").toLowerCase()).filter(Boolean))].sort();
  const na = norm(a);
  const nb = norm(b);
  if (na.length !== nb.length) return false;
  return na.every((v, i) => v === nb[i]);
}

/** Compara categoría + subcategorías efectivas vs lo publicado. */
export function clasificacionEquivaleAlPublicado(
  publicado: ClasificacionPublicadaEmprendedor,
  categoriaEfectiva: string | null,
  subcategoriasEfectivas: string[]
): boolean {
  const pc = publicado.categoria_id ? s(publicado.categoria_id).replace(/-/g, "").toLowerCase() : "";
  const ec = categoriaEfectiva ? s(categoriaEfectiva).replace(/-/g, "").toLowerCase() : "";
  if (pc !== ec) return false;
  return subcategoriasIdsMismoConjunto(publicado.subcategorias_ids, subcategoriasEfectivas);
}

export async function loadClasificacionPublicadaEmprendedor(
  supabase: SupabaseClient,
  emprendedorId: string
): Promise<ClasificacionPublicadaEmprendedor> {
  const eid = s(emprendedorId);
  if (!eid) return { categoria_id: null, subcategorias_ids: [] };

  const { data: emp } = await supabase
    .from("emprendedores")
    .select("categoria_id")
    .eq("id", eid)
    .maybeSingle();

  const cat =
    emp && (emp as { categoria_id?: unknown }).categoria_id != null
      ? normalizeTaxonomiaUuid((emp as { categoria_id: unknown }).categoria_id)
      : null;

  const { data: subs } = await supabase
    .from("emprendedor_subcategorias")
    .select("subcategoria_id")
    .eq("emprendedor_id", eid)
    .order("subcategoria_id", { ascending: true });

  const subIds = normalizeTaxonomiaUuidList(
    (subs ?? []).map((r: { subcategoria_id?: unknown }) => (r as { subcategoria_id: unknown }).subcategoria_id)
  );

  return { categoria_id: cat, subcategorias_ids: subIds };
}

export type ClasificacionPublicadaModeracion = {
  categoria_id: string | null;
  subcategorias_ids: string[];
  categoria: { id: string; nombre: string; slug: string } | null;
  subcategorias_nombres: string[];
};

/**
 * Para la cola de moderación: clasificación vigente en `emprendedores` + pivot,
 * en batch (una fila por emprendedor).
 */
export async function loadClasificacionPublicadaBatchModeracion(
  supabase: SupabaseClient,
  emprendedorIds: string[]
): Promise<Map<string, ClasificacionPublicadaModeracion>> {
  const out = new Map<string, ClasificacionPublicadaModeracion>();
  const ids = [...new Set(emprendedorIds.map((x) => s(x)).filter(Boolean))];
  if (!ids.length) return out;

  const { data: empRows } = await supabase
    .from("emprendedores")
    .select("id, categoria_id")
    .in("id", ids);

  const { data: pivotRows } = await supabase
    .from("emprendedor_subcategorias")
    .select("emprendedor_id, subcategoria_id")
    .in("emprendedor_id", ids);

  const catIds = new Set<string>();
  const subIdsAll = new Set<string>();
  const subsByEmp = new Map<string, string[]>();

  for (const r of empRows ?? []) {
    const id = s((r as { id?: unknown }).id);
    const cid = normalizeTaxonomiaUuid((r as { categoria_id?: unknown }).categoria_id);
    if (cid) catIds.add(cid);
  }

  for (const r of pivotRows ?? []) {
    const eid = s((r as { emprendedor_id?: unknown }).emprendedor_id);
    const sid = normalizeTaxonomiaUuid((r as { subcategoria_id?: unknown }).subcategoria_id);
    if (!eid || !sid) continue;
    if (!subsByEmp.has(eid)) subsByEmp.set(eid, []);
    subsByEmp.get(eid)!.push(sid);
    subIdsAll.add(sid);
  }

  const catMap = new Map<string, { id: string; nombre: string; slug: string }>();
  if (catIds.size) {
    const { data: cats } = await supabase
      .from("categorias")
      .select("id, nombre, slug")
      .in("id", [...catIds]);
    for (const c of cats ?? []) {
      const id = s((c as { id?: unknown }).id);
      if (!id) continue;
      catMap.set(id, {
        id,
        nombre: s((c as { nombre?: unknown }).nombre),
        slug: s((c as { slug?: unknown }).slug),
      });
    }
  }

  const subMap = new Map<string, string>();
  if (subIdsAll.size) {
    const { data: subs } = await supabase
      .from("subcategorias")
      .select("id, nombre, slug")
      .in("id", [...subIdsAll]);
    for (const sc of subs ?? []) {
      const id = s((sc as { id?: unknown }).id);
      if (!id) continue;
      const label =
        s((sc as { nombre?: unknown }).nombre) || s((sc as { slug?: unknown }).slug);
      subMap.set(id, label || id);
    }
  }

  for (const emp of empRows ?? []) {
    const eid = s((emp as { id?: unknown }).id);
    if (!eid) continue;
    const catId = normalizeTaxonomiaUuid((emp as { categoria_id?: unknown }).categoria_id);
    const subList = dedupeSubIds(subsByEmp.get(eid) ?? []);
    const nombres = subList.map((sid) => subMap.get(sid) || sid);
    out.set(eid, {
      categoria_id: catId,
      subcategorias_ids: subList,
      categoria: catId ? catMap.get(catId) ?? null : null,
      subcategorias_nombres: nombres,
    });
  }

  return out;
}

function dedupeSubIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of ids) {
    const u = normalizeTaxonomiaUuid(raw);
    if (!u || seen.has(u.toLowerCase())) continue;
    seen.add(u.toLowerCase());
    out.push(u);
  }
  return out;
}
