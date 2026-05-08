"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PlanPeriodicidad } from "@/lib/planConstants";
import type { EstadoComercialEmprendedor } from "@/lib/getEstadoComercialEmprendedor";
import { buildPlanActivationMessage } from "@/lib/buildPlanActivationMessage";
import {
  getTransferenciaBancoUi,
  montoExactoDisplayClp,
  montoExactoTransferencia,
} from "@/lib/panelPlanesTransferencia";
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
  copyBloqueSuperiorPlanesDesdeEstado,
  copyBloqueSuperiorPlanesSinContextoNegocio,
  diasRestantesHasta,
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

function parseIsoDate(iso: string | null | undefined): Date | null {
  if (iso == null || String(iso).trim() === "") return null;
  const d = new Date(String(iso));
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addCalendarMonthsFromDate(start: Date, months: number): Date {
  const d = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const origDay = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() !== origDay) d.setDate(0);
  return d;
}

function monthsForPeriodicidad(p: PlanPeriodicidad): number {
  if (p === "mensual") return 1;
  if (p === "semestral") return 6;
  return 12;
}

function formatFechaLocal(d: Date): string {
  return new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

const allowClientPlanActivate =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_PANEL_ALLOW_CLIENT_ACTIVATE === "true";

const transferenciaDisponible =
  Boolean(process.env.NEXT_PUBLIC_TRANSFER_BANK_NAME) &&
  Boolean(process.env.NEXT_PUBLIC_TRANSFER_ACCOUNT_NUMBER) &&
  Boolean(process.env.NEXT_PUBLIC_TRANSFER_EMAIL);

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
  /** Evita solapamiento y permite no incluir `transferBusy` en deps del callback (eso re-disparaba el effect en bucle). */
  const transferCrearInflightRef = useRef(false);
  const [nombre, setNombre] = useState("");
  const [comunaSlug, setComunaSlug] = useState("");
  const [fotoPrincipalUrl, setFotoPrincipalUrl] = useState("");
  const [galeriaPrimeraUrl, setGaleriaPrimeraUrl] = useState("");
  const [galeriaUrls, setGaleriaUrls] = useState<string[]>([]);
  const [comercial, setComercial] = useState<PanelComercialPayload | null>(
    null
  );
  const [loading, setLoading] = useState(!!id.trim());
  const [selectedPlan, setSelectedPlan] = useState<PlanPeriodicidad>(
    PLAN_RECOMENDADO
  );
  const [transferenciaExpanded, setTransferenciaExpanded] = useState(false);
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
  const [negocioSlug, setNegocioSlug] = useState("");
  const [comunaNombreDisplay, setComunaNombreDisplay] = useState("");
  const [descripcionLarga, setDescripcionLarga] = useState("");
  const [whatsappNegocio, setWhatsappNegocio] = useState("");
  const [instagramNegocio, setInstagramNegocio] = useState("");
  const [webNegocio, setWebNegocio] = useState("");
  const [emailNegocio, setEmailNegocio] = useState("");
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
          setNegocioSlug(String(it.slug ?? "").trim());
          setComunaNombreDisplay(String(it.comunaBaseNombre ?? "").trim());
          setDescripcionLarga(
            String(it.descripcionLarga ?? it.descripcion_larga ?? "").trim()
          );
          setWhatsappNegocio(String(it.whatsapp ?? "").trim());
          setInstagramNegocio(String(it.instagram ?? "").trim());
          setWebNegocio(
            String(it.web ?? it.sitio_web ?? it.sitioWeb ?? "").trim()
          );
          setEmailNegocio(String(it.email ?? "").trim());
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
          setGaleriaUrls(gal.slice(0, 6));
          setComercial(res.comercial as PanelComercialPayload);
        } else {
          setNombre("");
          setComunaSlug("");
          setFotoPrincipalUrl("");
          setGaleriaPrimeraUrl("");
          setGaleriaUrls([]);
          setNegocioSlug("");
          setComunaNombreDisplay("");
          setDescripcionLarga("");
          setWhatsappNegocio("");
          setInstagramNegocio("");
          setWebNegocio("");
          setEmailNegocio("");
          setComercial(null);
        }
      })
      .catch(() => {
        setNombre("");
        setComunaSlug("");
        setFotoPrincipalUrl("");
        setGaleriaPrimeraUrl("");
        setGaleriaUrls([]);
        setNegocioSlug("");
        setComunaNombreDisplay("");
        setDescripcionLarga("");
        setWhatsappNegocio("");
        setInstagramNegocio("");
        setWebNegocio("");
        setEmailNegocio("");
        setComercial(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!transferenciaDisponible) return;
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
  }, [accessToken, transferenciaDisponible]);

  useEffect(() => {
    if (!transferenciaDisponible) setTransferenciaExpanded(false);
  }, [transferenciaDisponible]);

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

  const heroTrialDetallado =
    comercialListo &&
    (estado === "trial_activo" ||
      estado === "trial_por_vencer" ||
      estado === "trial_con_plan_confirmado_programado" ||
      estado === "trial_por_vencer_con_plan_confirmado_programado");

  const heroPlanPagadoActivo =
    comercialListo && (estado === "plan_activo" || estado === "plan_por_vencer");

  const diasTrialHero = useMemo(() => {
    if (!comercialListo || !comercial) return null;
    if (comercial.diasRestantes != null && comercial.diasRestantes > 0) {
      return comercial.diasRestantes;
    }
    return diasRestantesHasta(comercial.trialExpiraAt);
  }, [comercialListo, comercial]);

  const vigenciaPlanLabels = useMemo(() => {
    if (!comercialListo || !comercial) {
      return { inicio: null as string | null, fin: null as string | null };
    }
    if (planProgramado && comercial.planIniciaAt && fechaLargaEs(comercial.planIniciaAt)) {
      if (comercial.planExpiraAt && fechaLargaEs(comercial.planExpiraAt)) {
        return {
          inicio: fechaLargaEs(comercial.planIniciaAt),
          fin: fechaLargaEs(comercial.planExpiraAt),
        };
      }
      const iniP = parseIsoDate(comercial.planIniciaAt);
      if (iniP) {
        const per = String(comercial.planPeriodicidad ?? "").toLowerCase();
        const meses =
          per === "mensual"
            ? 1
            : per === "semestral"
              ? 6
              : per === "anual"
                ? 12
                : monthsForPeriodicidad(selectedPlan);
        const finP = addCalendarMonthsFromDate(startOfLocalDay(iniP), meses);
        return {
          inicio: formatFechaLocal(startOfLocalDay(iniP)),
          fin: formatFechaLocal(finP),
        };
      }
    }
    let inicioDt: Date | null = null;
    if (estaEnTrial && comercial.trialExpiraAt) {
      const t = parseIsoDate(comercial.trialExpiraAt);
      inicioDt = t ? startOfLocalDay(t) : null;
    } else {
      inicioDt = startOfLocalDay(new Date());
    }
    if (!inicioDt) return { inicio: null, fin: null };
    const finDt = addCalendarMonthsFromDate(
      inicioDt,
      monthsForPeriodicidad(selectedPlan)
    );
    return {
      inicio: formatFechaLocal(inicioDt),
      fin: formatFechaLocal(finDt),
    };
  }, [
    comercialListo,
    comercial,
    planProgramado,
    estaEnTrial,
    selectedPlan,
    comercial?.planPeriodicidad,
  ]);

  const montoTransferSegunPlan = useMemo(
    () =>
      montoExactoDisplayClp(
        montoExactoTransferencia(planKeyParaApi(selectedPlan))
      ),
    [selectedPlan]
  );

  const hrefFichaPublicaPreview = useMemo(() => {
    const s = negocioSlug.trim();
    if (!s) return "";
    const path = `/emprendedor/${encodeURIComponent(s)}`;
    const c = comunaSlug.trim();
    if (!c) return path;
    const q = new URLSearchParams();
    q.set("comuna", c);
    const n = comunaNombreDisplay.trim();
    if (n) q.set("comunaNombre", n);
    return `${path}?${q.toString()}`;
  }, [negocioSlug, comunaSlug, comunaNombreDisplay]);

  /** Fotos únicas para la vista “perfil completo” (principal + galería). */
  const fotosPreviewListado = useMemo(() => {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const u of [fotoPrincipalUrl, ...galeriaUrls]) {
      const s = String(u ?? "").trim();
      if (!s || seen.has(s)) continue;
      seen.add(s);
      out.push(s);
      if (out.length >= 4) break;
    }
    return out;
  }, [fotoPrincipalUrl, galeriaUrls]);

  const ensureTransferReference = useCallback(async () => {
    const cleanId = id.trim();
    const tok = String(accessToken ?? "").trim();
    if (!cleanId || tok.length < 8) return;
    if (planProgramado) return;
    if (!transferenciaDisponible) return;
    if (!transferenciaExpanded) return;
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
      transferCrearInflightRef.current = false;
      setTransferBusy(false);
    }
  }, [id, accessToken, planProgramado, transferenciaExpanded, selectedPlan]);

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
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-14">
      <PanelBrandHomeBar />
      <div>
        <Link
          href={panelBack}
          className="text-sm font-semibold text-sky-700 hover:text-sky-800"
        >
          ← Volver al panel
        </Link>
        <h1 className="mt-4 text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
          {nombre.trim()
            ? `Planes para ${nombre.trim()}`
            : "Planes y ficha completa"}
        </h1>
        <p className="mt-2 text-sm text-slate-600 max-w-2xl">
          Activa o mantén tu ficha completa en Rey del Dato.
        </p>
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
        ) : heroTrialDetallado && comercial ? (
          <>
            {nombre.trim() ? (
              <p className="text-sm font-semibold text-slate-600 mb-1">{nombre.trim()}</p>
            ) : null}
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
              Tu ficha completa está activa
            </h2>
            <ul className="mt-3 space-y-1.5 text-sm text-gray-800 max-w-2xl">
              {comercial.trialIniciaAt && fechaLargaEs(comercial.trialIniciaAt) ? (
                <li>
                  <span className="font-semibold text-slate-700">Inicio prueba: </span>
                  {fechaLargaEs(comercial.trialIniciaAt)}
                </li>
              ) : null}
              {comercial.trialExpiraAt && fechaLargaEs(comercial.trialExpiraAt) ? (
                <li>
                  <span className="font-semibold text-slate-700">Termina prueba: </span>
                  {fechaLargaEs(comercial.trialExpiraAt)}
                </li>
              ) : null}
              {diasTrialHero != null && diasTrialHero > 0 ? (
                <li>
                  <span className="font-semibold text-slate-700">Te quedan: </span>
                  {diasTrialHero} {diasTrialHero === 1 ? "día" : "días"}
                </li>
              ) : null}
            </ul>
            <p className="mt-3 text-sm text-slate-700 leading-relaxed max-w-2xl">
              Durante la prueba tu ficha completa se mantiene visible sin costo.
            </p>
            {planProgramado ? (
              <p className="mt-2 text-sm text-slate-700 leading-relaxed max-w-2xl">
                Además, ya tienes un plan pagado confirmado que comenzará al término de tu prueba.
              </p>
            ) : null}
          </>
        ) : heroPlanPagadoActivo && comercial ? (
          <>
            {nombre.trim() ? (
              <p className="text-sm font-semibold text-slate-600 mb-1">{nombre.trim()}</p>
            ) : null}
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
              Tu ficha completa está activa
            </h2>
            <p className="mt-3 text-base text-gray-800 leading-relaxed max-w-2xl">
              {comercial.planExpiraAt && fechaLargaEs(comercial.planExpiraAt)
                ? `Tu plan pagado está vigente hasta el ${fechaLargaEs(comercial.planExpiraAt)}. Tu negocio sigue apareciendo como perfil completo en las búsquedas.`
                : "Tu plan pagado está vigente. Tu negocio sigue apareciendo como perfil completo en las búsquedas."}
            </p>
          </>
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
        className="-mt-1 sm:-mt-2 w-full rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/70 p-6 sm:p-8 lg:p-10 shadow-md"
        aria-label="Así te verán las personas"
      >
        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
          Así te verán las personas
        </h2>
        <p className="mt-3 text-base sm:text-lg text-slate-700 leading-relaxed max-w-4xl">
          Con <strong className="font-semibold text-slate-900">ficha completa</strong>, te ves más
          serio en el listado y además obtienes una{" "}
          <strong className="font-semibold text-slate-900">página pública</strong> que la gente puede
          abrir para ver fotos, descripción y más contactos.
        </p>

        <div className="mt-8 lg:mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-stretch">
          {/* Perfil básico — menos visible, solo listado + WhatsApp */}
          <div className="relative flex min-h-[720px] flex-col rounded-2xl border border-slate-300/90 bg-slate-100/70 p-6 sm:p-8 lg:p-10 shadow-inner">
            <div className="absolute right-4 top-4 sm:right-8 sm:top-8">
              <span className="inline-flex items-center rounded-lg border border-slate-400/70 bg-slate-200/95 px-3 py-1.5 text-[0.7rem] font-extrabold uppercase tracking-wide text-slate-800 shadow-sm">
                Menos visible
              </span>
            </div>
            <div className="pr-24 sm:pr-28">
              <p className="text-xl font-black text-slate-800">Perfil básico</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Apareces en el directorio con menos contexto. Contacto principal: WhatsApp desde la
                card.
              </p>
            </div>
            <div className="mt-6 flex flex-1 flex-col rounded-xl border border-slate-300/60 bg-white/60 p-4 sm:p-5 lg:p-6 [&_img]:opacity-80 [&_img]:blur-[0.5px]">
              <div className="w-full grayscale-[0.35] opacity-90 saturate-[0.7] contrast-[0.95]">
                <EmprendedorSearchCard
                  slug="demo"
                  nombre={nombre.trim() || "Tu negocio"}
                  fotoPrincipalUrl=""
                  whatsappPrincipal={
                    String(whatsappNegocio || "").replace(/\D/g, "").length >= 8
                      ? whatsappNegocio
                      : "+56900000000"
                  }
                  estadoPublicacion="publicado"
                  esFichaCompleta={false}
                  estadoFicha="ficha_basica"
                  bloqueTerritorial={null}
                  frase=""
                  descripcionLibre=""
                  subcategoriasNombres={[]}
                  subcategoriasSlugs={[]}
                  comunaBaseNombre={comunaNombreDisplay.trim() || "Tu comuna"}
                  comunaBaseSlug={comunaSlug.trim() || "santiago"}
                  comunaBaseRegionAbrev="RM"
                  comunaBuscadaNombre=""
                  atiendeLine={
                    comunaNombreDisplay.trim()
                      ? `Atiende: ${comunaNombreDisplay.trim()}`
                      : "Atiende tu comuna"
                  }
                  bloquearAccesoFichaPublica
                />
              </div>
            </div>
          </div>

          {/* Perfil completo — más visible + página pública (una sola vez) */}
          <div className="relative flex min-h-[720px] flex-col rounded-2xl border-2 border-teal-600/25 bg-gradient-to-b from-teal-50/40 via-white to-white p-6 sm:p-8 lg:p-10 shadow-[0_12px_48px_rgba(15,118,110,0.12)]">
            <div className="absolute right-4 top-4 sm:right-8 sm:top-8">
              <span className="inline-flex items-center rounded-lg border border-teal-700 bg-[#0f766e] px-3 py-1.5 text-[0.7rem] font-extrabold uppercase tracking-wide text-white shadow-sm">
                Más visible
              </span>
            </div>
            <div className="pr-24 sm:pr-28">
              <p className="text-xl font-black text-gray-900">Perfil completo</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Card con más contexto en resultados, galería y señales de confianza; desde la card se
                abre tu página pública.
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex rounded-full border border-teal-200 bg-white px-3 py-1 text-xs font-bold text-teal-900">
                Más contexto en el listado
              </span>
              <span className="inline-flex rounded-full border border-teal-200 bg-white px-3 py-1 text-xs font-bold text-teal-900">
                Galería visible
              </span>
              <span className="inline-flex rounded-full border border-teal-200 bg-white px-3 py-1 text-xs font-bold text-teal-900">
                Más confianza
              </span>
            </div>

            {fotosPreviewListado.length > 0 ? (
              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                {fotosPreviewListado.map((src) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={src}
                    src={src}
                    alt=""
                    className="aspect-[4/3] w-full rounded-xl border border-teal-100 object-cover shadow-sm"
                  />
                ))}
              </div>
            ) : null}

            <div className="mt-5 w-full flex-1 rounded-xl border border-teal-100/80 bg-white/80 p-4 sm:p-5 lg:p-6 shadow-sm">
              <EmprendedorSearchCard
                slug={negocioSlug.trim() || "demo"}
                nombre={nombre.trim() || "Tu negocio"}
                fotoPrincipalUrl={fotoPrincipalUrl || galeriaPrimeraUrl || ""}
                whatsappPrincipal={
                  String(whatsappNegocio || "").replace(/\D/g, "").length >= 8
                    ? whatsappNegocio
                    : "+56900000000"
                }
                estadoPublicacion="publicado"
                esFichaCompleta
                estadoFicha="ficha_completa"
                bloqueTerritorial={null}
                frase=""
                descripcionLibre={
                  descripcionLarga.trim() ||
                  "Aquí va tu descripción: servicios, experiencia y lo que te diferencia."
                }
                subcategoriasNombres={["Servicio"]}
                subcategoriasSlugs={["servicio"]}
                comunaBaseNombre={comunaNombreDisplay.trim() || "Tu comuna"}
                comunaBaseSlug={comunaSlug.trim() || "santiago"}
                comunaBaseRegionAbrev="RM"
                comunaBuscadaNombre={comunaNombreDisplay.trim() || ""}
                atiendeLine={
                  comunaNombreDisplay.trim()
                    ? `Atiende: ${comunaNombreDisplay.trim()}`
                    : "Atiende tu comuna"
                }
                fichaContextComunaSlug={comunaSlug.trim() || null}
                fichaContextComunaNombre={comunaNombreDisplay.trim() || null}
                disponibleHoy
                respondeRapido
                etiquetaVerFicha="Ver ficha"
                fichaPublicaHrefOverride={hrefFichaPublicaPreview || null}
              />
            </div>

            {hrefFichaPublicaPreview ? (
              <div
                id="panel-ficha-publica"
                className="mt-6 rounded-2xl border-2 border-teal-200 bg-white p-6 sm:p-8 shadow-md"
              >
                <p className="text-xs font-extrabold uppercase tracking-wide text-[#0f766e]">
                  Tu página pública
                </p>
                <p className="mt-3 text-base font-black text-gray-900">Una página para compartir</p>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-700">
                  Es el destino cuando alguien hace clic en <span className="font-semibold">Ver ficha</span>:
                  más fotos, texto completo y tus otros contactos (redes, web, correo).
                </p>
                <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="shrink-0">
                    {fotoPrincipalUrl || galeriaPrimeraUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={fotoPrincipalUrl || galeriaPrimeraUrl}
                        alt=""
                        className="h-40 w-40 rounded-2xl border border-slate-200 object-cover shadow-sm sm:h-44 sm:w-44"
                      />
                    ) : (
                      <div className="flex h-40 w-40 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center text-xs font-medium text-slate-500 sm:h-44 sm:w-44">
                        Añade fotos
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-3 text-sm">
                    <p className="text-lg font-black text-gray-900">
                      {nombre.trim() || "Tu negocio"}
                    </p>
                    {comunaNombreDisplay.trim() ? (
                      <p className="text-slate-600">
                        <span className="font-semibold">Ubicación: </span>
                        {comunaNombreDisplay.trim()}
                      </p>
                    ) : null}
                    {descripcionLarga.trim() ? (
                      <p className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words text-slate-700 leading-relaxed">
                        {descripcionLarga.trim()}
                      </p>
                    ) : (
                      <p className="text-slate-500 italic">
                        Tu descripción larga se mostrará aquí cuando la completes en el panel.
                      </p>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100 pt-3 text-slate-700">
                      {String(whatsappNegocio || "").replace(/\D/g, "").length >= 8 ? (
                        <span>
                          <span className="font-semibold">WhatsApp</span>{" "}
                          <span className="tabular-nums">{whatsappNegocio.trim()}</span>
                        </span>
                      ) : null}
                      {instagramNegocio.trim() ? (
                        <span className="break-all">
                          <span className="font-semibold">Instagram</span> {instagramNegocio.trim()}
                        </span>
                      ) : null}
                      {webNegocio.trim() ? (
                        <span className="break-all">
                          <span className="font-semibold">Web</span> {webNegocio.trim()}
                        </span>
                      ) : null}
                      {emailNegocio.trim() ? (
                        <span className="break-all">
                          <span className="font-semibold">Correo</span> {emailNegocio.trim()}
                        </span>
                      ) : null}
                    </div>
                    <div className="pt-2">
                      <Link
                        href={hrefFichaPublicaPreview}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-12 items-center justify-center rounded-xl bg-[#0f766e] px-6 text-sm font-bold text-white shadow-md transition hover:bg-[#0d9488]"
                      >
                        Ver ficha
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600">
                Guarda el slug de tu negocio para ver aquí el enlace de tu página pública.
              </p>
            )}
          </div>
        </div>
      </section>

      <section
        className={`max-w-[1600px] mx-auto w-full rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm ${
          "lg:sticky lg:top-4"
        }`}
        aria-label="Resumen del plan"
      >
        <div className="grid w-full gap-6 py-5 md:grid-cols-[1fr_auto] md:items-start md:gap-8 md:py-6">
          <div className="space-y-3 md:max-w-xl md:min-w-[280px]">
            <p className="text-base sm:text-lg font-black text-gray-900">
              Plan {tarjetaPorKey(selectedPlan).titulo.toLowerCase()} —{" "}
              <span className="tabular-nums">
                {precioPlanesDisplaySimple(PRECIO_PLAN_CLP[selectedPlan])}
              </span>
            </p>
            {planProgramado ? (
              <p className="text-sm text-slate-700">
                Tu plan pagado ya está confirmado. La vigencia que ves corresponde a tu compra
                programada.
              </p>
            ) : estaEnTrial ? (
              <p className="text-sm text-slate-700">
                Si pagas hoy, tu plan partirá cuando termine tu prueba.
              </p>
            ) : (
              <p className="text-sm text-slate-700">
                Si pagas hoy, tu plan comenzará en la fecha de inicio indicada abajo.
              </p>
            )}
            {vigenciaPlanLabels.inicio && vigenciaPlanLabels.fin ? (
              <>
                <p className="text-sm font-semibold text-slate-800">
                  Vigencia: {vigenciaPlanLabels.inicio} al {vigenciaPlanLabels.fin}
                </p>
                {!planProgramado ? (
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Si pagas hoy, tu plan comenzará el {vigenciaPlanLabels.inicio} y terminará el{" "}
                    {vigenciaPlanLabels.fin}.
                  </p>
                ) : null}
              </>
            ) : null}
            {estaEnTrial ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-emerald-200/90 text-[0.7rem] font-extrabold uppercase tracking-wide text-emerald-950">
                  ✅ No pierdes días
                </span>
                <span className="text-sm text-slate-600 font-semibold">No pierdes días de prueba.</span>
              </div>
            ) : null}
          </div>

          <div className="flex w-full shrink-0 flex-col gap-5 md:w-auto md:justify-self-end md:items-end">
            <div className="flex w-full flex-col gap-3 md:w-full md:max-w-md md:items-end">
              <h2 className="w-full text-center text-lg font-black text-gray-900 tracking-tight md:text-right">
                Activa tu ficha completa
              </h2>
              <div className="flex w-full flex-col gap-2">
                <button
                  type="button"
                  onClick={handleCtaPrincipal}
                  disabled={redirigiendoPago || planProgramado}
                  className="inline-flex h-14 w-full items-center justify-center rounded-xl bg-gray-900 px-4 text-base font-semibold text-white shadow-lg shadow-slate-900/10 transition-all duration-200 hover:translate-y-[-1px] hover:bg-gray-800 hover:shadow-xl disabled:opacity-60 sm:px-6"
                >
                  {redirigiendoPago
                    ? "Redirigiendo al pago…"
                    : planProgramado
                      ? "Plan ya programado"
                      : "Mantener perfil completo"}
                </button>
                <div className="w-full space-y-1 text-center text-xs text-slate-600 md:text-right">
                  <p className="font-medium text-slate-700">Activación automática.</p>
                  <p className="text-slate-500">Pago seguro con Webpay</p>
                </div>
              </div>
            </div>
            {transferenciaDisponible && !planProgramado ? (
              <>
                <div className="flex w-full flex-col gap-2 md:w-full md:max-w-md md:items-end">
                  <button
                    type="button"
                    aria-expanded={transferenciaExpanded}
                    onClick={() => {
                      setTransferenciaExpanded((o) => !o);
                      setTransferError(null);
                    }}
                    className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-base font-semibold text-slate-800 transition-all duration-200 hover:bg-slate-50"
                  >
                    {transferenciaExpanded
                      ? "Ocultar datos de transferencia"
                      : "Pagar por transferencia"}
                  </button>
                  <p className="w-full text-center text-xs text-slate-600 md:text-right">
                    Validación manual. Puede tardar algunas horas.
                  </p>
                </div>
                <input
                  ref={transferFileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) void handleUploadComprobante(f);
                  }}
                />
              </>
            ) : null}
          </div>
        </div>
        {transferenciaDisponible && transferenciaExpanded && !planProgramado ? (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm">
              <p className="text-xs text-slate-600 leading-relaxed">
                Transfiere el monto exacto y sube tu comprobante. Revisaremos el pago antes de activar
                el plan.
              </p>
              <p className="mt-4 font-bold text-gray-900">Transferencia bancaria</p>
              <dl className="mt-2 space-y-1.5 text-slate-700">
                <div className="flex flex-wrap gap-x-2 gap-y-0">
                  <dt className="shrink-0 font-medium text-slate-600">Banco</dt>
                  <dd className="min-w-0">{transferenciaUi.banco}</dd>
                </div>
                <div className="flex flex-wrap gap-x-2 gap-y-0">
                  <dt className="shrink-0 font-medium text-slate-600">Cuenta</dt>
                  <dd className="min-w-0">
                    {transferenciaUi.tipoCuenta} {transferenciaUi.numeroCuenta}
                  </dd>
                </div>
                <div className="flex flex-wrap gap-x-2 gap-y-0">
                  <dt className="shrink-0 font-medium text-slate-600">Rut</dt>
                  <dd className="min-w-0 tabular-nums">{transferenciaUi.rut}</dd>
                </div>
                <div className="flex flex-wrap gap-x-2 gap-y-0">
                  <dt className="shrink-0 font-medium text-slate-600">Correo</dt>
                  <dd className="min-w-0 break-all">{transferenciaUi.correo}</dd>
                </div>
                <div className="flex flex-wrap gap-x-2 gap-y-0">
                  <dt className="shrink-0 font-medium text-slate-600">Monto</dt>
                  <dd className="min-w-0 tabular-nums">{montoTransferSegunPlan}</dd>
                </div>
                <div className="flex flex-wrap gap-x-2 gap-y-0">
                  <dt className="shrink-0 font-medium text-slate-600">Referencia</dt>
                  <dd className="min-w-0 font-mono text-[0.8rem]">
                    {transferBusy && !pagoTransfer?.referencia
                      ? "Generando referencia…"
                      : pagoTransfer?.referencia || "—"}
                  </dd>
                </div>
              </dl>
              <button
                type="button"
                disabled={
                  transferBusy ||
                  !pagoTransfer?.id ||
                  !!pagoTransfer?.comprobanteUrl
                }
                onClick={() => transferFileRef.current?.click()}
                className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
              >
                {pagoTransfer?.comprobanteUrl
                  ? "Comprobante recibido"
                  : transferBusy && !pagoTransfer?.referencia
                    ? "Generando referencia…"
                    : transferBusy && pagoTransfer?.referencia
                      ? "Procesando…"
                      : "Subir comprobante"}
              </button>
            </div>
          </div>
        ) : null}
        {transferenciaDisponible && transferError ? (
          <p className="mt-3 text-sm text-amber-900 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            {transferError}
          </p>
        ) : null}
        {transferenciaDisponible && transferOkMsg ? (
          <p className="mt-3 text-sm text-emerald-900 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
            {transferOkMsg}
          </p>
        ) : null}
      </section>

      <section
        className="rounded-2xl border border-slate-200 bg-stone-50/70 p-6"
        aria-label="Tu perfil perderá"
      >
        <h2 className="text-lg font-black text-gray-900">Volverás a una ficha básica</h2>
        <p className="mt-1 text-sm text-slate-500">
          Tu negocio seguirá visible, pero con menos información y menor confianza visual.
        </p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-3 text-sm font-medium text-slate-800">
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
