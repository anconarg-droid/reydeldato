import type { BuscarApiItem } from "@/lib/mapBuscarItemToEmprendedorCard";
import {
  fichaPublicaEsMejoradaDesdeBusqueda,
  fotoListadoEmprendedorBusqueda,
  trialVigenteOPlanPagoActivoDesdeBusqueda,
} from "@/lib/estadoFicha";
import { isNuevo } from "@/lib/productRules";
import { getRegionShort } from "@/utils/regionShort";
import { modalidadesDbToCardBadges } from "@/lib/search/cardListingEnrichment";

function s(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

function arr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => s(x)).filter(Boolean);
}

function fichaFlagsDesdeRow(r: Record<string, unknown>, galeriaPivot = 0): {
  esFichaCompleta: boolean;
  estadoFicha: "ficha_completa" | "ficha_basica";
} {
  const ok = fichaPublicaEsMejoradaDesdeBusqueda(r, null, galeriaPivot);
  return {
    esFichaCompleta: ok,
    estadoFicha: ok ? "ficha_completa" : "ficha_basica",
  };
}

function esNuevoDesdeRow(r: Record<string, unknown>): boolean {
  return isNuevo({
    createdAt: r.created_at as string | Date | null | undefined,
    estadoPublicacion: r.estado_publicacion as string | null | undefined,
  });
}

export function vwAlgoliaRowToBuscarApiItem(
  r: Record<string, unknown>,
  ctx: {
    categoriaNombreFallback?: string;
    /** Si el usuario filtró por comuna en URL */
    filterComunaSlug?: string;
    filterComunaNombre?: string;
  }
): BuscarApiItem {
  const subSlugsFromArr = Array.isArray(r.subcategorias_slugs_arr)
    ? (r.subcategorias_slugs_arr as unknown[]).map((x) => s(x).toLowerCase()).filter(Boolean)
    : [];
  const subSlugsFromCol = Array.isArray(r.subcategorias_slugs)
    ? (r.subcategorias_slugs as unknown[]).map((x) => s(x).toLowerCase()).filter(Boolean)
    : [];
  const subSlugs =
    subSlugsFromArr.length > 0 ? subSlugsFromArr : subSlugsFromCol;
  const subNombres = Array.isArray(r.subcategorias_nombres_arr)
    ? (r.subcategorias_nombres_arr as unknown[]).map((x) => s(x)).filter(Boolean)
    : [];
  const principal = s(r.subcategoria_slug ?? r.subcategoria_slug_final).toLowerCase();
  const slugSet = new Set(subSlugs);
  if (principal) slugSet.add(principal);
  const mergedSlugs = [...slugSet];
  const regNombre = s(r.region_nombre);
  const baseSlug = s(r.comuna_base_slug);
  const baseNombre = s(r.comuna_base_nombre);
  const fSlug = s(ctx.filterComunaSlug).toLowerCase();
  const fNombre = s(ctx.filterComunaNombre);

  let bloque: BuscarApiItem["bloque"];
  if (!fSlug) {
    bloque = undefined;
  } else if (baseSlug && fSlug === baseSlug.toLowerCase()) {
    bloque = "de_tu_comuna";
  } else {
    bloque = "atienden_tu_comuna";
  }

  const regionesSlugs = Array.isArray(r.regiones_cobertura_slugs_arr)
    ? (r.regiones_cobertura_slugs_arr as unknown[]).map((x) => s(x)).filter(Boolean)
    : [];

  const ficha = fichaFlagsDesdeRow(r, 0);
  const fotoUrl = fotoListadoEmprendedorBusqueda(r, null);

  const comunasCovSlugs = Array.isArray(r.comunas_cobertura_slugs_arr)
    ? (r.comunas_cobertura_slugs_arr as unknown[]).map((x) => s(x)).filter(Boolean)
    : [];
  const comunasCovAlt = Array.isArray(r.cobertura_comunas)
    ? (r.cobertura_comunas as unknown[]).map((x) => s(x)).filter(Boolean)
    : [];
  const comunasCov =
    comunasCovSlugs.length > 0 ? comunasCovSlugs : comunasCovAlt;

  return {
    id: s(r.id),
    slug: s(r.slug),
    nombre: s(r.nombre),
    frase: s(r.descripcion_corta),
    descripcion: s(r.descripcion_larga),
    fotoPrincipalUrl: fotoUrl,
    whatsappPrincipal: s(r.whatsapp_principal) || s(r.whatsapp),
    comunaSlug: fSlug || baseSlug,
    comunaNombre: fNombre || baseNombre,
    comunaBaseNombre: baseNombre,
    comunaBaseSlug: baseSlug,
    comunaBaseRegionAbrev: regNombre ? getRegionShort(regNombre) : undefined,
    coberturaTipo: s(r.cobertura_tipo) || s(r.nivel_cobertura),
    comunasCobertura: comunasCov.length ? comunasCov : undefined,
    regionesCobertura: regionesSlugs.length ? regionesSlugs : undefined,
    bloque,
    subcategoriasSlugs: mergedSlugs.length ? mergedSlugs : principal ? [principal] : [],
    subcategoriasNombres: subNombres.length ? subNombres : undefined,
    categoriaNombre: s(r.categoria_nombre) || ctx.categoriaNombreFallback,
    fichaActivaPorNegocio: trialVigenteOPlanPagoActivoDesdeBusqueda(r, null),
    esFichaCompleta: ficha.esFichaCompleta,
    estadoFicha: ficha.estadoFicha,
    esNuevo: esNuevoDesdeRow(r),
    createdAt: s(r.created_at),
    estadoPublicacion: s(r.estado_publicacion),
  };
}

type ComunaInfo = { nombre: string; slug: string };

export function emprendedorTableRowToBuscarApiItem(
  r: Record<string, unknown>,
  comunaById: Map<number, ComunaInfo>,
  comunaGeoCol: "comuna_id" | "comuna_base_id",
  ctx: { categoriaNombreFallback?: string; filterComunaSlug?: string; filterComunaNombre?: string }
): BuscarApiItem {
  const cidRaw = r[comunaGeoCol] ?? r.comuna_id ?? r.comuna_base_id;
  const cid = typeof cidRaw === "number" ? cidRaw : Number(cidRaw);
  const cinfo = Number.isFinite(cid) ? comunaById.get(cid) : undefined;
  const baseNombre = cinfo?.nombre ?? "";
  const baseSlug = cinfo?.slug ?? "";
  const fSlug = s(ctx.filterComunaSlug).toLowerCase();
  const fNombre = s(ctx.filterComunaNombre);

  const arrSlugs = Array.isArray(r.subcategorias_slugs)
    ? (r.subcategorias_slugs as unknown[]).map((x) => s(x).toLowerCase()).filter(Boolean)
    : [];
  const principal = s(r.subcategoria_slug_final).toLowerCase();
  const slugSet = new Set(arrSlugs);
  if (principal) slugSet.add(principal);
  const mergedSlugs = [...slugSet];

  let bloqueTb: BuscarApiItem["bloque"];
  if (!fSlug) {
    bloqueTb = undefined;
  } else if (baseSlug && fSlug === baseSlug.toLowerCase()) {
    bloqueTb = "de_tu_comuna";
  } else {
    bloqueTb = "atienden_tu_comuna";
  }

  const ficha = fichaFlagsDesdeRow(r, 0);
  const fotoUrl = fotoListadoEmprendedorBusqueda(r, null);

  const comunasCov = Array.isArray(r.comunas_cobertura)
    ? (r.comunas_cobertura as unknown[]).map((x) => s(x)).filter(Boolean)
    : [];

  return {
    id: s(r.id),
    slug: s(r.slug),
    nombre: s(r.nombre_emprendimiento) || s(r.slug),
    frase: s(r.frase_negocio),
    descripcion: s(r.descripcion_libre),
    fotoPrincipalUrl: fotoUrl,
    whatsappPrincipal: s(r.whatsapp_principal) || s(r.whatsapp),
    comunaSlug: fSlug || baseSlug,
    comunaNombre: fNombre || baseNombre,
    comunaBaseNombre: baseNombre,
    comunaBaseSlug: baseSlug,
    coberturaTipo: s(r.cobertura_tipo),
    comunasCobertura: comunasCov.length ? comunasCov : undefined,
    bloque: bloqueTb,
    subcategoriasSlugs: mergedSlugs,
    categoriaNombre: ctx.categoriaNombreFallback,
    fichaActivaPorNegocio: trialVigenteOPlanPagoActivoDesdeBusqueda(r, null),
    esFichaCompleta: ficha.esFichaCompleta,
    estadoFicha: ficha.estadoFicha,
    esNuevo: esNuevoDesdeRow(r),
    createdAt: s(r.created_at),
    estadoPublicacion: s(r.estado_publicacion),
  };
}

export function categoriaApiItemToBuscarApiItem(
  hit: Record<string, unknown>,
  comunaSlug: string,
  comunaNombre: string
): BuscarApiItem {
  const slugs = arr(hit.subcategorias_slugs).map((x) => x.toLowerCase());
  const one = s(hit.subcategoria_slug).toLowerCase();
  const merged = new Set(slugs);
  if (one) merged.add(one);

  const regionesRaw = hit.regiones_cobertura_slugs_arr ?? hit.regiones_cobertura_slugs;
  const regionesSlugs = Array.isArray(regionesRaw)
    ? (regionesRaw as unknown[]).map((x) => s(x)).filter(Boolean)
    : [];

  /**
   * La API de categoría ya calculó el flag con `fichaPublicaEsMejoradaDesdeBusqueda` (misma función que `/api/buscar`).
   * No recalcular aquí: evita dos reglas distintas para el mismo JSON.
   */
  const completa =
    hit.ficha_mejorada_contenido === true || hit.esFichaCompleta === true;
  const fotoUrl = fotoListadoEmprendedorBusqueda(hit, null);

  const enTu = hit.en_tu_comuna === true;
  const atiende = hit.atiende_tu_comuna === true;

  const regNombre = s(hit.region_nombre);

  const comunasSlugs = arr(hit.comunas_cobertura_slugs);
  const comunasNombres = arr(hit.comunas_cobertura_nombres);
  const comunasCobertura =
    comunasSlugs.length > 0
      ? comunasSlugs
      : comunasNombres.length > 0
        ? comunasNombres
        : undefined;

  const modsHit = Array.isArray(hit.modalidades_atencion)
    ? (hit.modalidades_atencion as unknown[]).map((x) => s(x)).filter(Boolean)
    : [];
  const badgesRpc =
    Array.isArray(hit.modalidadesCardBadges) && hit.modalidadesCardBadges.length > 0
      ? (hit.modalidadesCardBadges as unknown[]).map((x) => s(x)).filter(Boolean)
      : modalidadesDbToCardBadges(modsHit);

  return {
    id: s(hit.id),
    slug: s(hit.slug),
    nombre: s(hit.nombre),
    frase: s(hit.descripcion_corta),
    descripcion: s(hit.descripcion_larga),
    fotoPrincipalUrl: fotoUrl,
    whatsappPrincipal: s(hit.whatsapp_principal) || s(hit.whatsapp),
    comunaSlug,
    comunaNombre,
    comunaBaseNombre: s(hit.comuna_base_nombre),
    comunaBaseSlug: s(hit.comuna_base_slug),
    comunaBaseRegionAbrev: regNombre ? getRegionShort(regNombre) : undefined,
    coberturaTipo:
      s(hit.cobertura) || s(hit.cobertura_tipo) || s(hit.nivel_cobertura),
    comunasCobertura,
    regionesCobertura: regionesSlugs.length ? regionesSlugs : undefined,
    bloque: enTu ? "de_tu_comuna" : atiende ? "atienden_tu_comuna" : "atienden_tu_comuna",
    subcategoriasSlugs: [...merged],
    subcategoriasNombres: arr(hit.subcategorias_nombres),
    categoriaNombre: s(hit.categoria_nombre),
    fichaActivaPorNegocio: trialVigenteOPlanPagoActivoDesdeBusqueda(hit, null),
    esFichaCompleta: completa,
    estadoFicha: completa ? "ficha_completa" : "ficha_basica",
    esNuevo: isNuevo({
      createdAt: hit.created_at as string | Date | null | undefined,
      estadoPublicacion: hit.estado_publicacion as string | null | undefined,
    }),
    createdAt: s(hit.created_at),
    estadoPublicacion: s(hit.estado_publicacion),
    resumenLocalesLinea: s(hit.resumenLocalesLinea) || undefined,
    modalidadesCardBadges: badgesRpc.length ? badgesRpc : undefined,
  };
}
