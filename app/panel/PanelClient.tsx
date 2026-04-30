"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import { displayTitleCaseWords } from "@/lib/displayTextFormat";

type Metrics = {
  impresiones: number;
  visitas: number;
  click_whatsapp: number;
  click_ficha: number;
  click_waze: number;
  click_maps: number;
};

type StatsRange = "7d" | "30d" | "all";

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

/** Solo display: no muta BD. */
function nombreNegocioDisplay(raw: string): string {
  const t = String(raw ?? "").trim();
  if (!t || t === NOMBRE_NEGOCIO_FALLBACK) return t || NOMBRE_NEGOCIO_FALLBACK;
  return displayTitleCaseWords(t);
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

function panelInsightMessage(
  apariciones: number,
  vistas: number,
  clicsWhatsApp: number
): string {
  if (apariciones < 20) {
    return "Tu negocio aún aparece poco en búsquedas.";
  }
  if (apariciones >= 20 && vistas === 0) {
    return "Tu tarjeta aparece, pero todavía no han entrado a ver tu ficha.";
  }
  if (vistas > 0 && clicsWhatsApp === 0) {
    return "Están viendo tu ficha, pero todavía no te han contactado por WhatsApp.";
  }
  if (clicsWhatsApp > 0) {
    return "Tu ficha ya está generando contactos.";
  }
  return "Tu negocio aún aparece poco en búsquedas.";
}

function MetricsResumenPanel({
  data,
  rangeLabel,
  loading = false,
  omitInsight = false,
  headerRight,
}: {
  data: Metrics;
  rangeLabel: string;
  /** Mientras carga el rango, se muestran placeholders sin cambiar la fuente de datos. */
  loading?: boolean;
  /** Si true, no renderiza la caja de insight (se muestra fuera del card, p. ej. bajo la vista previa). */
  omitInsight?: boolean;
  headerRight?: ReactNode;
}) {
  const v = (n: number) => (Number.isFinite(n) ? n : 0);
  const comoLlegar = v(data.click_waze) + v(data.click_maps);
  const apariciones = v(data.impresiones);
  const vistas = v(data.visitas);
  const clicsWhatsApp = v(data.click_whatsapp);
  const clicsInstagramWeb = v(data.click_ficha);

  const ariaResumen = `${rangeLabel}. Te encontraron ${apariciones}, vieron tu ficha ${vistas}, te contactaron ${clicsWhatsApp}. Mostraron interés: Instagram o web ${clicsInstagramWeb}, cómo llegar ${comoLlegar}.`;

  return (
    <div
      className="w-full min-w-0 rounded-xl border border-gray-200 bg-white px-3 py-4 shadow-sm sm:px-5 sm:py-5"
      title={rangeLabel}
      aria-label={ariaResumen}
    >
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <h3
              id="panel-metricas-rendimiento-titulo"
              className="text-base font-semibold tracking-tight text-gray-900"
            >
              Rendimiento de tu negocio
            </h3>
            <p
              id="panel-metricas-rendimiento-desc"
              className="text-sm leading-relaxed text-gray-500"
            >
              Cuántas veces apareciste y qué hicieron las personas.
            </p>
          </div>
          {headerRight ? <div className="shrink-0">{headerRight}</div> : null}
        </div>

        <section aria-describedby="panel-metricas-rendimiento-desc">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {loading ? (
              <>
                {[0, 1, 2].map((k) => (
                  <div
                    key={k}
                    className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-center"
                    aria-hidden
                  >
                    <div className="h-4 w-28 rounded bg-gray-200/90 animate-pulse" />
                    <div className="mt-3 h-9 w-16 rounded bg-gray-200/90 animate-pulse" />
                    <div className="mt-2 h-3 w-full max-w-[12rem] rounded bg-gray-100 animate-pulse" />
                  </div>
                ))}
              </>
            ) : (
              <>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
                  <p className="text-lg" aria-hidden>
                    🔍
                  </p>
                  <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-gray-900">
                    {apariciones}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-700">
                    Te encontraron
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
                  <p className="text-lg" aria-hidden>
                    👁
                  </p>
                  <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-gray-900">
                    {vistas}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-700">
                    Vieron tu ficha
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-200/80 bg-gray-50 p-4 text-center ring-1 ring-emerald-100/60">
                  <p className="text-lg" aria-hidden>
                    💬
                  </p>
                  <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-gray-900">
                    {clicsWhatsApp}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-700">
                    Te contactaron
                  </p>
                </div>
              </>
            )}
          </div>
        </section>

        <hr className="border-gray-200" aria-hidden />

        <section
          className="space-y-2"
          aria-label="Mostraron interés"
        >
          <div className="space-y-0.5">
            <h4 className="text-sm font-semibold text-gray-900">Mostraron interés</h4>
            <p className="text-xs leading-relaxed text-gray-500">
              Otras acciones que indican interés
            </p>
          </div>
          {loading ? (
            <div className="mt-4 space-y-3" aria-hidden>
              {[0, 1].map((k) => (
                <div key={k} className="flex justify-between gap-4">
                  <div className="h-4 flex-1 max-w-[10rem] rounded bg-gray-100 animate-pulse" />
                  <div className="h-4 w-10 rounded bg-gray-100 animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
                <p className="text-lg" aria-hidden>
                  🌐
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-gray-900">
                  {clicsInstagramWeb}
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-700">
                  Instagram / Web
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
                <p className="text-lg" aria-hidden>
                  🗺
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-gray-900">
                  {comoLlegar}
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-700">
                  Cómo llegar
                </p>
              </div>
            </div>
          )}
        </section>

        {!omitInsight ? (
          !loading ? (
            <div
              className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm leading-relaxed text-emerald-950"
              role="status"
            >
              {panelInsightMessage(apariciones, vistas, clicsWhatsApp)}
            </div>
          ) : (
            <div
              className="h-14 rounded-xl border border-green-100 bg-green-50/80 animate-pulse"
              aria-hidden
            />
          )
        ) : null}
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
        className="max-w-3xl rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 shadow-sm"
        aria-hidden
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="h-6 w-44 max-w-[55%] bg-gray-200 rounded animate-pulse" />
          <div className="h-11 w-40 bg-gray-200 rounded-xl animate-pulse" />
        </div>
        <div className="mt-3 h-3 w-full max-w-md bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }
  const pct = fichaInfo?.completitud.porcentaje;
  return (
    <div className="max-w-3xl rounded-xl border border-gray-200 bg-gray-50/90 px-4 py-3 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {typeof pct === "number" ? (
            <>
              <span className="text-base font-extrabold text-gray-900 whitespace-nowrap shrink-0 sm:text-lg">
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
            <span className="text-base font-semibold text-gray-600 sm:text-lg">
              Tu ficha
            </span>
          )}
        </div>
        <div className="flex w-full shrink-0 sm:w-auto sm:justify-end">
          <Link
            href={editarMiFichaHref}
            prefetch={false}
            className="inline-flex min-h-[44px] w-full min-w-[10rem] items-center justify-center rounded-xl px-5 text-sm font-bold bg-gray-900 text-white hover:bg-gray-800 sm:w-auto sm:px-7 sm:text-base"
          >
            Editar mi ficha
          </Link>
        </div>
      </div>
      <p className="mt-2.5 text-xs leading-snug text-gray-600 sm:text-sm max-w-xl">
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
        <li>Tu negocio seguirá visible en tu comuna</li>
        <li>Pasarás a ficha básica: solo WhatsApp y datos esenciales</li>
        <li>No podrás mostrar fotos, redes ni descripción completa</li>
      </ul>
      <p className="mt-3 text-sm text-gray-800 leading-snug">
        Puedes activar la ficha completa cuando quieras para mostrar mejor tu negocio.
      </p>
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
      className="max-w-3xl rounded-xl border border-gray-200 bg-white p-3 shadow-sm text-sm text-gray-800 sm:p-3.5"
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
        className="max-w-3xl min-h-[88px] rounded-xl bg-gray-100 animate-pulse"
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
        className="max-w-3xl rounded-xl border border-sky-200 bg-sky-50/85 p-3 shadow-sm sm:p-3.5"
        aria-label="Estado del plan"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5 text-sm text-gray-800 min-w-0">
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
      className={`max-w-3xl rounded-xl border p-3 shadow-sm sm:p-3.5 ${
        alerta
          ? "border-amber-200 bg-amber-50/90"
          : "border-emerald-200 bg-emerald-50/80"
      }`}
      aria-label="Estado del plan"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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

  useEffect(() => {
    setModoVista("completa");
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
    const raw = negocioItem
      ? nombreNegocioVisibleDesdeItem(negocioItem)
      : fichaInfo?.nombre
        ? String(fichaInfo.nombre).trim()
        : "";
    if (!raw) return NOMBRE_NEGOCIO_FALLBACK;
    return nombreNegocioDisplay(raw);
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

  /**
   * Siempre pedimos métricas a `/api/panel` mientras haya `qs`, aunque el
   * emprendedor esté en perfil básico o plan vencido: los eventos siguen
   * guardándose en el servidor y así, al reactivar, ve números reales (sin
   * “congelar” en el cliente). Solo ocultamos el bloque visual en ese caso.
   */
  useEffect(() => {
    if (!qs) {
      setData(EMPTY_METRICS);
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
  }, [qs, range]);

  const comercialSinPerfilCompleto =
    !fichaLoading &&
    comercial !== null &&
    !comercial.esPerfilCompletoComercial;

  /** Solo oculta el cuadro de estadísticas en el panel; el fetch sigue activo. */
  const estadisticasOcultasEnPanel = comercialSinPerfilCompleto;

  const metricsMostrados = data ?? EMPTY_METRICS;
  const rangoMostrado = range;

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
      <div className="w-full">
        <div className="mx-auto w-full max-w-[1120px] px-4 py-8 space-y-5">
          <PanelBrandHomeBar />
          Cargando…
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-[1120px] px-4 py-5 lg:py-8 space-y-4">
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

      <div className="grid grid-cols-1 gap-6 min-[520px]:grid-cols-[minmax(0,1fr)_minmax(320px,360px)] min-[520px]:items-start">
        <div className="min-w-0 w-full max-w-[640px] space-y-4 sm:justify-self-start">
          <div
            className="max-w-3xl rounded-xl border border-gray-200 bg-gradient-to-br from-white via-gray-50/80 to-gray-50/40 px-4 py-3 shadow-sm ring-1 ring-gray-900/[0.04] sm:px-5 sm:py-3.5"
            aria-label={`Tu negocio: ${tituloHeaderPanel}`}
          >
            <div className="shrink-0 space-y-0.5 border-b border-gray-200/80 pb-2">
              <p className="text-base font-black tracking-tight text-gray-900 sm:text-lg">
                Tu negocio
              </p>
              <p className="text-[11px] font-semibold text-gray-500 sm:text-xs">
                Gestiona tu perfil
              </p>
            </div>
            <h1 className="mt-2 min-w-0 text-pretty text-2xl font-black leading-snug text-gray-900 break-words hyphens-auto sm:text-3xl">
              {tituloHeaderPanel}
            </h1>
            {tieneNegocio && !fichaLoading && negocioItem ? (
              <div className="mt-2 space-y-1 text-sm text-gray-600">
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
                  className={`mt-2 inline-flex w-fit max-w-full rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${
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
            <div className="max-w-3xl space-y-3 rounded-xl border-2 border-amber-200/80 bg-gradient-to-br from-amber-50/95 via-white to-white p-3 shadow-sm sm:p-4">
              <div className="space-y-4">
                <BloqueCuandoTerminePlan sinCaja />
                <div className="flex w-full max-w-md flex-col items-center justify-center gap-2.5 rounded-lg border border-amber-300/50 bg-white/90 p-3 text-center shadow-inner mx-auto">
                  <p className="w-full px-1 text-center text-base font-black leading-tight text-gray-900">
                    Compara cómo te ven
                  </p>
                  <p className="w-full text-center text-[10px] font-semibold uppercase tracking-wide text-amber-900/90">
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
                  className="flex min-h-[44px] w-full items-center justify-center rounded-xl border-2 border-gray-900 bg-gray-900 px-4 text-center text-sm font-black text-white shadow-md transition hover:border-gray-800 hover:bg-gray-800"
                >
                  Mantener perfil completo
                </Link>
              ) : null}
            </div>
          ) : tieneNegocio && !fichaLoading ? (
            <div className="flex max-w-sm flex-col items-center gap-2.5 rounded-xl border border-gray-200 bg-gray-50/90 px-3 py-3 text-center mx-auto lg:mx-0 lg:max-w-3xl lg:flex-row lg:justify-center lg:gap-6">
              <p className="text-sm font-black text-gray-900">
                Compara cómo te ven
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-600">
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
                  className="block max-w-3xl text-center text-sm font-semibold text-sky-700 hover:underline sm:text-left"
                >
                  Activar por WhatsApp
                </a>
              ) : null;
            })()
          ) : null}
        </div>

        <div className="min-w-0 space-y-4 overflow-x-hidden min-[520px]:justify-self-end lg:sticky lg:top-6 lg:self-start">
          {estadisticasOcultasEnPanel ? (
            <div
              className="w-full rounded-lg border border-amber-200/90 bg-amber-50/90 px-3 py-3 text-sm leading-snug text-gray-800 sm:px-4"
              role="status"
            >
              <p className="font-semibold text-gray-900">
                Estadísticas no visibles con tu plan o perfil actual
              </p>
              <p className="mt-1.5 text-gray-700">
                Visitas, impresiones y contactos{" "}
                <span className="font-semibold">siguen registrándose</span> en
                segundo plano. Al reactivar perfil completo verás aquí el total
                real, incluido lo que ocurra mientras tanto.
              </p>
            </div>
          ) : null}
          {qs && !estadisticasOcultasEnPanel ? (
            <div className="w-full">
              <div className="flex flex-col gap-2.5">
                <MetricsResumenPanel
                  data={metricsMostrados}
                  rangeLabel={textoRangoMetricas(rangoMostrado)}
                  loading={loading}
                  omitInsight
                  headerRight={
                    <div
                      className="inline-flex max-w-full flex-wrap rounded-lg border border-gray-200 bg-white p-1 shadow-sm"
                      role="group"
                      aria-label="Periodo de estadísticas"
                    >
                      {(["7d", "30d", "all"] as const).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRange(r)}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            range === r
                              ? "bg-gray-900 text-white"
                              : "text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          {r === "7d" ? "7d" : r === "30d" ? "30d" : "Total"}
                        </button>
                      ))}
                    </div>
                  }
                />
              </div>
            </div>
          ) : null}

          <h2 className="text-sm font-extrabold tracking-tight text-gray-900">
            Así te ven en resultados
          </h2>
          {tieneNegocio ? (
            fichaLoading ? (
              <div
                className="w-full min-w-0 rounded-xl border border-gray-200 bg-gray-100 min-h-[240px] animate-pulse"
                aria-hidden
              />
            ) : previewCardProps ? (
              <div className="w-full min-w-0 space-y-2">
                {previewInformativa && negocioItem ? (
                  <div
                    role="status"
                    className="rounded-lg border border-slate-200 bg-slate-50/90 px-2.5 py-2 text-left"
                  >
                    <p className="m-0 text-[11px] font-extrabold text-slate-900">
                      Vista previa
                    </p>
                    <p className="mt-0.5 m-0 text-[10px] font-medium leading-snug text-slate-600">
                      {panelPreviewSubtituloInformativo(negocioItem)}
                    </p>
                  </div>
                ) : null}
                <div className="w-full">
                  <EmprendedorSearchCard
                    {...previewCardProps}
                    modoVista={modoVista}
                    etiquetaVerFicha="Ver ficha completa"
                  />
                </div>
              </div>
            ) : (
              <div
                className="w-full min-w-0 rounded-xl border border-gray-200 bg-gray-50 min-h-[180px] animate-pulse"
                aria-hidden
              />
            )
          ) : (
            <p className="text-sm text-gray-500 py-2">
              Enlaza tu ficha para ver la vista previa aquí.
            </p>
          )}

          {qs && !estadisticasOcultasEnPanel ? (
            !loading ? (
              <div
                className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm leading-relaxed text-emerald-950"
                role="status"
              >
                {panelInsightMessage(
                  Number.isFinite(metricsMostrados.impresiones)
                    ? metricsMostrados.impresiones
                    : 0,
                  Number.isFinite(metricsMostrados.visitas)
                    ? metricsMostrados.visitas
                    : 0,
                  Number.isFinite(metricsMostrados.click_whatsapp)
                    ? metricsMostrados.click_whatsapp
                    : 0
                )}
              </div>
            ) : (
              <div
                className="h-14 rounded-xl border border-green-100 bg-green-50/80 animate-pulse"
                aria-hidden
              />
            )
          ) : null}
        </div>
      </div>

      {tieneNegocio && !fichaLoading && negocioItem ? (
        <section
          className="space-y-3 border-t border-gray-200 pt-8 mt-6 sm:pt-10 sm:mt-8"
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
    </div>
  );
}
