"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PlanPeriodicidad } from "@/lib/planConstants";
import type { EstadoComercialEmprendedor } from "@/lib/getEstadoComercialEmprendedor";
import { buildPlanActivationMessage } from "@/lib/buildPlanActivationMessage";
import { getTransferenciaBancoUi, montoExactoDisplayClp } from "@/lib/panelPlanesTransferencia";
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
  fechaLargaEs,
  mensajeContextualEncimaTarjetasPlanes,
} from "@/lib/panelComercialCopy";
import type { PanelComercialPayload } from "@/lib/panelComercialPayload";
import { planContratadoPendienteDeInicio } from "@/lib/comercialPlanScheduling";
import PanelBrandHomeBar from "@/components/panel/PanelBrandHomeBar";
import EmprendedorSearchCard from "@/components/search/EmprendedorSearchCard";

const BENEFICIOS = [
  "Destacas más en el directorio en crecimiento de tu zona (más contexto y confianza)",
  "Más personas ven tu negocio y entran a tu perfil",
  "Ficha completa: más fotos, descripción e información útil que la ficha básica",
  "Generas más confianza y aumentas tus contactos",
] as const;

const PERDIDAS = [
  "Fotos y galería",
  'Botón "Ver ficha"',
  "Instagram y redes",
  "Más información",
  "Mayor visibilidad",
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
      case "trial_con_plan_confirmado_programado":
      case "trial_por_vencer_con_plan_confirmado_programado":
      case "plan_confirmado_programado":
      case "plan_confirmado_programado_por_arrancar":
        return "Gestionar plan";
      case "plan_vencido":
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
    case "plan_vencido":
    case "vencido_reciente":
      return "Reactivar ficha completa";
    default:
      return "Pagar y activar ahora";
  }
}

function whatsappAccion(estado: EstadoComercialEmprendedor): AccionPlanWhatsApp {
  if (estado === "plan_activo") return "gestionar";
  if (estado === "plan_por_vencer") return "renovar";
  if (
    estado === "trial_con_plan_confirmado_programado" ||
    estado === "trial_por_vencer_con_plan_confirmado_programado" ||
    estado === "plan_confirmado_programado" ||
    estado === "plan_confirmado_programado_por_arrancar"
  ) {
    return "gestionar";
  }
  if (estado === "plan_vencido" || estado === "vencido_reciente") return "renovar";
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
  accessToken = "",
  pagoFlash = null,
}: {
  id: string;
  slug: string;
  accessToken?: string;
  pagoFlash?: "fallo" | null;
}) {
  const transferFileRef = useRef<HTMLInputElement | null>(null);
  const [nombre, setNombre] = useState("");
  const [comunaSlug, setComunaSlug] = useState("");
  const [fotoPrincipalUrl, setFotoPrincipalUrl] = useState("");
  const [galeriaPrimeraUrl, setGaleriaPrimeraUrl] = useState("");
  const [comercial, setComercial] = useState<PanelComercialPayload | null>(
    null
  );
  const [loading, setLoading] = useState(!!id.trim());
  const [selectedPlan, setSelectedPlan] = useState<PlanPeriodicidad>(
    PLAN_RECOMENDADO
  );
  const [metodoPago, setMetodoPago] = useState<"webpay" | "transferencia">(
    "webpay"
  );
  const [pagoTransfer, setPagoTransfer] = useState<{
    id: string;
    referencia: string;
    estado: string;
    monto: number;
    comprobanteUrl: string | null;
  } | null>(null);
  const [transferBusy, setTransferBusy] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferOkMsg, setTransferOkMsg] = useState<string | null>(null);
  const [redirigiendoPago, setRedirigiendoPago] = useState(false);
  const [pagoIniciarError, setPagoIniciarError] = useState<string | null>(null);

  const modoSoloContacto = planesWebpayDeshabilitadoCliente();
  const transferenciaUi = getTransferenciaBancoUi();

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
          setFotoPrincipalUrl(
            String(
              it.fotoPrincipalUrl ??
                it.foto_principal_url ??
                it.foto_principal ??
                it.foto_url ??
                ""
            ).trim()
          );
          const galRaw =
            it.galeriaUrls ??
            it.galeria_urls ??
            it.galeria ??
            it.imagenes ??
            it.fotos ??
            [];
          const gal = Array.isArray(galRaw)
            ? galRaw.map((x) => String(x ?? "").trim()).filter(Boolean)
            : [];
          setGaleriaPrimeraUrl(gal[0] ?? "");
          setComercial(res.comercial as PanelComercialPayload);
        } else {
          setNombre("");
          setComunaSlug("");
          setFotoPrincipalUrl("");
          setGaleriaPrimeraUrl("");
          setComercial(null);
        }
      })
      .catch(() => {
        setNombre("");
        setComunaSlug("");
        setFotoPrincipalUrl("");
        setGaleriaPrimeraUrl("");
        setComercial(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const tok = String(accessToken ?? "").trim();
    if (tok.length < 8) return;
    fetch(`/api/pagos/transferencia/estado?access_token=${encodeURIComponent(tok)}`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((j) => {
        if (!j?.ok || !Array.isArray(j.items)) return;
        const latest = j.items[0];
        if (!latest?.id) return;
        setPagoTransfer({
          id: String(latest.id),
          referencia: String(latest.referencia || ""),
          estado: String(latest.estado || ""),
          monto: Number(latest.monto || 0),
          comprobanteUrl: latest.comprobanteUrl ? String(latest.comprobanteUrl) : null,
        });
      })
      .catch(() => {});
  }, [accessToken]);

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

  const encimaTarjetas = comercialListo
    ? mensajeContextualEncimaTarjetasPlanes(comercial)
    : null;

  const planProgramado = comercialListo
    ? planContratadoPendienteDeInicio(
        comercial.planContratadoPersistido === true ? true : null,
        comercial.planIniciaAt ?? null,
        new Date()
      )
    : false;

  const estaEnTrial =
    comercialListo &&
    (estado === "trial_activo" ||
      estado === "trial_por_vencer" ||
      estado === "trial_con_plan_confirmado_programado" ||
      estado === "trial_por_vencer_con_plan_confirmado_programado");

  const inicioPlanDisplay = useMemo(() => {
    if (!comercialListo) return "—";
    if (planProgramado && comercial.planIniciaAt) {
      return fechaLargaEs(comercial.planIniciaAt) ?? "—";
    }
    if (estaEnTrial) {
      return fechaLargaEs(comercial.trialExpiraAt) ?? "—";
    }
    return "Inmediatamente";
  }, [comercialListo, planProgramado, comercial?.planIniciaAt, estaEnTrial, comercial?.trialExpiraAt]);

  const ctaPrincipalLabel = ctaPrincipalLabelFromEstado(
    estado,
    comercialListo,
    modoSoloContacto
  );

  const ensureTransferReference = useCallback(async () => {
    const cleanId = id.trim();
    const tok = String(accessToken ?? "").trim();
    if (!cleanId || tok.length < 8) return;
    if (planProgramado) return;
    if (metodoPago !== "transferencia") return;
    if (transferBusy) return;
    // Si ya hay una referencia para este plan en pending/en_revision, el API la reusa.
    setTransferBusy(true);
    setTransferError(null);
    try {
      const r = await fetch("/api/pagos/transferencia/crear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emprendedorId: cleanId,
          planCodigo: planKeyParaApi(selectedPlan),
          access_token: tok,
        }),
      });
      const data = (await r.json().catch(() => ({}))) as Record<string, unknown>;
      if (!r.ok || data.ok !== true || !data.pago) {
        // No bloquear UI por esto: se muestra error y el usuario puede reintentar cambiando método.
        setTransferError(
          typeof data.error === "string" && data.error ? data.error : "No pudimos preparar la transferencia."
        );
        return;
      }
      const p = data.pago as Record<string, unknown>;
      setPagoTransfer({
        id: String(p.id ?? ""),
        referencia: String(p.referencia ?? ""),
        estado: String(p.estado ?? ""),
        monto: Number(p.monto ?? 0),
        comprobanteUrl:
          p.comprobanteUrl != null ? String(p.comprobanteUrl) : null,
      });
    } finally {
      setTransferBusy(false);
    }
  }, [id, accessToken, planProgramado, metodoPago, transferBusy, selectedPlan]);

  useEffect(() => {
    void ensureTransferReference();
  }, [ensureTransferReference]);

  const handleCtaPrincipal = useCallback(async () => {
    const MSG_PAGO =
      "No pudimos iniciar el pago. Inténtalo nuevamente.";
    const cleanId = id.trim();
    setPagoIniciarError(null);
    setTransferError(null);
    setTransferOkMsg(null);

    if (!cleanId) {
      setPagoIniciarError(
        "No pudimos identificar tu negocio. Vuelve al panel e intenta de nuevo."
      );
      return;
    }

    if (planProgramado) {
      setPagoIniciarError(
        "Ya tienes un plan pagado programado. No necesitas pagar de nuevo."
      );
      return;
    }

    if (metodoPago === "transferencia") return;

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
      const tok = String(accessToken ?? "").trim();
      if (tok.length < 8) {
        setPagoIniciarError(MSG_PAGO);
        return;
      }
      const r = await fetch("/api/pagos/crear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emprendedorId: cleanId,
          planCodigo: planKeyParaApi(selectedPlan),
          access_token: tok,
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
    accessToken,
    planProgramado,
    metodoPago,
  ]);

  const handleUploadComprobante = useCallback(
    async (file: File) => {
      const tok = String(accessToken ?? "").trim();
      if (tok.length < 8) {
        setTransferError("No pudimos validar tu acceso. Vuelve al panel e intenta nuevamente.");
        return;
      }
      if (!pagoTransfer?.id) {
        setTransferError("Primero necesitamos generar tu referencia de pago.");
        return;
      }
      setTransferBusy(true);
      setTransferError(null);
      setTransferOkMsg(null);
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onerror = () => reject(new Error("No pudimos leer el archivo."));
          reader.onload = () => resolve(String(reader.result || ""));
          reader.readAsDataURL(file);
        });

        const up = await fetch("/api/upload-base64", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base64,
            filename: file.name,
            folder: `pagos/${pagoTransfer.id}`,
          }),
        });
        const upj = (await up.json().catch(() => ({}))) as Record<string, unknown>;
        const url =
          typeof upj.publicUrl === "string"
            ? upj.publicUrl
            : typeof upj.url === "string"
              ? upj.url
              : "";
        if (!up.ok || !url) {
          setTransferError(
            (typeof upj.error === "string" && upj.error) ||
              "No se pudo subir el comprobante."
          );
          return;
        }

        const r = await fetch("/api/pagos/transferencia/comprobante", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            access_token: tok,
            emprendedorId: id.trim(),
            pagoId: pagoTransfer.id,
            comprobanteUrl: url,
          }),
        });
        const j = (await r.json().catch(() => ({}))) as Record<string, unknown>;
        if (!r.ok || j.ok !== true) {
          setTransferError(
            (typeof j.error === "string" && j.error) ||
              "No se pudo registrar el comprobante."
          );
          return;
        }
        const p = (j.pago ?? {}) as Record<string, unknown>;
        setPagoTransfer((prev) =>
          prev
            ? {
                ...prev,
                estado: String(p.estado ?? prev.estado),
                comprobanteUrl: url,
              }
            : prev
        );
        setTransferOkMsg("Comprobante enviado. Tu pago quedó en revisión.");
      } catch (e) {
        setTransferError(e instanceof Error ? e.message : "Error al subir comprobante.");
      } finally {
        setTransferBusy(false);
      }
    },
    [accessToken, pagoTransfer, id]
  );

  const copyToClipboard = useCallback(async (text: string) => {
    const t = String(text ?? "").trim();
    if (!t) return;
    try {
      await navigator.clipboard.writeText(t);
      setTransferOkMsg("Copiado al portapapeles.");
      window.setTimeout(() => setTransferOkMsg(null), 1500);
    } catch {
      // fallback: no bloquea
    }
  }, []);

  const tarjetasOrdenadas = ORDEN_TARJETAS_PLANES.map((k) =>
    TARJETAS.find((t) => t.key === k)!
  );

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-14">
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

      <section aria-label="Planes">
        <h2 className="sr-only">Elige tu plan</h2>
        {!heroCargando && encimaTarjetas ? (
          <p className="mb-4 max-w-3xl text-sm font-semibold text-slate-800 leading-relaxed">
            {encimaTarjetas}
          </p>
        ) : null}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5 lg:items-stretch">
          {tarjetasOrdenadas.map((t) => {
            const destacado = t.key === PLAN_RECOMENDADO;
            const selected = selectedPlan === t.key;
            return (
              <div
                key={t.key}
                role="button"
                tabIndex={0}
                aria-pressed={selected}
                onClick={() => setSelectedPlan(t.key)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedPlan(t.key);
                  }
                }}
                className={`flex flex-col rounded-2xl border p-5 sm:p-6 h-full transition-all outline-none cursor-pointer select-none ${
                  destacado
                    ? "bg-gradient-to-b from-sky-50 via-white to-white lg:z-[1] shadow-[0_0_0_1px_rgba(59,130,246,0.15),0_10px_30px_rgba(59,130,246,0.10)]"
                    : "bg-white shadow-sm hover:shadow-md"
                } ${
                  selected
                    ? destacado
                      ? "border-sky-600 ring-2 ring-sky-500/40 shadow-xl lg:scale-[1.015]"
                      : "border-sky-500 ring-2 ring-sky-500/30 shadow-lg lg:scale-[1.01]"
                    : destacado
                      ? "border-sky-500 ring-2 ring-sky-400/30"
                      : "border-slate-200 hover:border-slate-300"
                } focus-visible:ring-2 focus-visible:ring-sky-500/40`}
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
                  <div className="shrink-0 flex flex-col items-end gap-2">
                    {destacado ? (
                      <span className="text-[0.65rem] font-black uppercase tracking-wider text-white bg-sky-600 px-2.5 py-1 rounded-md shadow-sm">
                        RECOMENDADO
                      </span>
                    ) : null}
                  </div>
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
                {t.key === "anual" ? (
                  <p className="mt-3 text-xs text-slate-500">
                    Más elegido por negocios que quieren resultados constantes
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPlan(t.key);
                  }}
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
        className="-mt-2 sm:-mt-3 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/70 p-7 sm:p-8 shadow-md"
        aria-label="Así te verán las personas"
      >
        <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
          Así te verán las personas
        </h2>
        <p className="mt-2 text-sm sm:text-base text-slate-700">
          Los perfiles completos generan más confianza y más contactos.
        </p>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
          <div className="rounded-2xl border border-slate-300 bg-slate-200/60 p-4 sm:p-5 relative overflow-hidden opacity-70 saturate-50 contrast-[0.7]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-black text-slate-800">Perfil básico</p>
                <p className="text-xs font-semibold text-slate-600/90">Sin ficha pública</p>
                <p className="text-xs text-slate-500 mt-0.5">Menos información visible</p>
              </div>
              <span className="text-[0.7rem] font-extrabold tracking-wide text-slate-700 bg-slate-200 px-2.5 py-1 rounded-md border border-slate-300/70 shadow-sm">
                👁 Menos visible
              </span>
            </div>

            <div className="mt-3 max-w-[380px] mx-auto">
              <div className="opacity-80 [&_img]:blur-[1.5px] [&_img]:saturate-50 [&_img]:contrast-75 [&_a]:bg-none [&_a]:bg-slate-300/60 [&_a]:text-slate-700 [&_a]:shadow-none [&_a]:from-transparent [&_a]:to-transparent">
                <EmprendedorSearchCard
                  slug="demo"
                  nombre={nombre || "Tu negocio"}
                  fotoPrincipalUrl=""
                  whatsappPrincipal="+56900000000"
                  estadoPublicacion="publicado"
                  esFichaCompleta={false}
                  estadoFicha="ficha_basica"
                  bloqueTerritorial={null}
                  frase=""
                  descripcionLibre=""
                  subcategoriasNombres={[]}
                  subcategoriasSlugs={[]}
                  comunaBaseNombre="Santiago"
                  comunaBaseSlug="santiago"
                  comunaBaseRegionAbrev="RM"
                  comunaBuscadaNombre=""
                  atiendeLine=""
                  bloquearAccesoFichaPublica
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 relative overflow-hidden shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-black text-gray-900">Perfil completo</p>
                <p className="text-xs font-semibold text-slate-600">
                  Fotos, descripción y más contactos
                </p>
              </div>
              <span className="text-[0.7rem] font-extrabold tracking-wide text-white bg-emerald-600 px-2.5 py-1 rounded-md shadow-sm border border-emerald-700/20">
                👁 Más visible
              </span>
            </div>

            <div className="mt-4 max-w-[420px] mx-auto">
              <div className="rounded-2xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_54px_rgba(16,185,129,0.20)] shadow-[0_0_0_1px_rgba(16,185,129,0.12),0_12px_30px_rgba(16,185,129,0.10)]">
                <EmprendedorSearchCard
                  slug="demo"
                  nombre={nombre || "Tu negocio"}
                  fotoPrincipalUrl={fotoPrincipalUrl || galeriaPrimeraUrl || ""}
                  whatsappPrincipal="+56900000000"
                  estadoPublicacion="publicado"
                  esFichaCompleta
                  estadoFicha="ficha_completa"
                  bloqueTerritorial={null}
                  frase=""
                  descripcionLibre="Fotos, descripción y más señales de confianza en la card."
                  subcategoriasNombres={["Servicio"]}
                  subcategoriasSlugs={["servicio"]}
                  comunaBaseNombre="Santiago"
                  comunaBaseSlug="santiago"
                  comunaBaseRegionAbrev="RM"
                  comunaBuscadaNombre="Santiago"
                  atiendeLine="Atiende: Santiago"
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold text-emerald-900">
                <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2">
                  <span aria-hidden>✓</span> Perfil completo
                </div>
                <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2">
                  <span aria-hidden>✓</span> Más información
                </div>
                <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2">
                  <span aria-hidden>✓</span> Más contacto
                </div>
                <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2">
                  <span aria-hidden>✓</span> Más confianza
                </div>
              </div>
            </div>
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-emerald-50/10 via-white/20 to-emerald-100/10" />
          </div>
        </div>
      </section>

      <section
        className={`rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm ${
          "lg:sticky lg:top-4"
        }`}
        aria-label="Resumen del plan"
      >
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-center py-5 md:py-6">
          <div className="space-y-2">
            <p className="text-base sm:text-lg font-black text-gray-900">
              Plan {tarjetaPorKey(selectedPlan).titulo.toLowerCase()} —{" "}
              <span className="tabular-nums">
                {precioPlanesDisplaySimple(PRECIO_PLAN_CLP[selectedPlan])}
              </span>
            </p>
            <p className="text-sm text-slate-700">
              Tu plan pagado comenzará automáticamente el{" "}
              <span className="font-extrabold tabular-nums">{inicioPlanDisplay}</span>
            </p>
            {estaEnTrial ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-emerald-200/90 text-[0.7rem] font-extrabold uppercase tracking-wide text-emerald-950">
                  ✅ No pierdes días
                </span>
                <span className="text-sm text-slate-600 font-semibold">
                  Puedes pagar hoy sin perder días de tu prueba.
                </span>
              </div>
            ) : null}
          </div>

          <div className="w-full md:w-auto">
            <button
              type="button"
              onClick={
                metodoPago === "webpay"
                  ? handleCtaPrincipal
                  : () => transferFileRef.current?.click()
              }
              disabled={
                metodoPago === "webpay"
                  ? redirigiendoPago || planProgramado
                  : transferBusy || !pagoTransfer?.id || !pagoTransfer?.referencia
              }
              className="inline-flex h-14 w-full md:w-auto md:max-w-[360px] items-center justify-center rounded-xl bg-gray-900 px-8 text-base font-semibold text-white shadow-lg shadow-slate-900/10 hover:bg-gray-800 transition-all duration-200 hover:scale-[1.01] disabled:opacity-60"
            >
              {metodoPago === "webpay"
                ? redirigiendoPago
                  ? "Redirigiendo al pago…"
                  : planProgramado
                    ? "Plan ya programado"
                    : "Pagar con Webpay"
                : "Subir comprobante"}
            </button>
            <input
              ref={transferFileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleUploadComprobante(f);
                e.currentTarget.value = "";
              }}
            />
            <p className="mt-1.5 text-[11px] font-semibold text-slate-600 md:text-right">
              {metodoPago === "webpay"
                ? "Pago seguro con Webpay."
                : "Tu plan se activará al validar la transferencia."}
            </p>
          </div>
        </div>
        {metodoPago === "transferencia" && !pagoTransfer?.referencia ? (
          <p className="mt-3 text-xs text-slate-600">
            Preparando tu referencia de pago…
          </p>
        ) : null}
        {transferError ? (
          <p className="mt-3 text-sm text-amber-900 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            {transferError}
          </p>
        ) : null}
        {transferOkMsg ? (
          <p className="mt-3 text-sm text-emerald-900 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
            {transferOkMsg}
          </p>
        ) : null}
      </section>

      <section
        className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm"
        aria-label="Método de pago"
      >
        <h2 className="text-sm font-extrabold tracking-tight text-gray-900">
          Método de pago
        </h2>
        <div className="mt-3 space-y-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="metodoPagoInline"
              checked={metodoPago === "webpay"}
              onChange={() => setMetodoPago("webpay")}
            />
            <span className="text-sm font-extrabold text-gray-900">Webpay</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="metodoPagoInline"
              checked={metodoPago === "transferencia"}
              onChange={() => setMetodoPago("transferencia")}
            />
            <span className="text-sm font-extrabold text-gray-900">Transferencia</span>
          </label>
        </div>

        {metodoPago === "transferencia" ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-slate-600">
              Puedes transferir desde cualquier banco. Activamos tu plan al validar tu pago.
            </p>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
              <p className="text-xs font-extrabold uppercase tracking-wide text-slate-600">
                Monto a transferir
              </p>
              <div className="mt-1 flex items-end justify-between gap-3">
                <p className="text-3xl sm:text-4xl font-black text-gray-900 tabular-nums">
                  {pagoTransfer?.monto
                    ? montoExactoDisplayClp(pagoTransfer.monto)
                    : precioPlanesDisplaySimple(PRECIO_PLAN_CLP[selectedPlan])}
                </p>
                <button
                  type="button"
                  className="text-xs font-extrabold rounded-lg border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50"
                  onClick={() =>
                    void copyToClipboard(
                      String(
                        pagoTransfer?.monto
                          ? pagoTransfer.monto
                          : PRECIO_PLAN_CLP[selectedPlan]
                      )
                    )
                  }
                >
                  Copiar monto
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
                  Banco
                </p>
                <p className="font-bold text-gray-900">{transferenciaUi.banco}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
                  Tipo / Nº cuenta
                </p>
                <p className="font-bold text-gray-900">
                  {transferenciaUi.tipoCuenta} · {transferenciaUi.numeroCuenta}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
                  RUT
                </p>
                <p className="font-bold text-gray-900">{transferenciaUi.rut}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
                  Correo
                </p>
                <p className="font-bold text-gray-900">{transferenciaUi.correo}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wide text-slate-600">
                    Referencia obligatoria
                  </p>
                  <p className="mt-1 font-black text-gray-900 tabular-nums">
                    {pagoTransfer?.referencia ? (
                      <code className="px-2 py-1 rounded-md bg-slate-100 border border-slate-200">
                        {pagoTransfer.referencia}
                      </code>
                    ) : (
                      <span className="text-slate-500">Preparando…</span>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!pagoTransfer?.referencia}
                  className="text-xs font-extrabold rounded-lg border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50 disabled:opacity-60"
                  onClick={() => void copyToClipboard(String(pagoTransfer?.referencia ?? ""))}
                >
                  Copiar referencia
                </button>
              </div>

              <button
                type="button"
                className="w-full text-xs font-extrabold rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 hover:bg-slate-100"
                onClick={() =>
                  void copyToClipboard(
                    [
                      `Banco: ${transferenciaUi.banco}`,
                      `Cuenta: ${transferenciaUi.tipoCuenta} ${transferenciaUi.numeroCuenta}`,
                      `RUT: ${transferenciaUi.rut}`,
                      `Correo: ${transferenciaUi.correo}`,
                      `Monto: ${
                        pagoTransfer?.monto
                          ? montoExactoDisplayClp(pagoTransfer.monto)
                          : precioPlanesDisplaySimple(PRECIO_PLAN_CLP[selectedPlan])
                      }`,
                      `Referencia: ${String(pagoTransfer?.referencia ?? "").trim()}`,
                    ].join("\n")
                  )
                }
              >
                Copiar datos de transferencia
              </button>
            </div>
            {pagoTransfer?.comprobanteUrl ? (
              <a
                className="text-sm font-bold text-sky-700 hover:underline"
                href={pagoTransfer.comprobanteUrl}
                target="_blank"
                rel="noreferrer"
              >
                Ver comprobante enviado
              </a>
            ) : (
              <p className="text-sm text-slate-600">
                Cuando transfieras, sube tu comprobante desde el botón final.
              </p>
            )}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-600">
            Pago seguro con Webpay. Activación automática.
          </p>
        )}
      </section>

      <section
        className="rounded-2xl border border-slate-200 bg-stone-50/70 p-4 sm:p-5"
        aria-label="Tu perfil perderá"
      >
        <h2 className="text-lg font-black text-gray-900">Tu perfil perderá:</h2>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-medium text-slate-800">
          {PERDIDAS.map((t) => (
            <p key={t} className="flex items-start gap-2 m-0 leading-snug">
              <span className="mt-0.5 text-slate-500 text-xs" aria-hidden>
                ⚠
              </span>
              <span>{t}</span>
            </p>
          ))}
        </div>
      </section>

    </div>
  );
}
