import { VW_APERTURA_COMUNA_V2 } from "@/lib/aperturaComunaContrato";
import { comunaPublicaAbierta } from "@/lib/comunaPublicaAbierta";
import { slugify } from "@/lib/slugify";
import { createSupabaseServerPublicClient } from "@/lib/supabase/server";

function regionSlugDesdeComunaRow(comunaRow: {
  region_id?: unknown;
  regiones?: { slug?: unknown } | { slug?: unknown }[];
}): string | null {
  const rel = comunaRow.regiones;
  const slugJoin = Array.isArray(rel) ? rel[0]?.slug : rel?.slug;
  if (slugJoin != null && String(slugJoin).trim()) return String(slugJoin).trim();
  return null;
}

/**
 * Solo `regiones.slug` para una comuna (sin reglas de directorio).
 * Útil como respaldo en ficha cuando hace falta el slug para matchear cobertura multirregión.
 */
export async function getRegionSlugForComunaSlug(slugRaw: string): Promise<string | null> {
  const slug = slugify(slugRaw);
  if (!slug) return null;
  const sb = createSupabaseServerPublicClient();
  const { data: comunaRow } = await sb
    .from("comunas")
    .select("region_id, regiones(slug)")
    .eq("slug", slug)
    .maybeSingle();
  if (!comunaRow) return null;
  const fromJoin = regionSlugDesdeComunaRow(
    comunaRow as { region_id?: unknown; regiones?: { slug?: unknown } | { slug?: unknown }[] },
  );
  if (fromJoin) return fromJoin;
  const rid = (comunaRow as { region_id?: unknown }).region_id;
  if (rid == null || !String(rid).trim()) return null;
  const { data: regionRow } = await sb
    .from("regiones")
    .select("slug")
    .eq("id", rid)
    .maybeSingle();
  const rs = (regionRow as { slug?: unknown } | null)?.slug;
  return rs != null && String(rs).trim() ? String(rs).trim() : null;
}

export type ComunaDirectorioNavegable = {
  slug: string;
  nombre: string | null;
  comunaId: string | null;
  /** Slug de región (`regiones.slug` vía FK), para contexto ficha / cobertura. */
  regionSlug: string | null;
  /** True si /[slug] muestra el directorio (no /abrir-comuna). */
  navegable: boolean;
};

/**
 * Replica la regla de `app/[comuna]/page.tsx`: fila en `comunas`, vista de apertura,
 * y `comunas_config.activa !== false`.
 */
export async function getComunaDirectorioNavegable(
  slugRaw: string,
): Promise<ComunaDirectorioNavegable> {
  const slug = slugify(slugRaw);
  const vacio: ComunaDirectorioNavegable = {
    slug,
    nombre: null,
    comunaId: null,
    regionSlug: null,
    navegable: false,
  };
  if (!slug) return vacio;

  const sb = createSupabaseServerPublicClient();

  const { data: comunaRow } = await sb
    .from("comunas")
    .select("id, slug, nombre, forzar_abierta, region_id, regiones(slug)")
    .eq("slug", slug)
    .maybeSingle();

  if (!comunaRow?.id) {
    return vacio;
  }

  const id = String((comunaRow as { id: unknown }).id);
  const nombre =
    (comunaRow as { nombre?: unknown }).nombre != null
      ? String((comunaRow as { nombre: unknown }).nombre).trim() || null
      : null;

  let regionSlug = regionSlugDesdeComunaRow(
    comunaRow as { region_id?: unknown; regiones?: { slug?: unknown } | { slug?: unknown }[] },
  );

  if (!regionSlug) {
    const rid = (comunaRow as { region_id?: unknown }).region_id;
    if (rid != null && String(rid).trim()) {
      const { data: regionRow } = await sb
        .from("regiones")
        .select("slug")
        .eq("id", rid)
        .maybeSingle();
      const rs = (regionRow as { slug?: unknown } | null)?.slug;
      if (rs != null && String(rs).trim()) regionSlug = String(rs).trim();
    }
  }

  const { data: vwRow } = await sb
    .from(VW_APERTURA_COMUNA_V2)
    .select("porcentaje_apertura, abierta")
    .eq("comuna_slug", slug)
    .maybeSingle();

  const vw = vwRow
    ? {
        porcentaje_apertura: Number(
          (vwRow as { porcentaje_apertura?: unknown }).porcentaje_apertura ?? 0,
        ),
        abierta: (vwRow as { abierta?: unknown }).abierta,
      }
    : null;

  const publica = comunaPublicaAbierta(
    (comunaRow as { forzar_abierta?: unknown }).forzar_abierta,
    vw,
  );

  const { data: config } = await sb
    .from("comunas_config")
    .select("activa")
    .eq("comuna_id", comunaRow.id)
    .maybeSingle();

  if (config?.activa === false || !publica) {
    return { slug, nombre, comunaId: id, regionSlug, navegable: false };
  }

  return { slug, nombre, comunaId: id, regionSlug, navegable: true };
}
