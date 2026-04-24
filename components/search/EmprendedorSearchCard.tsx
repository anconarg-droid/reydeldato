"use client";

/**
 * Card de resultados — layout estable: columna flex `h-full`, imagen altura fija, textos con line-clamp
 * y min-heights alineados; CTAs en footer con `mt-auto`. Cobertura / chips con filas de altura mínima fija.
 */

import { useState } from "react";
import TrackedCardLink, {
  type CardViewListingSource,
} from "@/components/search/TrackedCardLink";
import { getPlaceholderSinFotoSub } from "@/lib/productRules";
import { urlTieneFotoListado } from "@/lib/search/sortItemsConFotoPrimero";
import type { ModoVistaPanel } from "@/lib/panelModoVista";
import {
  getDescripcionCardCorta,
  getDireccionCard,
  getLineaTaxonomiaCard,
  getModalidadesChips,
  getSubcategoriaDescripcionFallback,
  listadoFooterCtasDosColumnas,
  listadoPerfilCompletoUi,
  tieneModalidadLocalFisicoEnChips,
} from "@/lib/search/emprendedorSearchCardHelpers";
import { buildListadoPinUbicacionComuna } from "@/lib/search/listadoPinUbicacionComuna";
import { slugify } from "@/lib/slugify";
import {
  displayCapitalizeSentenceStarts,
  displayTitleCaseWords,
} from "@/lib/displayTextFormat";

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
  destacarMejoresOpciones?: boolean;
  modoVista?: ModoVistaPanel;
  bloquearAccesoFichaPublica?: boolean;
  /** Si viene, el CTA "Ver detalles" usa esta URL (p. ej. demos en home). */
  fichaPublicaHrefOverride?: string | null;
  /** Id en DB cuando viene del API (tracking `/api/event`). */
  emprendedorId?: string | null;
  /**
   * Comuna sin directorio activo (p. ej. preview en `/resultados`): solo imagen + nombre;
   * sin WhatsApp, ver ficha, descripción, ubicación ni modalidad.
   */
  usarCardSimple?: boolean;
};

const ACTIONS_H = 48;

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

function getModalidadesLimitadas(modalidades: string[]) {
  const list = Array.isArray(modalidades)
    ? modalidades.map((x) => String(x ?? "").trim()).filter(Boolean)
    : [];
  if (!list.length) return [];
  const visibles = list.slice(0, 2);
  const extra = list.length - visibles.length;
  if (extra > 0) return [...visibles, `+${extra}`];
  return visibles;
}

function formatDireccionCardDisplay(raw: string): string {
  const t = String(raw ?? "");
  if (!t.trim()) return slotOrSpace("");
  return t
    .split(/\r?\n/)
    // Dirección debe mostrarse tal cual viene (solo trim). No abreviar ni title-case.
    .map((ln) => String(ln ?? "").trim())
    .join("\n");
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Limpia dirección solo para presentación (no persiste en DB):
 * - si la línea viene como "Comuna · Dirección Comuna", quita comuna del inicio/fin
 * - quita duplicados simples y separadores sobrantes
 */
function cleanDireccionLocalParaCard(raw: string, comunaBaseNombre: string): string {
  let t = String(raw ?? "").trim();
  if (!t) return "";

  // Quitar emoji/label si viniera con prefijo
  t = t.replace(/^📍\s*/g, "").trim();
  t = t.replace(/^Local\s+en\s+/i, "").trim();

  const comuna = String(comunaBaseNombre ?? "").trim();
  if (comuna) {
    const c = escapeRegExp(comuna);
    // "Comuna · ..."
    t = t.replace(new RegExp(`^${c}\\s*[·,\\-–—]\\s*`, "i"), "").trim();
    // "... · Comuna"
    t = t.replace(new RegExp(`\\s*[·,\\-–—]\\s*${c}$`, "i"), "").trim();
    // "... Comuna" (al final con espacio)
    t = t.replace(new RegExp(`\\s+${c}$`, "i"), "").trim();
  }

  // Solo limpieza superficial de puntuación sobrante (sin modificar palabras).
  t = t.replace(/^[,\-–—·\s]+/, "").replace(/[,\-–—·\s]+$/, "").trim();

  return t;
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

  const vistaBasicaPanel = (p.modoVista ?? "completa") === "basica";
  /** Badge, borde teal, sombra y CTA “Ver detalles” activo: trial/plan + publicado + sin bloqueo. */
  const listadoUiPerfilCompleto = listadoPerfilCompletoUi(p);
  /** WhatsApp + columna Ver detalles (enlace o deshabilitada): trial/plan + publicado. */
  const listadoPieDosCtas = listadoFooterCtasDosColumnas(p);
  const esIntermedio = perfilIntermedioListadoPorTexto(p);

  const modalidadChips = getModalidadesChips({ modalidadesCardBadges: p.modalidadesCardBadges });
  const tieneLocalFisico =
    tieneModalidadLocalFisicoEnChips(modalidadChips) ||
    Boolean(String(p.resumenLocalesLinea ?? "").trim()) ||
    Boolean(String(p.localFisicoComunaNombre ?? "").trim());
  const resumenLocalesRaw = String(p.resumenLocalesLinea ?? "").trim();
  const resumenLocalesTieneExtra =
    /\n\+\d+\s+local(?:es)?\s+m[aá]s\b/i.test(resumenLocalesRaw) ||
    /^\+\d+\s+local(?:es)?\s+m[aá]s\b/i.test(
      resumenLocalesRaw.split(/\r?\n/).slice(-1)[0] ?? ""
    );
  const modalidadesLimitadas = resumenLocalesTieneExtra
    ? getModalidadesLimitadas(modalidadChips).filter((x) => !/^\+\d+\b/.test(String(x).trim()))
    : getModalidadesLimitadas(modalidadChips);

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

  const nombreRaw = String(p.nombre || "").trim();
  const nombreDisplay = nombreRaw
    ? displayTitleCaseWords(nombreRaw)
    : "Emprendimiento";
  const fotoUrl = String(p.fotoPrincipalUrl || "").trim();
  const [imgBroken, setImgBroken] = useState(false);
  const mostrarFoto = urlTieneFotoListado(fotoUrl) && !imgBroken;

  const comunaBuscadaTrim = String(p.comunaBuscadaNombre || "").trim();
  const buscadaSlugCtx = slugify(String(p.fichaContextComunaSlug ?? "").trim());
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

  /** Dos columnas cuando hay slot de ficha (enlace o bloqueada); mismo ancho de CTAs en el bloque. */
  const footerDosColumnas = listadoPieDosCtas;

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
        className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        aria-label={`${nombreDisplay}: disponible cuando la comuna esté activa`}
      >
        <div className="flex min-h-0 min-w-0 flex-1 flex-col p-3.5">
          <div
            className={`relative w-full shrink-0 overflow-hidden rounded-xl border border-slate-200/90 aspect-square ${
              mostrarFoto ? "bg-slate-100" : "bg-gray-100"
            }`}
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
              <div className="flex h-full min-h-40 w-full flex-col items-center justify-center gap-1 px-3 py-4 text-center">
                <span className="text-sm font-semibold text-gray-500">Sin imágenes</span>
                <span className="max-w-[13rem] text-xs font-medium leading-snug text-gray-400">
                  {getPlaceholderSinFotoSub()}
                </span>
              </div>
            )}
          </div>
          {puedeNavegarFicha ? (
            <TrackedCardLink
              slug={p.slug}
              href={fichaHref}
              type="view_ficha"
              analyticsSource={analyticsSource}
              trackingComunaSlug={p.fichaContextComunaSlug ?? null}
              trackingEmprendedorId={p.emprendedorId ?? null}
              className="mt-2 block w-full"
              aria-label={`Ver ficha: ${nombreDisplay}`}
            >
              <h3 className="m-0 line-clamp-2 min-h-[2.5rem] w-full text-center text-base font-extrabold leading-snug text-slate-900">
                {nombreDisplay}
              </h3>
            </TrackedCardLink>
          ) : (
            <h3 className="m-0 mt-2 line-clamp-2 min-h-[2.5rem] w-full shrink-0 text-center text-base font-extrabold leading-snug text-slate-900">
              {nombreDisplay}
            </h3>
          )}
          <p className="m-0 mt-1.5 w-full shrink-0 px-1 text-center text-[11px] font-medium leading-snug text-slate-500">
            Disponible cuando se active la comuna
          </p>
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
  const titleFontClass = listadoUiPerfilCompleto ? "font-bold" : "font-semibold";

  const chipBase =
    "inline-flex max-w-full shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-bold leading-tight tracking-wide";

  const categoriaDisplay = slotOrSpace(lineaTaxonomia);
  const descDisplay = slotOrSpace(displayCapitalizeSentenceStarts(descTextRaw));
  const coberturaDisplay = slotOrSpace(coberturaTxt);
  const localFisicoComuna = String(p.localFisicoComunaNombre ?? "").trim();
  const ubicacionesRaw = resumenLocalesRaw;
  const ubicacionesLines = listadoUiPerfilCompleto
    ? ubicacionesRaw
        .split(/\r?\n/)
        .map((x) => String(x ?? "").trim())
        .filter((ln) => Boolean(ln) && !/^\+\d+\b/.test(ln))
    : localFisicoComuna
      ? [`Local en ${localFisicoComuna}`]
      : [];
  const ubicacionesVisibles = ubicacionesLines.slice(0, 2);
  const ubicacionesExtra = Math.max(0, ubicacionesLines.length - ubicacionesVisibles.length);
  const localDireccionRaw = String(ubicacionesVisibles[0] ?? "").trim();
  const localDireccionClean = cleanDireccionLocalParaCard(localDireccionRaw, comunaNomRaw);
  const localDireccionDisplay = localDireccionClean
    ? formatDireccionCardDisplay(localDireccionClean)
    : "";

  if (process.env.NODE_ENV !== "production") {
    const nameKey = String(p.nombre ?? "").toLowerCase();
    const slugKey = String(p.slug ?? "").toLowerCase();
    const match =
      nameKey.includes("mecanico") ||
      nameKey.includes("abrazo") ||
      slugKey.includes("mecanico") ||
      slugKey.includes("abrazo");
    if (match) {
      // Logs temporales para depuración de la card pedida.
      // eslint-disable-next-line no-console
      console.log("[card-debug] raw props", {
        slug: p.slug,
        nombre: p.nombre,
        categoriaNombre: p.categoriaNombre,
        subcategoriasNombres: p.subcategoriasNombres,
        subcategoriasSlugs: p.subcategoriasSlugs,
        resumenLocalesLinea: p.resumenLocalesLinea,
        localFisicoComunaNombre: p.localFisicoComunaNombre,
        modalidadesCardBadges: p.modalidadesCardBadges,
        esFichaCompleta: p.esFichaCompleta,
        modoVista: p.modoVista,
      });
      // eslint-disable-next-line no-console
      console.log("[card-debug] computed", {
        lineaTaxonomia,
        categoriaDisplay,
        ubicacionesLines,
        tieneLocalFisico,
        listadoUiPerfilCompleto,
        listadoPieDosCtas,
        estadoPublicacion: p.estadoPublicacion,
      });
      if (!String(p.categoriaNombre ?? "").trim() && !(p.subcategoriasNombres?.length || p.subcategoriasSlugs?.length)) {
        // eslint-disable-next-line no-console
        console.log("[card-debug] categoria/sub vacías: item no trae taxonomía");
      }
      if (ubicacionesLines.length === 0) {
        // eslint-disable-next-line no-console
        console.log("[card-debug] dirección vacía: revisar locales/modalidades/plan", {
          resumenLocalesLinea: p.resumenLocalesLinea,
          localFisicoComunaNombre: p.localFisicoComunaNombre,
          tieneLocalFisico,
          listadoUiPerfilCompleto,
        });
      }
    }
  }

  return (
    <article
      className={`flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border bg-white ${
        listadoUiPerfilCompleto ? "border-[#0f766e]" : "border-slate-200"
      }`}
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
          <p className="m-0 inline-block rounded-full border border-slate-300 bg-slate-200/80 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-600">
            Perfil básico
          </p>
          <p className="m-0 mt-1 text-xs font-bold text-slate-700">Visible en búsquedas</p>
          <p className="m-0 text-xs font-bold text-slate-700">Contacto por WhatsApp</p>
        </div>
      ) : null}

      <div
        className={`flex min-h-0 min-w-0 flex-1 flex-col p-3.5 ${
          listadoUiPerfilCompleto
            ? "bg-white"
            : vistaBasicaPanel
              ? "bg-white"
              : esIntermedio
                ? "bg-slate-50"
                : "bg-white"
        }`}
      >
        {/* Imagen: mismo marco con/sin foto (evita cards “sin caja” en la zona superior). */}
        <div
          className={`relative w-full shrink-0 overflow-hidden rounded-xl border border-slate-200/90 aspect-square ${
            mostrarFoto ? "bg-slate-100" : "bg-gray-100"
          }`}
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
              {listadoUiPerfilCompleto ? (
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/35 via-transparent to-transparent"
                  aria-hidden
                />
              ) : null}
            </>
          ) : (
            <div className="flex h-full min-h-40 w-full flex-col items-center justify-center gap-1 px-3 py-4 text-center">
              <span className="text-sm font-semibold text-gray-500">Sin imágenes</span>
              <span className="max-w-[13rem] text-xs font-medium leading-snug text-gray-400">
                {getPlaceholderSinFotoSub()}
              </span>
            </div>
          )}

          {listadoUiPerfilCompleto ? (
            <div className="pointer-events-none absolute bottom-2 left-2">
              <span className="rounded-full bg-[#0f766e] px-2.5 py-1 text-[9px] font-extrabold tracking-wide text-white shadow-sm">
                Perfil completo
              </span>
            </div>
          ) : null}

          {p.esNuevo === true ? (
            <div className="pointer-events-none absolute top-2 right-2">
              <span className="rounded-full border border-slate-200 bg-white/95 px-2 py-0.5 text-[9px] font-extrabold tracking-wide text-slate-700 shadow-sm">
                Nuevo
              </span>
            </div>
          ) : null}
        </div>

        {/* Cuerpo: crece; reserva footer abajo */}
        <div className="mt-2.5 flex min-h-0 min-w-0 flex-1 flex-col gap-1.5">
          <h3
            className={`m-0 line-clamp-2 min-h-[2.75rem] w-full shrink-0 text-base leading-snug ${titleFontClass} ${titleColor}`}
          >
            {nombreDisplay}
          </h3>

          <p
            className="m-0 min-h-[1rem] w-full shrink-0 text-xs font-semibold leading-snug text-slate-400"
            title={lineaTaxonomia.trim() || undefined}
          >
            {lineaTaxonomia.trim() ? lineaTaxonomia.trim() : " "}
          </p>

          <p className="m-0 line-clamp-3 min-h-[3.25rem] w-full shrink-0 text-sm font-medium leading-snug text-slate-700">
            {descDisplay}
          </p>

          <p className="m-0 min-h-[1rem] w-full shrink-0 text-[11px] leading-tight text-slate-500">
            {confianzaTexto || " "}
          </p>

          {/* Ubicación: primero el contexto (comuna), luego direcciones reales (hasta 2). */}
          <p className="m-0 min-h-[1.375rem] w-full shrink-0 truncate text-sm font-medium leading-tight text-slate-800">
            <span aria-hidden>📍 </span>
            {pinUbicacion.primary}
          </p>
          {pinUbicacion.secondary ? (
            <p className="m-0 min-h-[1rem] w-full shrink-0 truncate text-[11px] leading-tight text-slate-500">
              {pinUbicacion.secondary}
            </p>
          ) : null}

          <div
            className="flex min-h-[32px] w-full shrink-0 flex-nowrap items-center gap-1.5 overflow-hidden"
            aria-hidden={!showCoberturaStatusRow}
          >
            {showCoberturaStatusRow ? (
              <>
                {territorialLabel ? (
                  <span
                    className={`${chipBase} max-h-7 border ${
                      p.bloqueTerritorial === "de_tu_comuna"
                        ? "border-teal-200 bg-teal-50 text-teal-900"
                        : "border-blue-200 bg-blue-50 text-blue-800"
                    }`}
                    title={mostrarComunaBusquedaSecundaria ? `Cobertura hacia ${comunaBuscadaTrim}` : undefined}
                  >
                    {territorialLabel}
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
                  <span className={`${chipBase} max-h-7 border border-amber-200 bg-amber-50 text-amber-900`}>
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
            className="flex min-h-[26px] max-h-[26px] w-full shrink-0 flex-wrap content-start items-center gap-1 overflow-hidden"
            aria-label="Forma de atención"
          >
            {modalidadesLimitadas.length > 0 ? (
              <>
                {modalidadesLimitadas.map((label, idx) => {
                  const isMas = String(label).trim().startsWith("+");
                  return (
                    <span
                      key={`${idx}-${label}`}
                      className={`inline-flex max-w-full shrink-0 items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-tight tracking-wide max-h-6 border ${
                        isMas
                          ? listadoUiPerfilCompleto
                            ? "border-slate-200 bg-slate-100 text-slate-500"
                            : "border-slate-200 bg-slate-100 text-slate-500"
                          : listadoUiPerfilCompleto
                            ? "border-slate-200 bg-slate-50 text-slate-600"
                            : "border-slate-200 bg-slate-50 text-slate-600"
                      }`}
                      title={isMas ? `${label.replace("+", "")} modalidades más` : undefined}
                    >
                      {label}
                    </span>
                  );
                })}
              </>
            ) : (
              <span className="invisible text-sm" aria-hidden>
                {" "}
              </span>
            )}
          </div>

          {/* Bloque: Local físico + dirección (separado de "Atiende") */}
          {tieneLocalFisico ? (
            <div className="my-1 w-full shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
              <p className="m-0 flex items-center gap-1.5 text-[12px] font-bold leading-tight text-slate-800">
                <span aria-hidden>🏪</span>
                <span>Local físico</span>
              </p>
              {localDireccionDisplay ? (
                <p
                  className="m-0 mt-1 flex items-start gap-1.5 text-[13px] leading-tight text-slate-700"
                  title={localDireccionDisplay.trim() || undefined}
                >
                  <span aria-hidden className="mt-[1px]">
                    📍
                  </span>
                  <span className="truncate">{localDireccionDisplay}</span>
                </p>
              ) : null}
              {ubicacionesExtra > 0 ? (
                <p className="m-0 mt-1 text-xs font-medium leading-snug text-slate-500">
                  +{ubicacionesExtra} locales más
                </p>
              ) : null}
            </div>
          ) : null}

          <p
            className="m-0 line-clamp-2 min-h-[2.25rem] w-full shrink-0 text-sm leading-snug text-slate-500"
            title={coberturaTxt.trim() || undefined}
          >
            {coberturaDisplay}
          </p>
        </div>

        {tieneWhatsappValido || puedeVerFichaPublica ? (
        <div
          className={`mt-auto w-full shrink-0 border-t pt-3 ${
            listadoUiPerfilCompleto ? "border-slate-300/40" : "border-slate-200"
          }`}
        >
          {!listadoUiPerfilCompleto && tieneWhatsappValido ? (
            <p className="mb-2 w-full text-center text-[10px] font-normal leading-snug text-slate-600">
              Solo contacto por WhatsApp
            </p>
          ) : null}
          <div
            className={`flex w-full shrink-0 flex-row gap-2 ${
              footerDosColumnas ? "" : "justify-center"
            }`}
          >
            {p.bloquearAccesoFichaPublica ? (
              <>
                {tieneWhatsappValido ? (
                  <span
                    className={`flex cursor-not-allowed select-none items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-center text-sm font-extrabold leading-tight text-slate-400 ${
                      footerDosColumnas
                        ? "min-w-0 flex-1"
                        : "w-[calc(50%-4px)] max-w-[calc(50%-4px)] min-w-0 shrink-0"
                    }`}
                    style={{ minHeight: ACTIONS_H, height: ACTIONS_H }}
                    aria-disabled
                  >
                    WhatsApp
                  </span>
                ) : null}
                {listadoPieDosCtas ? (
                  <span
                    className="flex min-w-0 flex-1 cursor-not-allowed select-none items-center justify-center rounded-xl border border-slate-200 bg-slate-100 px-1 text-center text-sm font-extrabold leading-tight text-slate-400 shadow-none"
                    style={{ minHeight: ACTIONS_H, height: ACTIONS_H }}
                    role="status"
                    aria-disabled
                  >
                    Ver detalles
                  </span>
                ) : null}
              </>
            ) : (
              <>
                {tieneWhatsappValido ? (
                  <TrackedCardLink
                    slug={p.slug}
                    href={whatsappUrl || whatsappHref}
                    type="whatsapp"
                    trackingComunaSlug={p.fichaContextComunaSlug ?? null}
                    trackingEmprendedorId={p.emprendedorId ?? null}
                    className={`flex items-center justify-center rounded-xl bg-gradient-to-b from-green-500 to-green-600 text-center text-sm font-extrabold leading-tight text-white shadow-md shadow-green-600/25 ${
                      footerDosColumnas
                        ? "min-w-0 flex-1"
                        : "w-[calc(50%-4px)] max-w-[calc(50%-4px)] min-w-0 shrink-0"
                    }`}
                    style={{ minHeight: ACTIONS_H, height: ACTIONS_H }}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`WhatsApp: ${nombreDisplay}`}
                    onClick={(e) => {
                      const url = whatsappUrl || whatsappHref;
                      if (!url) return;
                      e.preventDefault();
                      const w = window.open(url, "_blank", "noopener,noreferrer");
                      if (!w) window.location.href = url;
                    }}
                  >
                    WhatsApp
                  </TrackedCardLink>
                ) : null}

                {listadoUiPerfilCompleto ? (
                  <TrackedCardLink
                    slug={p.slug}
                    href={fichaHref}
                    type="view_ficha"
                    analyticsSource={analyticsSource}
                    trackingComunaSlug={p.fichaContextComunaSlug ?? null}
                    trackingEmprendedorId={p.emprendedorId ?? null}
                    className="flex min-w-0 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm font-extrabold text-slate-700 shadow-none"
                    style={{ minHeight: ACTIONS_H, height: ACTIONS_H }}
                    aria-label={`Ver detalles: ${nombreDisplay}`}
                  >
                    Ver detalles
                  </TrackedCardLink>
                ) : null}
              </>
            )}
          </div>
        </div>
        ) : null}
      </div>
    </article>
  );
}
