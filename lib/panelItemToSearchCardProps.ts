import type { EmprendedorSearchCardProps } from "@/components/search/EmprendedorSearchCard";
import { pareceUuidEmprendedor } from "@/lib/emprendedorLookupParam";
import {
  buildLocalesResumenLineaTarjeta,
  modalidadesDbToCardBadges,
  type LocalMiniForCard,
} from "@/lib/search/cardListingEnrichment";
import { buildAtiendeLine, humanizeCoverageSlug } from "@/lib/search/atiendeResumenLabel";

function localesFisicosPanelToMinis(item: Record<string, unknown>): LocalMiniForCard[] {
  const locs = Array.isArray(item.localesFisicos) ? item.localesFisicos : [];
  const out: LocalMiniForCard[] = [];
  for (const L of locs) {
    if (!L || typeof L !== "object" || Array.isArray(L)) continue;
    const o = L as Record<string, unknown>;
    const slug = String(o.comunaSlug ?? "").trim();
    const comunaNombre = slug ? humanizeCoverageSlug(slug) : "";
    const dir = String(o.direccion ?? "").trim();
    const esP = o.esPrincipal === true;
    if (!comunaNombre && !dir) continue;
    out.push({
      comunaNombre: comunaNombre || slug,
      direccion: dir,
      esPrincipal: esP,
    });
  }
  return out;
}

/** Comuna del local principal (solo nombre), fallback si no hay línea de resumen. */
function localFisicoComunaNombreFromPanelItem(item: Record<string, unknown>): string | undefined {
  const minis = localesFisicosPanelToMinis(item);
  if (minis.length === 0) return undefined;
  const principal = minis.find((m) => m.esPrincipal) ?? minis[0];
  const n = String(principal?.comunaNombre ?? "").trim();
  return n || undefined;
}

export type PanelItemToCardOpts = {
  /** `slug` de la URL del panel cuando el ítem aún no tiene slug en BD. */
  urlSlugParam?: string;
};

/** Slug para `/emprendedor/[slug]` (misma regla que la card de listado). */
export function panelSlugFichaPublicaDesdeItem(
  item: Record<string, unknown>,
  urlSlugParam?: string
): string {
  const fromDb = String(item.slug ?? "").trim();
  const url = String(urlSlugParam ?? "").trim();
  const fromUrl = url && !pareceUuidEmprendedor(url) ? url : "";
  const id = String(item.id ?? "").trim();
  return fromDb || fromUrl || id;
}

/**
 * Arma props de `EmprendedorSearchCard` desde el `item` de `GET /api/panel/negocio`
 * (misma card que en el buscador).
 *
 * **Slug:** usa `item.slug`, si no el `urlSlugParam` (si no es UUID), si no `item.id`
 * para que `/emprendedor/[slug]` resuelva por UUID vía `getEmprendedorPublicoBySlug`.
 */
export function panelNegocioItemToSearchCardProps(
  item: Record<string, unknown>,
  tipoFichaPanel: "completa" | "basica",
  opts?: PanelItemToCardOpts
): EmprendedorSearchCardProps {
  const slug = panelSlugFichaPublicaDesdeItem(item, opts?.urlSlugParam);

  const nombre =
    String(item.nombre_emprendimiento ?? item.nombre ?? "").trim() ||
    "Tu negocio";

  const regiones = Array.isArray(item.regionesCoberturaSlugs)
    ? (item.regionesCoberturaSlugs as unknown[]).map((x) => String(x ?? "").trim())
    : [];

  const atiendeLine = buildAtiendeLine({
    coberturaTipo: String(item.coberturaTipo ?? ""),
    regionesCobertura: regiones,
  });

  const subSlugs = Array.isArray(item.subcategoriasSlugs)
    ? (item.subcategoriasSlugs as unknown[]).map((x) => String(x ?? "").trim())
    : undefined;

  const comunasCov = Array.isArray(item.comunasCoberturaSlugs)
    ? (item.comunasCoberturaSlugs as unknown[])
        .map((x) => String(x ?? "").trim())
        .filter(Boolean)
    : [];

  const modsRaw = item.modalidadesAtencion ?? item.modalidades_atencion;
  const modsArr = Array.isArray(modsRaw)
    ? (modsRaw as unknown[]).map((x) => String(x ?? "").trim()).filter(Boolean)
    : [];
  const resumenLocalesLinea = buildLocalesResumenLineaTarjeta(
    localesFisicosPanelToMinis(item)
  );
  const modalidadesCardBadges = modalidadesDbToCardBadges(modsArr);

  return {
    slug,
    nombre,
    fotoPrincipalUrl: String(
      item.fotoPrincipalUrl ?? item.foto_principal_url ?? ""
    ),
    whatsappPrincipal: String(
      item.whatsapp_principal ?? item.whatsapp ?? ""
    ),
    /** `completa` = producto (trial/plan), no % completitud; ver JSDoc en `EmprendedorSearchCardProps`. */
    esFichaCompleta: tipoFichaPanel === "completa",
    estadoFicha:
      tipoFichaPanel === "completa" ? "ficha_completa" : "ficha_basica",
    bloqueTerritorial: null,
    frase: String(item.frase_negocio ?? item.descripcionCorta ?? ""),
    descripcionLibre: String(item.descripcionLarga ?? ""),
    subcategoriasSlugs: subSlugs?.length ? subSlugs : undefined,
    categoriaNombre: String(item.categoriaNombre ?? "").trim() || undefined,
    coberturaTipo: String(item.coberturaTipo ?? ""),
    comunasCobertura: comunasCov.length ? comunasCov : undefined,
    regionesCobertura: regiones.length ? regiones : undefined,
    localFisicoComunaNombre: resumenLocalesLinea
      ? undefined
      : localFisicoComunaNombreFromPanelItem(item),
    resumenLocalesLinea: resumenLocalesLinea ?? undefined,
    modalidadesCardBadges:
      modalidadesCardBadges.length > 0 ? modalidadesCardBadges : undefined,
    comunaBaseNombre:
      String(item.comunaBaseNombre ?? "").trim() || "—",
    atiendeLine,
    analyticsSource: "panel",
  };
}
