import type { EmprendedorSearchCardProps } from "@/components/search/EmprendedorSearchCard";
import { buscarApiItemEsFichaCompleta } from "@/lib/buscarApiItemEsFichaCompleta";
import { isNuevo } from "@/lib/productRules";
import { humanizeCoverageSlug } from "@/lib/search/atiendeResumenLabel";
import { buildAtiendeLine } from "@/lib/search/atiendeResumenLabel";

/** Ítem devuelto por `GET /api/buscar` (shape estable para el cliente). */
export type BuscarApiItem = {
  id?: string;
  slug: string;
  nombre: string;
  frase?: string;
  descripcion?: string;
  fotoPrincipalUrl?: string;
  whatsappPrincipal?: string;
  comunaSlug?: string;
  comunaNombre?: string;
  coberturaTipo?: string;
  bloque?: "de_tu_comuna" | "atienden_tu_comuna";
  comunaBaseNombre?: string;
  /** Abreviatura de región de la comuna base (ej. RM), desde `getRegionShort`. */
  comunaBaseRegionAbrev?: string;
  /** Slug de la comuna base (para `getBadgeCobertura`). */
  comunaBaseSlug?: string;
  comunaId?: number;
  esFichaCompleta?: boolean;
  estadoFicha?: "ficha_completa" | "ficha_basica";
  /** Mismo booleano que `esFichaCompleta` (alias para filtro / consistencia). */
  fichaActivaPorNegocio?: boolean;
  subcategoriasSlugs?: string[];
  subcategoriasNombres?: string[];
  categoriaNombre?: string;
  comunasCobertura?: string[];
  regionesCobertura?: string[];
  /** Texto legible de la comuna del local físico principal (opcional). */
  localFisicoComunaNombre?: string;
  /** Desde `emprendedor_locales` (una línea compacta). */
  resumenLocalesLinea?: string | null;
  /** Desde `emprendedor_modalidades`. */
  modalidadesCardBadges?: string[];
  esNuevo?: boolean;
  /** ISO `created_at` (para recalcular "Nuevo" en cliente con la misma regla). */
  createdAt?: string;
  estadoPublicacion?: string;
};

export function buscarApiItemToEmprendedorCardProps(
  item: BuscarApiItem,
  meta: { comunaSlug: string; comunaNombre: string } | null,
  analyticsSource: EmprendedorSearchCardProps["analyticsSource"]
): EmprendedorSearchCardProps {
  const baseNombreRaw = String(item.comunaBaseNombre ?? "").trim();
  /** No usar `comunaNombre` (comuna buscada) como base cuando el ítem es explícitamente "atienden_tu_comuna". */
  const baseNombre =
    baseNombreRaw ||
    (item.bloque === "atienden_tu_comuna"
      ? ""
      : String(item.comunaNombre ?? "").trim());
  const slugCtx = String(meta?.comunaSlug || item.comunaSlug || "").trim();
  const nombreCtx = String(meta?.comunaNombre || item.comunaNombre || "").trim();
  const atiendeLine = buildAtiendeLine({
    coberturaTipo: item.coberturaTipo || "",
    regionesCobertura: item.regionesCobertura,
  });
  const esFichaCompleta = buscarApiItemEsFichaCompleta(item);

  const comunaBuscadaNombre =
    slugCtx.length > 0 ? nombreCtx || humanizeCoverageSlug(slugCtx) : undefined;

  const createdAt = String(item.createdAt ?? "").trim();
  const estadoPub = String(item.estadoPublicacion ?? "").trim();
  const esNuevo =
    createdAt && estadoPub
      ? isNuevo({
          createdAt,
          estadoPublicacion: estadoPub,
        })
      : item.esNuevo === true;

  const comunaCtxSlug = slugCtx;

  const idRaw = item.id != null ? String(item.id).trim() : "";

  return {
    slug: item.slug,
    nombre: item.nombre,
    emprendedorId: idRaw || undefined,
    fotoPrincipalUrl: String(item.fotoPrincipalUrl || ""),
    whatsappPrincipal: String(item.whatsappPrincipal || ""),
    estadoPublicacion: String(item.estadoPublicacion ?? "").trim() || undefined,
    esFichaCompleta,
    estadoFicha: item.estadoFicha,
    bloqueTerritorial: item.bloque ?? null,
    frase: String(item.frase || ""),
    descripcionLibre: String(item.descripcion || ""),
    subcategoriasNombres: item.subcategoriasNombres,
    subcategoriasSlugs: item.subcategoriasSlugs,
    categoriaNombre: item.categoriaNombre,
    coberturaTipo: String(item.coberturaTipo || ""),
    comunasCobertura: Array.isArray(item.comunasCobertura)
      ? item.comunasCobertura.map((x) => String(x ?? "").trim()).filter(Boolean)
      : undefined,
    regionesCobertura: Array.isArray(item.regionesCobertura)
      ? item.regionesCobertura.map((x) => String(x ?? "").trim()).filter(Boolean)
      : undefined,
    localFisicoComunaNombre:
      String(item.localFisicoComunaNombre ?? "").trim() || undefined,
    resumenLocalesLinea:
      item.resumenLocalesLinea != null && String(item.resumenLocalesLinea).trim()
        ? String(item.resumenLocalesLinea).trim()
        : undefined,
    modalidadesCardBadges: Array.isArray(item.modalidadesCardBadges)
      ? item.modalidadesCardBadges
          .map((x) => String(x ?? "").trim())
          .filter(Boolean)
      : undefined,
    comunaBaseNombre: baseNombre.trim(),
    comunaBaseSlug: String(item.comunaBaseSlug || "").trim() || undefined,
    comunaBaseRegionAbrev: String(item.comunaBaseRegionAbrev || "").trim() || undefined,
    comunaBuscadaNombre,
    atiendeLine,
    esNuevo,
    analyticsSource,
    fichaContextComunaSlug: comunaCtxSlug || undefined,
    fichaContextComunaNombre: comunaCtxSlug
      ? String(meta?.comunaNombre ?? item.comunaNombre ?? "").trim() ||
        humanizeCoverageSlug(comunaCtxSlug)
      : undefined,
  };
}
