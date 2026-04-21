import {
  fichaPublicaEsMejoradaDesdeBusqueda,
  fotoListadoEmprendedorBusqueda,
} from "@/lib/estadoFicha";
import type { BuscarApiItem } from "@/lib/mapBuscarItemToEmprendedorCard";
import { isNuevo } from "@/lib/productRules";
import {
  buildLocalesResumenLineaTarjeta,
  modalidadesDbToCardBadges,
  type LocalMiniForCard,
} from "@/lib/search/cardListingEnrichment";
import { getRegionShort } from "@/utils/regionShort";

function s(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function parseStrArr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x ?? "").trim()).filter(Boolean);
}

function localesJsonbToMinis(raw: unknown): LocalMiniForCard[] {
  let j: unknown = raw;
  if (typeof raw === "string") {
    try {
      j = JSON.parse(raw) as unknown;
    } catch {
      return [];
    }
  }
  if (!Array.isArray(j)) return [];
  const out: LocalMiniForCard[] = [];
  for (const x of j) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const comunaNombre = String(o.comuna_nombre ?? "").trim();
    const direccion = String(o.direccion ?? "").trim();
    const esPrincipal = o.es_principal === true;
    if (!comunaNombre && !direccion) continue;
    out.push({ comunaNombre, direccion, esPrincipal });
  }
  return out;
}

function enrichmentFromVwRow(row: Record<string, unknown>): {
  resumenLocalesLinea?: string;
  localFisicoComunaNombre?: string;
  modalidadesCardBadges?: string[];
} {
  const minis = localesJsonbToMinis(row.locales);
  const resumen = buildLocalesResumenLineaTarjeta(minis);
  const sorted = [...minis].sort(
    (a, b) => (b.esPrincipal ? 1 : 0) - (a.esPrincipal ? 1 : 0)
  );
  const principalComuna = String(sorted[0]?.comunaNombre ?? "").trim();
  const badges = modalidadesDbToCardBadges(parseStrArr(row.modalidades_atencion_arr));
  const o: {
    resumenLocalesLinea?: string;
    localFisicoComunaNombre?: string;
    modalidadesCardBadges?: string[];
  } = {};
  if (resumen) o.resumenLocalesLinea = resumen;
  if (principalComuna) o.localFisicoComunaNombre = principalComuna;
  if (badges.length) o.modalidadesCardBadges = badges;
  return o;
}

/**
 * Fila de `vw_emprendedores_publico` → mismo shape que `GET /api/buscar` / home “últimos”.
 */
export function vwPublicRowToBuscarApiItem(row: Record<string, unknown>): BuscarApiItem | null {
  const slug = s(row.slug);
  if (!slug) return null;

  const subSlugs = parseStrArr(row.subcategorias_slugs).map((x) => x.toLowerCase());
  const principal = s(row.subcategoria_slug_final).toLowerCase();
  const slugSet = new Set(subSlugs);
  if (principal) slugSet.add(principal);
  const mergedSlugs = [...slugSet];

  const subNombres = parseStrArr(row.subcategorias_nombres_arr);
  const baseSlug = s(row.comuna_base_slug);
  const baseNombre = s(row.comuna_base_nombre);
  const regNombre = s(row.region_nombre);

  const esFichaCompleta = fichaPublicaEsMejoradaDesdeBusqueda(row, null, 0);
  const fotoUrl = fotoListadoEmprendedorBusqueda(row, null);
  const enrich = enrichmentFromVwRow(row);

  const comunasSlugs = parseStrArr(row.comunas_cobertura_slugs_arr);
  const comunasLegacy = parseStrArr(row.comunas_cobertura);
  const comunasCobertura = comunasSlugs.length > 0 ? comunasSlugs : comunasLegacy;

  const regionesSlugs = parseStrArr(row.regiones_cobertura_slugs_arr);

  const nombre = s(row.nombre_emprendimiento) || s(row.nombre) || slug;
  if (!nombre) return null;

  return {
    id: s(row.id),
    slug,
    nombre,
    frase: s(row.frase_negocio),
    descripcion: s(row.descripcion_libre),
    fotoPrincipalUrl: fotoUrl,
    whatsappPrincipal: s(row.whatsapp_principal),
    comunaSlug: baseSlug,
    comunaNombre: baseNombre,
    comunaBaseNombre: baseNombre,
    comunaBaseSlug: baseSlug,
    comunaBaseRegionAbrev: regNombre ? getRegionShort(regNombre) || undefined : undefined,
    coberturaTipo: s(row.cobertura_tipo),
    comunasCobertura: comunasCobertura.length ? comunasCobertura : undefined,
    regionesCobertura: regionesSlugs.length ? regionesSlugs : undefined,
    subcategoriasSlugs: mergedSlugs.length ? mergedSlugs : undefined,
    subcategoriasNombres: subNombres.length ? subNombres : undefined,
    categoriaNombre: s(row.categoria_nombre) || undefined,
    esFichaCompleta,
    estadoFicha: esFichaCompleta ? "ficha_completa" : "ficha_basica",
    fichaActivaPorNegocio: esFichaCompleta,
    createdAt: s(row.created_at),
    estadoPublicacion: s(row.estado_publicacion),
    esNuevo: isNuevo({
      createdAt: row.created_at as string | Date | null | undefined,
      estadoPublicacion: row.estado_publicacion as string | null | undefined,
    }),
    ...enrich,
  };
}
