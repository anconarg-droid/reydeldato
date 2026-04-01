"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { PerfilCompleto } from "@/lib/calcularCompletitudEmprendedor";
import type { TipoFicha } from "@/lib/calcularTipoFicha";
import {
  panelInsightCase,
  type PanelInsightCase,
} from "@/lib/panelInsightCase";

type Metrics = {
  impresiones: number;
  visitas: number;
  click_whatsapp: number;
  click_ficha: number;
};

const EMPTY_METRICS: Metrics = {
  impresiones: 0,
  visitas: 0,
  click_whatsapp: 0,
  click_ficha: 0,
};

/** API puede devolver `data` como objeto o como array de una fila. */
function metricsFromResponse(data: unknown): Metrics | null {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return null;
  const o = row as Record<string, unknown>;
  const n = (k: string) => (typeof o[k] === "number" ? o[k] : Number(o[k]));
  if (
    !Number.isFinite(n("impresiones")) ||
    !Number.isFinite(n("visitas")) ||
    !Number.isFinite(n("click_whatsapp")) ||
    !Number.isFinite(n("click_ficha"))
  ) {
    return null;
  }
  return {
    impresiones: n("impresiones") as number,
    visitas: n("visitas") as number,
    click_whatsapp: n("click_whatsapp") as number,
    click_ficha: n("click_ficha") as number,
  };
}

function panelQuery(id?: string, slug?: string): string | null {
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

  const negocio = slug?.trim() ? ` (${slug.trim()})` : "";
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

/**
 * Prioridad para ?focus= en /mejorar-ficha (solo esos tres; sin categoría en query).
 * Categoría u otras mejoras: mismo enlace sin focus.
 */
function focusParaMejorarFicha(
  ctx: PanelEdicionContext | null
): PanelMejorarFichaFocus | null {
  if (!ctx) return null;
  const principal = ctx.fotoPrincipalUrl.trim() ? 1 : 0;
  const totalFotos = principal + ctx.galeriaExtraCount;
  if (totalFotos < 2) return "fotos";

  const corta = ctx.descripcionCorta.trim();
  const larga = ctx.descripcionLarga.trim();
  if (!corta || larga.length < 120) return "descripcion";

  if (!ctx.instagram.trim() && !ctx.web.trim()) return "redes";

  return null;
}

function buildMejorarFichaHref(
  ctx: PanelEdicionContext | null,
  id?: string,
  slug?: string
): string {
  const cleanId = id?.trim();
  const cleanSlug = slug?.trim();
  let href = "/mejorar-ficha";
  if (cleanId) href += `?id=${encodeURIComponent(cleanId)}`;
  else if (cleanSlug) href += `?slug=${encodeURIComponent(cleanSlug)}`;

  const focus = focusParaMejorarFicha(ctx);
  if (!focus) return href;

  const join = href.includes("?") ? "&" : "?";
  return `${href}${join}focus=${encodeURIComponent(focus)}`;
}

function businessNameFromSlug(slug?: string): string {
  const raw = (slug || "").trim();
  if (!raw) return "Tu negocio";
  const words = raw.split(/[-_]+/g).filter(Boolean);
  const label = words
    .slice(0, 3)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return label || "Tu negocio";
}

function parseInsightCaseFromPayload(data: unknown): PanelInsightCase | null {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return null;
  const ic = (row as Record<string, unknown>).insight_case;
  if (ic === "A" || ic === "B" || ic === "C" || ic === "D") return ic;
  return null;
}

const CHECKLIST_AYUDA_CORTA = [
  "Subir más fotos",
  "Completar descripción",
  "Mostrar Instagram o sitio web",
] as const;

const CTA_MEJORAR_PERFIL = "Mejorar mi perfil para recibir más clientes";

const COPY_PERFIL_BASICO_FUERTE = {
  lead: "Tu perfil no está aprovechando todo su potencial.",
  body1: "Los negocios con fotos y descripción clara reciben más contactos.",
  body2:
    "Si completas tu perfil, puedes aumentar la cantidad de personas que te escriben.",
};

function FichaEstadoBloque({
  fichaLoading,
  fichaInfo,
  tipoFichaPanel,
}: {
  fichaLoading: boolean;
  fichaInfo: { nombre: string; completitud: PerfilCompleto } | null;
  tipoFichaPanel: TipoFicha | null;
}) {
  if (fichaLoading) {
    return (
      <p className="text-sm text-gray-600">Cargando estado de tu ficha…</p>
    );
  }
  if (!fichaInfo) {
    return (
      <p className="text-sm text-gray-600">
        La edición desde este panel estará disponible pronto.
        <br />
        Por ahora, este acceso no forma parte del flujo principal.
      </p>
    );
  }
  return (
    <>
      <p className="text-base font-semibold text-gray-900">{fichaInfo.nombre}</p>

      {tipoFichaPanel === "completa" ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-4 space-y-1">
          <p className="text-base font-bold text-gray-900">Tu perfil está completo</p>
          <p className="text-sm text-gray-700 leading-relaxed">
            Ya muestras más información antes del contacto.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-4 space-y-3">
          <p className="text-base font-bold text-gray-900">
            {COPY_PERFIL_BASICO_FUERTE.lead}
          </p>
          <p className="text-sm text-gray-800 leading-relaxed">
            {COPY_PERFIL_BASICO_FUERTE.body1}
          </p>
          <p className="text-sm text-gray-800 leading-relaxed">
            {COPY_PERFIL_BASICO_FUERTE.body2}
          </p>
          <p className="text-sm font-semibold text-gray-900 pt-1">
            Lo que más te puede ayudar ahora:
          </p>
          <div className="text-sm text-gray-800 space-y-0.5">
            {CHECKLIST_AYUDA_CORTA.map((t) => (
              <p key={t}>{t}</p>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-sm pt-1">
        <span className="font-semibold text-gray-800">
          {fichaInfo.completitud.porcentaje}% completa
        </span>
        {fichaInfo.completitud.baseMinimaLista ? (
          <span className="rounded-full bg-emerald-50 text-emerald-800 px-2.5 py-0.5 text-xs font-semibold">
            Base esencial lista
          </span>
        ) : (
          <span className="rounded-full bg-amber-50 text-amber-900 px-2.5 py-0.5 text-xs font-semibold">
            Falta algo esencial
          </span>
        )}
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            fichaInfo.completitud.porcentaje < 50
              ? "bg-red-500"
              : fichaInfo.completitud.porcentaje < 80
                ? "bg-amber-500"
                : "bg-green-600"
          }`}
          style={{ width: `${fichaInfo.completitud.porcentaje}%` }}
        />
      </div>
      <p className="text-sm text-gray-700 leading-relaxed">
        {fichaInfo.completitud.mensajeProgreso}
      </p>
    </>
  );
}

function interpretationCopy(c: PanelInsightCase, m: Metrics): string {
  if (c === "A") {
    return `Tu perfil está funcionando 🤞 ${m.visitas} personas entraron a tu perfil y ${m.click_whatsapp} te contactaron.

👉 Puedes aumentar esos contactos mejorando tu perfil.`;
  }
  if (c === "B") {
    return "Muchas personas ven tu negocio, pero pocas entran a tu perfil. Puedes mejorar tu nombre o descripción para atraer más clientes.";
  }
  if (c === "C") {
    return `Las personas están entrando a tu perfil, pero no están contactando. Agregar fotos reales y más información puede generar más confianza.

Hay personas que ven tu perfil pero no te escriben. Puedes convertir más visitas en clientes.`;
  }
  return "Tu negocio aún no está generando visitas. Completa tu perfil para empezar a recibir contactos.";
}

export default function PanelClient({
  id,
  slug,
  esPremium = false,
}: {
  /** UUID del emprendedor (cualquiera de id o slug sirve). */
  id?: string;
  slug?: string;
  /** Si no pasas, se asume no premium (mensaje de upgrade). */
  esPremium?: boolean;
}) {
  const [data, setData] = useState<Metrics | null>(null);
  const [insightCase, setInsightCase] = useState<PanelInsightCase>("D");
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<"7d" | "30d" | "all">("30d");
  const [fichaInfo, setFichaInfo] = useState<{
    nombre: string;
    completitud: PerfilCompleto;
  } | null>(null);
  const [tipoFichaPanel, setTipoFichaPanel] = useState<TipoFicha | null>(null);
  const [fichaLoading, setFichaLoading] = useState(false);
  const [edicionContext, setEdicionContext] =
    useState<PanelEdicionContext | null>(null);

  const qs = panelQuery(id, slug);
  const mejorarFichaHref = buildMejorarFichaHref(edicionContext, id, slug);
  const businessName =
    (fichaInfo?.nombre && fichaInfo.nombre.trim()) ||
    businessNameFromSlug(slug);

  useEffect(() => {
    if (!qs) {
      setData(EMPTY_METRICS);
      setInsightCase("D");
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`/api/panel?${qs}&range=${encodeURIComponent(range)}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.ok) {
          const m = metricsFromResponse(res.data);
          const metrics = m ?? EMPTY_METRICS;
          setData(metrics);
          setInsightCase(
            parseInsightCaseFromPayload(res.data) ?? panelInsightCase(metrics)
          );
        } else {
          setData(EMPTY_METRICS);
          setInsightCase("D");
        }
      })
      .catch(() => {
        setData(EMPTY_METRICS);
        setInsightCase("D");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [qs, range]);

  useEffect(() => {
    const cleanId = id?.trim();
    if (!cleanId) {
      setFichaInfo(null);
      setTipoFichaPanel(null);
      setEdicionContext(null);
      return;
    }

    setFichaLoading(true);
    fetch(`/api/panel/negocio?id=${encodeURIComponent(cleanId)}`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((res) => {
        if (res?.ok && res.item && res.completitud) {
          const it = res.item as Record<string, unknown>;
          const nombre = String(it.nombre ?? "").trim();
          const galeriaUrls = Array.isArray(it.galeriaUrls)
            ? (it.galeriaUrls as unknown[]).map((u) => String(u ?? "").trim())
            : [];
          setEdicionContext({
            fotoPrincipalUrl: String(it.fotoPrincipalUrl ?? ""),
            galeriaExtraCount: galeriaUrls.filter(Boolean).length,
            descripcionCorta: String(it.descripcionCorta ?? ""),
            descripcionLarga: String(it.descripcionLarga ?? ""),
            instagram: String(it.instagram ?? ""),
            web: String(it.web ?? ""),
            categoriaSlug: String(it.categoriaSlug ?? ""),
          });
          setFichaInfo({
            nombre: nombre || businessNameFromSlug(slug),
            completitud: res.completitud as PerfilCompleto,
          });
          setTipoFichaPanel(
            res.tipoFicha === "completa" ? "completa" : "basica"
          );
        } else {
          setFichaInfo(null);
          setTipoFichaPanel(null);
          setEdicionContext(null);
        }
      })
      .catch(() => {
        setFichaInfo(null);
        setTipoFichaPanel(null);
        setEdicionContext(null);
      })
      .finally(() => setFichaLoading(false));
  }, [id, slug]);

  if (loading || data === null) {
    return (
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        Cargando métricas...
      </div>
    );
  }

  const interpretation = interpretationCopy(insightCase, data);
  const ctaPrincipalAbajo = insightCase !== "D";

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-6 lg:space-y-8">
      {/* FILTRO VISUAL */}
      <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl lg:text-2xl font-extrabold text-gray-900">
          Así está funcionando tu negocio
        </h1>
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm w-fit">
          <button
            type="button"
            onClick={() => setRange("7d")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              range === "7d"
                ? "bg-gray-900 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            7 días
          </button>
          <button
            type="button"
            onClick={() => setRange("30d")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              range === "30d"
                ? "bg-gray-900 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            30 días
          </button>
          <button
            type="button"
            onClick={() => setRange("all")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              range === "all"
                ? "bg-gray-900 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Desde activación
          </button>
        </div>
      </section>

      {/* MÉTRICAS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <Card title="Personas te vieron" value={data.impresiones} />
        <Card title="Entraron a tu perfil" value={data.visitas} />
        <Card title="Hicieron clic en tu negocio" value={data.click_ficha} />
        <Card title="Te escribieron por WhatsApp" value={data.click_whatsapp} />
      </section>

      <section className="rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-4 sm:px-5 sm:py-5 space-y-4">
        <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-line">
          {interpretation}
        </p>
        {insightCase === "D" ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-4 space-y-3">
            <p className="text-base font-extrabold text-gray-900">
              Puedes recibir más clientes
            </p>
            <p className="text-sm text-gray-800 font-semibold leading-relaxed">
              {COPY_PERFIL_BASICO_FUERTE.lead}
            </p>
            <p className="text-sm text-gray-800 leading-relaxed">
              {COPY_PERFIL_BASICO_FUERTE.body1}
            </p>
            <p className="text-sm text-gray-800 leading-relaxed">
              {COPY_PERFIL_BASICO_FUERTE.body2}
            </p>
            <p className="text-sm font-semibold text-gray-900">
              Lo que más te puede ayudar ahora:
            </p>
            <div className="text-sm text-gray-800 space-y-0.5">
              {CHECKLIST_AYUDA_CORTA.map((t) => (
                <p key={t}>{t}</p>
              ))}
            </div>
            <Link
              href={mejorarFichaHref}
              className="inline-flex px-5 py-2.5 rounded-md text-sm font-semibold bg-gray-900 text-white hover:bg-gray-800 text-center"
            >
              {CTA_MEJORAR_PERFIL}
            </Link>
          </div>
        ) : null}
      </section>

      {(id?.trim() || !esPremium) && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 lg:p-6 shadow-sm space-y-6">
          <h2 className="text-xl lg:text-2xl font-extrabold text-gray-900">
            Tu negocio hoy
          </h2>

          {id?.trim() && !esPremium ? (
            <>
              <div className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.3fr] gap-8 items-start">
                <div className="space-y-4">
                  <FichaEstadoBloque
                    fichaLoading={fichaLoading}
                    fichaInfo={fichaInfo}
                    tipoFichaPanel={tipoFichaPanel}
                  />
                </div>
                <PanelPreviewColumn businessName={businessName} />
              </div>
              {ctaPrincipalAbajo ? (
                <div className="flex justify-center pt-2">
                  <Link
                    href={mejorarFichaHref}
                    className="inline-flex px-6 py-3 bg-gray-900 text-white rounded-md text-base font-semibold hover:bg-gray-800"
                  >
                    {CTA_MEJORAR_PERFIL}
                  </Link>
                </div>
              ) : null}
            </>
          ) : id?.trim() && esPremium ? (
            <div className="space-y-4">
              <FichaEstadoBloque
                fichaLoading={fichaLoading}
                fichaInfo={fichaInfo}
                tipoFichaPanel={tipoFichaPanel}
              />
              {ctaPrincipalAbajo ? (
                <Link
                  href={mejorarFichaHref}
                  className="inline-flex px-6 py-3 bg-gray-900 text-white rounded-md text-base font-semibold hover:bg-gray-800"
                >
                  {CTA_MEJORAR_PERFIL}
                </Link>
              ) : null}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.3fr] gap-8 items-start">
                <div className="space-y-4">
                  <p className="text-sm text-gray-700">
                    {fichaInfo?.completitud.subtituloPagina ??
                      "Cuando tengas tu ficha enlazada, podrás mejorarla desde aquí."}
                  </p>
                </div>
                <PanelPreviewColumn businessName={businessName} />
              </div>
              {ctaPrincipalAbajo ? (
                <div className="flex justify-center pt-2">
                  <Link
                    href={mejorarFichaHref}
                    className="inline-flex px-6 py-3 bg-gray-900 text-white rounded-md text-base font-semibold hover:bg-gray-800"
                  >
                    {CTA_MEJORAR_PERFIL}
                  </Link>
                </div>
              ) : null}
            </>
          )}
        </section>
      )}

      {esPremium ? (
        <div className="p-4 bg-green-50 border border-green-100 rounded-lg">
          <p className="text-sm font-semibold text-green-900">
            Tu ficha completa está activa.
          </p>
        </div>
      ) : null}

    </div>
  );
}

function PanelPreviewColumn({ businessName }: { businessName: string }) {
  return (
    <section className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 p-5 lg:p-6 shadow-sm">
      <p className="text-xs font-semibold text-gray-700 mb-2">
        Así te ven tus clientes
      </p>
      <h3 className="text-lg font-bold text-indigo-900 mb-1">
        Así se vería tu negocio si completas tu ficha
      </h3>
      <p className="text-sm text-indigo-900/80 mb-3">
        Con más información, generas más confianza y aumentas tus contactos.
      </p>

      <div className="rounded-xl border border-indigo-100 bg-white shadow-md overflow-hidden">
        <div className="grid grid-cols-3 gap-1 bg-white p-1">
          <div className="h-40 md:h-48 rounded-md bg-gradient-to-br from-blue-200 via-indigo-200 to-purple-200" />
          <div className="h-40 md:h-48 rounded-md bg-gradient-to-br from-violet-200 via-fuchsia-200 to-pink-200" />
          <div className="h-40 md:h-48 rounded-md bg-gradient-to-br from-sky-200 via-cyan-200 to-blue-200" />
        </div>

        <div className="p-5 space-y-4">
          <div>
            <p className="text-2xl font-bold text-gray-900">{businessName}</p>
            <p className="text-sm text-gray-600">
              Servicio confiable en tu comuna, con atención rápida y más opciones
              de contacto.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex rounded-full px-3 py-1 text-xs font-semibold bg-pink-100 text-pink-700">
              Instagram
            </span>
            <span className="inline-flex rounded-full px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-700">
              Sitio web
            </span>
          </div>

          <button
            type="button"
            className="w-full inline-flex justify-center items-center rounded-md bg-green-600 px-4 py-2.5 text-base font-medium text-white hover:bg-green-700"
            disabled
          >
            Hablar por WhatsApp
          </button>
        </div>
      </div>
    </section>
  );
}

function Card({ title, value }: { title: string; value: number }) {
  const v = Number.isFinite(value) ? value : 0;
  return (
    <div className="p-5 lg:p-6 border rounded-xl bg-white shadow-sm min-h-[118px] flex flex-col justify-between">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-3xl font-extrabold text-gray-900">{v}</p>
    </div>
  );
}