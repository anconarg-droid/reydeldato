"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { PlanPeriodicidad } from "@/lib/planConstants";
import type { EstadoComercialEmprendedor } from "@/lib/getEstadoComercialEmprendedor";
import { buildPlanActivationMessage } from "@/lib/buildPlanActivationMessage";
import {
  ORDEN_TARJETAS_PLANES,
  PLAN_ETIQUETA_WHATSAPP,
  PLAN_RECOMENDADO,
  PRECIO_PLAN_CLP,
  precioPlanesDisplaySimple,
} from "@/lib/panelPlanesPrecios";
import {
  buildWhatsAppPlanContactoHref,
  buildWhatsAppPlanSolicitudHref,
  type AccionPlanWhatsApp,
} from "@/lib/panelPlanesWhatsApp";
import {
  enviarFormularioWebpayPlus,
  planesWebpayDeshabilitadoCliente,
} from "@/lib/planesPanelWebpay";
import {
  COPY_PLAN_GRATIS_LUEGO_BASICO,
  copyBloqueSuperiorPlanesDesdeEstado,
  copyBloqueSuperiorPlanesSinContextoNegocio,
} from "@/lib/panelComercialCopy";
import type { PanelComercialPayload } from "@/lib/panelComercialPayload";
import PanelBrandHomeBar from "@/components/panel/PanelBrandHomeBar";

const BENEFICIOS = [
  "Destacas más en el directorio en crecimiento de tu zona (más contexto y confianza)",
  "Más personas ven tu negocio y entran a tu perfil",
  "Ficha completa: más fotos, descripción e información útil que la ficha básica",
  "Generas más confianza y aumentas tus contactos",
] as const;

const PERDIDAS = [
  "Sigues publicado con ficha básica: WhatsApp y datos esenciales",
  "Pierdes la ficha completa (menos fotos, texto y enlaces)",
  "En el directorio en crecimiento, quienes tienen ficha completa suelen resaltarse más",
] as const;

type TarjetaDef = {
  key: PlanPeriodicidad;
  titulo: string;
  subtitulo?: string;
  precioDisplay: string;
  corto: string;
  apoyo: string;
  apoyoExtra?: string;
  boton: string;
};

const TARJETAS: TarjetaDef[] = [
  {
    key: "mensual",
    titulo: "Plan básico",
    subtitulo: "1 mes",
    precioDisplay: precioPlanesDisplaySimple(PRECIO_PLAN_CLP.mensual),
    corto: "Activa tu ficha completa por 30 días.",
    apoyo: "Buena opción para partir y probar resultados.",
    boton: "Elegir plan básico",
  },
  {
    key: "semestral",
    titulo: "6 meses",
    precioDisplay: precioPlanesDisplaySimple(PRECIO_PLAN_CLP.semestral),
    corto: "Mantén tu ficha completa activa por más tiempo.",
    apoyo: "Mejor valor que pagar mes a mes.",
    boton: "Elegir 6 meses",
  },
  {
    key: "anual",
    titulo: "Anual",
    precioDisplay: precioPlanesDisplaySimple(PRECIO_PLAN_CLP.anual),
    corto: "Mantén tu ficha activa todo el año.",
    apoyo: "Ahorra más de $30.000 al año comparado con el plan básico.",
    apoyoExtra:
      "Es la opción más elegida por quienes quieren resultados constantes.",
    boton: "Elegir anual",
  },
];

function tarjetaPorKey(k: PlanPeriodicidad): TarjetaDef {
  const t = TARJETAS.find((x) => x.key === k);
  if (!t) return TARJETAS[0];
  return t;
}

function comunaDesdeSlug(slug: string): string {
  const s = slug.trim();
  if (!s) return "—";
  return s
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function ctaPrincipalLabelFromEstado(
  estado: EstadoComercialEmprendedor,
  comercialListo: boolean,
  modoSoloContacto: boolean
): string {
  if (modoSoloContacto) {
    if (!comercialListo) return "Activar mi ficha completa";
    switch (estado) {
      case "plan_activo":
        return "Gestionar plan";
      case "plan_por_vencer":
        return "Renovar plan";
      case "vencido_reciente":
        return "Volver a activar";
      default:
        return "Activar mi ficha completa";
    }
  }
  switch (estado) {
    case "plan_activo":
      return "Gestionar plan";
    case "plan_por_vencer":
      return "Renovar plan";
    default:
      return "Pagar y activar ahora";
  }
}

function whatsappAccion(estado: EstadoComercialEmprendedor): AccionPlanWhatsApp {
  if (estado === "plan_activo") return "gestionar";
  if (estado === "plan_por_vencer") return "renovar";
  return "activar";
}

function planKeyParaApi(p: PlanPeriodicidad): "basico" | "semestral" | "anual" {
  if (p === "mensual") return "basico";
  if (p === "semestral") return "semestral";
  return "anual";
}

const allowClientPlanActivate =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_PANEL_ALLOW_CLIENT_ACTIVATE === "true";

export default function PlanesPanelClient({
  id,
  slug,
  pagoFlash = null,
}: {
  id: string;
  slug: string;
  pagoFlash?: "fallo" | null;
}) {
  const [nombre, setNombre] = useState("");
  const [comunaSlug, setComunaSlug] = useState("");
  const [comercial, setComercial] = useState<PanelComercialPayload | null>(
    null
  );
  const [loading, setLoading] = useState(!!id.trim());
  const [selectedPlan, setSelectedPlan] = useState<PlanPeriodicidad>(
    PLAN_RECOMENDADO
  );
  const [redirigiendoPago, setRedirigiendoPago] = useState(false);
  const [pagoIniciarError, setPagoIniciarError] = useState<string | null>(null);

  const modoSoloContacto = planesWebpayDeshabilitadoCliente();

  useEffect(() => {
    const cleanId = id.trim();
    if (!cleanId) {
      setLoading(false);
      setNombre("");
      setComunaSlug("");
      setComercial(null);
      return;
    }
    setLoading(true);
    fetch(`/api/panel/negocio?id=${encodeURIComponent(cleanId)}`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((res) => {
        if (res?.ok && res.item && res.comercial) {
          const it = res.item as Record<string, unknown>;
          setNombre(String(it.nombre ?? "").trim());
          setComunaSlug(String(it.comunaBaseSlug ?? "").trim());
          setComercial(res.comercial as PanelComercialPayload);
        } else {
          setNombre("");
          setComunaSlug("");
          setComercial(null);
        }
      })
      .catch(() => {
        setNombre("");
        setComunaSlug("");
        setComercial(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const panelBack =
    id.trim() !== ""
      ? `/panel?id=${encodeURIComponent(id.trim())}`
      : slug.trim() !== ""
        ? `/panel?slug=${encodeURIComponent(slug.trim())}`
        : "/panel";

  const slugForWa = slug.trim() || undefined;
  const estado: EstadoComercialEmprendedor = comercial?.estado ?? "basico";
  const comercialListo = comercial != null;
  const heroCargando = loading && id.trim() !== "";

  const estadoCopy = comercialListo
    ? copyBloqueSuperiorPlanesDesdeEstado({
        estado,
        diasRestantes: comercial.diasRestantes ?? null,
        planExpiraAt: comercial.planExpiraAt ?? null,
      })
    : copyBloqueSuperiorPlanesSinContextoNegocio();

  const ctaPrincipalLabel = ctaPrincipalLabelFromEstado(
    estado,
    comercialListo,
    modoSoloContacto
  );

  const handleCtaPrincipal = useCallback(async () => {
    const MSG_PAGO =
      "No pudimos iniciar el pago. Inténtalo nuevamente.";
    const cleanId = id.trim();
    setPagoIniciarError(null);

    if (!cleanId) {
      setPagoIniciarError(
        "No pudimos identificar tu negocio. Vuelve al panel e intenta de nuevo."
      );
      return;
    }

    if (modoSoloContacto) {
      setRedirigiendoPago(true);
      try {
        if (allowClientPlanActivate) {
          try {
            const r = await fetch("/api/panel/plan/activar", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                emprendedorId: cleanId,
                plan: planKeyParaApi(selectedPlan),
              }),
            });
            if (r.ok) {
              window.location.reload();
              return;
            }
          } catch {
            /* seguir a WhatsApp */
          }
        }

        const msg = buildPlanActivationMessage({
          nombreNegocio: nombre,
          comunaNombre: comunaSlug
            ? comunaDesdeSlug(comunaSlug)
            : slugForWa
              ? comunaDesdeSlug(slugForWa)
              : "",
          planEtiqueta: PLAN_ETIQUETA_WHATSAPP[selectedPlan],
          precioDisplay: precioPlanesDisplaySimple(
            PRECIO_PLAN_CLP[selectedPlan]
          ),
        });
        const hrefDetalle = buildWhatsAppPlanContactoHref(msg);
        if (hrefDetalle) {
          window.open(hrefDetalle, "_blank", "noopener,noreferrer");
          return;
        }

        const hrefCorto = buildWhatsAppPlanSolicitudHref({
          accion: comercialListo ? whatsappAccion(estado) : "activar",
          planEtiquetaUsuario: PLAN_ETIQUETA_WHATSAPP[selectedPlan],
          slugNegocio: slugForWa,
        });
        if (hrefCorto) {
          window.open(hrefCorto, "_blank", "noopener,noreferrer");
          return;
        }

        setPagoIniciarError(MSG_PAGO);
      } finally {
        setRedirigiendoPago(false);
      }
      return;
    }

    setRedirigiendoPago(true);
    let navegandoWebpay = false;
    try {
      const r = await fetch("/api/pagos/crear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emprendedorId: cleanId,
          planCodigo: planKeyParaApi(selectedPlan),
        }),
      });

      let data: Record<string, unknown> = {};
      try {
        data = (await r.json()) as Record<string, unknown>;
      } catch {
        data = {};
      }

      const url =
        typeof data.url === "string" ? data.url.trim() : "";
      const token =
        typeof data.token === "string" ? data.token.trim() : "";
      const okCuerpo =
        r.ok && data.ok === true && url.length > 0 && token.length > 0;

      if (okCuerpo) {
        navegandoWebpay = true;
        enviarFormularioWebpayPlus(url, token);
        return;
      }

      setPagoIniciarError(MSG_PAGO);
    } catch {
      setPagoIniciarError(MSG_PAGO);
    } finally {
      if (!navegandoWebpay) {
        setRedirigiendoPago(false);
      }
    }
  }, [
    id,
    nombre,
    comunaSlug,
    selectedPlan,
    estado,
    slugForWa,
    modoSoloContacto,
    comercialListo,
  ]);

  const tarjetasOrdenadas = ORDEN_TARJETAS_PLANES.map((k) =>
    TARJETAS.find((t) => t.key === k)!
  );

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10 pb-16">
      <PanelBrandHomeBar />
      <div>
        <Link
          href={panelBack}
          className="text-sm font-semibold text-sky-700 hover:text-sky-800"
        >
          ← Volver al panel
        </Link>
        <h1 className="mt-4 text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
          Planes y ficha completa
        </h1>
      </div>

      {pagoFlash === "fallo" && !loading ? (
        comercialListo && comercial.esPerfilCompletoComercial ? (
          <section
            className="rounded-2xl border border-sky-300 bg-sky-50/95 p-5 sm:p-6 shadow-sm"
            role="status"
            aria-live="polite"
          >
            <h2 className="text-lg font-black text-sky-950">
              Pago confirmado
            </h2>
            <p className="mt-2 text-sm text-sky-950/90 leading-relaxed">
              Hubo un problema en la redirección, pero tu plan está activo.
            </p>
          </section>
        ) : (
          <section
            className="rounded-2xl border border-amber-300 bg-amber-50/95 p-5 sm:p-6 shadow-sm"
            role="alert"
          >
            <h2 className="text-lg font-black text-amber-950">
              No se pudo completar el pago
            </h2>
            <p className="mt-2 text-sm text-amber-950/90 leading-relaxed">
              Tu ficha sigue en el estado actual. Puedes intentarlo nuevamente.
            </p>
          </section>
        )
      ) : null}

      <section
        className="rounded-2xl border-2 border-slate-200 bg-gradient-to-b from-white to-slate-50/90 p-6 sm:p-8 shadow-sm"
        aria-label="Estado de tu negocio"
      >
        {heroCargando ? (
          <div aria-hidden className="space-y-3">
            <div className="h-6 w-56 bg-slate-100 rounded animate-pulse" />
            <div className="h-4 w-full max-w-xl bg-slate-100 rounded animate-pulse" />
            <div className="h-4 max-w-lg w-full bg-slate-100 rounded animate-pulse" />
          </div>
        ) : (
          <>
            {comercialListo && nombre ? (
              <p className="text-sm font-semibold text-slate-600 mb-1">
                {nombre}
              </p>
            ) : null}
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
              {estadoCopy.titulo}
            </h2>
            <p className="mt-3 text-base text-gray-800 leading-relaxed max-w-2xl whitespace-pre-line">
              {estadoCopy.texto}
            </p>
            {estadoCopy.subtexto.trim() ? (
              <p className="mt-3 text-sm text-slate-700 leading-relaxed max-w-2xl font-medium">
                {estadoCopy.subtexto}
              </p>
            ) : null}
          </>
        )}
      </section>

      {!heroCargando && !comercialListo ? (
        <p className="text-sm text-slate-600 max-w-2xl">
          Selecciona un plan para mantener tu ficha completa activa.
        </p>
      ) : null}

      <section aria-label="Planes">
        <h2 className="sr-only">Elige tu plan</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5 lg:items-stretch">
          {tarjetasOrdenadas.map((t) => {
            const destacado = t.key === PLAN_RECOMENDADO;
            const selected = selectedPlan === t.key;
            return (
              <div
                key={t.key}
                className={`flex flex-col rounded-2xl border p-5 sm:p-6 h-full transition-shadow ${
                  destacado
                    ? "border-sky-500 bg-gradient-to-b from-sky-50 via-white to-white shadow-lg ring-2 ring-sky-400/30 lg:scale-[1.02] lg:z-[1]"
                    : "border-slate-200 bg-white shadow-sm hover:border-slate-300"
                } ${selected && !destacado ? "ring-2 ring-gray-900/10" : ""}`}
              >
                <div className="flex items-start justify-between gap-2 min-h-[2rem]">
                  <div>
                    <h3 className="text-lg font-black text-gray-900">
                      {t.titulo}
                    </h3>
                    {t.subtitulo ? (
                      <p className="text-sm font-medium text-slate-600 mt-0.5">
                        {t.subtitulo}
                      </p>
                    ) : null}
                  </div>
                  {destacado ? (
                    <span className="shrink-0 text-[0.65rem] font-extrabold uppercase tracking-wider text-sky-900 bg-sky-200/90 px-2 py-1 rounded-md">
                      RECOMENDADO
                    </span>
                  ) : null}
                </div>
                <p className="mt-4 text-3xl font-black text-gray-900 tabular-nums">
                  {t.precioDisplay}
                </p>
                <p className="mt-3 text-sm text-gray-800 leading-snug flex-1">
                  {t.corto}
                </p>
                <p className="mt-2 text-xs text-slate-600 leading-snug whitespace-pre-line">
                  {t.apoyo}
                  {t.apoyoExtra ? `\n${t.apoyoExtra}` : ""}
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedPlan(t.key)}
                  className={`mt-5 w-full rounded-xl font-bold transition-colors ${
                    destacado
                      ? "min-h-[48px] text-base bg-sky-600 text-white hover:bg-sky-700 shadow-lg ring-2 ring-sky-500/40 hover:ring-sky-500/60"
                      : "min-h-[44px] text-sm bg-gray-900 text-white hover:bg-gray-800"
                  }`}
                >
                  {t.boton}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section
        className="rounded-2xl border border-emerald-200/90 bg-emerald-50/50 p-6 sm:p-7"
        aria-label="Beneficios"
      >
        <h2 className="text-lg font-black text-gray-900">
          Qué logras con tu ficha completa
        </h2>
        <ul className="mt-4 list-disc pl-5 text-sm text-gray-800 space-y-2 leading-relaxed">
          {BENEFICIOS.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </section>

      <section
        className="rounded-2xl border border-amber-200/90 bg-amber-50/40 p-6 sm:p-7"
        aria-label="Si no continúas con ficha completa"
      >
        <h2 className="text-lg font-black text-gray-900">
          Si no continúas con la ficha completa
        </h2>
        <p className="mt-3 text-sm font-medium text-gray-800 leading-relaxed">
          {COPY_PLAN_GRATIS_LUEGO_BASICO}
        </p>
        <p className="mt-2 text-xs text-gray-600 leading-relaxed">
          En comunas con directorio en crecimiento ya hay servicios visibles; el
          catálogo sigue ampliándose. Los vecinos pueden recomendar negocios y
          publicar sigue siendo gratuito.
        </p>
        <ul className="mt-4 list-disc pl-5 text-sm text-gray-800 space-y-2 leading-relaxed">
          {PERDIDAS.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </section>

      <section
        className="rounded-2xl border border-slate-200 bg-slate-900 p-6 sm:p-8 text-center space-y-4"
        aria-label="Activar o renovar"
      >
        {pagoIniciarError ? (
          <p
            className="text-sm text-amber-200 max-w-md mx-auto leading-relaxed rounded-lg bg-amber-950/40 border border-amber-800/60 px-4 py-3"
            role="alert"
          >
            {pagoIniciarError}
          </p>
        ) : null}
        <p className="text-xs text-white/70 uppercase tracking-wide font-semibold">
          Plan elegido: {tarjetaPorKey(selectedPlan).titulo}
        </p>
        <button
          type="button"
          disabled={redirigiendoPago}
          onClick={handleCtaPrincipal}
          className="inline-flex w-full max-w-md mx-auto min-h-[52px] items-center justify-center rounded-xl bg-white px-6 py-3 text-base font-extrabold text-gray-900 shadow-lg hover:bg-gray-100 transition-colors disabled:opacity-70"
        >
          {redirigiendoPago
            ? "Redirigiendo al pago…"
            : ctaPrincipalLabel}
        </button>
        {modoSoloContacto ? (
          <p className="text-sm text-white/85 max-w-md mx-auto leading-relaxed">
            Activa tu plan por el canal configurado para tu cuenta.
          </p>
        ) : (
          <p className="text-sm text-white/85 max-w-md mx-auto leading-relaxed">
            Serás redirigido a Webpay para completar el pago.
          </p>
        )}
      </section>
    </div>
  );
}
