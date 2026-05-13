"use client";

/**
 * Card unificada: imagen fija, cuerpo en orden fijo (nombre → rubro → confianza md → desc → ubicación → territorial → modalidad),
 * cuerpo con slots de altura mínima; el footer de acciones usa `mt-auto` para anclarse al borde inferior.
 */

import { useState, type SVGProps } from "react";

import TrackedCardLink, {
  type CardViewListingSource,
} from "@/components/search/TrackedCardLink";
import { urlTieneFotoListado } from "@/lib/search/sortItemsConFotoPrimero";
import type { ModoVistaPanel } from "@/lib/panelModoVista";
import {
  getDescripcionCardCorta,
  getLineaTaxonomiaCard,
  getModalidadesChips,
  getSubcategoriaDescripcionFallback,
  listadoFooterCtasDosColumnas,
  listadoPerfilCompletoUi,
  tieneModalidadLocalFisicoEnChips,
} from "@/lib/search/emprendedorSearchCardHelpers";
import { buildListadoPinUbicacionComuna } from "@/lib/search/listadoPinUbicacionComuna";
import { humanizeCoverageSlug } from "@/lib/search/atiendeResumenLabel";
import { slugify } from "@/lib/slugify";
import {
  displayCapitalizeSentenceStarts,
  displayTitleCaseWords,
} from "@/lib/displayTextFormat";
import { cn } from "@/lib/utils";

export type EmprendedorSearchCardProps = {
  slug: string;
  nombre: string;
  fotoPrincipalUrl: string;
  whatsappPrincipal: string;
  /** Publicación en DB; si es "publicado", se puede navegar a la ficha pública. */
  estadoPublicacion?: string | null;
  esFichaCompleta: boolean;
  estadoFicha?: "ficha_completa" | "ficha_basica";
  bloqueTerritorial: "de_tu_comuna" | "atienden_tu_comuna" | null;
  frase: string;
  descripcionLibre: string;
  subcategoriasNombres?: string[];
  subcategoriasSlugs?: string[];
  /** `subcategoria_slug_final`; la línea de rubro lo prioriza sobre listas. */
  subcategoriaSlugFinal?: string;
  categoriaNombre?: string;
  coberturaTipo?: string;
  comunasCobertura?: string[];
  regionesCobertura?: string[];
  localFisicoComunaNombre?: string | null;
  resumenLocalesLinea?: string | null;
  modalidadesCardBadges?: string[];
  comunaBaseNombre: string;
  /** Slug canónico de la comuna base (cruce con comuna buscada en listados). */
  comunaBaseSlug?: string | null;
  comunaBaseRegionAbrev?: string | null;
  comunaBuscadaNombre?: string | null;
  atiendeLine: string;
  esNuevo?: boolean;
  disponibleHoy?: boolean;
  respondeRapido?: boolean;
  trabajosCount?: number;
  analyticsSource?: CardViewListingSource;
  fichaContextComunaSlug?: string | null;
  fichaContextComunaNombre?: string | null;
  /** Región (abrev.) de la comuna de búsqueda/listado para “Atiende X — RM”. */
  fichaContextComunaRegionAbrev?: string | null;
  destacarMejoresOpciones?: boolean;
  modoVista?: ModoVistaPanel;
  bloquearAccesoFichaPublica?: boolean;
  /** Texto del CTA secundario (por defecto: "Ver ficha"). */
  etiquetaVerFicha?: string;
  /** Si viene, el CTA secundario usa esta URL (p. ej. demos en home). */
  fichaPublicaHrefOverride?: string | null;
  /** Si se define, el CTA secundario ejecuta esto en lugar de navegar a la ficha pública. */
  onVerDetallesClick?: (() => void) | null;
  /** Id en DB cuando viene del API (tracking `/api/event`). */
  emprendedorId?: string | null;
  /**
   * Comuna sin directorio activo (p. ej. preview en `/resultados`): solo imagen + nombre;
   * sin WhatsApp, ver ficha, descripción, ubicación ni modalidad.
   */
  usarCardSimple?: boolean;
  /**
   * Misma card que en búsqueda; en carrusel home usar `variant="carousel"` (altura `h-full` dentro del shell).
   * `homeCarousel` queda como alias retrocompatible.
   */
  variant?: "default" | "carousel";
  /** @deprecated Preferir `variant="carousel"`. */
  homeCarousel?: boolean;
  /** Nota opcional bajo la línea de ubicación (p. ej. listados nacionales en página de comuna). */
  listadoNotaDebajoUbicacion?: string | null;
};

const CTA_WHATSAPP_CLASS =
  "flex h-[38px] min-w-0 w-[calc((100%-0.5rem)/2)] shrink-0 items-center justify-center rounded-xl bg-[#1D9E75] px-3 text-center text-sm font-medium leading-tight text-white shadow-sm";

const CTA_VER_FICHA_CLASS =
  "flex h-[38px] min-w-0 w-[calc((100%-0.5rem)/2)] shrink-0 items-center justify-center rounded-xl border-2 border-teal-600 bg-white text-sm font-medium text-teal-900 shadow-md shadow-teal-900/15 transition-colors hover:border-teal-700 hover:bg-teal-50";

const CTA_WHATSAPP_SOLO =
  "mt-auto flex h-[38px] w-full shrink-0 items-center justify-center rounded-xl bg-[#1D9E75] px-3 text-sm font-medium text-white shadow-sm";

function IconHome(props: SVGProps<SVGSVGElement>) {
  const { className, ...rest } = props;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-3.5 w-3.5 shrink-0", className)}
      aria-hidden
      {...rest}
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function IconVehicle(props: SVGProps<SVGSVGElement>) {
  const { className, ...rest } = props;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-3.5 w-3.5 shrink-0", className)}
      aria-hidden
      {...rest}
    >
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h1" />
      <path d="M15 18h1" />
      <path d="M18 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
      <circle cx="6.5" cy="18" r="2" />
      <circle cx="17.5" cy="18" r="2" />
    </svg>
  );
}

function IconPackage(props: SVGProps<SVGSVGElement>) {
  const { className, ...rest } = props;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-3.5 w-3.5 shrink-0", className)}
      aria-hidden
      {...rest}
    >
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

function IconMonitor(props: SVGProps<SVGSVGElement>) {
  const { className, ...rest } = props;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-3.5 w-3.5 shrink-0", className)}
      aria-hidden
      {...rest}
    >
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

function IconImagePlaceholder(props: SVGProps<SVGSVGElement>) {
  const { className, ...rest } = props;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-5 w-5", className)}
      aria-hidden
      {...rest}
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function IconCheckMini(props: SVGProps<SVGSVGElement>) {
  const { className, ...rest } = props;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-3.5 w-3.5 shrink-0", className)}
      aria-hidden
      {...rest}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconGlobeMini(props: SVGProps<SVGSVGElement>) {
  const { className, ...rest } = props;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-3.5 w-3.5 shrink-0", className)}
      aria-hidden
      {...rest}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

/** Cuatro slots fijos de modalidad en card; activo si el chip aparece en datos de listado. */
function modalidadFijaSlotActiva(
  slot: "local_fisico" | "domicilio" | "delivery" | "online",
  chips: string[],
): boolean {
  const lowered = chips.map((c) => String(c ?? "").trim().toLowerCase());
  if (!lowered.length) return false;
  if (slot === "local_fisico") {
    return lowered.some(
      (n) => n.includes("local") && (n.includes("físico") || n.includes("fisico")),
    );
  }
  if (slot === "domicilio") {
    return lowered.some((n) => n.includes("domicilio"));
  }
  if (slot === "delivery") {
    return lowered.some((n) => n.includes("delivery"));
  }
  if (slot === "online") {
    return lowered.some((n) => n.includes("online"));
  }
  return false;
}

function buildWhatsappHref(numero: string) {
  const clean = (numero || "").replace(/[^\d]/g, "");
  return clean ? `https://wa.me/${clean}` : "";
}

function buildWhatsAppUrl(item: { whatsapp: string; subcategoria?: string | null; comuna?: string | null }) {
  const clean = String(item.whatsapp || "").replace(/[^\d]/g, "");
  if (!clean) return "";
  const texto = `Hola! Te encontré en Rey del Dato 👑 Estoy buscando ${
    item.subcategoria || "servicio"
  } en ${item.comuna || "mi comuna"}, ¿me puedes ayudar?`;
  return `https://wa.me/${clean}?text=${encodeURIComponent(texto)}`;
}

function getConfianzaTexto(item: {
  disponible_hoy?: boolean;
  responde_rapido?: boolean;
  trabajos_count?: number | null;
}) {
  if (item.disponible_hoy) return "Disponible hoy";
  if (item.responde_rapido) return "Responde rápido";
  if (item.trabajos_count && item.trabajos_count > 20) return "+20 trabajos realizados";
  return "";
}

// Descripción en card: mostrar solo texto provisto por el emprendedor (sin promesas generadas).

function getCoberturaTextoUnificado(item: {
  comunas_cobertura?: string[] | null;
  regiones_cobertura?: string[] | null;
  comuna?: string | null;
}) {
  const prettyComuna = (raw: string) => tituloDesdeSlugComuna(String(raw ?? ""));
  const prettyRegion = (raw: string) =>
    displayTitleCaseWords(String(raw ?? "").trim().replace(/[-_]+/g, " "));
  const comunas = (item.comunas_cobertura ?? []).filter(Boolean);
  const regiones = (item.regiones_cobertura ?? []).filter(Boolean);

  // CASO 1: varias comunas
  if (comunas.length > 0) {
    const visibles = comunas
      .slice(0, 3)
      .map((c) => prettyComuna(String(c)))
      .filter(Boolean);
    const extra = comunas.length - visibles.length;
    return `Atiende: ${visibles.join(", ")}${extra > 0 ? ` +${extra}` : ""}`;
  }

  // CASO 2: regiones
  if (regiones.length > 0) {
    const first = prettyRegion(regiones[0]);
    if (regiones.length === 1) return `Atiende: ${first}`;
    return `Atiende: ${first} +${regiones.length - 1}`;
  }

  // CASO 3: fallback (solo base)
  const base = String(item.comuna || "").trim();
  if (base) return `Atiende: ${prettyComuna(base) || base}`;

  return "";
}

/** Si hay señal de local en datos de listado pero no chip explícito, añade solo la etiqueta (sin dirección). */
function conChipLocalFisicoInferido(
  chips: string[],
  p: Pick<EmprendedorSearchCardProps, "localFisicoComunaNombre" | "resumenLocalesLinea">,
): string[] {
  const tieneSeñalLocal =
    Boolean(String(p.localFisicoComunaNombre ?? "").trim()) ||
    Boolean(String(p.resumenLocalesLinea ?? "").trim());
  if (!tieneSeñalLocal) return chips;
  if (tieneModalidadLocalFisicoEnChips(chips)) return chips;
  return ["Local físico", ...chips];
}

function tituloDesdeSlugComuna(slug: string): string {
  const base = String(slug || "")
    .trim()
    .replace(/[-_]+/g, " ");
  if (!base) return "";
  return base
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function normNombreComunaCard(s: string): string {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function buildFichaHref(
  slug: string,
  ctx?: { comunaSlug: string; comunaNombre: string } | null,
): string {
  const s = String(slug || "").trim();
  const path = `/emprendedor/${encodeURIComponent(s)}`;
  const comSlug = String(ctx?.comunaSlug ?? "").trim();
  if (!comSlug) return path;
  const nombre =
    String(ctx?.comunaNombre ?? "").trim() || tituloDesdeSlugComuna(comSlug);
  const q = new URLSearchParams();
  q.set("comuna", comSlug);
  q.set("comunaNombre", nombre);
  return `${path}?${q.toString()}`;
}

const MIN_CARACTERES_TEXTO_PERFIL_INTERMEDIO = 40;

function perfilIntermedioListadoPorTexto(p: EmprendedorSearchCardProps): boolean {
  if (p.esFichaCompleta === true) return false;
  const libre = String(p.descripcionLibre ?? "").trim();
  const frase = String(p.frase ?? "").trim();
  return (
    libre.length >= MIN_CARACTERES_TEXTO_PERFIL_INTERMEDIO ||
    frase.length >= MIN_CARACTERES_TEXTO_PERFIL_INTERMEDIO
  );
}

/** Spec: si falta dato → espacio (no quitar el bloque). */
function slotOrSpace(text: string): string {
  const t = String(text ?? "").trim();
  return t || " ";
}

export default function EmprendedorSearchCard(p: EmprendedorSearchCardProps) {
  const isCarousel = p.variant === "carousel" || p.homeCarousel === true;
  const whatsappHref = buildWhatsappHref(p.whatsappPrincipal);
  /** Dígitos presentes → enlace wa.me válido; no acoplado a tipo de perfil. */
  const tieneWhatsappValido = Boolean(whatsappHref);
  const whatsappUrl = buildWhatsAppUrl({
    whatsapp: p.whatsappPrincipal,
    subcategoria: String(p.subcategoriasNombres?.[0] ?? "").trim() || (p.categoriaNombre ?? null),
    comuna: (String(p.comunaBuscadaNombre || "").trim() || String(p.comunaBaseNombre || "").trim()) ?? null,
  });
  const confianzaTexto = getConfianzaTexto({
    disponible_hoy: p.disponibleHoy === true,
    responde_rapido: p.respondeRapido === true,
    trabajos_count: typeof p.trabajosCount === "number" ? p.trabajosCount : null,
  });
  const comCtxSlug = String(p.fichaContextComunaSlug ?? "").trim();
  const fichaHrefOverride = String(p.fichaPublicaHrefOverride ?? "").trim();
  const fichaHref = fichaHrefOverride
    ? fichaHrefOverride
    : buildFichaHref(
        p.slug,
        comCtxSlug
          ? {
              comunaSlug: comCtxSlug,
              comunaNombre: String(p.fichaContextComunaNombre ?? "").trim(),
            }
          : null,
      );

  const verDetallesHandler =
    typeof p.onVerDetallesClick === "function" ? p.onVerDetallesClick : null;

  const vistaBasicaPanel = (p.modoVista ?? "completa") === "basica";
  const etiquetaVerFicha = String(p.etiquetaVerFicha ?? "").trim() || "Ver ficha";
  /** Badge, borde teal, sombra y CTA secundario activo: trial/plan + publicado + sin bloqueo. */
  const listadoUiPerfilCompleto = listadoPerfilCompletoUi(p);
  /** WhatsApp + columna secundaria (enlace o deshabilitada): trial/plan + publicado. */
  const listadoPieDosCtas = listadoFooterCtasDosColumnas(p);
  const esIntermedio = perfilIntermedioListadoPorTexto(p);

  const modalidadChips = conChipLocalFisicoInferido(
    getModalidadesChips({ modalidadesCardBadges: p.modalidadesCardBadges }),
    p,
  );
  const lineaTaxonomia = getLineaTaxonomiaCard(p);
  const coberturaTxt = getCoberturaTextoUnificado({
    comunas_cobertura: p.comunasCobertura ?? null,
    regiones_cobertura: p.regionesCobertura ?? null,
    comuna: p.comunaBaseNombre ?? null,
  });

  const descTextRaw = getDescripcionCardCorta(
    p,
    lineaTaxonomia,
    getSubcategoriaDescripcionFallback(p),
  );

  const comunaNomRaw = String(p.comunaBaseNombre || "").trim();
  const reg = String(p.comunaBaseRegionAbrev || "").trim();
  const comunaBaseLabel =
    comunaNomRaw || reg
      ? reg && comunaNomRaw
        ? `${comunaNomRaw} · ${reg}`
        : comunaNomRaw || reg
      : "Sin información de comuna base";

  const comunaBuscadaTrim = String(p.comunaBuscadaNombre || "").trim();
  const buscadaSlugCtx = slugify(String(p.fichaContextComunaSlug ?? "").trim());

  const pinUbicacion = buildListadoPinUbicacionComuna({
    fichaContextComunaSlug: p.fichaContextComunaSlug,
    fichaContextComunaNombre: p.fichaContextComunaNombre,
    comunaBuscadaNombre: p.comunaBuscadaNombre,
    comunaBaseSlug: p.comunaBaseSlug,
    comunaBaseNombre: comunaNomRaw || p.comunaBaseNombre,
    comunaBaseRegionAbrev: p.comunaBaseRegionAbrev,
    comunasCobertura: p.comunasCobertura,
    bloqueTerritorial: p.bloqueTerritorial,
  });

  const nombreBuscadaTerritorial =
    String(p.fichaContextComunaNombre ?? "").trim() ||
    comunaBuscadaTrim ||
    (buscadaSlugCtx ? humanizeCoverageSlug(buscadaSlugCtx) : "");
  const comunaBuscadaDisplay =
    nombreBuscadaTerritorial.trim() ||
    (buscadaSlugCtx ? tituloDesdeSlugComuna(buscadaSlugCtx) : "") ||
    comunaBuscadaTrim;
  const slugBaseNorm = slugify(String(p.comunaBaseSlug ?? "").trim());
  const isComunaContext =
    Boolean(String(p.fichaContextComunaSlug ?? "").trim()) || comunaBuscadaTrim.length > 0;
  const mostrarUbicacionModoComuna =
    isComunaContext && Boolean(String(comunaBuscadaDisplay ?? "").trim());
  const slugCoinciden =
    Boolean(buscadaSlugCtx) && Boolean(slugBaseNorm) && buscadaSlugCtx === slugBaseNorm;
  const nombreCoincideConBuscada =
    Boolean(comunaNomRaw) &&
    Boolean(comunaBuscadaDisplay.trim()) &&
    normNombreComunaCard(comunaNomRaw) === normNombreComunaCard(comunaBuscadaDisplay);
  const esBaseEnComuna =
    p.bloqueTerritorial === "de_tu_comuna" ||
    (mostrarUbicacionModoComuna &&
      p.bloqueTerritorial !== "atienden_tu_comuna" &&
      (slugCoinciden || nombreCoincideConBuscada));
  const ubicacionPorBloqueTerritorialExplicito =
    Boolean(nombreBuscadaTerritorial) &&
    (p.bloqueTerritorial === "de_tu_comuna" ||
      p.bloqueTerritorial === "atienden_tu_comuna");

  const nombreRaw = String(p.nombre || "").trim();
  const nombreDisplay = nombreRaw
    ? displayTitleCaseWords(nombreRaw)
    : "Emprendimiento";
  const fotoUrl = String(p.fotoPrincipalUrl || "").trim();
  const [imgBroken, setImgBroken] = useState(false);
  const mostrarFoto = urlTieneFotoListado(fotoUrl) && !imgBroken;

  const tieneContextoComunaBuscada = Boolean(
    buscadaSlugCtx && (String(p.fichaContextComunaNombre ?? "").trim() || comunaBuscadaTrim)
  );
  /** Siempre el mismo lenguaje en el chip principal (no "Atiende Talagante", etc.). */
  const territorialLabel =
    p.bloqueTerritorial === "de_tu_comuna"
      ? "De tu comuna"
      : p.bloqueTerritorial === "atienden_tu_comuna"
        ? "Atiende tu comuna"
        : null;

  /** Comuna de la búsqueda/vista: solo como dato secundario junto al chip unificado. */
  const mostrarComunaBusquedaSecundaria =
    p.bloqueTerritorial === "atienden_tu_comuna" &&
    !tieneContextoComunaBuscada &&
    comunaBuscadaTrim.length > 0;

  const showCoberturaStatusRow =
    territorialLabel != null || (listadoUiPerfilCompleto && p.disponibleHoy === true);

  const analyticsSource = p.analyticsSource ?? "search";
  const destacarListado = p.destacarMejoresOpciones === true;
  const estadoPub = String(p.estadoPublicacion ?? "").trim().toLowerCase();
  const fichaPublicaDisponible = estadoPub === "publicado";
  const puedeVerFichaPublica = fichaPublicaDisponible && !p.bloquearAccesoFichaPublica;

  const idleShadow = listadoUiPerfilCompleto
    ? "0 6px 22px rgba(15, 118, 110, 0.14), 0 2px 10px rgba(15, 23, 42, 0.05), 0 0 0 1px rgba(15, 118, 110, 0.08)"
    : "0 1px 2px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.08)";
  const hoverShadow = listadoUiPerfilCompleto
    ? "0 12px 32px rgba(15, 118, 110, 0.18), 0 4px 14px rgba(15, 23, 42, 0.07)"
    : "0 4px 12px rgba(15, 23, 42, 0.1), 0 2px 4px rgba(15, 23, 42, 0.06)";
  const idleShadowListado = destacarListado
    ? `${idleShadow}, 0 0 0 2px #ffffff, 0 0 0 5px rgba(2, 132, 199, 0.4), 0 12px 36px rgba(2, 132, 199, 0.12)`
    : idleShadow;
  const hoverShadowListado = destacarListado
    ? `${hoverShadow}, 0 0 0 2px #ffffff, 0 0 0 5px rgba(2, 132, 199, 0.52), 0 18px 48px rgba(2, 132, 199, 0.18)`
    : hoverShadow;

  const [hovered, setHovered] = useState(false);
  const cardShadow = hovered ? hoverShadowListado : idleShadowListado;

  if (p.usarCardSimple) {
    const fichaHrefOverride = String(p.fichaPublicaHrefOverride ?? "").trim();
    const fichaHref = fichaHrefOverride
      ? fichaHrefOverride
      : buildFichaHref(
          p.slug,
          String(p.fichaContextComunaSlug ?? "").trim()
            ? {
                comunaSlug: String(p.fichaContextComunaSlug ?? "").trim(),
                comunaNombre: String(p.fichaContextComunaNombre ?? "").trim(),
              }
            : null,
        );
    const puedeNavegarFicha = fichaPublicaDisponible && !p.bloquearAccesoFichaPublica;
    return (
      <article
        className={cn(
          "flex min-h-[500px] min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-300 bg-slate-50 shadow-sm md:h-[520px] md:max-h-[520px] md:min-h-[520px]",
          isCarousel && "h-full min-h-0",
        )}
        aria-label={`${nombreDisplay}: disponible cuando la comuna esté activa`}
      >
        <div className="flex min-h-0 min-w-0 flex-1 flex-col p-3.5">
          <div
            className={cn(
              "relative h-[170px] w-full shrink-0 overflow-hidden rounded-xl border border-slate-200/90",
              mostrarFoto ? "bg-slate-100" : "bg-gradient-to-br from-[#E1F5EE] to-[#D1EDE0]",
            )}
          >
            {mostrarFoto ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={fotoUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                  onError={() => setImgBroken(true)}
                />
              </>
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center px-3 py-4 text-center">
                <div className="mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#0F6E56]">
                  <IconImagePlaceholder />
                </div>
                <span className="text-sm font-semibold text-[#085041]">Sin imágenes</span>
                <span className="max-w-[15rem] text-xs font-medium leading-snug text-[#0F6E56]">
                  Pide referencias por WhatsApp
                </span>
              </div>
            )}
          </div>
          <div className="flex min-h-0 flex-1 flex-col justify-center pt-3">
            {puedeNavegarFicha ? (
              <TrackedCardLink
                slug={p.slug}
                href={fichaHref}
                type="view_ficha"
                analyticsSource={analyticsSource}
                trackingComunaSlug={p.fichaContextComunaSlug ?? null}
                trackingEmprendedorId={p.emprendedorId ?? null}
                className="block w-full"
                aria-label={`Ver ficha: ${nombreDisplay}`}
              >
                <h3 className="m-0 line-clamp-2 min-h-[3.25rem] w-full text-center text-lg font-bold leading-snug text-slate-900">
                  {nombreDisplay}
                </h3>
              </TrackedCardLink>
            ) : (
              <h3 className="m-0 line-clamp-2 min-h-[3.25rem] w-full shrink-0 text-center text-lg font-bold leading-snug text-slate-900">
                {nombreDisplay}
              </h3>
            )}
            <p className="m-0 mt-2 w-full shrink-0 px-1 text-center text-[11px] font-medium leading-snug text-slate-500">
              Disponible cuando se active la comuna
            </p>
          </div>
        </div>
      </article>
    );
  }

  const titleColor = listadoUiPerfilCompleto
    ? "text-neutral-950"
    : vistaBasicaPanel
      ? "text-slate-700"
      : esIntermedio
        ? "text-slate-700"
        : "text-slate-600";

  const chipBase =
    "inline-flex max-w-full shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-bold leading-tight tracking-wide";

  const descDisplay = slotOrSpace(displayCapitalizeSentenceStarts(descTextRaw));
  const coberturaDisplay = slotOrSpace(coberturaTxt);

  return (
    <article
      className={cn(
        "flex min-h-[500px] min-w-0 flex-col overflow-hidden rounded-2xl border md:h-[520px] md:max-h-[520px] md:min-h-[520px]",
        listadoUiPerfilCompleto ? "border-[#0f766e] bg-white" : "border-slate-300 bg-slate-50",
        isCarousel && "h-full min-h-0",
      )}
      style={{
        boxShadow: cardShadow,
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        transition: "transform 180ms ease, box-shadow 180ms ease",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {vistaBasicaPanel ? (
        <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-2.5 py-2 text-center">
          <p className="m-0 text-xs font-bold text-slate-700">Visible en búsquedas</p>
          <p className="m-0 text-xs font-bold text-slate-700">Contacto por WhatsApp</p>
        </div>
      ) : null}

      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
          listadoUiPerfilCompleto ? "bg-white" : "bg-slate-50",
        )}
      >
        {/* Imagen: altura fija; no condiciona la altura total de la card. */}
        <div
          className={cn(
            "relative h-[170px] w-full shrink-0 overflow-hidden rounded-xl",
            mostrarFoto ? "bg-slate-100" : "",
            !mostrarFoto &&
              (listadoUiPerfilCompleto
                ? "bg-gradient-to-br from-[#E1F5EE] to-[#D1EDE0]"
                : "bg-slate-100"),
          )}
        >
          {mostrarFoto ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fotoUrl}
                alt={nombreDisplay}
                className="absolute inset-0 h-full w-full object-cover object-center"
                loading="lazy"
                decoding="async"
                onError={() => setImgBroken(true)}
              />
              {listadoUiPerfilCompleto || !vistaBasicaPanel ? (
                <div
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-t via-transparent to-transparent ${
                    listadoUiPerfilCompleto
                      ? "from-slate-900/35"
                      : "from-slate-900/25"
                  }`}
                  aria-hidden
                />
              ) : null}
            </>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center px-4 py-4 text-center">
              <div className="mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#0F6E56]">
                <IconImagePlaceholder />
              </div>
              <span className="text-sm font-extrabold text-[#085041]">Sin imágenes</span>
              <span className="max-w-[16rem] text-xs font-semibold leading-snug text-[#0F6E56]">
                Pide referencias por WhatsApp
              </span>
            </div>
          )}

          <div className="pointer-events-none absolute bottom-2 left-2 z-[1]">
            {listadoUiPerfilCompleto ? (
              <span className="rounded-full bg-[#0f766e] px-2.5 py-1 text-[9px] font-extrabold tracking-wide text-white shadow-sm">
                Perfil completo
              </span>
            ) : (
              <span className="rounded-full bg-[#94a3b8] px-2.5 py-1 text-[9px] font-extrabold tracking-wide text-white shadow-sm">
                Perfil básico
              </span>
            )}
          </div>

          {p.esNuevo === true ? (
            <div className="pointer-events-none absolute top-2 right-2 hidden md:block">
              <span className="rounded-full border border-slate-200 bg-white/95 px-2 py-0.5 text-[9px] font-extrabold tracking-wide text-slate-700 shadow-sm">
                Nuevo
              </span>
            </div>
          ) : null}
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-4 py-3">
          <div className="flex min-h-0 w-full shrink-0 flex-col">
            <div className="mb-2.5 flex min-h-[48px] w-full flex-col justify-start gap-0.5">
              <h3
                className={cn(
                  "m-0 line-clamp-2 w-full shrink-0 text-lg font-bold leading-snug",
                  titleColor,
                )}
              >
                {nombreDisplay}
              </h3>

              <p
                className="m-0 line-clamp-1 w-full shrink-0 text-xs font-medium leading-snug text-slate-500"
                title={lineaTaxonomia.trim() || undefined}
              >
                {lineaTaxonomia.trim() ? lineaTaxonomia.trim() : "\u00A0"}
              </p>
            </div>

            <p className="m-0 mb-2.5 hidden min-h-[1.25rem] w-full shrink-0 text-xs leading-tight text-slate-500 md:block">
              {confianzaTexto || "\u00A0"}
            </p>

            <div className="mb-3.5 flex min-h-[60px] w-full flex-col justify-start">
              <p className="m-0 line-clamp-3 w-full shrink-0 text-sm font-medium leading-relaxed text-slate-700">
                {descDisplay}
              </p>
            </div>

            <div className="mb-2 flex min-h-[24px] w-full shrink-0 flex-col gap-0.5">
            {/* Ubicación: siempre 📍 En {comuna base} — {región}; en listado por comuna, “Atiende …” si el negocio no tiene base en la comuna buscada. */}
            {(() => {
              const regComunaBuscada = String(p.fichaContextComunaRegionAbrev ?? "").trim();
              const regBase = String(p.comunaBaseRegionAbrev ?? "").trim();
              const nombreBaseLinea =
                comunaNomRaw.trim() ||
                (String(p.comunaBaseSlug ?? "").trim()
                  ? tituloDesdeSlugComuna(String(p.comunaBaseSlug).trim())
                  : "");
              const textoEnBaseRegion =
                nombreBaseLinea && regBase
                  ? `En ${nombreBaseLinea} — ${regBase}`
                  : nombreBaseLinea
                    ? `En ${nombreBaseLinea}`
                    : regBase
                      ? `En ${regBase}`
                      : "";
              const lineaClass =
                "m-0 line-clamp-1 w-full shrink-0 break-words text-[13px] font-medium leading-snug text-slate-800";
              const lineaBaseP =
                textoEnBaseRegion ? (
                  <p className={lineaClass}>
                    <span aria-hidden>📍 </span>
                    {textoEnBaseRegion}
                  </p>
                ) : null;

              if (mostrarUbicacionModoComuna) {
                const mostrarSegundaAtiende =
                  Boolean(String(comunaBuscadaDisplay ?? "").trim()) && !esBaseEnComuna;
                return (
                  <>
                    {lineaBaseP ? (
                      lineaBaseP
                    ) : (
                      <p className={lineaClass}>
                        <span aria-hidden>📍 </span>
                        En {comunaBuscadaDisplay}
                        {regComunaBuscada || regBase ? ` — ${regComunaBuscada || regBase}` : ""}
                      </p>
                    )}
                    {mostrarSegundaAtiende ? (
                      <p className="m-0 line-clamp-1 w-full shrink-0 text-[13px] font-medium leading-snug text-slate-700">
                        Atiende: {comunaBuscadaDisplay}
                        {regComunaBuscada ? ` — ${regComunaBuscada}` : ""}
                      </p>
                    ) : null}
                  </>
                );
              }

              if (ubicacionPorBloqueTerritorialExplicito) {
                return p.bloqueTerritorial === "de_tu_comuna" ? (
                  lineaBaseP ?? (
                    <p className={lineaClass}>
                      <span aria-hidden>📍 </span>
                      En {nombreBuscadaTerritorial}
                    </p>
                  )
                ) : (
                  <>
                    {lineaBaseP ?? (
                      <p className={lineaClass}>
                        <span aria-hidden>📍 </span>
                        Base en {comunaBaseLabel}
                      </p>
                    )}
                    <p className="m-0 line-clamp-1 w-full shrink-0 text-[13px] font-medium leading-snug text-slate-700">
                      Atiende: {nombreBuscadaTerritorial}
                    </p>
                  </>
                );
              }

              if (lineaBaseP) return lineaBaseP;

              return (
                <>
                  <p className="m-0 min-h-[1.375rem] w-full shrink-0 truncate text-[13px] font-medium leading-tight text-slate-800">
                    <span aria-hidden>📍 </span>
                    {pinUbicacion.primary}
                  </p>
                  {pinUbicacion.secondary ? (
                    <p className="m-0 line-clamp-1 min-h-[1rem] w-full shrink-0 text-[11px] leading-tight text-slate-500">
                      {pinUbicacion.secondary}
                    </p>
                  ) : null}
                </>
              );
            })()}

            {String(p.listadoNotaDebajoUbicacion ?? "").trim() ? (
              <p className="m-0 line-clamp-1 w-full shrink-0 text-xs font-medium leading-snug text-amber-900/85">
                {String(p.listadoNotaDebajoUbicacion).trim()}
              </p>
            ) : null}

            {!mostrarUbicacionModoComuna ? (
              <p
                className="m-0 line-clamp-1 min-h-[1rem] w-full shrink-0 text-xs leading-snug text-slate-500"
                title={coberturaTxt.trim() || undefined}
              >
                {coberturaDisplay}
              </p>
            ) : null}
          </div>

          <div
            className="mb-3 flex min-h-[30px] w-full shrink-0 flex-wrap items-center gap-1.5 overflow-hidden"
            aria-hidden={!showCoberturaStatusRow}
          >
            {showCoberturaStatusRow ? (
              <>
                {p.bloqueTerritorial === "de_tu_comuna" ? (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#0F6E56] px-2.5 py-1 text-xs font-medium text-white"
                    title={mostrarComunaBusquedaSecundaria ? `Cobertura hacia ${comunaBuscadaTrim}` : undefined}
                  >
                    <IconCheckMini className="text-white" />
                    De tu comuna
                  </span>
                ) : p.bloqueTerritorial === "atienden_tu_comuna" ? (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#0F6E56] bg-white px-2.5 py-1 text-xs font-medium text-[#0F6E56]"
                    title={mostrarComunaBusquedaSecundaria ? `Cobertura hacia ${comunaBuscadaTrim}` : undefined}
                  >
                    <IconGlobeMini />
                    Atiende tu comuna
                  </span>
                ) : null}
                {mostrarComunaBusquedaSecundaria ? (
                  <span
                    className="inline-flex max-w-full shrink-0 items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium leading-tight text-slate-500 max-h-7 truncate"
                    title={`Comuna de la búsqueda: ${comunaBuscadaTrim}`}
                  >
                    {comunaBuscadaTrim}
                  </span>
                ) : null}
                {p.disponibleHoy === true && listadoUiPerfilCompleto ? (
                  <span className={`${chipBase} border border-amber-200 bg-amber-50 text-amber-900`}>
                    Disponible hoy
                  </span>
                ) : null}
              </>
            ) : (
              <span className="invisible text-[10px]" aria-hidden>
                ·
              </span>
            )}
          </div>

          <div
            className="grid w-full shrink-0 grid-cols-2 gap-1.5"
            aria-label="Modalidades de atención"
          >
            {(
              [
                {
                  slot: "local_fisico" as const,
                  label: "Local físico",
                  display: "🏠 Local físico",
                  Icon: IconHome,
                },
                {
                  slot: "domicilio" as const,
                  label: "A domicilio",
                  display: "🚗 A domicilio",
                  Icon: IconVehicle,
                },
                {
                  slot: "delivery" as const,
                  label: "Delivery",
                  display: "📦 Delivery",
                  Icon: IconPackage,
                },
                {
                  slot: "online" as const,
                  label: "Online",
                  display: "💻 Online",
                  Icon: IconMonitor,
                },
              ] as const
            ).map(({ slot, label, display, Icon }) => {
              const active = modalidadFijaSlotActiva(slot, modalidadChips);
              return (
                <span
                  key={slot}
                  title={display}
                  aria-label={label}
                  className={cn(
                    "flex min-w-0 items-center gap-1.5 rounded-lg border px-2 py-1.5",
                    active
                      ? "border-[#5DCAA5] bg-[#E1F5EE] font-medium text-[#085041]"
                      : "border-gray-200 bg-transparent text-gray-300",
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="min-w-0 flex-1 text-left text-[11px] leading-tight">{display}</span>
                </span>
              );
            })}
          </div>

          </div>

        <div
          className={cn(
            "mt-auto w-full shrink-0 border-t pt-4",
            listadoUiPerfilCompleto ? "border-slate-300/40" : "border-slate-200",
          )}
        >
          {/* Perfil completo (listadoUiPerfilCompleto): WhatsApp + Ver ficha. Básico: leyenda + solo WhatsApp. */}
          {p.bloquearAccesoFichaPublica ? (
            <div className="flex w-full shrink-0 flex-row items-stretch justify-center gap-2">
              {tieneWhatsappValido ? (
                <span
                  className="flex h-[38px] min-w-0 w-[calc((100%-0.5rem)/2)] shrink-0 cursor-not-allowed select-none items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-center text-sm font-medium leading-tight text-slate-400"
                  aria-disabled
                >
                  WhatsApp
                </span>
              ) : null}
              {listadoPieDosCtas ? (
                <span
                  className="flex h-[38px] min-w-0 w-[calc((100%-0.5rem)/2)] shrink-0 cursor-not-allowed select-none items-center justify-center rounded-xl border border-slate-200 bg-slate-100 px-1 text-center text-sm font-medium leading-tight text-slate-400 shadow-none"
                  role="status"
                  aria-disabled
                >
                  {etiquetaVerFicha}
                </span>
              ) : null}
            </div>
          ) : listadoUiPerfilCompleto && puedeVerFichaPublica && tieneWhatsappValido ? (
            <div className="flex w-full shrink-0 flex-row items-stretch justify-center gap-2">
              <TrackedCardLink
                slug={p.slug}
                href={whatsappUrl || whatsappHref}
                type="whatsapp"
                analyticsSource={analyticsSource}
                trackingComunaSlug={p.fichaContextComunaSlug ?? null}
                trackingEmprendedorId={p.emprendedorId ?? null}
                className={CTA_WHATSAPP_CLASS}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`WhatsApp: ${nombreDisplay}`}
              >
                WhatsApp
              </TrackedCardLink>
              {verDetallesHandler ? (
                <button
                  type="button"
                  onClick={verDetallesHandler}
                  className={CTA_VER_FICHA_CLASS}
                  aria-label={`${etiquetaVerFicha}: ${nombreDisplay}`}
                >
                  {etiquetaVerFicha}
                </button>
              ) : (
                <TrackedCardLink
                  slug={p.slug}
                  href={fichaHref}
                  type="view_ficha"
                  analyticsSource={analyticsSource}
                  trackingComunaSlug={p.fichaContextComunaSlug ?? null}
                  trackingEmprendedorId={p.emprendedorId ?? null}
                  className={CTA_VER_FICHA_CLASS}
                  aria-label={`${etiquetaVerFicha}: ${nombreDisplay}`}
                >
                  {etiquetaVerFicha}
                </TrackedCardLink>
              )}
            </div>
          ) : listadoUiPerfilCompleto && puedeVerFichaPublica && !tieneWhatsappValido ? (
            <div className="flex min-h-[48px] w-full shrink-0 justify-center">
              {verDetallesHandler ? (
                <button
                  type="button"
                  onClick={verDetallesHandler}
                  className="flex h-[38px] w-full max-w-sm min-w-[200px] items-center justify-center rounded-xl border-2 border-teal-600 bg-white text-sm font-medium text-teal-900 shadow-md shadow-teal-900/15 transition-colors hover:border-teal-700 hover:bg-teal-50"
                  aria-label={`${etiquetaVerFicha}: ${nombreDisplay}`}
                >
                  {etiquetaVerFicha}
                </button>
              ) : (
                <TrackedCardLink
                  slug={p.slug}
                  href={fichaHref}
                  type="view_ficha"
                  analyticsSource={analyticsSource}
                  trackingComunaSlug={p.fichaContextComunaSlug ?? null}
                  trackingEmprendedorId={p.emprendedorId ?? null}
                  className="flex h-[38px] w-full max-w-sm min-w-[200px] items-center justify-center rounded-xl border-2 border-teal-600 bg-white text-sm font-medium text-teal-900 shadow-md shadow-teal-900/15 transition-colors hover:border-teal-700 hover:bg-teal-50"
                  aria-label={`${etiquetaVerFicha}: ${nombreDisplay}`}
                >
                  {etiquetaVerFicha}
                </TrackedCardLink>
              )}
            </div>
          ) : !listadoUiPerfilCompleto && tieneWhatsappValido ? (
            <div className="flex w-full flex-col gap-2">
              <div className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-center">
                <p className="m-0 text-xs font-semibold leading-snug text-slate-700">
                  Solo contacto por WhatsApp
                </p>
              </div>
              <TrackedCardLink
                slug={p.slug}
                href={whatsappUrl || whatsappHref}
                type="whatsapp"
                analyticsSource={analyticsSource}
                trackingComunaSlug={p.fichaContextComunaSlug ?? null}
                trackingEmprendedorId={p.emprendedorId ?? null}
                className={CTA_WHATSAPP_SOLO}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`WhatsApp: ${nombreDisplay}`}
              >
                WhatsApp
              </TrackedCardLink>
            </div>
          ) : (
            <div className="min-h-[38px] w-full shrink-0" aria-hidden />
          )}
        </div>
        </div>
      </div>
    </article>
  );
}
