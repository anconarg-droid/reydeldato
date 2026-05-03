"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import EmprendedorSearchCard from "@/components/search/EmprendedorSearchCard";
import PanelBrandHomeBar from "@/components/panel/PanelBrandHomeBar";
import PanelFichaPublicaEmbed from "@/components/panel/PanelFichaPublicaEmbed";
import { PanelRendimientoModoBasicaPreview } from "@/components/panel/PanelRendimientoModoBasicaPreview";
import { SwitchModoVista } from "@/components/panel/SwitchModoVista";
import PanelDashboardLayoutV2 from "@/components/panel/PanelDashboardLayoutV2";
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

function textoRangoMetricas(range: StatsRange): string {
  if (range === "7d") return "Estás viendo estadísticas de los últimos 7 días";
  if (range === "30d") return "Estás viendo estadísticas de los últimos 30 días";
  return "Estás viendo estadísticas desde la activación de tu ficha";
}

function panelInsightMessage(
  apariciones: number,
  vistas: number,
  clicsWhatsApp: number
): string | null {
  if (apariciones < 20) return null;
  if (apariciones >= 20 && vistas === 0)
    return "Tu tarjeta aparece, pero todavía no han entrado a ver tu ficha.";
  if (vistas > 0 && clicsWhatsApp === 0)
    return "Están viendo tu ficha, pero todavía no te han contactado por WhatsApp.";
  if (clicsWhatsApp > 0) return "Tu ficha ya está generando contactos.";
  return null;
}

function MetricsResumenPanel({
  data,
  rangeLabel,
  loading = false,
  headerRight,
}: {
  data: Metrics;
  rangeLabel: string;
  loading?: boolean;
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
            <h3 className="text-base font-semibold tracking-tight text-gray-900">
              Rendimiento de tu negocio
            </h3>
            <p className="text-sm leading-relaxed text-gray-500">
              Cuántas veces apareciste y qué hicieron las personas.
            </p>
          </div>
          {headerRight ? <div className="shrink-0">{headerRight}</div> : null}
        </div>

        <section>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {loading ? (
              <>
                {[0, 1, 2].map((k) => (
                  <div
                    key={k}
                    className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-center"
                    aria-hidden
                  >
                    <div className="h-4 w-28 mx-auto rounded bg-gray-200/90 animate-pulse" />
                    <div className="mt-3 h-9 w-16 mx-auto rounded bg-gray-200/90 animate-pulse" />
                    <div className="mt-2 h-3 w-full max-w-[12rem] mx-auto rounded bg-gray-100 animate-pulse" />
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

        <section className="space-y-2" aria-label="Mostraron interés">
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

        {!loading ? (
          (() => {
            const insight = panelInsightMessage(
              apariciones,
              vistas,
              clicsWhatsApp
            );
            if (!insight) return null;
            return (
              <div
                className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm leading-relaxed text-emerald-950"
                role="status"
              >
                {insight}
              </div>
            );
          })()
        ) : (
          <div
            className="h-14 rounded-xl border border-green-100 bg-green-50/80 animate-pulse"
            aria-hidden
          />
        )}
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

function BloqueCuandoTerminePlan() {
  return (
    <section
      className="max-w-3xl rounded-xl border border-gray-200 bg-white p-3 shadow-sm text-sm text-gray-800 sm:p-3.5"
      aria-label="Qué pasa cuando termina tu plan"
    >
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
    </section>
  );
}

type Props = {
  id: string;
  slug: string;
  accessToken: string | null;
  mejorarFichaFocus: string | null;
  esPremium: boolean;
  pagoResult: "exito" | "fallo" | null;
};

export default function Panel1Client({
  id,
  slug,
  accessToken,
  mejorarFichaFocus,
  esPremium,
  pagoResult,
}: Props) {
  const planesUiVisible = panelPlanesVisibleEnCliente();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Metrics | null>(null);
  const [range, setRange] = useState<StatsRange>("30d");
  const [rangoMostrado, setRangoMostrado] = useState<StatsRange>("30d");

  const [fichaLoading, setFichaLoading] = useState(true);
  const [negocioItem, setNegocioItem] = useState<Record<string, unknown> | null>(null);
  const [comercial, setComercial] = useState<PanelComercialPayload | null>(null);
  const [fichaInfo, setFichaInfo] = useState<{ completitud: PerfilCompleto } | null>(
    null
  );
  const [modoVista, setModoVista] = useState<ModoVistaPanel>("completa");
  const [tipoFichaPanel, setTipoFichaPanel] = useState<TipoFicha | null>(null);

  const qs = useMemo(() => panelQuery(id, slug, accessToken), [id, slug, accessToken]);

  useEffect(() => {
    if (!qs) return;
    setLoading(true);
    void fetch(`/api/panel?${qs}&range=${encodeURIComponent(range)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const m = metricsFromResponse(j?.data ?? j);
        setData(m ?? EMPTY_METRICS);
        setRangoMostrado(range);
      })
      .catch(() => setData(EMPTY_METRICS))
      .finally(() => setLoading(false));
  }, [qs, range]);

  useEffect(() => {
    const negocioQs = qs;
    if (!negocioQs) {
      setFichaLoading(false);
      setNegocioItem(null);
      setComercial(null);
      setFichaInfo(null);
      setTipoFichaPanel(null);
      return;
    }
    setFichaLoading(true);
    void fetch(`/api/panel/negocio?${negocioQs}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const ok = Boolean(j && typeof j === "object" && (j as any).ok);
        const it = ok ? ((j as any).item as Record<string, unknown> | null) : null;
        if (it) {
          setNegocioItem(it);
          const res = j as any;
          setTipoFichaPanel(res.tipoFicha === "completa" ? "completa" : "basica");
          setComercial(res.comercial ? (res.comercial as PanelComercialPayload) : null);
          if (res.completitud) {
            setFichaInfo({ completitud: res.completitud as PerfilCompleto });
          } else {
            setFichaInfo(null);
          }
        } else {
          setNegocioItem(null);
          setComercial(null);
          setFichaInfo(null);
          setTipoFichaPanel(null);
        }
      })
      .catch(() => {
        setNegocioItem(null);
        setComercial(null);
        setFichaInfo(null);
        setTipoFichaPanel(null);
      })
      .finally(() => setFichaLoading(false));
  }, [qs]);

  const metricsMostrados = data ?? EMPTY_METRICS;
  const tituloHeaderPanel = useMemo(() => {
    const nombre = String(negocioItem?.nombre ?? negocioItem?.nombre_emprendimiento ?? "").trim();
    return nombre || "Tu negocio";
  }, [negocioItem]);

  const tieneNegocio = Boolean(negocioItem);
  const estadoPanelResumen = useMemo(() => {
    const raw = String(negocioItem?.estado_publicacion ?? "").trim();
    const n = normalizeEstadoPublicacionDb(raw);
    if (n === ESTADO_PUBLICACION.publicado) return "Publicado";
    if (n === ESTADO_PUBLICACION.en_revision) return "En revisión";
    if (n) return raw;
    return "";
  }, [negocioItem]);

  const perfilCompletoEnHeader = comercial?.esPerfilCompletoComercial === true;

  const previewInformativa = useMemo(
    () => panelPreviewDebeBloquearAccionesPublicas(negocioItem),
    [negocioItem]
  );

  const previewCardProps = useMemo(() => {
    if (!negocioItem) return null;
    const base = panelNegocioItemToSearchCardProps(
      negocioItem,
      (tipoFichaPanel ?? "basica") as "basica" | "completa"
    );
    const applied = aplicarModoBasicoSearchCardProps(
      base,
      modoVista,
      (tipoFichaPanel ?? "basica") as TipoFicha
    );
    return applied;
  }, [negocioItem, modoVista, tipoFichaPanel]);

  const slugFichaPublica = useMemo(() => {
    return negocioItem ? panelSlugFichaPublicaDesdeItem(negocioItem) : "";
  }, [negocioItem]);

  const editarMiFichaHref = useMemo(() => {
    const params = new URLSearchParams();
    const tok = accessToken?.trim();
    const i = id?.trim();
    const s = slug?.trim();
    if (tok) params.set("access_token", tok);
    else if (i) params.set("id", i);
    else if (s) params.set("slug", s);
    if (mejorarFichaFocus?.trim()) params.set("focus", mejorarFichaFocus.trim());
    const qs = params.toString();
    return qs ? `/mejorar-ficha?${qs}` : "/mejorar-ficha";
  }, [accessToken, id, slug, mejorarFichaFocus]);

  const planesHref = useMemo(() => {
    const params = new URLSearchParams();
    const tok = accessToken?.trim();
    const i = id?.trim();
    const s = slug?.trim();
    if (tok) params.set("access_token", tok);
    else if (i) params.set("id", i);
    else if (s) params.set("slug", s);
    const qs = params.toString();
    return qs ? `/panel/planes?${qs}` : "/panel/planes";
  }, [accessToken, id, slug]);

  const estadisticasOcultasEnPanel = comercial?.esPerfilCompletoComercial !== true;

  const metricasOcultasPorVistaBasica =
    !estadisticasOcultasEnPanel && modoVista === "basica";

  useEffect(() => {
    setModoVista("completa");
  }, [qs]);

  const backButton = <PanelBrandHomeBar />;

  const tuNegocio = (
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
          >
            {perfilCompletoEnHeader ? "Perfil completo" : "Perfil básico"}
          </p>
        )
      ) : null}
    </div>
  );

  const planActual = tieneNegocio ? (
    <section className="max-w-3xl rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:p-3.5">
      {(() => {
        if (fichaLoading) {
          return (
            <div className="min-h-[88px] rounded-xl bg-gray-100 animate-pulse" aria-hidden />
          );
        }
        const planUi = buildPlanUi(comercial);
        const esAccesoInicial = planUi.titulo === PLAN_UI_TITULO_ACCESO_INICIAL;
        if (esAccesoInicial) {
          return (
            <div className="space-y-1.5 text-sm text-gray-800 min-w-0">
              <h2 className="text-base font-black text-gray-900 leading-snug">
                {planUi.titulo}
              </h2>
              <p className="text-gray-700 leading-relaxed">
                Tu ficha está activa en esta primera etapa. Más adelante podrás ver y
                gestionar tu plan aquí.
              </p>
            </div>
          );
        }
        if (!comercial) return null;
        const lineas = [
          PLAN_UI_LINEA_PLAN_ACTIVO,
          PLAN_UI_LINEA_FECHAS_NO_PANEL,
        ].filter(Boolean);
        return (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1.5 text-sm text-gray-800 min-w-0">
              <h2 className="text-base font-black text-gray-900 leading-snug">
                {planUi.titulo}
              </h2>
              {lineas.map((t, idx) => (
                <p key={idx} className="m-0 text-gray-700 leading-relaxed">
                  {t}
                </p>
              ))}
            </div>
            {planesUiVisible ? (
              <Link
                href={planesHref}
                prefetch={false}
                className="inline-flex shrink-0 min-h-[44px] items-center justify-center rounded-xl px-4 text-sm font-bold bg-gray-900 text-white hover:bg-gray-800"
              >
                Ver planes
              </Link>
            ) : null}
          </div>
        );
      })()}
    </section>
  ) : null;

  const progresoFicha = tieneNegocio ? (
    <div className="max-w-3xl rounded-xl border border-gray-200 bg-gray-50/90 px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 text-sm font-black text-gray-900">
          Tu ficha:{" "}
          {typeof fichaInfo?.completitud.porcentaje === "number"
            ? `${Math.max(0, Math.min(100, Math.round(fichaInfo.completitud.porcentaje)))}%`
            : "—"}
        </p>
        <Link
          href={editarMiFichaHref}
          prefetch={false}
          className="inline-flex min-h-[44px] w-full min-w-[10rem] items-center justify-center rounded-xl px-5 text-sm font-bold bg-gray-900 text-white hover:bg-gray-800 sm:w-auto sm:px-7 sm:text-base"
        >
          Editar mi ficha
        </Link>
      </div>
      <p className="mt-2.5 text-xs leading-snug text-gray-600 sm:text-sm max-w-xl">
        Completar tu ficha puede ayudarte a recibir más contactos
      </p>
    </div>
  ) : null;

  const cuandoTerminePlan =
    tieneNegocio && !fichaLoading && mostrarBloqueCuandoTerminePlan(comercial) ? (
      <div className="max-w-3xl space-y-3 rounded-xl border-2 border-amber-200/80 bg-gradient-to-br from-amber-50/95 via-white to-white p-3 shadow-sm sm:p-4">
        <BloqueCuandoTerminePlan />
        <div className="flex w-full max-w-md flex-col items-center justify-center gap-2.5 rounded-lg border border-amber-300/50 bg-white/90 p-3 text-center shadow-inner mx-auto">
          <p className="w-full px-1 text-center text-base font-black leading-tight text-gray-900">
            Compara cómo te ven
          </p>
          <p className="w-full text-center text-[10px] font-semibold uppercase tracking-wide text-amber-900/90">
            Completa · Básica
          </p>
          <SwitchModoVista value={modoVista} onChange={setModoVista} size="prominent" />
        </div>
      </div>
    ) : null;

  const rendimiento = qs && !estadisticasOcultasEnPanel ? (
    metricasOcultasPorVistaBasica ? (
      <PanelRendimientoModoBasicaPreview />
    ) : (
      <MetricsResumenPanel
        data={metricsMostrados}
        rangeLabel={textoRangoMetricas(rangoMostrado)}
        loading={loading}
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
                  range === r ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {r === "7d" ? "7d" : r === "30d" ? "30d" : "Total"}
              </button>
            ))}
          </div>
        }
      />
    )
  ) : (
    <div
      className="w-full rounded-lg border border-amber-200/90 bg-amber-50/90 px-3 py-3 text-sm leading-snug text-gray-800 sm:px-4"
      role="status"
    >
      <p className="font-semibold text-gray-900">
        Estadísticas no visibles con tu plan o perfil actual
      </p>
      <p className="mt-1.5 text-gray-700">
        Visitas, impresiones y contactos{" "}
        <span className="font-semibold">siguen registrándose</span> en segundo plano.
        Al reactivar perfil completo verás aquí el total real, incluido lo que ocurra
        mientras tanto.
      </p>
    </div>
  );

  const previewBusqueda = (
    <div className="space-y-2">
      <h2 className="text-sm font-extrabold tracking-tight text-gray-900">
        Así te ven en resultados
      </h2>
      {tieneNegocio ? (
        fichaLoading ? (
          <div
            className="w-full max-w-[360px] mx-auto rounded-xl border border-gray-200 bg-gray-100 min-h-[240px] animate-pulse"
            aria-hidden
          />
        ) : previewCardProps ? (
          <div className="w-full max-w-[360px] mx-auto space-y-2">
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
            <EmprendedorSearchCard
              {...previewCardProps}
              modoVista={modoVista}
              etiquetaVerFicha="Ver ficha completa"
            />
          </div>
        ) : (
          <div
            className="w-full max-w-[360px] mx-auto rounded-xl border border-gray-200 bg-gray-50 min-h-[180px] animate-pulse"
            aria-hidden
          />
        )
      ) : (
        <p className="text-sm text-gray-500 py-2">
          Enlaza tu ficha para ver la vista previa aquí.
        </p>
      )}
    </div>
  );

  const perfilPublico =
    tieneNegocio && !fichaLoading && negocioItem ? (
      <section aria-label="Tu perfil completo en la web pública">
        <div className="space-y-1">
          <h2 className="text-base font-extrabold text-gray-900">
            Tu perfil completo (página pública)
          </h2>
          <p className="text-xs text-gray-600">
            Así te ven al abrir tu ficha desde la búsqueda.
          </p>
        </div>
        <PanelFichaPublicaEmbed
          slug={slugFichaPublica}
          modoVista={modoVista}
          item={negocioItem}
          urlSlugParam={slug}
          vistaPublicaBloqueada={previewInformativa}
        />
      </section>
    ) : null;

  return (
    <PanelDashboardLayoutV2
      backButton={backButton}
      tuNegocio={
        <div className="space-y-3">
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
              {comercial?.esPerfilCompletoComercial ? "Plan activo" : "Pago no completado"}
            </p>
          ) : null}
          {tuNegocio}
        </div>
      }
      planActual={planActual}
      progresoFicha={progresoFicha}
      cuandoTerminePlan={cuandoTerminePlan}
      rendimiento={rendimiento}
      previewBusqueda={previewBusqueda}
      perfilPublico={perfilPublico}
    />
  );
}

