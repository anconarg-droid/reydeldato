"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import EmprendedorSearchCard from "@/components/search/EmprendedorSearchCard";
import PanelBrandHomeBar from "@/components/panel/PanelBrandHomeBar";
import PanelFichaPublicaEmbed from "@/components/panel/PanelFichaPublicaEmbed";
import { SwitchModoVista } from "@/components/panel/SwitchModoVista";
import type { PerfilCompleto } from "@/lib/calcularCompletitudEmprendedor";
import type { TipoFicha } from "@/lib/calcularTipoFicha";
import type { PanelComercialPayload } from "@/lib/panelComercialPayload";
import { pareceUuidEmprendedor } from "@/lib/emprendedorLookupParam";
import {
  ESTADO_PUBLICACION,
  normalizeEstadoPublicacionDb,
} from "@/lib/estadoPublicacion";
import {
  buildPlanUi,
  PLAN_UI_LINEA_FECHAS_NO_PANEL,
  PLAN_UI_LINEA_PLAN_ACTIVO,
  PLAN_UI_TITULO_ACCESO_INICIAL,
} from "@/lib/panelEstadoPlanUi";
import {
  aplicarModoBasicoSearchCardProps,
  type ModoVistaPanel,
} from "@/lib/panelModoVista";
import {
  panelNegocioItemToSearchCardProps,
  panelSlugFichaPublicaDesdeItem,
} from "@/lib/panelItemToSearchCardProps";
import {
  panelPreviewDebeBloquearAccionesPublicas,
  panelPreviewSubtituloInformativo,
} from "@/lib/panelPreviewPublica";
import { panelPlanesVisibleEnCliente } from "@/lib/panelPlanesVisibility";

type Metrics = {
  impresiones: number;
  visitas: number;
  click_whatsapp: number;
  click_ficha: number;
  click_waze: number;
  click_maps: number;
};

type StatsRange = "7d" | "30d" | "all";

type StatsSnapshot = {
  metrics: Metrics;
  range: StatsRange;
};

const EMPTY_METRICS: Metrics = {
  impresiones: 0,
  visitas: 0,
  click_whatsapp: 0,
  click_ficha: 0,
  click_waze: 0,
  click_maps: 0,
};

function metricsFromResponse(data: unknown): Metrics | null {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return null;
  const o = row as Record<string, unknown>;
  const n = (k: string) => (typeof o[k] === "number" ? o[k] : Number(o[k]));
  if (
    !Number.isFinite(n("impresiones")) ||
    !Number.isFinite(n("visitas")) ||
    !Number.isFinite(n("click_whatsapp")) ||
    !Number.isFinite(n("click_ficha")) ||
    !Number.isFinite(n("click_waze")) ||
    !Number.isFinite(n("click_maps"))
  ) {
    return null;
  }
  return {
    impresiones: n("impresiones") as number,
    visitas: n("visitas") as number,
    click_whatsapp: n("click_whatsapp") as number,
    click_ficha: n("click_ficha") as number,
    click_waze: n("click_waze") as number,
    click_maps: n("click_maps") as number,
  };
}

function panelQuery(
  id?: string,
  slug?: string,
  accessToken?: string | null
): string | null {
  const tok = accessToken?.trim();
  if (tok) return `access_token=${encodeURIComponent(tok)}`;
  const s = slug?.trim();
  const i = id?.trim();
  if (i) return `id=${encodeURIComponent(i)}`;
  if (s) return `slug=${encodeURIComponent(s)}`;
  return null;
}

function normalizeWhatsappNumber(raw: string): string {
  return raw.replace(/\D/g, "");
}

function buildActivarFichaWhatsAppHref(slug?: string): string | null {
  const rawNumber = process.env.NEXT_PUBLIC_ACTIVAR_FICHA_WHATSAPP || "";
  const number = normalizeWhatsappNumber(rawNumber);
  if (!number) return null;

  const rawSlug = slug?.trim() ?? "";
  const negocio =
    rawSlug && !pareceUuidEmprendedor(rawSlug) ? ` (${rawSlug})` : "";
  const text = `Hola quiero activar mi ficha en Rey del Dato${negocio}`;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

type PanelEdicionContext = {
  fotoPrincipalUrl: string;
  galeriaExtraCount: number;
  descripcionCorta: string;
  descripcionLarga: string;
  instagram: string;
  web: string;
  categoriaSlug: string;
};

type PanelMejorarFichaFocus = "fotos" | "descripcion" | "redes";

const MIN_DESCRIPCION_SERVICIO_CHARS = 120;

function focusParaMejorarFicha(
  ctx: PanelEdicionContext | null
): PanelMejorarFichaFocus | null {
  if (!ctx) return null;
  const principal = ctx.fotoPrincipalUrl.trim() ? 1 : 0;
  const totalFotos = principal + ctx.galeriaExtraCount;
  if (totalFotos < 3) return "fotos";

  const corta = ctx.descripcionCorta.trim();
  const larga = ctx.descripcionLarga.trim();
  if (!corta || larga.length < MIN_DESCRIPCION_SERVICIO_CHARS)
    return "descripcion";

  if (!ctx.instagram.trim()) return "redes";

  return null;
}

function buildPanelPlanesHref(
  id?: string,
  slug?: string,
  accessToken?: string | null
): string {
  const cleanId = id?.trim();
  const cleanSlug = slug?.trim();
  const tok = accessToken?.trim();
  if (cleanId) return `/panel/planes?id=${encodeURIComponent(cleanId)}`;
  if (cleanSlug) return `/panel/planes?slug=${encodeURIComponent(cleanSlug)}`;
  if (tok)
    return `/panel/planes?access_token=${encodeURIComponent(tok)}`;
  return "/panel/planes";
}

function parsePanelMejorarFichaFocus(
  raw: string | null | undefined
): PanelMejorarFichaFocus | null {
  const v = String(raw || "").trim().toLowerCase();
  if (v === "fotos" || v === "descripcion" || v === "redes") return v;
  return null;
}

/**
 * Flujo “Editar mi ficha” → `/mejorar-ficha?…` (NegocioForm modo upgrade).
 * Opcional `focus` para alinear con `NegocioForm` (fotos | descripcion | redes).
 * Sin `id` (solo slug en URL): no hay fila en `vw`; se mantiene deep-link en `/panel`.
 */
function buildMejorarFichaHref(
  ctx: PanelEdicionContext | null,
  id?: string,
  slug?: string,
  forcedFocus?: PanelMejorarFichaFocus | null,
  accessToken?: string | null
): string {
  const cleanId = id?.trim();
  const cleanSlug = slug?.trim();
  const tok = accessToken?.trim();
  const focus = forcedFocus ?? focusParaMejorarFicha(ctx);

  if (cleanId) {
    const pub = new URLSearchParams();
    pub.set("id", cleanId);
    pub.set("origen", "panel");
    if (focus) pub.set("focus", focus);
    return `/mejorar-ficha?${pub.toString()}`;
  }

  if (tok) {
    const pub = new URLSearchParams();
    pub.set("access_token", tok);
    pub.set("origen", "panel");
    if (focus) pub.set("focus", focus);
    return `/mejorar-ficha?${pub.toString()}`;
  }

  let href = "/panel";
  if (cleanSlug) {
    href += `?slug=${encodeURIComponent(cleanSlug)}`;
  }
  if (focus) {
    const join = href.includes("?") ? "&" : "?";
    return `${href}${join}focus=${encodeURIComponent(focus)}`;
  }
  return href;
}

const NOMBRE_NEGOCIO_FALLBACK = "Tu negocio";

function nombreNegocioVisibleDesdeItem(it: Record<string, unknown>): string {
  const n = String(it.nombre_emprendimiento ?? it.nombre ?? "").trim();
  return n || NOMBRE_NEGOCIO_FALLBACK;
}

function textoRangoMetricas(range: "7d" | "30d" | "all"): string {
  if (range === "7d") {
    return "Estás viendo estadísticas de los últimos 7 días";
  }
  if (range === "30d") {
    return "Estás viendo estadísticas de los últimos 30 días";
  }
  return "Estás viendo estadísticas desde la activación de tu ficha";
}

function MetricsResumenPanel({
  data,
  rangeLabel,
}: {
  data: Metrics;
  rangeLabel: string;
}) {
  const v = (n: number) => (Number.isFinite(n) ? n : 0);
  const comoLlegar = v(data.click_waze) + v(data.click_maps);

  const bloquePrincipal = [
    {
      icon: "💬",
      label: "WhatsApp",
      value: v(data.click_whatsapp),
      hint: "Contactos iniciados por WhatsApp.",
    },
    {
      icon: "🧭",
      label: "Cómo llegar",
      value: comoLlegar,
      hint: "Clics en “Abrir en Waze” y “Ver en Maps” (suma).",
    },
  ] as const;

  const bloqueFicha = [
    {
      icon: "🔍",
      label: "Visitas al perfil",
      value: v(data.visitas),
      hint: "Veces que abrieron tu ficha pública.",
    },
    {
      icon: "👆",
      label: "Clics en tu ficha",
      value: v(data.click_ficha),
      hint: "Clics en acciones de tu ficha (contacto, web, redes, compartir, etc.).",
    },
  ] as const;

  const ariaResumen = `${rangeLabel}. Personas que interactuaron: WhatsApp ${bloquePrincipal[0].value}, Cómo llegar ${bloquePrincipal[1].value}. Interés en la ficha: visitas al perfil ${bloqueFicha[0].value}, clics en tu ficha ${bloqueFicha[1].value}.`;

  return (
    <div
      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 sm:px-4 sm:py-3.5 shadow-sm"
      title={rangeLabel}
      aria-label={ariaResumen}
    >
      <div className="space-y-5">
        <section
          className="space-y-3"
          aria-labelledby="panel-metricas-interaccion-titulo"
        >
          <h3
            id="panel-metricas-interaccion-titulo"
            className="text-center text-xs font-semibold uppercase tracking-wide text-gray-500 sm:text-left"
          >
            Personas que interactuaron con tu negocio
          </h3>
          <div className="grid grid-cols-2 justify-items-center gap-x-4 gap-y-3 text-center">
            {bloquePrincipal.map((it) => (
              <div
                key={it.label}
                className="min-w-0 max-w-[9.5rem] sm:max-w-none"
                title={it.hint}
              >
                <div className="flex items-center justify-center gap-1.5 text-gray-700">
                  <span className="text-base leading-none shrink-0" aria-hidden>
                    {it.icon}
                  </span>
                  <span className="text-[11px] sm:text-xs font-semibold leading-snug text-gray-600">
                    {it.label}
                  </span>
                </div>
                <p className="mt-1 text-lg sm:text-xl font-black tabular-nums text-gray-900 tracking-tight">
                  {it.value}
                </p>
              </div>
            ))}
          </div>
          <p className="text-center text-[11px] text-gray-500 leading-snug sm:text-left">
            Estas acciones muestran personas que tienen interés real en tu negocio.
          </p>
        </section>

        <section
          className="space-y-3 border-t border-gray-100 pt-4"
          aria-labelledby="panel-metricas-ficha-titulo"
        >
          <h3
            id="panel-metricas-ficha-titulo"
            className="text-center text-xs font-semibold uppercase tracking-wide text-gray-500 sm:text-left"
          >
            Interés en tu ficha
          </h3>
          <div className="grid grid-cols-2 justify-items-center gap-x-4 gap-y-3 text-center">
            {bloqueFicha.map((it) => (
              <div
                key={it.label}
                className="min-w-0 max-w-[9.5rem] sm:max-w-none"
                title={it.hint}
              >
                <div className="flex items-center justify-center gap-1.5 text-gray-700">
                  <span className="text-base leading-none shrink-0" aria-hidden>
                    {it.icon}
                  </span>
                  <span className="text-[11px] sm:text-xs font-semibold leading-snug text-gray-600">
                    {it.label}
                  </span>
                </div>
                <p className="mt-1 text-lg sm:text-xl font-black tabular-nums text-gray-900 tracking-tight">
                  {it.value}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function mostrarBloqueCuandoTerminePlan(
  comercial: PanelComercialPayload | null
): boolean {
  if (!comercial) return false;
  const e = comercial.estado;
  return (
    e === "trial_activo" ||
    e === "trial_por_vencer" ||
    e === "plan_activo" ||
    e === "plan_por_vencer"
  );
}

/** Porcentaje + CTA único → `/mejorar-ficha?…`. */
function BloqueFichaPctYMejorar({
  fichaLoading,
  fichaInfo,
  editarMiFichaHref,
}: {
  fichaLoading: boolean;
  fichaInfo: { completitud: PerfilCompleto } | null;
  editarMiFichaHref: string;
}) {
  if (fichaLoading) {
    return (
      <div
        className="rounded-2xl border border-gray-200 bg-gray-50 px-5 py-5 shadow-sm"
        aria-hidden
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="h-7 w-44 max-w-[55%] bg-gray-200 rounded animate-pulse" />
          <div className="h-14 w-48 bg-gray-200 rounded-xl animate-pulse" />
        </div>
        <div className="mt-4 h-4 w-full max-w-md bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }
  const pct = fichaInfo?.completitud.porcentaje;
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50/90 px-5 py-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {typeof pct === "number" ? (
            <>
              <span className="text-lg font-extrabold text-gray-900 whitespace-nowrap shrink-0">
                Tu ficha:{" "}
                <span className="tabular-nums font-black">{pct}%</span>
              </span>
              <div className="h-2 min-w-[4rem] flex-1 max-w-[10rem] rounded-full bg-gray-200 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    pct < 50
                      ? "bg-red-500"
                      : pct < 80
                        ? "bg-amber-500"
                        : "bg-green-600"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </>
          ) : (
            <span className="text-lg font-semibold text-gray-600">Tu ficha</span>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <Link
            href={editarMiFichaHref}
            prefetch={false}
            className="inline-flex min-h-[56px] min-w-[11rem] items-center justify-center rounded-xl px-7 text-base font-bold bg-gray-900 text-white hover:bg-gray-800"
          >
            Editar mi ficha
          </Link>
        </div>
      </div>
      <p className="mt-4 text-sm leading-snug text-gray-600 max-w-xl">
        Completar tu ficha puede ayudarte a recibir más contactos
      </p>
    </div>
  );
}

function BloqueCuandoTerminePlan({ sinCaja }: { sinCaja?: boolean }) {
  const contenido = (
    <>
      <h2 className="text-base font-black text-gray-900 mb-2">
        Cuando termine tu plan:
      </h2>
      <ul className="list-disc pl-4 space-y-1 text-sm text-gray-800 leading-snug">
        <li>Visible en búsquedas</li>
        <li>Pasarás a perfil básico</li>
        <li>Perfil más simple en resultados</li>
        <li>Contacto por WhatsApp</li>
      </ul>
    </>
  );

  if (sinCaja) {
    return (
      <div className="text-gray-800" aria-label="Qué pasa cuando termina tu plan">
        {contenido}
      </div>
    );
  }

  return (
    <section
      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm text-sm text-gray-800"
      aria-label="Qué pasa cuando termina tu plan"
    >
      {contenido}
    </section>
  );
}

function BloqueEstadoPlan({
  fichaLoading,
  comercial,
  planesHref,
  planesUiVisible,
}: {
  fichaLoading: boolean;
  comercial: PanelComercialPayload | null;
  planesHref: string;
  planesUiVisible: boolean;
}) {
  if (fichaLoading) {
    return (
      <div
        className="min-h-[100px] rounded-xl bg-gray-100 animate-pulse"
        aria-hidden
      />
    );
  }

  const planUi = buildPlanUi(comercial);
  const esAccesoInicial = planUi.titulo === PLAN_UI_TITULO_ACCESO_INICIAL;

  const verPlanesBtn = planesUiVisible ? (
    <Link
      href={planesHref}
      prefetch={false}
      className="inline-flex shrink-0 min-h-[44px] items-center justify-center rounded-xl px-4 text-sm font-bold bg-gray-900 text-white hover:bg-gray-800"
    >
      Ver planes
    </Link>
  ) : null;

  if (esAccesoInicial) {
    return (
      <section
        className="rounded-xl border border-sky-200 bg-sky-50/85 p-4 shadow-sm"
        aria-label="Estado del plan"
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2 text-sm text-gray-800 min-w-0">
            <h2 className="text-base font-black text-gray-900 leading-snug">
              {planUi.titulo}
            </h2>
            <p className="text-gray-700 leading-relaxed max-w-xl">
              Tu ficha está activa en esta primera etapa. Más adelante podrás
              ver y gestionar tu plan aquí.
            </p>
          </div>
          {verPlanesBtn}
        </div>
      </section>
    );
  }

  if (!comercial) return null;

  const alerta =
    comercial.estado === "trial_por_vencer" ||
    comercial.estado === "plan_por_vencer" ||
    comercial.estado === "vencido_reciente";

  const diasRestantesTexto =
    planUi.diasRestantes == null
      ? "No disponible"
      : planUi.diasRestantes <= 0
        ? "0 días"
        : `${planUi.diasRestantes} días`;

  return (
    <section
      className={`rounded-xl border p-4 shadow-sm ${
        alerta
          ? "border-amber-200 bg-amber-50/90"
          : "border-emerald-200 bg-emerald-50/80"
      }`}
      aria-label="Estado del plan"
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1 text-sm text-gray-800 min-w-0">
          <h2 className="text-base font-black text-gray-900 leading-snug">
            {planUi.titulo}
          </h2>
          {planUi.planPagadoSinFechasEnPanel ? (
            <div className="space-y-2 text-gray-700 leading-relaxed max-w-xl pt-0.5">
              <p className="font-medium text-gray-900">
                {PLAN_UI_LINEA_PLAN_ACTIVO}
              </p>
              <p>{PLAN_UI_LINEA_FECHAS_NO_PANEL}</p>
            </div>
          ) : (
            <>
              {planUi.inicio ? (
                <p>
                  <span className="text-gray-500">Inicio:</span>{" "}
                  <span className="tabular-nums font-medium">
                    {planUi.inicio}
                  </span>
                </p>
              ) : (
                <p className="text-gray-800">Inicio no disponible</p>
              )}
              <p>
                <span className="text-gray-500">Término:</span>{" "}
                <span className="tabular-nums font-medium">
                  {planUi.termino ?? "No disponible"}
                </span>
              </p>
              <p className="font-bold text-gray-900 pt-0.5">
                Te quedan:{" "}
                <span className="tabular-nums">{diasRestantesTexto}</span>
              </p>
            </>
          )}
        </div>
        {verPlanesBtn}
      </div>
    </section>
  );
}

export default function PanelClient({
  id,
  slug,
  accessToken = null,
  mejorarFichaFocus = null,
  esPremium = false,
  pagoResult = null,
}: {
  id?: string;
  slug?: string;
  /** Acceso sin `id` en URL: mismo valor que en `postulaciones_emprendedores` / `emprendedores`. */
  accessToken?: string | null;
  mejorarFichaFocus?: string | null;
  esPremium?: boolean;
  pagoResult?: "exito" | "fallo" | null;
}) {
  const focusParsed = useMemo(
    () => parsePanelMejorarFichaFocus(mejorarFichaFocus),
    [mejorarFichaFocus]
  );

  const [data, setData] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<StatsRange>("30d");
  const [fichaInfo, setFichaInfo] = useState<{
    nombre: string;
    completitud: PerfilCompleto;
  } | null>(null);
  const [tipoFichaPanel, setTipoFichaPanel] = useState<TipoFicha | null>(null);
  const [fichaLoading, setFichaLoading] = useState(false);
  const [comercial, setComercial] = useState<PanelComercialPayload | null>(
    null
  );
  const [edicionContext, setEdicionContext] =
    useState<PanelEdicionContext | null>(null);
  const [negocioItem, setNegocioItem] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [modoVista, setModoVista] = useState<ModoVistaPanel>("completa");
  const [snapshotVistaBasica, setSnapshotVistaBasica] =
    useState<StatsSnapshot | null>(null);
  const [snapshotComercial, setSnapshotComercial] =
    useState<StatsSnapshot | null>(null);
  const prevModoVistaRef = useRef<ModoVistaPanel>("completa");

  useEffect(() => {
    setModoVista("completa");
    setSnapshotVistaBasica(null);
    setSnapshotComercial(null);
    prevModoVistaRef.current = "completa";
  }, [id, slug, accessToken]);

  const qs = panelQuery(id, slug, accessToken);
  const editarMiFichaHref = buildMejorarFichaHref(
    edicionContext,
    id,
    slug,
    focusParsed,
    accessToken
  );
  const planesHref = buildPanelPlanesHref(id, slug, accessToken);
  const planesUiVisible = panelPlanesVisibleEnCliente();
  const tieneNegocio = Boolean(
    id?.trim() || slug?.trim() || accessToken?.trim()
  );

  const tituloHeaderPanel = useMemo(() => {
    if (!tieneNegocio) return NOMBRE_NEGOCIO_FALLBACK;
    if (negocioItem) return nombreNegocioVisibleDesdeItem(negocioItem);
    if (fichaInfo?.nombre) return fichaInfo.nombre;
    return NOMBRE_NEGOCIO_FALLBACK;
  }, [tieneNegocio, negocioItem, fichaInfo?.nombre]);

  /** Vista previa informativa: no enlaces operativos (WhatsApp, compartir, ver ficha). */
  const previewInformativa = useMemo(
    () => panelPreviewDebeBloquearAccionesPublicas(negocioItem),
    [negocioItem]
  );

  const estadoPanelResumen = useMemo(() => {
    if (!negocioItem) return null;
    const custom = String(negocioItem.panel_estado_resumen ?? "").trim();
    if (custom) return custom;
    const ep = normalizeEstadoPublicacionDb(
      String(negocioItem.estado_publicacion ?? "")
    );
    if (ep === ESTADO_PUBLICACION.publicado) return "Publicado";
    if (ep === ESTADO_PUBLICACION.en_revision) return "En revisión";
    if (ep === ESTADO_PUBLICACION.borrador) return "Borrador";
    if (ep === ESTADO_PUBLICACION.rechazado) return "Rechazado";
    if (ep === ESTADO_PUBLICACION.suspendido) return "Suspendido";
    return ep ? ep.replace(/_/g, " ") : null;
  }, [negocioItem]);

  const previewCardProps = useMemo(() => {
    if (!negocioItem) return null;
    const tipoReal = tipoFichaPanel ?? "basica";
    const base = panelNegocioItemToSearchCardProps(negocioItem, tipoReal, {
      urlSlugParam: slug,
    });
    const withMode = aplicarModoBasicoSearchCardProps(base, modoVista, tipoReal);
    return { ...withMode, bloquearAccesoFichaPublica: previewInformativa };
  }, [negocioItem, tipoFichaPanel, slug, modoVista, previewInformativa]);

  const slugFichaPublica = useMemo(() => {
    if (!negocioItem) return "";
    return panelSlugFichaPublicaDesdeItem(negocioItem, slug);
  }, [negocioItem, slug]);

  const perfilCompletoEnHeader = useMemo(() => {
    if (comercial) return comercial.esPerfilCompletoComercial;
    return (tipoFichaPanel ?? "basica") === "completa";
  }, [comercial, tipoFichaPanel]);

  useEffect(() => {
    const prev = prevModoVistaRef.current;
    if (prev === "completa" && modoVista === "basica" && data) {
      setSnapshotVistaBasica({
        metrics: { ...data },
        range,
      });
    }
    if (modoVista === "completa") {
      setSnapshotVistaBasica(null);
    }
    prevModoVistaRef.current = modoVista;
  }, [modoVista, data, range]);

  useEffect(() => {
    if (fichaLoading || !comercial) return;
    if (!comercial.esPerfilCompletoComercial) {
      setSnapshotComercial((prev) => {
        if (prev) return prev;
        if (!data) return prev;
        return { metrics: { ...data }, range };
      });
    } else {
      setSnapshotComercial(null);
    }
  }, [
    fichaLoading,
    comercial,
    comercial?.esPerfilCompletoComercial,
    data,
    range,
  ]);

  useEffect(() => {
    if (!qs) {
      setData(EMPTY_METRICS);
      setLoading(false);
      return;
    }

    if (modoVista === "basica") {
      setLoading(false);
      return;
    }

    if (
      comercial &&
      !comercial.esPerfilCompletoComercial &&
      snapshotComercial !== null
    ) {
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`/api/panel?${qs}&range=${encodeURIComponent(range)}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.ok) {
          const m = metricsFromResponse(res.data);
          setData(m ?? EMPTY_METRICS);
        } else {
          setData(EMPTY_METRICS);
        }
      })
      .catch(() => {
        setData(EMPTY_METRICS);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [
    qs,
    range,
    modoVista,
    comercial,
    comercial?.esPerfilCompletoComercial,
    snapshotComercial,
  ]);

  const comercialSinPerfilCompleto =
    !fichaLoading &&
    comercial !== null &&
    !comercial.esPerfilCompletoComercial;

  const { metricsMostrados, rangoMostrado, tipoCongelacionStats } =
    useMemo(() => {
      if (comercialSinPerfilCompleto && snapshotComercial) {
        return {
          metricsMostrados: snapshotComercial.metrics,
          rangoMostrado: snapshotComercial.range,
          tipoCongelacionStats: "comercial" as const,
        };
      }
      if (modoVista === "basica" && snapshotVistaBasica) {
        return {
          metricsMostrados: snapshotVistaBasica.metrics,
          rangoMostrado: snapshotVistaBasica.range,
          tipoCongelacionStats: "vista" as const,
        };
      }
      return {
        metricsMostrados: data ?? EMPTY_METRICS,
        rangoMostrado: range,
        tipoCongelacionStats: null as null,
      };
    }, [
      comercialSinPerfilCompleto,
      snapshotComercial,
      modoVista,
      snapshotVistaBasica,
      data,
      range,
    ]);

  const statsSelectorBloqueado = tipoCongelacionStats !== null;
  const rangoActivoUi = statsSelectorBloqueado ? rangoMostrado : range;

  // Métrica preparada para futuro:
  // Conversión a contacto = % de visitas que terminan en click de WhatsApp.
  // NO se muestra aún en UI porque al inicio habrá poco tráfico y el % puede ser engañoso.
  const conversionContactoOculta =
    (metricsMostrados?.visitas ?? 0) > 0
      ? Math.round(
          ((metricsMostrados?.click_whatsapp ?? 0) /
            (metricsMostrados?.visitas ?? 1)) *
            100
        )
      : 0;

  useEffect(() => {
    const cleanId = id?.trim() ?? "";
    const cleanSlug = slug?.trim() ?? "";
    const cleanTok = accessToken?.trim() ?? "";
    if (!cleanId && !cleanSlug && !cleanTok) {
      setFichaInfo(null);
      setTipoFichaPanel(null);
      setComercial(null);
      setEdicionContext(null);
      setNegocioItem(null);
      return;
    }

    const negocioQs = cleanTok
      ? `access_token=${encodeURIComponent(cleanTok)}`
      : cleanId
        ? `id=${encodeURIComponent(cleanId)}`
        : `slug=${encodeURIComponent(cleanSlug)}`;

    setFichaLoading(true);
    fetch(`/api/panel/negocio?${negocioQs}`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((res) => {
        if (res?.ok && res.item) {
          const it = res.item as Record<string, unknown>;
          const galeriaUrls = Array.isArray(it.galeriaUrls)
            ? (it.galeriaUrls as unknown[]).map((u) => String(u ?? "").trim())
            : [];
          setNegocioItem(it);
          setEdicionContext({
            fotoPrincipalUrl: String(
              it.fotoPrincipalUrl ?? it.foto_principal_url ?? ""
            ),
            galeriaExtraCount: galeriaUrls.filter(Boolean).length,
            descripcionCorta: String(
              it.descripcionCorta ?? it.frase_negocio ?? ""
            ),
            descripcionLarga: String(it.descripcionLarga ?? ""),
            instagram: String(it.instagram ?? ""),
            web: String(it.web ?? it.sitio_web ?? ""),
            categoriaSlug: String(it.categoriaSlug ?? ""),
          });
          if (res.completitud) {
            setFichaInfo({
              nombre: nombreNegocioVisibleDesdeItem(it),
              completitud: res.completitud as PerfilCompleto,
            });
          } else {
            setFichaInfo(null);
          }
          setTipoFichaPanel(
            res.tipoFicha === "completa" ? "completa" : "basica"
          );
          setComercial(
            res.comercial ? (res.comercial as PanelComercialPayload) : null
          );
        } else {
          setFichaInfo(null);
          setTipoFichaPanel(null);
          setComercial(null);
          setEdicionContext(null);
          setNegocioItem(null);
        }
      })
      .catch(() => {
        setFichaInfo(null);
        setTipoFichaPanel(null);
        setComercial(null);
        setEdicionContext(null);
        setNegocioItem(null);
      })
      .finally(() => setFichaLoading(false));
  }, [id, slug, accessToken]);

  if (loading || data === null) {
    return (
      <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-5">
        <PanelBrandHomeBar />
        Cargando…
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-5 lg:py-8 space-y-4">
      <PanelBrandHomeBar />
      {planesUiVisible && pagoResult === "exito" ? (
        <p
          className="text-sm font-bold text-emerald-800 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2"
          role="status"
        >
          Pago aprobado
        </p>
      ) : null}
      {planesUiVisible && pagoResult === "fallo" && !fichaLoading ? (
        <p
          className={`text-sm font-bold rounded-lg border px-3 py-2 ${
            comercial?.esPerfilCompletoComercial
              ? "text-sky-900 border-sky-200 bg-sky-50"
              : "text-amber-900 border-amber-200 bg-amber-50"
          }`}
          role="status"
        >
          {comercial?.esPerfilCompletoComercial
            ? "Plan activo"
            : "Pago no completado"}
        </p>
      ) : null}

      <header className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:justify-between lg:gap-6">
        <div className="min-w-0 flex-1 lg:max-w-md xl:max-w-lg">
          <div
            className="flex h-full min-h-0 flex-col gap-2.5 rounded-2xl border border-gray-200 bg-gradient-to-br from-white via-gray-50/80 to-gray-50/40 px-5 py-3 sm:gap-3 sm:px-6 sm:py-4 shadow-sm ring-1 ring-gray-900/[0.04]"
            aria-label={`Tu negocio: ${tituloHeaderPanel}`}
          >
            <div className="shrink-0 space-y-0.5 border-b border-gray-200/80 pb-2 sm:space-y-1 sm:pb-2.5">
              <p className="text-lg font-black tracking-tight text-gray-900 sm:text-xl lg:text-2xl">
                Tu negocio
              </p>
              <p className="text-xs font-semibold text-gray-500 sm:text-sm">
                Gestiona tu perfil
              </p>
            </div>
            <h1 className="min-w-0 text-pretty text-2xl font-black leading-snug text-gray-900 break-words hyphens-auto sm:text-3xl lg:text-4xl xl:text-[2.5rem] xl:leading-tight">
              {tituloHeaderPanel}
            </h1>
            {tieneNegocio && !fichaLoading && negocioItem ? (
              <div className="mt-2 space-y-1.5 text-sm text-gray-600">
                {String(negocioItem.comunaBaseNombre ?? "").trim() ? (
                  <p>
                    <span className="font-semibold text-gray-700">Comuna:</span>{" "}
                    {String(negocioItem.comunaBaseNombre).trim()}
                  </p>
                ) : null}
                {(() => {
                  const desc = String(
                    negocioItem.panel_descripcion_resumen ??
                      negocioItem.descripcionLarga ??
                      negocioItem.descripcion_libre ??
                      ""
                  ).trim();
                  if (!desc) return null;
                  const short =
                    desc.length > 240 ? `${desc.slice(0, 240)}…` : desc;
                  return (
                    <p className="text-pretty">
                      <span className="font-semibold text-gray-700">
                        Descripción:
                      </span>{" "}
                      <span className="text-gray-600">{short}</span>
                    </p>
                  );
                })()}
                {estadoPanelResumen ? (
                  <p>
                    <span className="font-semibold text-gray-700">Estado:</span>{" "}
                    <span className="text-gray-800">{estadoPanelResumen}</span>
                  </p>
                ) : null}
              </div>
            ) : null}
            {tieneNegocio ? (
              fichaLoading ? (
                <div
                  className="mt-1.5 h-7 w-[11rem] max-w-full rounded-full bg-gray-200/90 animate-pulse"
                  aria-hidden
                />
              ) : (
                <p
                  className={`mt-1.5 inline-flex w-fit max-w-full rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wide sm:text-xs ${
                    perfilCompletoEnHeader
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "border-amber-200 bg-amber-50 text-amber-950"
                  }`}
                  role="status"
                  aria-label={
                    perfilCompletoEnHeader
                      ? "Tu perfil actual es completo"
                      : "Tu perfil actual es básico"
                  }
                >
                  {perfilCompletoEnHeader
                    ? "Perfil completo"
                    : "Perfil básico"}
                </p>
              )
            ) : null}
          </div>
        </div>
        <div className="flex w-full min-w-0 flex-col items-center gap-3 lg:max-w-lg xl:max-w-xl lg:shrink-0">
          {tipoCongelacionStats ? (
            <div
              className="w-full max-w-md mx-auto text-center text-sm leading-snug text-gray-600 px-1"
              role="status"
            >
              <p className="font-medium text-gray-700">
                Activa perfil completo para ver tus resultados
              </p>
              <p className="mt-0.5 text-gray-500">
                (visitas, clics y contactos)
              </p>
            </div>
          ) : null}
          <div
            className={`relative w-full overflow-hidden ${
              tipoCongelacionStats === "vista"
                ? "rounded-xl ring-1 ring-gray-200/80"
                : ""
            }`}
          >
            <div className="flex w-full flex-col items-center gap-3">
              <div className="flex w-full justify-center">
                <div
                  className="inline-flex max-w-full flex-wrap justify-center rounded-lg border border-gray-200 bg-white p-1 shadow-sm"
                  role="group"
                  aria-label="Periodo de estadísticas"
                  aria-disabled={statsSelectorBloqueado}
                >
                  {(["7d", "30d", "all"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      disabled={statsSelectorBloqueado}
                      onClick={() => setRange(r)}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors disabled:cursor-not-allowed ${
                        rangoActivoUi === r
                          ? "bg-gray-900 text-white"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {r === "7d"
                        ? "7 días"
                        : r === "30d"
                          ? "30 días"
                          : "Desde activación"}
                    </button>
                  ))}
                </div>
              </div>
              {qs ? (
                <MetricsResumenPanel
                  data={metricsMostrados}
                  rangeLabel={textoRangoMetricas(rangoMostrado)}
                />
              ) : null}
            </div>
            {tipoCongelacionStats === "vista" ? (
              <div
                className="pointer-events-none absolute inset-0 z-10 flex items-end justify-center bg-white/45 pb-2 backdrop-blur-[4px] ring-1 ring-inset ring-gray-900/[0.06] supports-[backdrop-filter]:bg-white/35 sm:pb-3 sm:backdrop-blur-[6px]"
                aria-hidden
              >
                <span className="rounded-full border border-gray-300/80 bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-gray-700 shadow-sm backdrop-blur-sm">
                  Disponible con perfil completo
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_minmax(300px,400px)] gap-5 xl:gap-8 items-start">
        <div className="space-y-3 min-w-0">
          {tieneNegocio ? (
            <BloqueEstadoPlan
              fichaLoading={fichaLoading}
              comercial={comercial}
              planesHref={planesHref}
              planesUiVisible={planesUiVisible}
            />
          ) : null}

          {tieneNegocio &&
          !fichaLoading &&
          mostrarBloqueCuandoTerminePlan(comercial) ? (
            <div className="rounded-2xl border-2 border-amber-200/80 bg-gradient-to-br from-amber-50/95 via-white to-white p-4 sm:p-5 shadow-sm space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
                <BloqueCuandoTerminePlan sinCaja />
                <div className="flex flex-col items-center justify-center text-center gap-3 rounded-xl border border-amber-300/50 bg-white/90 p-4 sm:p-5 shadow-inner w-full max-w-sm mx-auto">
                  <p className="text-lg font-black text-gray-900 leading-tight w-full text-center px-1">
                    Compara cómo te ven
                  </p>
                  <p className="text-xs font-semibold text-amber-900/90 uppercase tracking-wide w-full text-center">
                    Completa · Básica
                  </p>
                  <SwitchModoVista
                    value={modoVista}
                    onChange={setModoVista}
                    size="prominent"
                  />
                </div>
              </div>
              {planesUiVisible ? (
                <Link
                  href={planesHref}
                  prefetch={false}
                  className="flex w-full min-h-[48px] items-center justify-center rounded-xl border-2 border-gray-900 bg-gray-900 px-4 text-center text-sm font-black text-white shadow-md transition hover:bg-gray-800 hover:border-gray-800"
                >
                  Mantener perfil completo
                </Link>
              ) : null}
            </div>
          ) : tieneNegocio && !fichaLoading ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/90 px-4 py-4 text-center max-w-sm mx-auto w-full">
              <p className="text-sm font-black text-gray-900 w-full text-center">
                Compara cómo te ven
              </p>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide w-full text-center">
                Completa · Básica
              </p>
              <SwitchModoVista
                value={modoVista}
                onChange={setModoVista}
                size="prominent"
              />
            </div>
          ) : null}

          {tieneNegocio ? (
            <BloqueFichaPctYMejorar
              fichaLoading={fichaLoading}
              fichaInfo={fichaInfo}
              editarMiFichaHref={editarMiFichaHref}
            />
          ) : null}

          {!id?.trim() && !esPremium ? (
            (() => {
              const wa = buildActivarFichaWhatsAppHref(slug);
              return wa ? (
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center text-sm font-semibold text-sky-700 hover:underline"
                >
                  Activar por WhatsApp
                </a>
              ) : null;
            })()
          ) : null}
        </div>

        <div className="min-w-0 xl:sticky xl:top-6 xl:self-start space-y-3">
          {tieneNegocio ? (
            fichaLoading ? (
              <div
                className="rounded-2xl border border-gray-200 bg-gray-100 min-h-[280px] animate-pulse"
                aria-hidden
              />
            ) : previewCardProps ? (
              <div className="max-w-[400px] mx-auto xl:mx-0 space-y-3">
                <h2 className="text-sm font-extrabold text-gray-900 tracking-tight">
                  Tu ficha en resultados de búsqueda
                </h2>
                {previewInformativa && negocioItem ? (
                  <div
                    role="status"
                    className="rounded-lg border border-slate-200 bg-slate-50/90 px-3 py-2.5 text-left"
                  >
                    <p className="m-0 text-xs font-extrabold text-slate-900">
                      Vista previa de tu ficha
                    </p>
                    <p className="mt-1 m-0 text-[11px] font-medium leading-snug text-slate-600">
                      {panelPreviewSubtituloInformativo(negocioItem)}
                    </p>
                  </div>
                ) : null}
                <EmprendedorSearchCard
                  {...previewCardProps}
                  modoVista={modoVista}
                />
              </div>
            ) : (
              <div
                className="rounded-2xl border border-gray-200 bg-gray-50 min-h-[200px] animate-pulse"
                aria-hidden
              />
            )
          ) : (
            <p className="text-sm text-gray-500 text-center xl:text-left py-4">
              Enlaza tu ficha para verla aquí.
            </p>
          )}
        </div>
      </div>

      {tieneNegocio && !fichaLoading && negocioItem ? (
        <section
          className="space-y-4 pt-10 mt-8 sm:pt-12 sm:mt-10 border-t border-gray-200"
          aria-label="Tu perfil completo en la web pública"
        >
          {modoVista === "basica" ? (
            <div className="space-y-3 max-w-2xl">
              <h2 className="text-base font-black text-gray-900 leading-tight">
                Aprovecha todo tu perfil
              </h2>
              <ul className="space-y-2 text-sm text-gray-800 leading-snug">
                <li className="flex gap-2.5 items-start">
                  <span className="text-emerald-600 font-bold shrink-0" aria-hidden>
                    ✓
                  </span>
                  <span>Muestra tu trabajo con fotos</span>
                </li>
                <li className="flex gap-2.5 items-start">
                  <span className="text-emerald-600 font-bold shrink-0" aria-hidden>
                    ✓
                  </span>
                  <span>Explicas mejor lo que haces</span>
                </li>
                <li className="flex gap-2.5 items-start">
                  <span className="text-emerald-600 font-bold shrink-0" aria-hidden>
                    ✓
                  </span>
                  <span>Más formas para que te contacten</span>
                </li>
              </ul>
              <p className="mt-4 rounded-lg border border-amber-200/90 bg-amber-50/95 px-3 py-3.5 text-base font-black leading-snug text-gray-900 shadow-sm sm:px-4 sm:py-4 sm:text-lg">
                Perfil básico = contacto solo por WhatsApp
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <h2 className="text-base font-extrabold text-gray-900">
                Tu perfil completo (página pública)
              </h2>
              <p className="text-xs text-gray-600">
                Así te ven al abrir tu ficha desde la búsqueda.
              </p>
            </div>
          )}
          <PanelFichaPublicaEmbed
            slug={slugFichaPublica}
            modoVista={modoVista}
            item={negocioItem}
            urlSlugParam={slug}
            vistaPublicaBloqueada={previewInformativa}
          />
        </section>
      ) : null}
    </div>
  );
}
