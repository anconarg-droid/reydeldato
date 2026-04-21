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
  isPerfilCompletoCard,
  tieneModalidadLocalFisicoEnChips,
} from "@/lib/search/emprendedorSearchCardHelpers";
import { buildListadoPinUbicacionComuna } from "@/lib/search/listadoPinUbicacionComuna";
import { slugify } from "@/lib/slugify";

export type EmprendedorSearchCardProps = {
  slug: string;
  nombre: string;
  fotoPrincipalUrl: string;
  whatsappPrincipal: string;
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
    if (regiones.length === 1) return `Atiende: ${regiones[0]}`;
    return `Atiende: ${regiones[0]} +${regiones.length - 1}`;
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

function capitalizeFirstLetter(s: string) {
  const t = String(s ?? "");
  if (!t.trim()) return t;
  // Capitaliza el primer caracter no-espacio, preservando el prefijo de espacios.
  return t.replace(/^(\s*)(\S)/, (_, ws: string, ch: string) => `${ws}${ch.toUpperCase()}`);
}

function formatDireccionCardDisplay(raw: string): string {
  const t = String(raw ?? "");
  if (!t.trim()) return slotOrSpace("");
  return t
    .split(/\r?\n/)
    .map((ln) => capitalizeFirstLetter(ln.trim()))
    .join("\n");
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
  const perfilCompleto = isPerfilCompletoCard(p);
  const esIntermedio = perfilIntermedioListadoPorTexto(p);

  const modalidadChips = getModalidadesChips({ modalidadesCardBadges: p.modalidadesCardBadges });
  const tieneLocalFisico =
    tieneModalidadLocalFisicoEnChips(modalidadChips) ||
    Boolean(String(p.resumenLocalesLinea ?? "").trim()) ||
    Boolean(String(p.localFisicoComunaNombre ?? "").trim());
  const modalidadesLimitadas = getModalidadesLimitadas(modalidadChips);

  const lineaTaxonomia = getLineaTaxonomiaCard(p);
  const coberturaTxt = getCoberturaTextoUnificado({
    comunas_cobertura: p.comunasCobertura ?? null,
    regiones_cobertura: p.regionesCobertura ?? null,
    comuna: p.comunaBaseNombre ?? null,
  });

  const direccionTxt = getDireccionCard({
    esPerfilCompletoListado: perfilCompleto,
    resumenLocalesLinea: p.resumenLocalesLinea,
    localFisicoComunaNombre: p.localFisicoComunaNombre ?? null,
    tieneModalidadLocalFisico: tieneLocalFisico,
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
    ? capitalizeFirstLetter(nombreRaw)
    : "Emprendimiento";
  const fotoUrl = String(p.fotoPrincipalUrl || "").trim();
  const [imgBroken, setImgBroken] = useState(false);
  const mostrarFoto = urlTieneFotoListado(fotoUrl) && !imgBroken;

  const comunaBuscadaTrim = String(p.comunaBuscadaNombre || "").trim();
  const buscadaSlugCtx = slugify(String(p.fichaContextComunaSlug ?? "").trim());
  const tieneContextoComunaBuscada = Boolean(
    buscadaSlugCtx && (String(p.fichaContextComunaNombre ?? "").trim() || comunaBuscadaTrim)
  );
  const showAtiendeComunaBadge =
    !tieneContextoComunaBuscada &&
    p.bloqueTerritorial === "atienden_tu_comuna" &&
    comunaBuscadaTrim.length > 0;
  const territorialLabel =
    p.bloqueTerritorial === "de_tu_comuna"
      ? "De tu comuna"
      : p.bloqueTerritorial === "atienden_tu_comuna" && !showAtiendeComunaBadge
        ? "Atiende tu comuna"
        : null;

  const showTerritorialStatusChips = perfilCompleto && (territorialLabel || p.disponibleHoy === true);
  const showCoberturaStatusRow = showAtiendeComunaBadge || showTerritorialStatusChips;

  const analyticsSource = p.analyticsSource ?? "search";
  const destacarListado = p.destacarMejoresOpciones === true;

  /** Dos columnas solo con perfil completo (WhatsApp + Ver detalles). Sin completo: WhatsApp mismo ancho que cada CTA del completo, centrado en la fila. */
  const footerDosColumnas = perfilCompleto;

  const idleShadow = perfilCompleto
    ? "0 6px 22px rgba(15, 118, 110, 0.14), 0 2px 10px rgba(15, 23, 42, 0.05), 0 0 0 1px rgba(15, 118, 110, 0.08)"
    : "none";
  const hoverShadow = perfilCompleto
    ? "0 12px 32px rgba(15, 118, 110, 0.18), 0 4px 14px rgba(15, 23, 42, 0.07)"
    : "0 2px 8px rgba(15, 23, 42, 0.06)";
  const idleShadowListado = destacarListado
    ? `${idleShadow}, 0 0 0 2px #ffffff, 0 0 0 5px rgba(2, 132, 199, 0.4), 0 12px 36px rgba(2, 132, 199, 0.12)`
    : idleShadow;
  const hoverShadowListado = destacarListado
    ? `${hoverShadow}, 0 0 0 2px #ffffff, 0 0 0 5px rgba(2, 132, 199, 0.52), 0 18px 48px rgba(2, 132, 199, 0.18)`
    : hoverShadow;

  const [hovered, setHovered] = useState(false);
  const cardShadow = hovered ? hoverShadowListado : idleShadowListado;

  const titleColor = perfilCompleto
    ? "text-neutral-950"
    : vistaBasicaPanel
      ? "text-slate-700"
      : esIntermedio
        ? "text-slate-700"
        : "text-slate-600";
  const titleFontClass = perfilCompleto ? "font-bold" : "font-semibold";

  const chipBase =
    "inline-flex max-w-full shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-bold leading-tight tracking-wide";

  const categoriaDisplay = slotOrSpace(lineaTaxonomia);
  const descDisplay = slotOrSpace(capitalizeFirstLetter(descTextRaw));
  const coberturaDisplay = slotOrSpace(coberturaTxt);
  const direccionLineas = String(direccionTxt ?? "")
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
  const direccionDisplayMultilinea = formatDireccionCardDisplay(direccionTxt);
  const direccionMinHRem =
    direccionLineas.length >= 3 ? 4.125 : direccionLineas.length === 2 ? 2.75 : 1.375;

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
        direccionTxt,
        direccionLineas,
        direccionDisplayMultilinea,
        tieneLocalFisico,
        perfilCompleto,
      });
      if (!String(p.categoriaNombre ?? "").trim() && !(p.subcategoriasNombres?.length || p.subcategoriasSlugs?.length)) {
        // eslint-disable-next-line no-console
        console.log("[card-debug] categoria/sub vacías: item no trae taxonomía");
      }
      if (!String(direccionTxt ?? "").trim()) {
        // eslint-disable-next-line no-console
        console.log("[card-debug] dirección vacía: revisar locales/modalidades/plan", {
          resumenLocalesLinea: p.resumenLocalesLinea,
          localFisicoComunaNombre: p.localFisicoComunaNombre,
          tieneLocalFisico,
          perfilCompleto,
        });
      }
    }
  }

  return (
    <article
      className={`flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border bg-white ${
        perfilCompleto ? "border-[#0f766e]" : "border-slate-200"
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
        className={`flex min-h-0 min-w-0 flex-1 flex-col p-3 ${
          perfilCompleto ? "bg-white" : vistaBasicaPanel ? "bg-white" : esIntermedio ? "bg-slate-50" : "bg-white"
        }`}
      >
        {/* Imagen: altura fija en todas las cards */}
        <div className="relative h-40 w-full shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-44">
          {mostrarFoto ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fotoUrl}
                alt=""
                className="block h-full w-full object-cover"
                loading="lazy"
                onError={() => setImgBroken(true)}
              />
              {perfilCompleto ? (
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/35 via-transparent to-transparent"
                  aria-hidden
                />
              ) : null}
            </>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 px-3 text-center">
              <span
                className={`text-xs font-extrabold tracking-wide ${
                  perfilCompleto ? "text-slate-600" : esIntermedio ? "text-slate-500" : "text-slate-400"
                }`}
              >
                Sin imágenes
              </span>
              <span className="line-clamp-3 max-w-[11rem] text-[11px] font-medium leading-snug text-slate-400">
                {getPlaceholderSinFotoSub()}
              </span>
            </div>
          )}

          {perfilCompleto ? (
            <div className="pointer-events-none absolute bottom-2 left-2">
              <span className="rounded-full bg-[#0f766e] px-3 py-1.5 text-[11px] font-bold tracking-wide text-white shadow-sm">
                Perfil completo
              </span>
            </div>
          ) : null}

          {p.esNuevo === true ? (
            <div className="pointer-events-none absolute top-2 right-2">
              <span className="rounded-full border border-slate-200 bg-white/95 px-2.5 py-0.5 text-[10px] font-extrabold tracking-wide text-slate-700 shadow-sm">
                Nuevo
              </span>
            </div>
          ) : null}
        </div>

        {/* Cuerpo: crece; reserva footer abajo */}
        <div className="mt-2 flex min-h-0 min-w-0 flex-1 flex-col gap-1.5">
          <h3
            className={`m-0 line-clamp-2 min-h-[2.75rem] w-full shrink-0 text-base leading-snug ${titleFontClass} ${titleColor}`}
          >
            {nombreDisplay}
          </h3>

          <p className="m-0 line-clamp-3 min-h-[3.75rem] w-full shrink-0 text-sm font-medium leading-snug text-slate-700">
            {descDisplay}
          </p>

          <p
            className="m-0 line-clamp-2 min-h-[2rem] w-full shrink-0 text-[11px] font-semibold uppercase leading-tight tracking-wide text-gray-400"
            title={lineaTaxonomia.trim() || undefined}
          >
            {lineaTaxonomia.trim() ? lineaTaxonomia.trim() : " "}
          </p>

          <p className="m-0 min-h-[1rem] w-full shrink-0 text-[11px] leading-tight text-slate-500">
            {confianzaTexto || " "}
          </p>

          <p className="m-0 min-h-[1.375rem] w-full shrink-0 truncate text-sm font-medium leading-tight text-slate-800">
            <span aria-hidden>📍 </span>
            {pinUbicacion.primary}
          </p>
          {pinUbicacion.secondary ? (
            <p className="m-0 min-h-[1rem] w-full shrink-0 truncate text-[11px] leading-tight text-slate-500">
              {pinUbicacion.secondary}
            </p>
          ) : null}

          <p
            className="m-0 line-clamp-2 min-h-[2.5rem] w-full shrink-0 text-sm leading-snug text-slate-500"
            title={coberturaTxt.trim() || undefined}
          >
            {coberturaDisplay}
          </p>

          <div
            className="flex min-h-[32px] w-full shrink-0 flex-nowrap items-center gap-1.5 overflow-hidden"
            aria-hidden={!showCoberturaStatusRow}
          >
            {showCoberturaStatusRow ? (
              <>
                {showAtiendeComunaBadge ? (
                  <span
                    className={`${chipBase} max-h-7 border border-blue-200 bg-blue-50 text-blue-800`}
                    title={`Atiende ${comunaBuscadaTrim}`}
                  >
                    Atiende {comunaBuscadaTrim}
                  </span>
                ) : null}
                {territorialLabel ? (
                  <span
                    className={`${chipBase} max-h-7 border ${
                      p.bloqueTerritorial === "de_tu_comuna"
                        ? "border-teal-200 bg-teal-50 text-teal-900"
                        : "border-blue-200 bg-blue-50 text-blue-800"
                    }`}
                  >
                    {territorialLabel}
                  </span>
                ) : null}
                {p.disponibleHoy === true && perfilCompleto ? (
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
            className="flex min-h-[32px] max-h-[32px] w-full shrink-0 flex-wrap content-start items-center gap-1 overflow-hidden"
            aria-label="Forma de atención"
          >
            {modalidadesLimitadas.length > 0 ? (
              <>
                {modalidadesLimitadas.map((label, idx) => {
                  const isMas = String(label).trim().startsWith("+");
                  return (
                    <span
                      key={`${idx}-${label}`}
                      className={`${chipBase} max-h-7 border ${
                        isMas
                          ? perfilCompleto
                            ? "border-gray-200 bg-gray-200/80 text-gray-600"
                            : "border-gray-200 bg-gray-100 text-gray-500"
                          : perfilCompleto
                            ? "border-gray-200 bg-gray-100 text-gray-600"
                            : "border-gray-200 bg-gray-100 text-gray-500"
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

          <div
            className="w-full shrink-0"
            style={{ minHeight: `${direccionMinHRem}rem` }}
          >
            {direccionLineas.length > 1 ? (
              <div
                className="m-0 line-clamp-4 whitespace-pre-line text-sm leading-snug text-slate-700"
                title={direccionTxt.trim() || undefined}
              >
                {direccionDisplayMultilinea.trim() ? direccionDisplayMultilinea : " "}
              </div>
            ) : (
              <p
                className="m-0 truncate text-sm leading-tight text-slate-700"
                title={direccionTxt.trim() || undefined}
              >
                {slotOrSpace(direccionDisplayMultilinea)}
              </p>
            )}
          </div>
        </div>

        {tieneWhatsappValido || perfilCompleto ? (
        <div
          className={`mt-auto w-full shrink-0 border-t pt-3 ${
            perfilCompleto ? "border-slate-300/40" : "border-slate-200"
          }`}
        >
          {!perfilCompleto && tieneWhatsappValido ? (
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
                {perfilCompleto ? (
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

                {perfilCompleto ? (
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
