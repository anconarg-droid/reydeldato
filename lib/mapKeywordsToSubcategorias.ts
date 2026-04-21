/**
 * Mapea palabras clave o rubros (IA / texto libre) a subcategorías estructuradas
 * para conectar el formulario de registro con el sistema de apertura de comunas
 * (emprendedor_subcategorias).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type SubcategoriaResuelta = {
  id: string;
  slug: string;
  nombre: string;
  categoria_id: string;
};

/** Normaliza término a forma slug: minúsculas, guiones, sin acentos */
function toSlugForm(s: string): string {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Similitud simple: si el slug de la subcategoría contiene el término o al revés */
function matchesSlug(keywordSlug: string, subSlug: string): boolean {
  if (keywordSlug === subSlug) return true;
  if (subSlug.includes(keywordSlug)) return true;
  if (keywordSlug.includes(subSlug)) return true;
  return false;
}

/**
 * Dado una lista de palabras clave (tags_slugs, keywords_clasificacion de la IA),
 * resuelve subcategorías: primero coincidencia exacta por slug o nombre, luego por similitud.
 * Devuelve subcategorías únicas y la primera categoría para asignar al emprendimiento.
 */
export async function mapKeywordsToSubcategorias(
  supabase: SupabaseClient,
  keywords: string[]
): Promise<{
  subcategorias: SubcategoriaResuelta[];
  primeraCategoriaId: string | null;
 }> {
  if (!keywords.length) {
    return { subcategorias: [], primeraCategoriaId: null };
  }

  const { data: todas, error } = await supabase
    .from("subcategorias")
    .select("id, slug, nombre, categoria_id")
    .eq("activo", true);

  if (error || !todas?.length) {
    return { subcategorias: [], primeraCategoriaId: null };
  }

  const list = todas as Array<{ id: string; slug: string; nombre: string; categoria_id: string }>;
  const byId = new Map<string, SubcategoriaResuelta>();
  const slugNormToSub = new Map<string, SubcategoriaResuelta>();
  const nombreNormToSub = new Map<string, SubcategoriaResuelta>();

  for (const s of list) {
    const item: SubcategoriaResuelta = {
      id: s.id,
      slug: s.slug,
      nombre: s.nombre,
      categoria_id: s.categoria_id,
    };
    byId.set(s.id, item);
    slugNormToSub.set(toSlugForm(s.slug), item);
    nombreNormToSub.set(toSlugForm(s.nombre), item);
  }

  const addedIds = new Set<string>();

  for (const kw of keywords) {
    const kwNorm = toSlugForm(kw);
    if (!kwNorm) continue;

    let found: SubcategoriaResuelta | null = null;

    if (slugNormToSub.has(kwNorm)) {
      found = slugNormToSub.get(kwNorm)!;
    } else if (nombreNormToSub.has(kwNorm)) {
      found = nombreNormToSub.get(kwNorm)!;
    }

    if (!found) {
      for (const sub of list) {
        if (matchesSlug(kwNorm, toSlugForm(sub.slug)) || matchesSlug(kwNorm, toSlugForm(sub.nombre))) {
          found = byId.get(sub.id)!;
          break;
        }
      }
    }

    if (found && !addedIds.has(found.id)) {
      addedIds.add(found.id);
    }
  }

  const subcategorias = Array.from(byId.values()).filter((s) => addedIds.has(s.id));
  const primeraCategoriaId = subcategorias.length > 0 ? subcategorias[0].categoria_id : null;

  return { subcategorias, primeraCategoriaId };
}
