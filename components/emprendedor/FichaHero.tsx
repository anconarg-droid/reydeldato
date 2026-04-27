"use client";

import type { ReactNode } from "react";
import { MapPin, Share2 } from "lucide-react";
import PortalGallery from "@/app/emprendedor/[slug]/PortalGallery";
import ShareFichaButton from "@/app/emprendedor/[slug]/ShareFichaButton";
import TrackedActionButton from "@/app/emprendedor/[slug]/TrackedActionButton";
import { posthog } from "@/lib/posthog";
import FichaComoAtiende from "@/components/emprendedor/FichaComoAtiende";
import FichaPanelSecundarios from "@/components/emprendedor/FichaPanelSecundarios";
import CopyInlineButton from "@/components/ui/CopyInlineButton";
import type { ComoAtiendeFlags } from "@/lib/emprendedorFichaUi";
import { formatDireccionLocalLinea } from "@/lib/emprendedorLocalesFichaPublica";
import { buildMapsLinks } from "@/lib/maps";
import MapasLocalesLinksTracked from "@/components/emprendedor/MapasLocalesLinksTracked";
import { normalizeAndValidateChileWhatsappStrict } from "@/utils/phone";
import { displayTitleCaseWords } from "@/lib/displayTextFormat";

function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function formatWhatsappLegible(raw?: string): string {
  const t = String(raw ?? "").trim();
  if (!t) return "";
  const strict = normalizeAndValidateChileWhatsappStrict(t);
  if (!strict.ok) return t;
  const d = strict.normalized; // 569XXXXXXXX (11 dígitos)
  // +56 9 1234 5678
  return `+56 9 ${d.slice(3, 7)} ${d.slice(7, 11)}`;
}

function buildWhatsappHrefWithSamePrefill(
  phoneRaw: string,
  primaryHrefWithText: string | null
): string | null {
  const numeroLimpio = String(phoneRaw ?? "").replace(/\D/g, "");
  if (!numeroLimpio) return null;
  if (!primaryHrefWithText) return `https://wa.me/${numeroLimpio}`;
  try {
    const u = new URL(primaryHrefWithText);
    const text = u.searchParams.get("text");
    if (!text) return `https://wa.me/${numeroLimpio}`;
    return `https://wa.me/${numeroLimpio}?text=${encodeURIComponent(text)}`;
  } catch {
    return `https://wa.me/${numeroLimpio}`;
  }
}

function MapasLocalesLinks({
  emprendedorId,
  slug,
  comunaSlug,
  localIndex,
  direccion,
  comunaNombre,
  lat,
  lng,
  enabled,
}: {
  emprendedorId: string;
  slug: string;
  comunaSlug: string | null;
  localIndex: number | null;
  direccion?: string;
  comunaNombre?: string;
  lat?: number;
  lng?: number;
  enabled: boolean;
}) {
  if (!enabled) return null;
  const maps = buildMapsLinks(direccion, comunaNombre, lat, lng);
  if (!maps) return null;
  return (
    <MapasLocalesLinksTracked
      enabled={enabled}
      emprendedorId={emprendedorId}
      slug={slug}
      comunaSlug={comunaSlug}
      localIndex={localIndex}
      wazeHref={maps.waze}
      mapsHref={maps.google}
    />
  );
}

export type BloqueUbicacionFichaProps = {
  lineaPin: string;
  lineaBase: string;
  lineaAtiendeTambien: string | null;
};

type Props = {
  emprendedorId: string;
  comunaSlug: string | null;
  slug: string;
  fotoPrincipal: string;
  galeria: string[];
  /** Debajo de la galería (columna izquierda), p. ej. descripción larga. */
  bloqueBajoGaleria?: ReactNode;
  /** Debajo del panel derecho (checklist perfil completo). */
  bloqueBajoPanel?: ReactNode;
  /** Línea superior del panel (solo si no hay `bloqueUbicacion`). */
  ubicacionLinea: string;
  /** Bajo el nombre: pin + base + opcional “Atiende también en …”. */
  bloqueUbicacion: BloqueUbicacionFichaProps | null;
  nombre: string;
  /**
   * Solo resumen corto (descripcion_corta o fallback muy breve).
   * Máx. 2–3 líneas en UI (`line-clamp-3`).
   */
  descripcionCortaPanel: string;
  atiendeEnLinea: string;
  comoAtiende: ComoAtiendeFlags;
  whatsappUrl: string | null;
  /** Número visible bajo el CTA (ej. +56…). */
  whatsappDisplay?: string;
  /** Solo ficha pública; no se usa en cards de búsqueda. */
  whatsappSecundarioUrl?: string | null;
  whatsappSecundarioDisplay?: string;
  instagramUrl: string | null;
  instagramDisplay?: string;
  webUrl: string | null;
  webDisplay?: string;
  phoneUrl: string;
  phoneLabel: string;
  emailUrl: string;
  emailDisplay?: string;
  mostrarResponsable: boolean;
  responsableNombre: string;
  /**
   * Locales desde `emprendedor_locales` (principal primero). Si hay 1 → bloque “Local”; si 2–3 → “Locales”.
   */
  localesFicha?: {
    nombre_local?: string | null;
    direccion: string;
    referencia?: string;
    comuna_nombre: string;
    comuna_slug?: string | null;
    es_principal: boolean;
    lat?: number;
    lng?: number;
  }[];
  /**
   * Solo vista previa de moderación si aún no hay filas en `emprendedor_locales`.
   * No usar dirección legacy de `emprendedores` en producción.
   */
  direccionLocal?: string;
  /** URL canónica para compartir (junto al badge Perfil completo). */
  shareUrl: string;
  /**
   * Misma regla que {@link EmprendedorSearchCard}: categoría · subcategoría (helpers de listado).
   */
  lineaTaxonomia?: string;
  /**
   * Vista previa en moderación: mismo layout que producción, sin compartir ni tracking de clicks.
   */
  moderacionVistaPrevia?: boolean;
  /**
   * Waze / Google Maps bajo cada local con dirección (solo si el negocio declara local físico en datos).
   */
  mostrarEnlacesMapas?: boolean;
};

export default function FichaHero({
  emprendedorId,
  comunaSlug,
  slug,
  fotoPrincipal,
  galeria,
  bloqueBajoGaleria,
  bloqueBajoPanel,
  ubicacionLinea,
  bloqueUbicacion,
  nombre,
  descripcionCortaPanel,
  atiendeEnLinea,
  comoAtiende,
  whatsappUrl,
  whatsappDisplay,
  whatsappSecundarioUrl = null,
  whatsappSecundarioDisplay = "",
  instagramUrl,
  instagramDisplay,
  webUrl,
  webDisplay,
  phoneUrl,
  phoneLabel,
  emailUrl,
  emailDisplay,
  mostrarResponsable,
  responsableNombre,
  localesFicha,
  direccionLocal,
  shareUrl,
  lineaTaxonomia = "",
  moderacionVistaPrevia = false,
  mostrarEnlacesMapas = false,
}: Props) {
  const nombreParaMostrar = displayTitleCaseWords(s(nombre));

  return (
    <section className="mb-6 grid grid-cols-1 items-start gap-6 lg:mb-8 lg:grid-cols-12 lg:gap-8">
      <div className="flex min-w-0 flex-col gap-6 lg:col-span-7 xl:col-span-8">
        <PortalGallery
          fotoPrincipal={fotoPrincipal}
          galeria={galeria}
          placeholderFichaCompleta={{
            delivery: comoAtiende.delivery,
            atencionDomicilio: comoAtiende.domicilio,
            legacyTerreno: comoAtiende.presencialTerrenoLegacy,
            disponibleEnComuna: Boolean(
              String(ubicacionLinea || "").trim() ||
                String(bloqueUbicacion?.lineaPin || "").trim(),
            ),
            contactoWhatsapp: Boolean(whatsappUrl),
          }}
        />
        {bloqueBajoGaleria}
      </div>

      <div className="flex min-w-0 flex-col gap-4 lg:col-span-5 xl:col-span-4 lg:max-w-[430px] lg:justify-self-end lg:self-start lg:sticky lg:top-24">
        <aside className="rounded-3xl bg-white p-6 ring-1 ring-amber-100/80 border-2 border-amber-200/90 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.25),0_0_0_1px_rgba(251,191,36,0.12)] lg:p-8">
          <div className="flex flex-col gap-4">
            {ubicacionLinea ? (
              <p className="text-[15px] font-semibold text-slate-800 m-0 leading-snug">
                {ubicacionLinea}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="inline-flex w-fit px-3 py-1.5 rounded-lg bg-amber-100/90 border border-amber-300/60 text-[11px] font-extrabold uppercase tracking-wide text-amber-950">
                Perfil completo
              </div>
              {moderacionVistaPrevia ? (
                <span className="inline-flex items-center rounded-xl border border-amber-300/70 bg-amber-50/90 px-3 py-2 text-[12px] font-bold text-amber-950">
                  Vista previa · aún no publicada
                </span>
              ) : (
                <ShareFichaButton
                  slug={slug}
                  shareUrl={shareUrl}
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-blue-600 bg-blue-600 px-4 py-2.5 text-[14px] font-extrabold text-white shadow-[0_4px_14px_-4px_rgba(37,99,235,0.55)] transition hover:bg-blue-700 hover:border-blue-700 active:scale-[0.98]"
                  style={{ cursor: "pointer" }}
                >
                  <Share2 className="h-[18px] w-[18px] shrink-0" strokeWidth={2.5} aria-hidden />
                  Compartir ficha
                </ShareFichaButton>
              )}
            </div>

            <h1 className="m-0 text-[1.85rem] font-black leading-[1.08] tracking-tight text-slate-950 lg:text-4xl">
              {nombreParaMostrar}
            </h1>

            {mostrarResponsable && s(responsableNombre) ? (
              <p className="m-0 mt-1 text-sm text-slate-500 leading-snug">
                Atendido por{" "}
                <span className="font-medium text-slate-700">
                  {displayTitleCaseWords(s(responsableNombre))}
                </span>
              </p>
            ) : null}

            {bloqueUbicacion ? (
              <div className="flex flex-col gap-1">
                <p className="m-0 text-[15px] font-semibold text-slate-800 leading-snug">
                  {bloqueUbicacion.lineaPin}
                </p>
                <p className="m-0 text-[14px] font-medium text-slate-600 leading-snug">
                  {bloqueUbicacion.lineaBase}
                </p>
                {bloqueUbicacion.lineaAtiendeTambien ? (
                  <p className="m-0 text-[14px] font-semibold text-slate-800 leading-snug">
                    {bloqueUbicacion.lineaAtiendeTambien}
                  </p>
                ) : null}
              </div>
            ) : null}

            {String(descripcionCortaPanel || "").trim() ? (
              <p className="m-0 rounded-xl border border-slate-200/90 bg-slate-50/90 px-3.5 py-3 text-[15px] font-medium leading-snug text-slate-700 line-clamp-3">
                {descripcionCortaPanel}
              </p>
            ) : null}

            {String(lineaTaxonomia || "").trim() ? (
              <p
                className="m-0 mt-1 line-clamp-2 min-h-[18px] w-full text-[11px] font-semibold uppercase leading-tight tracking-wide text-slate-400"
                title={String(lineaTaxonomia).trim()}
              >
                {String(lineaTaxonomia).trim()}
              </p>
            ) : null}

            {atiendeEnLinea ? (
              <p className="text-[15px] text-slate-800 m-0 font-semibold leading-relaxed">
                {atiendeEnLinea}
              </p>
            ) : null}

            <div className="rounded-xl border border-slate-200/85 bg-slate-50/90 px-3.5 py-3">
              <p className="m-0 mb-2 text-[11px] font-extrabold uppercase tracking-wide text-slate-600">
                Cómo atiende
              </p>
              <FichaComoAtiende flags={comoAtiende} variant="panel" />
              {localesFicha && localesFicha.length >= 2 ? (
                <div
                  className="mt-3 rounded-xl border border-slate-200/95 bg-white px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]"
                  role="group"
                  aria-label="Locales"
                >
                  <p className="m-0 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
                    Locales
                  </p>
                  <ul className="m-0 mt-2 list-none space-y-3 p-0">
                    {localesFicha.map((loc, idx) => {
                      const linea = formatDireccionLocalLinea(loc);
                      return (
                        <li
                          key={`${loc.comuna_nombre}-${idx}`}
                          className="flex gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100/90 text-amber-900 ring-1 ring-amber-200/70">
                            <MapPin
                              className="h-[18px] w-[18px]"
                              strokeWidth={2.25}
                              aria-hidden
                            />
                          </span>
                          <div className="min-w-0 flex-1 pt-0.5">
                            <p className="m-0 text-[14px] font-semibold text-slate-800 leading-snug">
                              {loc.nombre_local
                                ? `${loc.nombre_local} · `
                                : ""}
                              {loc.comuna_nombre}
                              {loc.es_principal ? (
                                <span className="ml-1.5 text-[12px] font-bold text-amber-800">
                                  (principal)
                                </span>
                              ) : null}
                            </p>
                            {linea ? (
                              <p className="m-0 mt-1 text-[13px] font-medium text-slate-600 leading-snug">
                                {linea}
                              </p>
                            ) : null}
                            <MapasLocalesLinks
                              emprendedorId={emprendedorId}
                              slug={slug}
                              comunaSlug={s(loc.comuna_slug) || comunaSlug || null}
                              localIndex={idx}
                              direccion={loc.direccion}
                              comunaNombre={loc.comuna_nombre}
                              lat={loc.lat}
                              lng={loc.lng}
                              enabled={mostrarEnlacesMapas}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
              {localesFicha && localesFicha.length === 1 ? (
                <div
                  className="mt-3 flex gap-3 rounded-xl border border-slate-200/95 bg-white px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]"
                  role="group"
                  aria-label="Local"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100/90 text-amber-900 ring-1 ring-amber-200/70">
                    <MapPin className="h-[18px] w-[18px]" strokeWidth={2.25} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="m-0 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
                      Local
                    </p>
                    <p className="m-0 mt-0.5 text-[14px] font-semibold text-slate-800 leading-snug">
                      {localesFicha[0].nombre_local
                        ? `${localesFicha[0].nombre_local} · `
                        : ""}
                      {localesFicha[0].comuna_nombre}
                    </p>
                    {formatDireccionLocalLinea(localesFicha[0]) ? (
                      <p className="m-0 mt-1 text-[13px] font-medium text-slate-600 leading-snug">
                        {formatDireccionLocalLinea(localesFicha[0])}
                      </p>
                    ) : null}
                    <MapasLocalesLinks
                      emprendedorId={emprendedorId}
                      slug={slug}
                      comunaSlug={s(localesFicha[0].comuna_slug) || comunaSlug || null}
                      localIndex={0}
                      direccion={localesFicha[0].direccion}
                      comunaNombre={localesFicha[0].comuna_nombre}
                      lat={localesFicha[0].lat}
                      lng={localesFicha[0].lng}
                      enabled={mostrarEnlacesMapas}
                    />
                  </div>
                </div>
              ) : null}
              {moderacionVistaPrevia &&
              (!localesFicha || localesFicha.length === 0) &&
              String(direccionLocal || "").trim() ? (
                <div
                  className="mt-3 flex gap-3 rounded-xl border border-slate-200/95 bg-white px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]"
                  role="group"
                  aria-label="Dirección del local"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100/90 text-amber-900 ring-1 ring-amber-200/70">
                    <MapPin className="h-[18px] w-[18px]" strokeWidth={2.25} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="m-0 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
                      Dirección del local
                    </p>
                    <p className="m-0 mt-0.5 text-[14px] font-semibold text-slate-800 leading-snug">
                      {String(direccionLocal).trim()}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="pt-1 flex flex-col gap-3">
              {whatsappUrl ? (
                <div className="rounded-2xl overflow-hidden ring-2 ring-emerald-600/20 shadow-[0_10px_40px_-12px_rgba(22,163,74,0.52)] transition-all duration-200 ease-out motion-safe:hover:ring-emerald-500/35 motion-safe:hover:shadow-[0_16px_48px_-14px_rgba(22,163,74,0.58)] motion-reduce:transition-none">
                  <TrackedActionButton
                    slug={slug}
                    type="whatsapp"
                    href={whatsappUrl}
                    label="Enviar mensaje por WhatsApp"
                    bg="#16a34a"
                    emphasis="primary"
                    disableTracking={moderacionVistaPrevia}
                    emprendedorNombre={nombreParaMostrar}
                  />
                </div>
              ) : null}
              {whatsappUrl && String(whatsappDisplay || "").trim() ? (
                <div className="mt-2 flex items-center justify-center gap-2 text-sm text-slate-600">
                  <span>{formatWhatsappLegible(whatsappDisplay)}</span>
                  <CopyInlineButton text={formatWhatsappLegible(whatsappDisplay)} />
                </div>
              ) : null}
              {String(whatsappSecundarioDisplay || "").trim() ? (
                <div className="mt-2 rounded-xl border border-slate-200/85 bg-slate-50/80 px-3 py-2.5 text-center">
                  <p className="m-0 text-xs font-semibold text-slate-500 leading-snug">
                    También puedes escribir a este número:
                  </p>
                  {(() => {
                    const href = buildWhatsappHrefWithSamePrefill(
                      whatsappSecundarioDisplay,
                      whatsappUrl
                    );
                    return href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => {
                          if (moderacionVistaPrevia) return;
                          try {
                            posthog.capture("whatsapp_click", {
                              emprendedor_slug: slug,
                              emprendedor_nombre: nombre,
                              whatsapp_variant: "secundario",
                            });
                          } catch {
                            /* noop */
                          }
                        }}
                        className="mt-2 mx-auto flex w-full max-w-md items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[14px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                        aria-label="Escribir por WhatsApp al número alternativo"
                      >
                        <span className="mr-2 text-[15px] leading-none" aria-hidden>
                          💬
                        </span>
                        Escribir por WhatsApp
                      </a>
                    ) : null;
                  })()}
                  <div className="mt-2 flex items-center justify-center gap-3 text-sm text-slate-600">
                    <span>{formatWhatsappLegible(whatsappSecundarioDisplay)}</span>
                    <CopyInlineButton text={formatWhatsappLegible(whatsappSecundarioDisplay)} />
                  </div>
                </div>
              ) : null}
            </div>

            <FichaPanelSecundarios
              slug={slug}
              instagramUrl={instagramUrl}
              instagramDisplay={instagramDisplay}
              webUrl={webUrl}
              webDisplay={webDisplay}
              phoneUrl={phoneUrl}
              phoneLabel={phoneLabel}
              emailUrl={emailUrl}
              emailDisplay={emailDisplay}
              disableTracking={moderacionVistaPrevia}
            />
          </div>
        </aside>
        {bloqueBajoPanel}
      </div>
    </section>
  );
}
