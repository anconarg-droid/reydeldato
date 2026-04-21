"use client";

import FichaDestacados from "@/components/emprendedor/FichaDestacados";
import FichaHero from "@/components/emprendedor/FichaHero";
import type { PostulacionModeracionItem } from "@/lib/loadPostulacionesModeracion";
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
import { fichaPublicaEsMejoradaDesdeItem } from "@/lib/estadoFicha";
import { expandGaleriaUrlList } from "@/lib/galeriaUrlsEmprendedor";

function s(v: unknown) {
  return String(v ?? "").trim();
}

function arr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => (x == null ? "" : String(x).trim())).filter(Boolean);
}

function normalizeSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
    "http://localhost:3000"
  );
}

function buildMailUrl(email: string) {
  const v = s(email);
  return v ? `mailto:${encodeURIComponent(v)}` : "";
}

function buildPhoneUrl(phone: string) {
  const c = s(phone).replace(/\D/g, "");
  return c ? `tel:${c}` : "";
}

export type ClasificacionModeracionRow = {
  categoriaId: string;
  subIds: string[];
};

export type TaxonomiaModeracionLite = {
  categorias: { id: string; nombre: string }[];
  subcategorias: { id: string; nombre: string; categoria_id: string }[];
};

type Props = {
  item: PostulacionModeracionItem;
  row: ClasificacionModeracionRow;
  taxonomia: TaxonomiaModeracionLite | null;
};

/**
 * Reutiliza `FichaHero` (misma UI que `/emprendedor/[slug]` en ficha completa),
 * con datos de la postulación y la clasificación que está eligiendo el moderador.
 */
export default function ModeracionFichaPreview({
  item,
  row,
  taxonomia,
}: Props) {
  const slug = `moderacion-${s(item.id)}`;
  const comunaNombre = item.comuna?.nombre ?? "";
  const comunaSlug = item.comuna?.slug ?? "";
  const coberturaTipo = s(item.cobertura_tipo);
  const modalidadesArr = arr(item.modalidades_atencion);
  const galeriaRaw = expandGaleriaUrlList(item.galeria_urls);
  const main = s(item.foto_principal_url);
  const galeria = main ? galeriaRaw.filter((u) => s(u) !== main) : galeriaRaw;

  const cobertura = coberturaTexto(coberturaTipo, arr(item.comunas_cobertura));
  const comunasCoberturaFinal = arr(item.comunas_cobertura);
  const coberturaDisplay =
    comunasCoberturaFinal.length > 0
      ? comunasCoberturaFinal.join(", ")
      : coberturaTipo
        ? cobertura
        : "";

  const catNombreModerador =
    (taxonomia
      ? taxonomia.categorias.find((c) => s(c.id) === s(row.categoriaId))?.nombre
      : null) || item.categoria?.nombre || "Servicios";

  const subNombresModerador = row.subIds
    .map((id) => {
      const n = taxonomia?.subcategorias.find((sc) => s(sc.id) === s(id))
        ?.nombre;
      return n ? s(n) : "";
    })
    .filter(Boolean);

  const subcatsForList =
    subNombresModerador.length > 0
      ? subNombresModerador
      : item.subcategorias_nombres ?? [];

  const categoriaVisible = subcatsForList[0] || catNombreModerador || "Servicios";

  const coberturaVisible = coberturaDisplay || coberturaTipo || "";

  const subtituloVisible = buildSubtituloFicha({
    categoria: categoriaVisible,
    comuna: comunaNombre,
    cobertura: coberturaVisible,
  });

  const textoCortaFuente = s(item.frase_negocio) || s(item.descripcion_corta);
  const textoCortaNorm = normalizeDescripcionCorta(textoCortaFuente);
  const descripcionCortaPanel =
    textoCortaNorm.length > 0
      ? clampDescripcionCortaFichaDisplay(textoCortaNorm)
      : clampDescripcionCortaFichaDisplay(subtituloVisible);

  const descripcionLargaUtil = s(item.descripcion_libre) || null;

  const sitioWeb = s(item.sitio_web);
  const whatsappUrl = buildWhatsappUrl(s(item.whatsapp_principal));
  const whatsappSecundarioFicha = publicWhatsappSecundarioParaFicha(
    s(item.whatsapp_principal),
    s(item.whatsapp_secundario),
  );
  const instagramUrl = buildInstagramUrl(s(item.instagram));
  const webUrl = buildWebsiteUrl(sitioWeb);
  const phoneUrlLlamar = item.whatsapp_principal
    ? buildPhoneUrl(s(item.whatsapp_principal))
    : "";
  const phoneLabelLlamar = formatWhatsappDisplay(s(item.whatsapp_principal));

  const comoAtiende = comoAtiendeFlags(modalidadesArr);
  const tieneLocalFisico = modalidadesArr.some((x) =>
    ["local_fisico", "local", "fisico"].includes(x.toLowerCase()),
  );
  const direccionLocalFicha =
    tieneLocalFisico && (s(item.direccion) || s(item.direccion_referencia))
      ? [s(item.direccion), s(item.direccion_referencia)].filter(Boolean).join(" · ")
      : "";

  const ubicacionUnaLinea = formatComunaRegion({
    comunaNombre,
    regionNombre: null,
    regionSlug: null,
  });

  const bloqueUbicacion = getBloqueUbicacionFicha({
    comunaBuscadaSlug: "",
    comunaBaseSlug: comunaSlug || null,
    comunaBaseNombre: comunaNombre || null,
    regionNombre: null,
    regionSlug: null,
    coberturaTipo: coberturaTipo || null,
    comunasCobertura: comunasCoberturaFinal.length ? comunasCoberturaFinal : null,
    comunasCoberturaSlugs: comunasCoberturaFinal.length ? comunasCoberturaFinal : null,
    regionesCoberturaSlugs: arr(item.regiones_cobertura),
  });

  const atiendeEnLinea =
    coberturaDisplay.length > 0 ? `Cobertura en: ${coberturaDisplay}` : "";

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
      : atiendeEnLinea;

  const itemRecord: Record<string, unknown> = {
    ...item,
    nombre: s(item.nombre_emprendimiento),
    nombre_emprendimiento: s(item.nombre_emprendimiento),
    whatsapp: s(item.whatsapp_principal),
    whatsapp_principal: s(item.whatsapp_principal),
  };

  const esFichaCompleta = fichaPublicaEsMejoradaDesdeItem(
    itemRecord,
    galeria.length + (main ? 1 : 0),
  );

  const perfilIncluyeLineas = esFichaCompleta
    ? (() => {
        const base = perfilCompletoIncluyeLineas({
          disponibleEnComuna: Boolean(s(ubicacionUnaLinea)),
          flags: comoAtiende,
          tieneWhatsapp: Boolean(whatsappUrl),
        });
        return direccionLocalFicha
          ? [...base, `Dirección del local: ${direccionLocalFicha}`]
          : base;
      })()
    : [];

  const shareUrl = `${normalizeSiteUrl()}/admin/pendientes`;
  const emailUrl = buildMailUrl(s(item.email));

  return (
    <section className="rounded-2xl border border-amber-200/90 bg-gradient-to-b from-amber-50/40 to-white px-3 py-4 md:px-5 md:py-5 shadow-sm">
      <p className="m-0 mb-3 text-center text-[11px] font-extrabold uppercase tracking-[0.12em] text-amber-900">
        Misma vista que la ficha pública (revisión)
      </p>
      <FichaHero
        emprendedorId=""
        comunaSlug={comunaSlug ? String(comunaSlug).trim() : null}
        slug={slug}
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
        nombre={s(item.nombre_emprendimiento) || "Sin nombre"}
        descripcionCortaPanel={descripcionCortaPanel}
        atiendeEnLinea={atiendeEnLineaFicha}
        comoAtiende={comoAtiende}
        whatsappUrl={whatsappUrl}
        whatsappDisplay={formatWhatsappDisplay(s(item.whatsapp_principal))}
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
        mostrarResponsable={false}
        responsableNombre=""
        direccionLocal={direccionLocalFicha || undefined}
        shareUrl={shareUrl}
        moderacionVistaPrevia
      />
    </section>
  );
}
