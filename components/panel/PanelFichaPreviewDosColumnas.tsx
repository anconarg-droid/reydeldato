"use client";

import FichaDestacados from "@/components/emprendedor/FichaDestacados";
import FichaHero from "@/components/emprendedor/FichaHero";
import {
  buildInstagramUrl,
  buildWebsiteUrl,
  buildWhatsappUrl,
  formatInstagramDisplay,
  formatWebsiteDisplay,
  formatWhatsappDisplay,
  publicWhatsappSecundarioParaFicha,
} from "@/lib/formatPublicLinks";
import { coberturaTexto } from "@/lib/cobertura";
import {
  clampDescripcionCortaFichaDisplay,
  comoAtiendeFlags,
  perfilCompletoIncluyeLineas,
} from "@/lib/emprendedorFichaUi";
import { buildSubtituloFicha } from "@/lib/emprendedorProfileCopy";
import { getBloqueUbicacionFicha } from "@/lib/getContextoUbicacion";
import { formatComunaRegion } from "@/lib/productRules";
import { normalizeDescripcionCorta } from "@/lib/descripcionProductoForm";
import { buildAtiendeLine, humanizeCoverageSlug } from "@/lib/search/atiendeResumenLabel";
import { panelSlugFichaPublicaDesdeItem } from "@/lib/panelItemToSearchCardProps";

function s(v: unknown) {
  return String(v ?? "").trim();
}

function arr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => (x == null ? "" : String(x).trim())).filter(Boolean);
}

function uniqStrings(list: string[]): string[] {
  return [...new Set(list.map((x) => String(x || "").trim()).filter(Boolean))];
}

function normalizeSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
    "http://localhost:3000"
  );
}

function buildMailUrl(email: string) {
  const v = s(email);
  return v ? `mailto:${v}` : "";
}

function buildPhoneUrl(phone: string) {
  const c = s(phone).replace(/\D/g, "");
  return c ? `tel:${c}` : "";
}

function prettySubFromSlug(slug: string) {
  return String(slug || "")
    .replace(/[-_]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function rubroVisibleDesdeItem(item: Record<string, unknown>): string {
  const nombres = Array.isArray(item.subcategoriasNombres)
    ? (item.subcategoriasNombres as unknown[])
        .map((x) => s(x))
        .filter(Boolean)
    : [];
  if (nombres.length) return nombres[0];
  const slugs = Array.isArray(item.subcategoriasSlugs)
    ? (item.subcategoriasSlugs as unknown[]).map((x) => s(x))
    : [];
  if (slugs.length) return prettySubFromSlug(slugs[0]);
  return s(item.categoriaNombre);
}

/**
 * Misma UI que `/emprendedor/[slug]` en ficha completa: `FichaHero` con descripción larga
 * bajo la galería (columna izquierda) y panel de contacto a la derecha.
 */
export default function PanelFichaPreviewDosColumnas({
  item,
  urlSlugParam,
  ocultarAccionesPublicas = false,
}: {
  item: Record<string, unknown>;
  /** Slug de la URL del panel si el ítem aún no trae slug en BD. */
  urlSlugParam?: string;
  /** Sin compartir ni tracking; mismo layout que moderación / ficha no publicada. */
  ocultarAccionesPublicas?: boolean;
}) {
  const slugReal = panelSlugFichaPublicaDesdeItem(item, urlSlugParam);
  const emprendedorId = s(item.id ?? item.emprendedorId);
  const modalidadesArr = arr(item.modalidadesAtencion);
  const main = s(item.fotoPrincipalUrl ?? item.foto_principal_url);
  const galeriaRaw = arr(item.galeriaUrls).slice(0, 8);
  const galeria = main ? galeriaRaw.filter((u) => s(u) !== main) : galeriaRaw;

  const comunaNombre = s(item.comunaBaseNombre);
  const coberturaTipo = s(item.coberturaTipo);
  const comunaBaseSlug = s(item.comunaBaseSlug);
  const comunasSlugs = uniqStrings(arr(item.comunasCoberturaSlugs)).filter(
    (sl) => sl.toLowerCase() !== comunaBaseSlug.toLowerCase()
  );
  const namesFromSlugs = comunasSlugs
    .map((sl) => humanizeCoverageSlug(sl))
    .filter(Boolean)
    .join(", ");

  const coberturaDisplay =
    namesFromSlugs ||
    coberturaTexto(coberturaTipo, []) ||
    "";

  const lineAtiendeCard = buildAtiendeLine({
    coberturaTipo,
    regionesCobertura: arr(item.regionesCoberturaSlugs),
  });

  const atiendeEnLineaBase =
    coberturaDisplay.length > 0
      ? `Cobertura en: ${coberturaDisplay}`
      : lineAtiendeCard;

  const ubicacionUnaLinea = formatComunaRegion({
    comunaNombre,
    regionNombre: null,
    regionSlug: null,
  });

  const bloqueUbicacion = getBloqueUbicacionFicha({
    comunaBuscadaSlug: "",
    comunaBaseSlug: comunaBaseSlug || null,
    comunaBaseNombre: comunaNombre || null,
    regionNombre: null,
    regionSlug: null,
    coberturaTipo: coberturaTipo || null,
    comunasCobertura: null,
    comunasCoberturaSlugs: comunasSlugs.length ? comunasSlugs : null,
    regionesCoberturaSlugs: arr(item.regionesCoberturaSlugs).length
      ? arr(item.regionesCoberturaSlugs)
      : null,
  });

  const panelMuestraBloqueUbicacion = Boolean(
    bloqueUbicacion.lineaPin && bloqueUbicacion.lineaBase,
  );
  const baseNombrePanel = comunaNombre;
  const partesCoberturaDisplay = coberturaDisplay
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
  const coberturaSoloRepiteBase =
    Boolean(baseNombrePanel) &&
    partesCoberturaDisplay.length === 1 &&
    partesCoberturaDisplay[0] === baseNombrePanel.toLowerCase();

  const atiendeEnLineaFicha =
    bloqueUbicacion.ocultarAtiendeEnLineaGenerica ||
    (panelMuestraBloqueUbicacion && coberturaSoloRepiteBase)
      ? ""
      : atiendeEnLineaBase;

  const rubroTitulo = rubroVisibleDesdeItem(item);
  const categoriaVisible =
    rubroTitulo || s(item.categoriaNombre) || "Servicios";

  const subtituloVisible = buildSubtituloFicha({
    categoria: categoriaVisible,
    comuna: comunaNombre,
    cobertura: coberturaDisplay || lineAtiendeCard || "",
  });

  const textoCortaFuente =
    s(item.frase_negocio) || s(item.descripcionCorta);
  const textoCortaNorm = normalizeDescripcionCorta(textoCortaFuente);
  const descripcionCortaPanel =
    textoCortaNorm.length > 0
      ? clampDescripcionCortaFichaDisplay(textoCortaNorm)
      : clampDescripcionCortaFichaDisplay(subtituloVisible);

  const descripcionLargaUtil = s(item.descripcionLarga) || null;

  const sitioWeb = s(item.web ?? item.sitio_web);
  const whatsapp = s(item.whatsapp);
  const whatsappUrl = buildWhatsappUrl(whatsapp);
  const waSecPanel = s(
    (item as Record<string, unknown>).whatsappSecundario ??
      (item as Record<string, unknown>).whatsapp_secundario,
  );
  const whatsappSecundarioFicha = publicWhatsappSecundarioParaFicha(whatsapp, waSecPanel);
  const instagramUrl = buildInstagramUrl(s(item.instagram));
  const webUrl = buildWebsiteUrl(sitioWeb);
  const phoneUrlLlamar = whatsapp ? buildPhoneUrl(whatsapp) : "";
  const phoneLabelLlamar = formatWhatsappDisplay(whatsapp);

  const comoAtiende = comoAtiendeFlags(modalidadesArr);

  const perfilIncluyeLineas = (() => {
    const base = perfilCompletoIncluyeLineas({
      disponibleEnComuna: Boolean(s(ubicacionUnaLinea)),
      flags: comoAtiende,
      tieneWhatsapp: Boolean(whatsappUrl),
    });
    return base;
  })();

  const shareUrl = `${normalizeSiteUrl()}/emprendedor/${encodeURIComponent(slugReal)}`;
  const emailUrl = buildMailUrl(s(item.email));

  const localesFicha = (() => {
    const raw = (item as any).localesFisicos;
    if (!Array.isArray(raw)) return undefined;
    const mapped = raw
      .map((r: any) => {
        const comunaSlug = s(r?.comunaSlug ?? r?.comuna_slug);
        const comunaNombre =
          s(r?.comunaNombre ?? r?.comuna_nombre) || humanizeCoverageSlug(comunaSlug);
        const direccion = s(r?.direccion);
        const referencia = s(r?.referencia);
        const esPrincipal = r?.esPrincipal === true || r?.es_principal === true;
        if (!comunaNombre && !direccion && !referencia) return null;
        return {
          nombre_local: null as string | null,
          comuna_nombre: comunaNombre || "",
          direccion,
          referencia: referencia || undefined,
          es_principal: esPrincipal,
        };
      })
      .filter(Boolean) as {
      nombre_local: string | null;
      comuna_nombre: string;
      direccion: string;
      referencia?: string;
      es_principal: boolean;
    }[];
    if (mapped.length === 0) return undefined;
    return [...mapped].sort((a, b) =>
      a.es_principal === b.es_principal ? 0 : a.es_principal ? -1 : 1
    );
  })();

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      <FichaHero
        emprendedorId={emprendedorId}
        comunaSlug={comunaBaseSlug ? comunaBaseSlug : null}
        slug={slugReal}
        fotoPrincipal={main}
        galeria={galeria}
        bloqueBajoGaleria={
          descripcionLargaUtil ? (
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 md:p-6 shadow-sm ring-1 ring-slate-100">
              <h2 className="m-0 mb-3 text-lg font-black text-slate-900 tracking-tight">
                Descripción
              </h2>
              <p className="m-0 max-w-prose text-[15px] md:text-[16px] leading-relaxed text-slate-700 whitespace-pre-wrap">
                {descripcionLargaUtil}
              </p>
            </div>
          ) : undefined
        }
        bloqueBajoPanel={<FichaDestacados items={perfilIncluyeLineas} />}
        ubicacionLinea={bloqueUbicacion.lineaPin ? "" : ubicacionUnaLinea}
        bloqueUbicacion={
          bloqueUbicacion.lineaPin && bloqueUbicacion.lineaBase
            ? {
                lineaPin: bloqueUbicacion.lineaPin,
                lineaBase: bloqueUbicacion.lineaBase,
                lineaAtiendeTambien: bloqueUbicacion.lineaAtiendeTambien,
              }
            : null
        }
        nombre={s(item.nombre_emprendimiento ?? item.nombre) || "Tu negocio"}
        descripcionCortaPanel={descripcionCortaPanel}
        atiendeEnLinea={atiendeEnLineaFicha}
        comoAtiende={comoAtiende}
        whatsappUrl={whatsappUrl}
        whatsappDisplay={formatWhatsappDisplay(whatsapp)}
        whatsappSecundarioUrl={whatsappSecundarioFicha.url}
        whatsappSecundarioDisplay={whatsappSecundarioFicha.display}
        instagramUrl={instagramUrl}
        instagramDisplay={formatInstagramDisplay(s(item.instagram))}
        webUrl={webUrl}
        webDisplay={formatWebsiteDisplay(sitioWeb)}
        phoneUrl={phoneUrlLlamar}
        phoneLabel={phoneLabelLlamar}
        emailUrl={emailUrl}
        emailDisplay={s(item.email)}
        mostrarResponsable={item.mostrarResponsable === true}
        responsableNombre={s(item.responsable)}
        localesFicha={localesFicha}
        shareUrl={shareUrl}
        moderacionVistaPrevia={ocultarAccionesPublicas}
      />
    </div>
  );
}
