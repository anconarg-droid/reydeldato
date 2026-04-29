"use client";

import React, {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { isPersistibleFotoUrl } from "@/lib/isPersistibleFotoUrl";
import {
  etiquetaModalidadAtencion,
  modalidadesAtencionInputsToDbUnique,
} from "@/lib/modalidadesAtencion";
import { publicarBorradorByIdPath } from "@/lib/publicarApi";
import {
  validateOptionalInstagram,
  validateOptionalWebsite,
} from "@/lib/contactoPublicoValidation";
import { validateRequiredPublicEmail } from "@/lib/validateEmail";
import {
  normalizeKeywordsUsuarioFromDbValue,
  parseKeywordsUsuarioInputToTextArray,
  readKeywordsUsuarioPreferJson,
} from "@/lib/keywordsUsuarioPostulacion";
import {
  chileWhatsappStorageToDisplay,
  formatChileWhatsappDisplay,
  normalizeAndValidateChileWhatsappStrict,
  sanitizeChileWhatsappInput,
} from "@/utils/phone";
import { getRegionShort } from "@/utils/regionShort";
import {
  DESCRIPCION_CORTA_MAX,
  DESCRIPCION_CORTA_MIN,
  normalizeDescripcionCorta,
  normalizeDescripcionLarga,
  primeraValidacionDescripcion,
  validateDescripcionCortaPublicacion,
  validateDescripcionLarga,
} from "@/lib/descripcionProductoForm";
import { MSG_LOCAL_FISICO_SIN_UBICACION } from "@/lib/postulacionLocalFisicoUbicacion";
import { clampDescripcionCortaFichaDisplay } from "@/lib/emprendedorFichaUi";
import {
  displayCapitalizeFirst,
  displayCapitalizeSentenceStarts,
  displayTitleCaseWords,
} from "@/lib/displayTextFormat";
import { formatInstagramDisplay, formatWebsiteDisplay } from "@/lib/formatPublicLinks";
import {
  ESTADO_PUBLICACION,
  emprendedorFichaVisiblePublicamente,
  normalizeEstadoPublicacionDb,
} from "@/lib/estadoPublicacion";
import {
  type ComunaCatalogRow,
  clampLocalesFisicosComunasWithCatalog,
  comunaRowsPermitidosLocales,
  comunaRowsSoloComunaBase,
  formatComunaCatalogLabel,
  formatComunaCatalogLabelCorto,
  principalLocalComunaMatchesBase,
  resolveComunaFromCatalog,
  serializeLocalesFisicosParaBorradorPatch,
} from "@/lib/localesComunasCatalog";
import {
  Check,
  ChevronDown,
  Globe,
  Home,
  Package,
  Pencil,
  Store,
  type LucideIcon,
} from "lucide-react";
import { panelSlugFichaPublicaDesdeItem } from "@/lib/panelItemToSearchCardProps";

const UPGRADE_WA_INVALID = "__UPGRADE_WA_INVALID__";
const UPGRADE_WA_SEC_INVALID = "__UPGRADE_WA_SEC_INVALID__";
const UPGRADE_WA_SEC_DUP = "__UPGRADE_WA_SEC_DUP__";

function keywordsUsuarioFromPanelJson(json: Record<string, unknown>): string {
  const fromRow = readKeywordsUsuarioPreferJson(json);
  if (fromRow.length) return fromRow.join(", ");
  const v = json.palabras_clave;
  if (Array.isArray(v)) return normalizeKeywordsUsuarioFromDbValue(v).join(", ");
  if (typeof v === "string") return v.trim();
  return "";
}

const MSG_GUARDAR_FALLBACK =
  "Error al guardar. Revisa los datos e intenta nuevamente.";

const MSG_FICHA_REVISION_GUARDADO =
  "Tu emprendimiento está en revisión. Te avisaremos cuando esté publicado.";

const MSG_GALERIA_SUBIENDO = "Subiendo imágenes…";
const MSG_GALERIA_OK = "Fotos subidas correctamente.";
const MSG_GALERIA_UNA_FALLA =
  "Una imagen falló al subir. Revisa e intenta nuevamente.";
const MSG_GALERIA_PERSIST_FALLA =
  "Las fotos se subieron pero no se guardaron en la ficha.";

/**
 * Logs galería /mejorar-ficha: solo en `development` o `NEXT_PUBLIC_DEBUG_GALERIA=1`.
 * En producción no emite consola (TAREA 7).
 */
const DEBUG_MEJORAR_FICHA_GALERIA =
  typeof process !== "undefined" &&
  (process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_DEBUG_GALERIA === "1");

function logMejorarFichaGaleria(phase: string, detail?: unknown): void {
  if (!DEBUG_MEJORAR_FICHA_GALERIA) return;
  if (detail !== undefined) {
    console.log(`[mejorar-ficha galeria] ${phase}`, detail);
  } else {
    console.log(`[mejorar-ficha galeria] ${phase}`);
  }
}

/**
 * Si `descripcion_libre` quedó igual que la frase corta (legacy / migraciones),
 * el campo largo debe mostrarse vacío: el texto corto solo vive en descripción corta.
 */
function descripcionLargaFormSinRedundancia(
  descripcionCorta: string,
  descripcionLarga: string
): string {
  const c = normalizeDescripcionCorta(descripcionCorta.trim());
  const lNorm = normalizeDescripcionLarga(descripcionLarga.trim());
  if (!lNorm) return "";
  if (c && lNorm === c) return "";
  return descripcionLarga.trim();
}

function logBorradorPatchFailure(
  context: string,
  info: {
    httpStatus: number;
    borradorId?: string;
    phase?: string;
    apiMessage?: string;
    rawSnippet?: string;
    parseError?: string;
    supabase?: unknown;
  }
) {
  console.error(`[mejorar-ficha] ${context}`, info);
}

/**
 * `res.text()` puede traer BOM, espacios o cuerpo vacío; `JSON.parse(" ")` lanza.
 * Normaliza antes de parsear y exige objeto (no array).
 */
function parsePublicarBorradorResponseText(rawText: string):
  | { ok: true; data: Record<string, unknown> | null }
  | { ok: false; parseError: string } {
  const trimmed = rawText.replace(/^\uFEFF/, "").trim();
  if (!trimmed) {
    return { ok: true, data: null };
  }
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        ok: false,
        parseError: "La respuesta no es un objeto JSON.",
      };
    }
    return { ok: true, data: parsed as Record<string, unknown> };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, parseError: msg };
  }
}

function userMessageForBorradorPatchResponse(
  res: Response,
  data: Record<string, unknown> | null,
  rawText: string
): string {
  const phase = typeof data?.phase === "string" ? data.phase : "";
  const apiMsg =
    (typeof data?.message === "string" && data.message.trim()) ||
    (typeof data?.error === "string" && data.error.trim()) ||
    "";

  logBorradorPatchFailure("PATCH /api/publicar/borrador/[id] respuesta no OK", {
    httpStatus: res.status,
    phase,
    apiMessage: apiMsg || undefined,
    rawSnippet: rawText.slice(0, 800),
    supabase: data?.supabase,
  });

  if (res.status >= 400 && res.status < 500 && apiMsg) {
    return apiMsg;
  }
  return MSG_GUARDAR_FALLBACK;
}

/** Ruta amigable `/{comuna}/e/{slug}`; sin comuna cae en `/emprendedor/{slug}`. */
function buildFichaPublicaAmigaPath(comunaSlug: string, slugSegment: string): string {
  const s = slugSegment.trim();
  if (!s) return "";
  const c = comunaSlug.trim();
  if (c) return `/${encodeURIComponent(c)}/e/${encodeURIComponent(s)}`;
  return `/emprendedor/${encodeURIComponent(s)}`;
}

/** Activa logs `[NegocioForm:postSave-debug]` en consola: `sessionStorage.setItem("NF_DEBUG_POST_SAVE","1")` y recarga. */
function nfPostSaveDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem("NF_DEBUG_POST_SAVE") === "1";
  } catch {
    return false;
  }
}

const POST_SAVE_NAV_STYLES = `
.nf-post-save-nav{
  border:1px solid #e5e7eb;
  border-left:4px solid #0d9488;
  background:#ffffff;
  border-radius:16px;
  padding:28px 24px;
  margin:0;
  box-sizing:border-box;
  box-shadow:0 2px 12px rgba(15,23,42,0.06);
}
.nf-post-save-nav-title{
  margin:0 0 8px;
  font-size:18px;
  font-weight:900;
  color:#0f172a;
  letter-spacing:-0.02em;
}
.nf-post-save-nav-sub{
  margin:0 0 20px;
  font-size:14px;
  font-weight:500;
  color:#64748b;
  line-height:1.55;
}
.nf-post-save-nav-actions{
  display:flex;
  flex-wrap:wrap;
  gap:10px;
  align-items:center;
}
.nf-post-save-nav-btn{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  min-height:44px;
  padding:0 16px;
  border-radius:12px;
  font-weight:800;
  font-size:14px;
  text-decoration:none;
  border:1px solid transparent;
  cursor:pointer;
  box-sizing:border-box;
  font-family:inherit;
}
.nf-post-save-nav-btn--primary{
  background:#0d9488;
  color:#fff;
  border-color:#0d9488;
}
.nf-post-save-nav-btn--primary:hover{background:#0f766e}
.nf-post-save-nav-btn--secondary{
  background:#fff;
  color:#0f172a;
  border-color:#e5e7eb;
}
.nf-post-save-nav-btn--secondary:hover{background:#f8fafc}
.nf-post-save-nav-btn--ghost{
  background:transparent;
  color:#166534;
  border-color:transparent;
  text-decoration:underline;
  text-underline-offset:3px;
  min-height:auto;
  padding:8px 4px;
}
.nf-post-save-nav-ficha-no-publica{
  margin:0;
  font-size:14px;
  font-weight:800;
  color:#92400e;
  line-height:1.45;
  max-width:min(100%,320px);
}
`;

/** Post-guardado desde panel: feedback neutro (sin bloque verde de “publicación”). */
const POST_SAVE_PANEL_SIMPLE_STYLES = `
.nf-post-save-panel-simple{
  border:1px solid #e2e8f0;
  background:#fff;
  border-radius:16px;
  padding:20px 22px;
  margin:0;
  box-sizing:border-box;
}
.nf-post-save-panel-simple-title{
  margin:0 0 14px;
  font-size:17px;
  font-weight:900;
  color:#0f172a;
  letter-spacing:-0.02em;
  text-align:center;
}
/* Mismas reglas que POST_SAVE_NAV_STYLES para acciones (si no, los nodos quedan inline y pegados). */
.nf-post-save-panel-simple .nf-post-save-nav-actions{
  display:flex;
  flex-direction:column;
  flex-wrap:nowrap;
  gap:10px;
  align-items:stretch;
  width:100%;
}
.nf-post-save-panel-simple .nf-post-save-nav-btn{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  min-height:44px;
  padding:0 16px;
  border-radius:12px;
  font-weight:800;
  font-size:14px;
  text-decoration:none;
  border:1px solid transparent;
  cursor:pointer;
  box-sizing:border-box;
  font-family:inherit;
  width:100%;
}
.nf-post-save-panel-simple .nf-post-save-nav-btn--primary{
  background:#15803d;
  color:#fff;
  border-color:#15803d;
}
.nf-post-save-panel-simple .nf-post-save-nav-btn--primary:hover{background:#166534}
.nf-post-save-panel-simple .nf-post-save-nav-btn--secondary{
  background:#fff;
  color:#0f172a;
  border-color:#e2e8f0;
}
.nf-post-save-panel-simple .nf-post-save-nav-btn--secondary:hover{background:#f8fafc}
.nf-post-save-panel-simple .nf-post-save-nav-btn--ghost{
  background:transparent;
  color:#0369a1;
  border-color:transparent;
  text-decoration:underline;
  text-underline-offset:3px;
  min-height:auto;
  padding:10px 4px;
}
`;

type ComunaOption = {
  slug: string;
  nombre: string;
  regionNombre: string;
};

type CoberturaTipo =
  | "solo_comuna"
  | "varias_comunas"
  | "regional"
  | "nacional";

type ModalidadAtencion =
  | "local_fisico"
  | "delivery"
  | "domicilio"
  | "online"
  | "presencial_terreno";

const MAX_LOCALES_FISICOS = 3;

type LocalFisicoFormItem = {
  clientId: string;
  comunaSlug: string;
  direccion: string;
  referencia: string;
  esPrincipal: boolean;
};

function newLocalFisicoClientId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `lf-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeLocalFisicoFromUnknown(raw: unknown): LocalFisicoFormItem {
  if (raw != null && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    const cid =
      typeof o.clientId === "string" && o.clientId.trim()
        ? o.clientId.trim()
        : newLocalFisicoClientId();
    const slug =
      typeof o.comunaSlug === "string" && o.comunaSlug.trim()
        ? o.comunaSlug.trim()
        : typeof o.comuna_slug === "string"
          ? o.comuna_slug.trim()
          : "";
    const esPr = o.esPrincipal === true || o.es_principal === true;
    const refRaw = o.referencia;
    const ref =
      refRaw == null ? "" : typeof refRaw === "string" ? refRaw.trim() : "";
    return {
      clientId: cid,
      comunaSlug: slug,
      direccion: String(o.direccion ?? "").trim(),
      referencia: ref,
      esPrincipal: esPr,
    };
  }
  return {
    clientId: newLocalFisicoClientId(),
    comunaSlug: "",
    direccion: "",
    referencia: "",
    esPrincipal: false,
  };
}

const MEJORAR_FICHA_MODALIDAD_TARJETAS: readonly {
  modalidad: Exclude<ModalidadAtencion, "presencial_terreno">;
  titulo: string;
  subtitulo: string;
  Icon: LucideIcon;
}[] = [
  {
    modalidad: "local_fisico",
    titulo: "Local físico",
    subtitulo: "Atiendes en tu local",
    Icon: Store,
  },
  {
    modalidad: "domicilio",
    titulo: "A domicilio",
    subtitulo: "Vas donde el cliente",
    Icon: Home,
  },
  {
    modalidad: "delivery",
    titulo: "Delivery",
    subtitulo: "Enviás el pedido",
    Icon: Package,
  },
  {
    modalidad: "online",
    titulo: "Online",
    subtitulo: "Trabajás de forma digital",
    Icon: Globe,
  },
];

type FormState = {
  nombre: string;
  responsable: string;

  categoriaSlug: string;
  subcategoriasSlugs: string[];

  comunaBaseSlug: string;
  coberturaTipo: CoberturaTipo;
  comunasCoberturaSlugs: string[];
  regionesCoberturaSlugs: string[];

  modalidadesAtencion: ModalidadAtencion[];

  descripcionCorta: string;
  descripcionLarga: string;

  /** Opcional, no visible públicamente; ayuda a clasificación/búsqueda. */
  keywordsUsuario: string;

  whatsapp: string;
  whatsappSecundario: string;
  instagram: string;
  web: string;
  email: string;

  fotoPrincipalUrl: string;
  galeriaUrls: string[];

  /** Locales físicos (máx. 3); el marcado como principal debe estar en la comuna base. */
  localesFisicos: LocalFisicoFormItem[];
};

type FormErrors = Partial<Record<keyof FormState, string>> & {
  general?: string;
};

const COMUNAS: ComunaOption[] = [
  { slug: "talagante", nombre: "Talagante", regionNombre: "Región Metropolitana" },
  { slug: "penaflor", nombre: "Peñaflor", regionNombre: "Región Metropolitana" },
  { slug: "padre-hurtado", nombre: "Padre Hurtado", regionNombre: "Región Metropolitana" },
  { slug: "calera-de-tango", nombre: "Calera de Tango", regionNombre: "Región Metropolitana" },
  { slug: "maipu", nombre: "Maipú", regionNombre: "Región Metropolitana" },
  { slug: "santiago", nombre: "Santiago", regionNombre: "Región Metropolitana" },
  { slug: "san-bernardo", nombre: "San Bernardo", regionNombre: "Región Metropolitana" },
  { slug: "buin", nombre: "Buin", regionNombre: "Región Metropolitana" },
  { slug: "melipilla", nombre: "Melipilla", regionNombre: "Región Metropolitana" },
  { slug: "puente-alto", nombre: "Puente Alto", regionNombre: "Región Metropolitana" },
];

function tituloDesdeSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function normalizeLocalesSearchText(value: string): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

type LocalesComunaPickerMode = "solo_base" | "fixed_list" | "free_search";

function localesComunaPickerModeFromCobertura(t: CoberturaTipo): LocalesComunaPickerMode {
  if (t === "solo_comuna") return "solo_base";
  if (t === "varias_comunas") return "fixed_list";
  return "free_search";
}

const INITIAL_STATE: FormState = {
  nombre: "",
  responsable: "",

  categoriaSlug: "",
  subcategoriasSlugs: [],

  comunaBaseSlug: "",
  coberturaTipo: "solo_comuna",
  comunasCoberturaSlugs: [],
  regionesCoberturaSlugs: [],

  modalidadesAtencion: [],

  descripcionCorta: "",
  descripcionLarga: "",
  keywordsUsuario: "",

  whatsapp: "",
  whatsappSecundario: "",
  instagram: "",
  web: "",
  email: "",

  fotoPrincipalUrl: "",
  galeriaUrls: Array.from({ length: 8 }, () => ""),

  localesFisicos: [],
};

/**
 * Quita campos de cobertura del ítem del panel para no pisar chips que el usuario ya editó
 * cuando llega un GET tardío (p. ej. pivot publicado vs postulación `edicion_publicado`).
 */
function stripPanelItemCoberturaForStaleHydrate(
  item: Partial<FormState>
): Partial<FormState> {
  const o = item as Record<string, unknown>;
  const {
    comunasCoberturaSlugs: _cc,
    coberturaTipo: _ct,
    regionesCoberturaSlugs: _rc,
    ...rest
  } = o;
  return rest as Partial<FormState>;
}

/** GET panel negocio: si la URL trae token, se envía para misma prioridad que el backend. */
function panelNegocioGetUrlForHydrate(empId: string): string {
  const qs = new URLSearchParams();
  qs.set("id", empId);
  if (typeof window !== "undefined") {
    const p = new URLSearchParams(window.location.search);
    const tok = (p.get("access_token") || p.get("token") || "").trim();
    if (tok.length >= 8) qs.set("access_token", tok);
  }
  return `/api/panel/negocio?${qs.toString()}`;
}

function PanelCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 24,
        background: "#fff",
        padding: 24,
      }}
    >
      <h2
        style={{
          margin: "0 0 8px 0",
          fontSize: 28,
          lineHeight: 1.02,
          fontWeight: 900,
          color: "#111827",
        }}
      >
        {title}
      </h2>

      {subtitle ? (
        <p
          style={{
            margin: "0 0 18px 0",
            fontSize: 15,
            lineHeight: 1.55,
            color: "#6b7280",
          }}
        >
          {subtitle}
        </p>
      ) : null}

      {children}
    </section>
  );
}

function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label
      style={{
        display: "block",
        marginBottom: 8,
        fontSize: 14,
        fontWeight: 800,
        color: "#111827",
      }}
    >
      {children} {required ? <span style={{ color: "#dc2626" }}>*</span> : null}
    </label>
  );
}

/** Etiqueta + icono para bloque contacto /mejorar-ficha (sin tocar FieldLabel global). */
function ContactoUpgradeLabel({
  icon,
  children,
  required,
  emphasize,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  required?: boolean;
  /** WhatsApp principal: etiqueta más visible. */
  emphasize?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 8,
      }}
    >
      <span style={{ display: "flex", flexShrink: 0, alignItems: "center" }}>{icon}</span>
      <label
        style={{
          margin: 0,
          fontSize: emphasize ? 15 : 14,
          fontWeight: emphasize ? 900 : 800,
          color: emphasize ? "#0f172a" : "#111827",
          lineHeight: 1.25,
          letterSpacing: emphasize ? "-0.02em" : undefined,
        }}
      >
        {children} {required ? <span style={{ color: "#dc2626" }}>*</span> : null}
      </label>
    </div>
  );
}

function WhatsAppGlyph() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0 }}>
      <path
        fill="#25d366"
        d="M12.04 2a9.94 9.94 0 0 0-8.47 15.14L2 22l5.02-1.32A9.94 9.94 0 1 0 12.04 2zm5.48 14.28c-.24.67-1.37 1.3-1.9 1.38-.48.08-1.1.11-1.78-.13-.41-.14-.95-.33-1.64-.65-2.88-1.24-4.74-4.1-4.88-4.3-.14-.2-1.17-1.56-1.17-2.97s.74-2.11 1-2.4c.26-.29.57-.36.76-.36l.55.01c.18 0 .42-.07.65.5.24.6.82 2.08.9 2.23.08.15.13.33.02.53-.11.2-.16.33-.32.52-.16.18-.33.41-.47.55-.16.16-.33.34-.14.66.18.31.82 1.35 1.76 2.18 1.21 1.08 2.23 1.42 2.55 1.58.32.16.51.13.7-.08.18-.2.8-.93 1.02-1.25.22-.31.44-.26.74-.16.31.1 1.95.92 2.28 1.09.34.16.56.24.64.38.08.14.08.81-.16 1.51z"
      />
    </svg>
  );
}

function InstagramGlyph({ tone = "brand" }: { tone?: "brand" | "neutral" }) {
  const gradId = useId().replace(/:/g, "");
  const stroke = tone === "neutral" ? "#64748b" : `url(#ig-stroke-${gradId})`;
  const fillDot = tone === "neutral" ? "#64748b" : `url(#ig-fill-${gradId})`;
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0 }}>
      {tone === "brand" ? (
        <defs>
          <linearGradient id={`ig-stroke-${gradId}`} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f09433" />
            <stop offset="0.25" stopColor="#e6683c" />
            <stop offset="0.5" stopColor="#dc2743" />
            <stop offset="0.75" stopColor="#cc2366" />
            <stop offset="100%" stopColor="#bc1888" />
          </linearGradient>
          <linearGradient id={`ig-fill-${gradId}`} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f09433" />
            <stop offset="100%" stopColor="#bc1888" />
          </linearGradient>
        </defs>
      ) : null}
      <rect
        x={3}
        y={3}
        width={18}
        height={18}
        rx={4.5}
        fill="none"
        stroke={stroke}
        strokeWidth={1.6}
      />
      <circle cx={12} cy={12} r={3.8} fill="none" stroke={stroke} strokeWidth={1.6} />
      <circle cx={17.2} cy={6.8} r={1.2} fill={fillDot} />
    </svg>
  );
}

function WebGlyph({ tone = "brand" }: { tone?: "brand" | "neutral" }) {
  const stroke = tone === "neutral" ? "#64748b" : "#0284c7";
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0 }}>
      <circle cx={12} cy={12} r={9} fill="none" stroke={stroke} strokeWidth={1.6} />
      <ellipse
        cx={12}
        cy={12}
        rx={4}
        ry={9}
        fill="none"
        stroke={stroke}
        strokeWidth={1.6}
      />
      <path
        d="M3 12h18"
        fill="none"
        stroke={stroke}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </svg>
  );
}

function UserCircleGlyph() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0 }}>
      <circle cx={12} cy={8} r={3.2} fill="none" stroke="#475569" strokeWidth={1.6} />
      <path
        d="M6.5 19.2c.8-3.2 3.4-5.2 5.5-5.2s4.7 2 5.5 5.2"
        fill="none"
        stroke="#475569"
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </svg>
  );
}

type TextInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  dense?: boolean;
} & Omit<React.ComponentPropsWithoutRef<"input">, "value" | "onChange">;

function TextInput({
  value,
  onChange,
  placeholder,
  error,
  type = "text",
  dense = false,
  style,
  ...inputProps
}: TextInputProps) {
  const { className, ...restInput } = inputProps;

  const mergedStyle: React.CSSProperties = {
    width: "100%",
    minHeight: dense ? 40 : 50,
    borderRadius: dense ? 10 : 14,
    border: error ? "1px solid #dc2626" : "1px solid #d1d5db",
    padding: dense ? "0 10px" : "0 14px",
    fontSize: dense ? 13 : 15,
    outline: "none",
    background: "#fff",
    ...(style && typeof style === "object" ? style : {}),
  };

  const mergedClass = className || undefined;

  return (
    <>
      <input
        {...restInput}
        type={type}
        className={mergedClass}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={mergedStyle}
        aria-invalid={error ? true : restInput["aria-invalid"]}
      />
      {error ? (
        <div style={{ marginTop: 6, fontSize: 13, color: "#b91c1c" }} role="alert">
          {error}
        </div>
      ) : null}
    </>
  );
}

function TextArea({
  value,
  onChange,
  placeholder,
  error,
  rows = 4,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  rows?: number;
}) {
  return (
    <>
      <textarea
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        style={{
          width: "100%",
          borderRadius: 14,
          border: error ? "1px solid #dc2626" : "1px solid #d1d5db",
          padding: "12px 14px",
          fontSize: 15,
          outline: "none",
          background: "#fff",
          resize: "vertical",
        }}
      />
      {error ? (
        <div style={{ marginTop: 6, fontSize: 13, color: "#b91c1c" }}>
          {error}
        </div>
      ) : null}
    </>
  );
}

function SelectInput({
  value,
  onChange,
  options,
  placeholder,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  error?: string;
}) {
  return (
    <>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          minHeight: 50,
          borderRadius: 14,
          border: error ? "1px solid #dc2626" : "1px solid #d1d5db",
          padding: "0 14px",
          fontSize: 15,
          outline: "none",
          background: "#fff",
        }}
      >
        <option value="">{placeholder || "Selecciona una opción"}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {error ? (
        <div style={{ marginTop: 6, fontSize: 13, color: "#b91c1c" }}>
          {error}
        </div>
      ) : null}
    </>
  );
}

function LocalesComunaAutocomplete({
  catalog,
  catalogLoading,
  valueSlug,
  onPick,
}: {
  catalog: ComunaCatalogRow[];
  catalogLoading: boolean;
  valueSlug: string;
  onPick: (slug: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const blurRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedLabel = useMemo(() => {
    const r = resolveComunaFromCatalog(catalog, valueSlug);
    return r ? formatComunaCatalogLabel(r) : "";
  }, [catalog, valueSlug]);

  const suggestions = useMemo(() => {
    const needle = normalizeLocalesSearchText(q);
    const list = catalog.map((c) => ({
      c,
      n: normalizeLocalesSearchText(
        `${c.nombre} ${c.regionNombre} ${String(c.slug).replace(/-/g, " ")}`
      ),
    }));
    if (!needle) return list.slice(0, 25).map((x) => x.c);
    return list.filter((x) => x.n.includes(needle)).slice(0, 25).map((x) => x.c);
  }, [catalog, q]);

  if (catalogLoading || catalog.length === 0) {
    return (
      <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
        {catalogLoading ? "Cargando comunas…" : "No se pudieron cargar las comunas."}
      </p>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <input
        type="text"
        autoComplete="off"
        aria-label="Buscar comuna del local"
        placeholder="Escribí para buscar comuna (ej. Maipú)"
        value={open ? q : selectedLabel}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (blurRef.current) {
            clearTimeout(blurRef.current);
            blurRef.current = null;
          }
          setOpen(true);
          setQ(selectedLabel);
        }}
        onBlur={() => {
          blurRef.current = setTimeout(() => {
            setOpen(false);
            setQ("");
          }, 200);
        }}
        style={{
          width: "100%",
          minHeight: 50,
          borderRadius: 14,
          border: "1px solid #d1d5db",
          padding: "0 14px",
          fontSize: 15,
          outline: "none",
          background: "#fff",
        }}
      />
      {open && (suggestions.length > 0 || normalizeLocalesSearchText(q)) ? (
        <div
          style={{
            position: "absolute",
            zIndex: 30,
            left: 0,
            right: 0,
            top: "100%",
            marginTop: 4,
            maxHeight: 260,
            overflowY: "auto",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            background: "#fff",
            boxShadow: "0 12px 40px rgba(15,23,42,0.14)",
          }}
        >
          {suggestions.length === 0 ? (
            <div style={{ padding: 12, fontSize: 13, color: "#64748b" }}>
              Sin resultados. Probá otro texto.
            </div>
          ) : (
            suggestions.map((c) => (
              <button
                key={String(c.id)}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onPick(c.slug);
                  setOpen(false);
                  setQ("");
                }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 14px",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                {formatComunaCatalogLabel(c)}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

/** Solo suma comunas a cobertura «varias comunas»; misma región que la comuna base; excluye base y ya elegidas. */
function CoberturaComunasAddAutocomplete({
  catalog,
  catalogLoading,
  comunaBaseSlug,
  selectedSlugs,
  onAdd,
}: {
  catalog: ComunaCatalogRow[];
  catalogLoading: boolean;
  comunaBaseSlug: string;
  selectedSlugs: string[];
  onAdd: (slug: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const blurRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedSet = useMemo(() => new Set(selectedSlugs), [selectedSlugs]);

  const baseRow = useMemo(
    () => resolveComunaFromCatalog(catalog, comunaBaseSlug),
    [catalog, comunaBaseSlug]
  );

  const regionNombreNorm = useMemo(
    () =>
      baseRow
        ? normalizeLocalesSearchText(String(baseRow.regionNombre ?? "").trim())
        : "",
    [baseRow]
  );

  const regionNombreDisplay = baseRow
    ? String(baseRow.regionNombre ?? "").trim()
    : "";

  /** Comunas de la misma región que la base, excl. base y ya en cobertura. */
  const poolRegional = useMemo(() => {
    if (!regionNombreNorm) return [];
    return catalog.filter(
      (c) =>
        normalizeLocalesSearchText(String(c.regionNombre ?? "").trim()) ===
          regionNombreNorm &&
        c.slug !== comunaBaseSlug &&
        !selectedSet.has(c.slug)
    );
  }, [catalog, regionNombreNorm, comunaBaseSlug, selectedSet]);

  const placeholderEjemplos = useMemo(() => {
    if (!comunaBaseSlug.trim()) {
      return "Primero elige tu comuna base arriba…";
    }
    if (!baseRow || !regionNombreNorm) {
      return "No pudimos detectar la región de tu comuna base.";
    }
    const ej = catalog
      .filter(
        (c) =>
          normalizeLocalesSearchText(String(c.regionNombre ?? "").trim()) ===
            regionNombreNorm && c.slug !== comunaBaseSlug
      )
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
      .slice(0, 3)
      .map((c) => c.nombre.trim())
      .filter(Boolean);
    if (!ej.length) {
      return regionNombreDisplay
        ? `Buscar comuna en ${regionNombreDisplay}…`
        : "Buscar comuna…";
    }
    return `Ej.: ${ej.join(", ")}…`;
  }, [
    catalog,
    baseRow,
    regionNombreNorm,
    regionNombreDisplay,
    comunaBaseSlug,
  ]);

  const queryNorm = normalizeLocalesSearchText(q);

  const suggestions = useMemo(() => {
    if (!queryNorm) return [];
    const list = poolRegional.map((c) => ({
      c,
      n: normalizeLocalesSearchText(
        `${c.nombre} ${String(c.slug).replace(/-/g, " ")}`
      ),
    }));
    return list.filter((x) => x.n.includes(queryNorm)).slice(0, 25).map((x) => x.c);
  }, [poolRegional, queryNorm]);

  if (catalogLoading || catalog.length === 0) {
    return (
      <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
        {catalogLoading ? "Cargando comunas…" : "No se pudieron cargar las comunas."}
      </p>
    );
  }

  const puedeBuscar = Boolean(regionNombreNorm && baseRow);
  const ariaRegion = regionNombreDisplay || "tu región";

  return (
    <div style={{ position: "relative" }}>
      {!puedeBuscar ? (
        <p style={{ margin: "0 0 8px", fontSize: 13, color: "#64748b" }}>
          {comunaBaseSlug.trim()
            ? "No encontramos la región de tu comuna base. Revisala arriba."
            : "Elige comuna base arriba para buscar en la misma región."}
        </p>
      ) : null}
      <input
        type="text"
        autoComplete="off"
        disabled={!puedeBuscar}
        aria-label={`Buscar comuna en ${ariaRegion} para agregar a la cobertura`}
        placeholder={placeholderEjemplos}
        value={q}
        onChange={(e) => {
          const v = e.target.value;
          setQ(v);
          setOpen(normalizeLocalesSearchText(v).length > 0);
        }}
        onFocus={() => {
          if (blurRef.current) {
            clearTimeout(blurRef.current);
            blurRef.current = null;
          }
          if (normalizeLocalesSearchText(q).length > 0) {
            setOpen(true);
          }
        }}
        onBlur={() => {
          blurRef.current = setTimeout(() => {
            setOpen(false);
          }, 200);
        }}
        style={{
          width: "100%",
          minHeight: 50,
          borderRadius: 14,
          border: "1px solid #d1d5db",
          padding: "0 14px",
          fontSize: 15,
          outline: "none",
          background: puedeBuscar ? "#fff" : "#f1f5f9",
          color: puedeBuscar ? "#0f172a" : "#94a3b8",
          cursor: puedeBuscar ? "text" : "not-allowed",
        }}
      />
      {puedeBuscar && poolRegional.length === 0 ? (
        <p style={{ margin: "8px 0 0", fontSize: 13, color: "#64748b" }}>
          No quedan más comunas de tu región para sumar.
        </p>
      ) : null}
      {open && puedeBuscar && queryNorm ? (
        <div
          style={{
            position: "absolute",
            zIndex: 30,
            left: 0,
            right: 0,
            top: "100%",
            marginTop: 4,
            maxHeight: 260,
            overflowY: "auto",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            background: "#fff",
            boxShadow: "0 12px 40px rgba(15,23,42,0.14)",
          }}
        >
          {suggestions.length === 0 ? (
            <div style={{ padding: 12, fontSize: 13, color: "#64748b" }}>
              Sin resultados en {regionNombreDisplay}. Probá otro nombre.
            </div>
          ) : (
            suggestions.map((c) => (
              <button
                key={String(c.id)}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onAdd(c.slug);
                  setQ("");
                  setOpen(false);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 14px",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                {c.nombre}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

function LocalesComunaPicker({
  mode,
  catalog,
  catalogLoading,
  allowedRows,
  valueSlug,
  onChange,
  emptyFixedHint,
  soloBaseSubcopy,
}: {
  mode: LocalesComunaPickerMode;
  catalog: ComunaCatalogRow[];
  catalogLoading: boolean;
  /** Filas ya resueltas desde `comunas` (sin duplicados por id). */
  allowedRows: ComunaCatalogRow[];
  valueSlug: string;
  onChange: (slug: string) => void;
  emptyFixedHint: string;
  /** Texto bajo la comuna en modo `solo_base` (p. ej. local principal con cobertura multi-comuna). */
  soloBaseSubcopy?: string;
}) {
  if (mode === "solo_base") {
    if (catalogLoading) {
      return (
        <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>Cargando comunas…</p>
      );
    }
    if (allowedRows.length === 0) {
      return (
        <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{emptyFixedHint}</p>
      );
    }
    const row0 = allowedRows[0];
    return (
      <div
        style={{
          padding: "12px 14px",
          borderRadius: 14,
          border: "1px solid #e2e8f0",
          background: "#f8fafc",
          fontSize: 15,
          color: "#0f172a",
        }}
      >
        {formatComunaCatalogLabel(row0)}
        <span
          style={{
            display: "block",
            marginTop: 6,
            fontSize: 12,
            color: "#64748b",
          }}
        >
          {soloBaseSubcopy ??
            "En cobertura «solo mi comuna» el local queda en tu comuna base."}
        </span>
      </div>
    );
  }

  if (mode === "fixed_list") {
    if (catalogLoading) {
      return (
        <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>Cargando comunas…</p>
      );
    }
    if (allowedRows.length === 0) {
      return (
        <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{emptyFixedHint}</p>
      );
    }
    const slugs = allowedRows.map((r) => r.slug);
    const resolvedVal = resolveComunaFromCatalog(catalog, valueSlug);
    const safeVal =
      resolvedVal && slugs.includes(resolvedVal.slug) ? resolvedVal.slug : allowedRows[0].slug;
    const options = allowedRows.map((c) => ({
      value: c.slug,
      label: formatComunaCatalogLabel(c),
    }));
    return (
      <SelectInput
        value={safeVal}
        onChange={onChange}
        placeholder="Selecciona comuna"
        options={options}
      />
    );
  }

  return (
    <LocalesComunaAutocomplete
      catalog={catalog}
      catalogLoading={catalogLoading}
      valueSlug={valueSlug}
      onPick={onChange}
    />
  );
}

function CheckboxPill({
  checked,
  onClick,
  children,
  size = "default",
  variant = "default",
}: {
  checked: boolean;
  onClick: () => void;
  children: React.ReactNode;
  size?: "default" | "large";
  /** Estilo tipo filtro (modalidades): gris claro / slate oscuro, más compacto. */
  variant?: "default" | "filter";
}) {
  const lg = size === "large";
  const filter = variant === "filter";

  if (filter) {
    return (
      <button
        type="button"
        onClick={onClick}
        style={{
          border: `1px solid ${checked ? "#0f172a" : "#e2e8f0"}`,
          background: checked ? "#0f172a" : "#f1f5f9",
          color: checked ? "#fff" : "#334155",
          borderRadius: 8,
          padding: lg ? "6px 12px" : "5px 11px",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          width: lg ? "100%" : undefined,
          minHeight: lg ? 36 : undefined,
          textAlign: lg ? "left" : "center",
          lineHeight: 1.3,
          boxSizing: "border-box",
        }}
      >
        {children}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: checked ? "1px solid #111827" : "1px solid #d1d5db",
        background: checked ? "#111827" : "#fff",
        color: checked ? "#fff" : "#111827",
        borderRadius: lg ? 16 : 999,
        padding: lg ? "14px 18px" : "10px 14px",
        fontSize: lg ? 15 : 14,
        fontWeight: 800,
        cursor: "pointer",
        width: lg ? "100%" : undefined,
        minHeight: lg ? 52 : undefined,
        textAlign: lg ? "left" : "center",
        lineHeight: lg ? 1.35 : undefined,
        boxSizing: "border-box",
      }}
    >
      {children}
    </button>
  );
}

const NF_UPGRADE_STYLES = `
.nf-upgrade-root{width:100%;max-width:1320px;margin:0 auto;box-sizing:border-box;display:flex;flex-direction:column;gap:24px}
.nf-upgrade-editor-layout{display:flex;flex-direction:column;gap:24px;align-items:stretch;width:100%}
.nf-upgrade-editor-main{min-width:0;flex:1;display:flex;flex-direction:column;gap:24px}
.nf-upgrade-editor-preview{width:100%;max-width:100%}
@media (min-width:1100px){
  .nf-upgrade-editor-layout{
    flex-direction:row;
    align-items:flex-start;
    gap:28px;
  }
  .nf-upgrade-editor-main{flex:1;min-width:0}
  .nf-upgrade-editor-preview{
    width:340px;
    flex-shrink:0;
    position:sticky;
    top:20px;
    align-self:flex-start;
  }
}
.nf-upgrade-fotos-pane{min-width:0;width:100%}
.nf-upgrade-ficha-resumen{
  border:1px solid #e2e8f0;
  border-radius:16px;
  background:#ffffff;
  padding:0;
  overflow:hidden;
  box-shadow:0 0 0 1px rgba(225,48,108,0.12),0 4px 18px rgba(15,23,42,0.08),0 1px 3px rgba(15,23,42,0.06);
  display:flex;
  flex-direction:column;
  min-height:0;
}
.nf-upgrade-ficha-resumen-foto{
  width:100%;
  flex-shrink:0;
  box-sizing:border-box;
  background:#f1f5f9;
  border-bottom:1px solid #e2e8f0;
  overflow:hidden;
  border-radius:16px 16px 0 0;
}
.nf-upgrade-ficha-resumen-foto .preview-image{
  width:100%;
  height:150px;
  overflow:hidden;
  flex-shrink:0;
}
.nf-upgrade-ficha-resumen-foto .preview-image img{
  width:100%;
  height:100%;
  object-fit:cover;
  object-position:center;
  display:block;
}
.nf-upgrade-ficha-resumen-foto-placeholder{
  margin:0;
  padding:12px 14px;
  width:100%;
  height:150px;
  min-height:150px;
  box-sizing:border-box;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:11px;
  font-weight:700;
  color:#94a3b8;
  text-align:center;
  line-height:1.4;
}
.nf-upgrade-ficha-resumen-inner{
  flex:1;
  min-height:0;
  padding:14px 16px 16px;
  display:flex;
  flex-direction:column;
  background:#ffffff;
}
.nf-upgrade-ficha-resumen-head{
  margin:0 0 12px;
  padding:0 0 12px;
  border-bottom:1px solid #e8ecf1;
}
.nf-upgrade-ficha-resumen-nombre{
  margin:0 0 6px;
  font-size:18px;
  font-weight:900;
  color:#0f172a;
  line-height:1.2;
  letter-spacing:-.03em;
}
.nf-upgrade-ficha-resumen-head .nf-upgrade-ficha-resumen-desc{
  margin:0;
}
.nf-upgrade-ficha-resumen-desc{
  margin:0 0 14px;
  font-size:13px;
  line-height:1.5;
  color:#64748b;
  font-weight:500;
}
.nf-upgrade-ficha-resumen-larga{
  margin:8px 0 0;
  font-size:12px;
  line-height:1.45;
  color:#64748b;
  font-weight:500;
  display:-webkit-box;
  -webkit-line-clamp:4;
  -webkit-box-orient:vertical;
  overflow:hidden;
  word-break:break-word;
}
.nf-upgrade-ficha-resumen-larga--expanded{
  display:block;
  -webkit-line-clamp:unset;
  overflow:visible;
}
.nf-upgrade-ficha-resumen-larga-more{
  margin:6px 0 0;
  padding:0;
  border:none;
  background:none;
  cursor:pointer;
  font-size:12px;
  font-weight:700;
  color:#0f766e;
  text-decoration:underline;
  text-underline-offset:3px;
}
.nf-upgrade-ficha-resumen-larga-more:hover{
  color:#0d9488;
}
.nf-upgrade-editor-preview .nf-upgrade-ficha-resumen{
  border-radius:14px;
  box-shadow:0 12px 40px rgba(15,23,42,0.1),0 2px 8px rgba(15,23,42,0.06);
}
.nf-upgrade-editor-preview .nf-upgrade-ficha-resumen-foto{
  border-radius:14px 14px 0 0;
  background:#eef1f5;
}
.nf-upgrade-editor-preview .nf-upgrade-ficha-resumen-foto .preview-image{
  height:132px;
  background:#eef1f5;
  display:flex;
  align-items:center;
  justify-content:center;
}
.nf-upgrade-editor-preview .nf-upgrade-ficha-resumen-foto .preview-image img{
  width:100%;
  height:100%;
  object-fit:contain;
  object-position:center;
  display:block;
}
.nf-upgrade-editor-preview .nf-upgrade-ficha-resumen-foto-placeholder{
  height:132px;
  min-height:132px;
  background:#eef1f5;
}
.nf-upgrade-editor-preview .nf-upgrade-ficha-resumen-inner{
  padding:12px 14px 14px;
}
.nf-upgrade-editor-preview .nf-upgrade-ficha-resumen-nombre{
  font-size:17px;
}
.nf-upgrade-ficha-resumen-block{
  margin:0 0 10px;
  padding:10px 12px 12px;
  border-radius:10px;
  background:#f8fafc;
  border:1px solid #e8ecf1;
}
.nf-upgrade-ficha-resumen-block-title{
  margin:0 0 10px;
  font-size:10px;
  font-weight:800;
  color:#475569;
  text-transform:uppercase;
  letter-spacing:.09em;
}
.nf-upgrade-ficha-resumen-block-rows{
  display:flex;
  flex-direction:column;
  gap:10px;
}
.nf-upgrade-ficha-resumen-block-row{
  margin:0;
  display:flex;
  flex-direction:column;
  gap:3px;
}
.nf-upgrade-ficha-resumen-block-kicker{
  font-size:11px;
  font-weight:700;
  color:#94a3b8;
  letter-spacing:.02em;
}
.nf-upgrade-ficha-resumen-inline-icon{
  display:inline-block;
  flex-shrink:0;
  width:1.1em;
  text-align:center;
  font-size:11px;
  line-height:1.25;
  opacity:0.88;
  color:#64748b;
}
.nf-upgrade-ficha-resumen-kicker-inline{
  display:inline-flex;
  align-items:flex-start;
  gap:5px;
}
.nf-upgrade-ficha-resumen-block-value{
  font-size:13px;
  font-weight:600;
  color:#334155;
  line-height:1.45;
}
.nf-upgrade-ficha-resumen-value-with-leading-icon{
  display:flex;
  align-items:flex-start;
  gap:5px;
}
.nf-upgrade-ficha-resumen-value-with-leading-icon .nf-upgrade-ficha-resumen-inline-icon{
  margin-top:2px;
}
.nf-upgrade-ficha-resumen-value-with-leading-icon > :last-child{
  flex:1;
  min-width:0;
}
.nf-upgrade-ficha-resumen-cobertura-nombres-root{
  display:block;
  min-width:0;
}
.nf-upgrade-ficha-resumen-cobertura-nombres{
  display:inline;
  font-weight:600;
  line-height:1.55;
}
.nf-upgrade-ficha-resumen-cobertura-sep{
  color:#94a3b8;
  font-weight:500;
}
.nf-upgrade-ficha-resumen-cobertura-mas-cta{
  color:#64748b;
  font-weight:600;
  font-size:12px;
}
.nf-upgrade-ficha-resumen-cobertura-reg-suf{
  color:#64748b;
  font-weight:700;
  font-size:12px;
  white-space:nowrap;
}
.nf-upgrade-ficha-resumen-chips{
  display:flex;
  flex-wrap:wrap;
  gap:6px;
  margin:0;
}
.nf-upgrade-ficha-resumen-chip{
  display:inline-flex;
  align-items:center;
  gap:5px;
  padding:4px 10px;
  border-radius:999px;
  font-size:11px;
  font-weight:800;
  color:#334155;
  background:#f1f5f9;
  border:1px solid #e2e8f0;
}
.nf-upgrade-ficha-resumen-chip-icon{
  font-size:11px;
  line-height:1;
  opacity:0.9;
  color:#64748b;
}
.nf-upgrade-ficha-resumen-contact{
  display:flex;
  flex-direction:column;
  gap:12px;
  margin:8px 0 0;
  padding-top:12px;
  border-top:1px solid #e8ecf1;
}
.nf-upgrade-ficha-resumen-contacto-nombre{
  margin:0 0 10px;
  padding:8px 10px;
  border-radius:10px;
  background:#f8fafc;
  border:1px solid #e8ecf1;
  display:flex;
  flex-direction:column;
  gap:2px;
}
.nf-upgrade-ficha-resumen-contacto-nombre-k{
  font-size:11px;
  font-weight:600;
  color:#64748b;
  letter-spacing:0;
}
.nf-upgrade-ficha-resumen-contacto-nombre-v{
  font-size:13px;
  font-weight:700;
  color:#334155;
  line-height:1.35;
}
.nf-upgrade-ficha-resumen-cta-row{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:10px 12px;
  margin:0;
}
.nf-upgrade-ficha-resumen-cta-row--single{
  grid-template-columns:1fr;
}
.nf-upgrade-ficha-resumen-cta-cell{
  min-width:0;
}
.nf-upgrade-ficha-resumen-wa-btn{
  display:flex;
  flex-direction:column;
  align-items:flex-start;
  justify-content:center;
  box-sizing:border-box;
  width:100%;
  min-height:44px;
  text-align:left;
  padding:12px;
  border-radius:11px;
  background:#16a34a;
  color:#fff;
  font-weight:700;
  font-size:13px;
  text-decoration:none;
  line-height:1.25;
  gap:6px;
}
.nf-upgrade-ficha-resumen-wa-btn svg path{
  fill:#fff;
}
.nf-upgrade-ficha-resumen-wa-btn:hover{filter:brightness(1.03)}
.nf-upgrade-ficha-resumen-ig-btn{
  display:flex;
  flex-direction:column;
  align-items:flex-start;
  justify-content:center;
  box-sizing:border-box;
  width:100%;
  min-height:44px;
  text-align:left;
  padding:12px;
  border-radius:11px;
  color:#334155;
  font-weight:700;
  font-size:13px;
  text-decoration:none;
  line-height:1.25;
  gap:6px;
  border:2px solid transparent;
  background-image:linear-gradient(#fff,#fff),linear-gradient(135deg,#f09433 0%,#e6683c 35%,#dc2743 65%,#bc1888 100%);
  background-origin:border-box;
  background-clip:padding-box,border-box;
}
.nf-upgrade-ficha-resumen-ig-btn:hover{filter:brightness(0.99)}
.nf-upgrade-ficha-resumen-web-btn{
  display:flex;
  flex-direction:column;
  align-items:flex-start;
  justify-content:center;
  box-sizing:border-box;
  width:100%;
  min-height:44px;
  margin-top:0;
  text-align:left;
  padding:12px;
  border-radius:11px;
  background:#fff;
  color:#334155;
  font-weight:700;
  font-size:13px;
  text-decoration:none;
  line-height:1.25;
  gap:6px;
  border:2px solid #0284c7;
}
.nf-upgrade-ficha-resumen-web-btn:hover{background:#f0f9ff}
.nf-upgrade-ficha-resumen-wa-muted{
  display:flex;
  align-items:center;
  justify-content:center;
  box-sizing:border-box;
  width:100%;
  min-height:44px;
  text-align:center;
  padding:10px 12px;
  border-radius:11px;
  background:#f1f5f9;
  color:#64748b;
  font-weight:600;
  font-size:12px;
  line-height:1.35;
}
.nf-upgrade-ficha-resumen-cta-empty{
  min-height:44px;
  border-radius:11px;
  border:1px dashed #e2e8f0;
  background:#fafafa;
}
.nf-upgrade-fotos-pitch{
  margin:0 0 18px;
  padding:0 2px;
}
.nf-upgrade-fotos-pitch-title{
  margin:0 0 8px;
  font-size:clamp(14px,1.6vw,16px);
  font-weight:700;
  color:#64748b;
  letter-spacing:-.01em;
  line-height:1.35;
  max-width:36em;
}
.nf-upgrade-fotos-pitch-sub{
  margin:0;
  font-size:13px;
  font-weight:500;
  color:#64748b;
  line-height:1.45;
  max-width:34em;
}
.nf-upgrade-principal-visual{
  border-radius:18px;
  border:2px solid #e2e8f0;
  background:#f5f5f5;
  width:100%;
  max-width:100%;
  aspect-ratio:1/1;
  height:auto;
  max-height:none;
  flex-shrink:0;
  display:flex;
  align-items:center;
  justify-content:center;
  overflow:hidden;
  position:relative;
  box-sizing:border-box;
}
.nf-upgrade-principal-visual-img{
  position:absolute;
  inset:0;
  z-index:0;
  max-width:100%;
  max-height:100%;
  width:100%;
  height:100%;
  object-fit:contain;
  object-position:center;
  display:block;
  margin:auto;
}
.nf-upgrade-principal-hit{
  position:absolute;
  inset:0;
  z-index:1;
  margin:0;
  border:none;
  border-radius:16px;
  cursor:pointer;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:10px;
  font-size:14px;
  font-weight:700;
  color:#64748b;
  transition:background .15s ease,opacity .15s ease;
  -webkit-tap-highlight-color:transparent;
}
.nf-upgrade-principal-hit:disabled{opacity:.55;cursor:not-allowed}
.nf-upgrade-principal-hit--empty{
  background:#f1f5f9;
  border:2px dashed #cbd5e1;
}
.nf-upgrade-principal-hit--empty:hover{background:#e8eef5}
.nf-upgrade-principal-cam-svg{
  width:44px;
  height:44px;
  color:#475569;
  opacity:.9;
}
.nf-upgrade-principal-hit--onphoto{
  background:transparent;
  color:#fff;
  opacity:0;
}
@media (hover:hover){
  .nf-upgrade-principal-visual:hover .nf-upgrade-principal-hit--onphoto:not(:disabled){
    opacity:1;
    background:rgba(15,23,42,.42);
  }
}
@media (hover:none){
  .nf-upgrade-principal-hit--onphoto:not(:disabled){
    opacity:1;
    background:rgba(15,23,42,.28);
  }
}
.nf-upgrade-principal-hit--onphoto .nf-upgrade-principal-cam-svg{
  width:36px;
  height:36px;
  color:#fff;
}
.nf-upgrade-principal-hit-photo-line{
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:6px;
  text-shadow:0 1px 2px rgba(0,0,0,.35);
  font-size:13px;
  font-weight:800;
}
.nf-upgrade-principal-visual-placeholder{
  display:none;
}
.nf-upgrade-principal-actions{
  margin-top:12px;
  display:flex;
  flex-direction:column;
  flex-wrap:nowrap;
  gap:6px;
  align-items:stretch;
}
.nf-upgrade-fotos-col-label{
  margin:0 0 8px;
  font-size:11px;
  font-weight:800;
  color:#64748b;
  text-transform:uppercase;
  letter-spacing:.06em;
}
.nf-upgrade-fotos-dual-cards .nf-upgrade-principal-visual{
  width:100%;
  max-width:100%;
  aspect-ratio:1/1;
  height:auto;
  max-height:none;
  min-height:0;
}
.nf-upgrade-fotos-dual-cards .nf-upgrade-principal-actions{
  margin-top:8px;
}
.nf-upgrade-fotos-dual-cards .nf-upgrade-principal-cta{
  min-height:36px;
  padding:0 12px;
  border-radius:10px;
  font-size:12px;
  font-weight:800;
}
.nf-mejorar-ficha-fotos-subcard--principal{
  padding-bottom:14px;
}
.nf-upgrade-galeria-head{
  display:flex;
  align-items:baseline;
  justify-content:space-between;
  gap:10px;
  flex-wrap:wrap;
  margin:0 0 14px;
}
.nf-upgrade-galeria-title{
  margin:0;
  font-size:11px;
  font-weight:800;
  color:#64748b;
  text-transform:uppercase;
  letter-spacing:.06em;
}
.nf-upgrade-galeria-max-hint{
  font-size:10px;
  font-weight:700;
  color:#94a3b8;
  letter-spacing:.02em;
  cursor:help;
  border-bottom:1px dotted #cbd5e1;
  line-height:1.3;
  flex-shrink:0;
}
.nf-upgrade-galeria-strip{display:flex;flex-wrap:wrap;gap:14px;align-items:flex-start}
.nf-upgrade-fotos-dual-cards .nf-upgrade-galeria-strip{
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:14px;
  width:100%;
  min-width:0;
  align-content:start;
  overflow:visible;
  padding:2px 0 4px;
}
@container (min-width:260px){
  .nf-upgrade-fotos-dual-cards .nf-upgrade-galeria-strip{
    grid-template-columns:repeat(3,minmax(0,1fr));
  }
}
@container (min-width:400px){
  .nf-upgrade-fotos-dual-cards .nf-upgrade-galeria-strip{
    grid-template-columns:repeat(4,minmax(0,1fr));
  }
}
.nf-upgrade-fotos-dual-cards .nf-upgrade-galeria-thumb{
  width:100%;
  min-width:0;
  position:relative;
  aspect-ratio:1;
  height:auto;
  box-sizing:border-box;
  overflow:hidden;
  align-self:start;
  border-radius:16px;
}
.nf-upgrade-fotos-dual-cards .nf-upgrade-galeria-thumb img{
  position:absolute;
  inset:0;
  width:100%;
  height:100%;
  object-fit:cover;
  display:block;
}
.nf-upgrade-galeria-thumb-remove{
  position:absolute;
  top:5px;
  right:5px;
  z-index:4;
  width:28px;
  height:28px;
  margin:0;
  padding:0;
  border:none;
  border-radius:999px;
  background:rgba(15,23,42,.88);
  color:#fff;
  font-size:20px;
  line-height:1;
  font-weight:700;
  cursor:pointer;
  display:flex;
  align-items:center;
  justify-content:center;
  box-shadow:0 1px 4px rgba(0,0,0,.2);
}
.nf-upgrade-galeria-thumb-remove:hover{
  background:#b91c1c;
}
.nf-upgrade-galeria-thumb-remove:focus-visible{
  outline:2px solid #64748b;
  outline-offset:2px;
}
.nf-upgrade-fotos-dual-cards .nf-upgrade-galeria-add{
  width:100%;
  min-width:0;
  aspect-ratio:1;
  min-height:0;
  padding:8px;
  font-size:10px;
  line-height:1.25;
  box-sizing:border-box;
  border-radius:16px;
}
.nf-upgrade-galeria-thumb{
  width:104px;
  height:104px;
  border-radius:16px;
  overflow:hidden;
  border:1px solid #e8ecf1;
  position:relative;
  flex-shrink:0;
  background:#f4f7fa;
  box-shadow:0 1px 3px rgba(15,23,42,0.05);
}
.nf-upgrade-galeria-thumb img{
  width:100%;
  height:100%;
  object-fit:cover;
  display:block;
}
.nf-upgrade-galeria-thumb-actions{
  position:absolute;
  left:0;
  right:0;
  bottom:0;
  display:flex;
  flex-wrap:wrap;
  gap:3px;
  justify-content:center;
  padding:5px 4px 6px;
  background:linear-gradient(to top,rgba(15,23,42,.78),transparent);
  opacity:0;
  pointer-events:none;
  transition:opacity .18s ease;
}
@media (hover: hover){
  .nf-upgrade-galeria-thumb:hover .nf-upgrade-galeria-thumb-actions{
    opacity:1;
    pointer-events:auto;
  }
}
.nf-upgrade-galeria-thumb:focus-within .nf-upgrade-galeria-thumb-actions,
.nf-upgrade-galeria-thumb.nf-upgrade-galeria-thumb--actions-open .nf-upgrade-galeria-thumb-actions{
  opacity:1;
  pointer-events:auto;
}
@media (prefers-reduced-motion:reduce){
  .nf-upgrade-galeria-thumb-actions{transition:none}
}
.nf-upgrade-galeria-thumb-actions button{
  font-size:9px;
  padding:4px 5px;
  border-radius:6px;
  border:none;
  background:rgba(255,255,255,.92);
  cursor:pointer;
  font-weight:800;
  color:#0f172a;
}
.nf-upgrade-fotos-dual-cards .nf-upgrade-galeria-thumb-actions{
  flex-direction:column;
  align-items:stretch;
  gap:4px;
  padding:6px 4px 7px;
}
.nf-upgrade-fotos-dual-cards .nf-upgrade-galeria-thumb-actions button{
  font-size:8px;
  padding:4px 4px;
  line-height:1.15;
  white-space:normal;
  text-align:center;
}
.nf-upgrade-galeria-add{
  width:104px;
  min-height:104px;
  border-radius:16px;
  border:2px dashed #c5ced9;
  background:#fafbfc;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:4px;
  cursor:pointer;
  font-weight:800;
  font-size:11px;
  color:#475569;
  padding:8px;
  text-align:center;
  box-sizing:border-box;
  transition:background .18s ease,border-color .18s ease,box-shadow .18s ease,transform .18s ease,color .18s ease;
}
.nf-upgrade-galeria-add:hover:not(:disabled){
  background:#f1f5f9;
  border-color:#94a3b8;
  color:#334155;
  box-shadow:0 2px 10px rgba(15,23,42,0.06);
  transform:translateY(-1px);
}
.nf-upgrade-galeria-add:active:not(:disabled){
  transform:translateY(0);
  box-shadow:0 1px 4px rgba(15,23,42,0.05);
}
.nf-upgrade-galeria-add:focus-visible{
  outline:2px solid #64748b;
  outline-offset:2px;
}
.nf-upgrade-galeria-add:disabled{opacity:.55;cursor:not-allowed}
@media (prefers-reduced-motion:reduce){
  .nf-upgrade-galeria-add{transition:none}
  .nf-upgrade-galeria-add:hover:not(:disabled){transform:none}
}
.nf-upgrade-contacto-grid{
  display:grid;
  gap:20px;
  grid-template-columns:1fr;
}
@media (min-width:900px){
  .nf-upgrade-contacto-grid{
    grid-template-columns:1fr 1fr;
    align-items:start;
  }
}
.nf-upgrade-contacto-grid--pair{
  display:grid;
  gap:20px 24px;
  grid-template-columns:1fr;
}
@media (min-width:900px){
  .nf-upgrade-contacto-grid--pair{
    grid-template-columns:1fr 1fr;
    grid-auto-rows:minmax(0,auto);
    align-items:stretch;
  }
}
.nf-upgrade-contacto-pair-cell{
  min-width:0;
  display:flex;
  flex-direction:column;
}
.nf-upgrade-contacto-nombre-row{
  grid-column:1/-1;
}
@media (min-width:900px){
  .nf-upgrade-contacto-nombre-row .nf-upgrade-contacto-field--60{
    max-width:60%;
  }
}
.nf-upgrade-contacto-wa-principal{
  padding:12px 14px 14px;
  border-radius:12px;
  box-sizing:border-box;
  background:#f8fafc;
  border:1px solid #e2e8f0;
}
/* Misma caja que el principal para alinear filas; borde neutro (no obligatorio). */
.nf-upgrade-contacto-wa-secundario{
  padding:12px 14px 14px;
  border-radius:12px;
  box-sizing:border-box;
  background:#f8fafc;
  border:1px solid #e2e8f0;
}
.nf-upgrade-contacto-instagram-wrap{
  padding:12px 14px 14px;
  border-radius:12px;
  box-sizing:border-box;
  background:#f8fafc;
  border:1px solid #e2e8f0;
}
.nf-upgrade-contacto-web-wrap{
  padding:12px 14px 14px;
  border-radius:12px;
  box-sizing:border-box;
  background:#f8fafc;
  border:1px solid #e2e8f0;
}
.nf-upgrade-contacto-field{
  width:100%;
  max-width:100%;
  min-width:0;
}
@media (min-width:900px){
  .nf-upgrade-contacto-field--60{max-width:60%}
}
.nf-upgrade-section-protagonist{
  border-color:#e2e8f0;
  background:#ffffff;
}
.nf-upgrade-modalidad-cards{
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:10px;
}
@media (max-width:900px){
  .nf-upgrade-modalidad-cards{grid-template-columns:1fr 1fr}
}
@media (max-width:440px){
  .nf-upgrade-modalidad-cards{grid-template-columns:1fr}
}
.nf-upgrade-modalidad-cards--error .nf-upgrade-modalidad-card--inactive{
  border-color:#fecaca;
}
.nf-upgrade-modalidad-card{
  position:relative;
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:0;
  width:100%;
  margin:0;
  padding:18px 8px 12px;
  border-radius:14px;
  border:1px solid #e2e8f0;
  background:#fff;
  color:#0f172a;
  cursor:pointer;
  text-align:center;
  box-sizing:border-box;
  transition:background .15s ease,border-color .15s ease,color .15s ease,box-shadow .15s ease;
  -webkit-tap-highlight-color:transparent;
}
.nf-upgrade-modalidad-card:focus-visible{
  outline:2px solid #3d6a9a;
  outline-offset:2px;
}
.nf-upgrade-modalidad-card--inactive:hover{
  border-color:#cbd5e1;
  box-shadow:0 1px 3px rgba(15,23,42,0.06);
}
.nf-upgrade-modalidad-card--active{
  background:#2d4d6e;
  border-color:#2d4d6e;
  color:#fff;
}
.nf-upgrade-modalidad-card-check{
  position:absolute;
  top:8px;
  right:8px;
  width:22px;
  height:22px;
  border-radius:999px;
  background:rgba(255,255,255,0.22);
  color:#fff;
  display:flex;
  align-items:center;
  justify-content:center;
  pointer-events:none;
}
.nf-upgrade-modalidad-card-icon-wrap{
  flex-shrink:0;
  display:flex;
  align-items:center;
  justify-content:center;
  width:44px;
  height:44px;
  margin:4px 0 10px;
  border-radius:999px;
  background:#f1f5f9;
  border:1px solid #e2e8f0;
  color:#334155;
}
.nf-upgrade-modalidad-card--active .nf-upgrade-modalidad-card-icon-wrap{
  background:rgba(255,255,255,0.14);
  border-color:rgba(255,255,255,0.22);
  color:#fff;
}
.nf-upgrade-modalidad-card-icon{
  display:block;
}
.nf-upgrade-modalidad-card-text{
  width:100%;
  min-width:0;
  display:flex;
  flex-direction:column;
  gap:6px;
  align-items:center;
}
.nf-upgrade-modalidad-card-title{
  font-size:14px;
  font-weight:800;
  letter-spacing:-0.02em;
  line-height:1.2;
}
.nf-upgrade-modalidad-card-sub{
  font-size:11px;
  font-weight:600;
  line-height:1.35;
  max-width:11.5em;
}
.nf-upgrade-modalidad-card--inactive .nf-upgrade-modalidad-card-sub{
  color:#64748b;
}
.nf-upgrade-modalidad-card--active .nf-upgrade-modalidad-card-sub{
  color:rgba(255,255,255,0.9);
}
.nf-upgrade-direccion-local{
  margin-top:6px;
  margin-bottom:0;
  padding:2px 0 0 11px;
  border-left:3px solid #e2e8f0;
}
.nf-upgrade-direccion-local-hint{
  margin:0 0 4px;
  font-size:11px;
  font-weight:700;
  color:#94a3b8;
  line-height:1.35;
  letter-spacing:0.02em;
}
.nf-upgrade-direccion-local .nf-upgrade-direccion-local-label{
  display:block;
  margin:0 0 6px;
  font-size:13px;
  font-weight:800;
  color:#334155;
  line-height:1.25;
}
.nf-upgrade-checklist-inline{
  margin:10px 0 0;
  padding:10px 14px;
  border-radius:12px;
  background:#f1f5f9;
  border:1px solid #e2e8f0;
  font-size:13px;
  font-weight:700;
  color:#475569;
}
.nf-upgrade-checklist-inline--guiado{
  font-weight:600;
  line-height:1.45;
}
.nf-upgrade-progreso-guiado-text{
  margin:0;
}
.nf-upgrade-progreso-opcional-hint{
  margin:8px 0 0;
  font-size:12px;
  font-weight:600;
  color:#64748b;
  line-height:1.45;
}
.nf-upgrade-seccion-opcional-hint{
  margin:0 0 12px;
  font-size:12px;
  font-weight:600;
  color:#64748b;
  line-height:1.45;
  max-width:42em;
}
.nf-form-field-hint{
  margin:6px 0 0;
  font-size:12px;
  font-weight:600;
  color:#64748b;
  line-height:1.45;
  max-width:42em;
}
.nf-upgrade-paso-badge{
  display:inline-flex;
  align-items:center;
  flex-shrink:0;
  padding:2px 7px;
  border-radius:999px;
  font-size:10px;
  font-weight:700;
  letter-spacing:0.01em;
  white-space:nowrap;
}
.nf-upgrade-paso-badge--ok{
  background:#f0fdf4;
  color:#047857;
  border:1px solid #bbf7d0;
}
.nf-upgrade-paso-badge--en-revision{
  background:#f8fafc;
  color:#64748b;
  border:1px solid #e2e8f0;
}
.nf-upgrade-paso-title-row{
  display:flex;
  flex-wrap:wrap;
  align-items:center;
  justify-content:space-between;
  gap:10px 14px;
}
.nf-upgrade-fotos-paso-head{
  display:flex;
  flex-wrap:wrap;
  align-items:center;
  justify-content:space-between;
  gap:10px 14px;
  margin:0 0 14px;
  padding:0 2px;
}
.nf-upgrade-fotos-paso-title{
  margin:0;
  font-size:19px;
  font-weight:800;
  color:#0f172a;
  letter-spacing:-0.03em;
  line-height:1.2;
}
.nf-upgrade-paso-sec-title{
  margin:0;
  font-size:17px;
  font-weight:900;
  color:#0f172a;
  letter-spacing:-0.02em;
  line-height:1.2;
}
.nf-upgrade-section-contacto-title-row{
  margin:0 0 4px;
}
.nf-upgrade-section-contacto-title-row .nf-upgrade-section-contacto-title{
  margin:0;
}
.nf-upgrade-stack{display:flex;flex-direction:column;gap:18px;min-width:0}
.nf-upgrade-submit{width:100%;min-width:0;display:flex;flex-direction:column;gap:8px}
.nf-upgrade-checklist{
  border:1px solid #e2e8f0;
  background:#fafbfc;
  border-radius:16px;
  padding:16px 18px;
}
.nf-upgrade-photo-empty-cta{
  width:100%;
  min-height:168px;
  border-radius:16px;
  border:2px dashed #cbd5e1;
  background:#f8fafc;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:10px;
  padding:20px 16px;
  cursor:pointer;
  font-size:16px;
  font-weight:900;
  color:#475569;
  transition:background .15s,border-color .15s;
}
.nf-upgrade-photo-empty-cta:hover:not(:disabled){
  background:#f1f5f9;
  border-color:#94a3b8;
}
.nf-upgrade-photo-empty-cta:disabled{
  opacity:.55;
  cursor:not-allowed;
}
.nf-upgrade-photo-empty-cta span{display:block;font-size:13px;font-weight:600;color:#64748b;max-width:280px;text-align:center;line-height:1.4}
.nf-upgrade-autosave-footer{
  border-radius:16px;
  border:1px solid #a7f3d0;
  background:#ecfdf5;
  padding:16px 18px;
  text-align:center;
}
.nf-upgrade-autosave-footer-title{margin:0;font-size:16px;font-weight:900;color:#065f46;letter-spacing:-0.02em}
.nf-upgrade-autosave-footer-title--error{color:#991b1b}
.nf-upgrade-autosave-footer-sub{margin:6px 0 0;font-size:12px;font-weight:600;color:#047857;line-height:1.45}
.nf-upgrade-autosave-footer-err{margin:8px 0 0;font-size:12px;font-weight:700;color:#b91c1c;line-height:1.45}
.nf-upgrade-autosave-footer--error{border-color:#fecaca;background:#fef2f2}
.nf-upgrade-autosave-footer--neutral{
  border-color:#e2e8f0;
  background:#f1f5f9;
}
.nf-upgrade-autosave-footer-title--muted{color:#334155}
.nf-upgrade-autosave-footer-sub--muted{color:#64748b}
.nf-upgrade-autosave-footer--pending{
  border-color:#fcd34d;
  background:#fffbeb;
}
.nf-upgrade-autosave-footer-title--pending{color:#92400e}
.nf-upgrade-autosave-footer-sub--pending{color:#b45309;font-weight:600}
.nf-upgrade-submit-footer-stack{
  display:flex;
  flex-direction:column;
  gap:12px;
  width:100%;
  min-width:0;
}
.nf-upgrade-save-primary-btn{
  width:100%;
  min-height:52px;
  padding:0 18px;
  border-radius:14px;
  border:none;
  background:#0d9488;
  color:#fff;
  font-weight:800;
  font-size:15px;
  cursor:pointer;
}
.nf-upgrade-save-primary-btn:hover:not(:disabled){filter:brightness(1.06)}
.nf-upgrade-save-primary-btn:disabled{
  opacity:.85;
  cursor:not-allowed;
  background:#64748b;
}
.nf-upgrade-save-secondary-link{
  color:#6b7280;
  font-weight:600;
}
.nf-upgrade-save-secondary-link:hover{
  color:#4b5563;
}
.nf-gallery-grid--rail{
  grid-template-columns:repeat(2,minmax(0,1fr))!important;
  gap:8px!important;
  margin-top:6px;
}
.nf-gallery-card--rail{
  aspect-ratio:1!important;
  border-radius:10px!important;
}
.nf-gallery-card--rail .nf-gallery-card-actions{
  padding:4px 4px 6px;
  gap:4px;
}
.nf-gallery-card--rail .nf-gallery-card-actions button{
  min-width:34px;
  min-height:30px;
  padding:0 6px;
  font-size:10px;
}
.nf-upgrade-principal-cta{
  width:100%;
  min-height:44px;
  padding:0 14px;
  border-radius:12px;
  border:1px solid #15803d;
  background:#15803d;
  color:#fff;
  font-weight:800;
  font-size:13px;
  cursor:pointer;
}
.nf-upgrade-principal-cta:hover:not(:disabled){
  filter:brightness(1.03);
}
.nf-upgrade-principal-cta:disabled{
  opacity:.55;
  cursor:not-allowed;
}
.nf-upgrade-principal-quitar-link{
  width:fit-content;
  align-self:flex-start;
  min-height:auto;
  padding:4px 0;
  border:none;
  background:transparent;
  color:#b91c1c;
  font-size:12px;
  font-weight:600;
  text-decoration:underline;
  text-underline-offset:3px;
  cursor:pointer;
  box-shadow:none;
}
.nf-upgrade-principal-quitar-link:hover:not(:disabled){
  color:#991b1b;
}
.nf-upgrade-principal-quitar-link:disabled{
  opacity:.5;
  cursor:not-allowed;
}
.nf-upgrade-galeria-thumb-actions button.nf-upgrade-galeria-quitar-link{
  background:transparent!important;
  border:none!important;
  color:#b91c1c!important;
  font-size:11px!important;
  font-weight:600!important;
  text-decoration:underline;
  padding:4px 6px!important;
  min-height:auto!important;
}
.nf-upgrade-galeria-thumb-actions button.nf-upgrade-galeria-quitar-link:hover:not(:disabled){
  color:#991b1b!important;
}
.nf-upgrade-principal-hint{
  margin:0 0 6px;
  font-size:12px;
  color:#64748b;
  font-weight:600;
  line-height:1.4;
}
.nf-upgrade-section{border:1px solid #e5e7eb;border-radius:14px;background:#fff;padding:18px 20px}
.nf-upgrade-section--muted{border-color:#e8ecf1;background:#fafbfd}
.nf-upgrade-section-contacto{
  margin-top:36px;
}
.nf-upgrade-section-contacto-title{
  margin:0 0 4px;
  font-size:19px;
  font-weight:800;
  color:#0f172a;
  letter-spacing:-0.03em;
  line-height:1.2;
}
.nf-upgrade-section-contacto-sub{
  margin:0 0 14px;
  font-size:12px;
  font-weight:600;
  color:#64748b;
  line-height:1.45;
  max-width:42em;
}
.nf-upgrade-fold{padding:14px 16px}
.nf-mejorar-ficha-banner{
  margin-bottom:16px;
  padding:12px 16px;
  border-radius:14px;
  border:1px solid #e5e7eb;
  border-left:3px solid #0f766e;
  background:#ffffff;
}
.nf-mejorar-ficha-banner-title{
  margin:0 0 4px;
  font-size:15px;
  font-weight:900;
  color:#0f172a;
  letter-spacing:-0.02em;
}
.nf-mejorar-ficha-banner-text{
  margin:0;
  font-size:13px;
  line-height:1.45;
  color:#475569;
  font-weight:600;
}
.nf-mejorar-ficha-banner--revision{
  border-color:#e5e7eb;
  border-left:3px solid #0f766e;
  background:#ffffff;
}
.nf-mejorar-ficha-banner--revision .nf-mejorar-ficha-banner-title{color:#0f172a;}
.nf-mejorar-ficha-banner--revision .nf-mejorar-ficha-banner-text{color:#475569;}
.nf-upgrade-fotos-pane-inner{
  width:100%;
  min-width:0;
  display:flex;
  flex-direction:column;
  gap:16px;
}
.nf-upgrade-fotos-dual-cards{
  display:flex;
  flex-direction:column;
  gap:16px;
}
@media (min-width:640px){
  .nf-upgrade-fotos-dual-cards{
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:18px;
    align-items:start;
  }
}
.nf-mejorar-ficha-fotos-subcard{
  scroll-margin-top:64px;
  border:1px solid #e2e8f0;
  background:#ffffff;
  border-radius:18px;
  box-shadow:0 1px 3px rgba(15,23,42,0.06);
  padding:18px 18px 20px;
  min-width:0;
  display:flex;
  flex-direction:column;
}
.nf-mejorar-ficha-fotos-subcard--galeria{
  border-color:#e2e8f0;
  background:#fafbfc;
  box-shadow:0 1px 3px rgba(15,23,42,0.05);
  container-type:inline-size;
  padding:20px 20px 22px;
}
.nf-mejorar-ficha-fotos-subcard--focus{
  border-color:rgba(21,128,61,0.45);
  box-shadow:0 0 0 2px rgba(21,128,61,0.12),0 4px 18px rgba(15,23,42,0.07);
}
.nf-mejorar-ficha-fotos-next{
  margin:0 0 10px;
  font-size:12px;
  font-weight:700;
  color:#64748b;
  line-height:1.4;
}
.nf-upgrade-collapse-btn{
  flex-shrink:0;
  font-size:13px;
  font-weight:800;
  color:#475569;
  background:transparent;
  border:none;
  cursor:pointer;
  padding:6px 10px;
  border-radius:8px;
}
.nf-upgrade-collapse-btn:hover{background:#f1f5f9;}
.nf-upgrade-photo-collapsed-summary{
  margin:10px 0 0;
  font-size:13px;
  color:#64748b;
  font-weight:600;
  line-height:1.45;
}
.nf-gallery-grid{
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:10px;
  margin-top:4px;
}
@media (min-width:520px){
  .nf-gallery-grid{grid-template-columns:repeat(3,minmax(0,1fr));}
}
.nf-gallery-card{
  position:relative;
  aspect-ratio:4/3;
  border-radius:12px;
  overflow:hidden;
  border:1px solid #e2e8f0;
  background:#f1f5f9;
}
.nf-gallery-card--add{
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:6px;
  cursor:pointer;
  border-style:dashed;
  border-color:#cbd5e1;
  background:#fafbfc;
  color:#2563eb;
  font-weight:800;
  font-size:14px;
  padding:12px;
  text-align:center;
  transition:background .15s,border-color .15s;
}
.nf-gallery-card--add:hover:not(:disabled){
  background:#eff6ff;
  border-color:#93c5fd;
}
.nf-gallery-card--add:disabled{
  opacity:.55;
  cursor:not-allowed;
}
.nf-gallery-card--principal{
  grid-column:span 2;
  grid-row:span 1;
  aspect-ratio:16/9;
}
@media (min-width:520px){
  .nf-gallery-card--principal{
    grid-column:span 2;
    aspect-ratio:4/3;
  }
}
.nf-gallery-card-img{
  width:100%;
  height:100%;
  object-fit:cover;
  display:block;
}
.nf-gallery-card-empty{
  width:100%;
  height:100%;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:6px;
  padding:12px;
  color:#64748b;
  font-size:13px;
  font-weight:700;
  text-align:center;
}
.nf-gallery-card-actions{
  position:absolute;
  left:0;
  right:0;
  bottom:0;
  display:flex;
  justify-content:center;
  gap:6px;
  padding:8px 6px;
  background:linear-gradient(to top,rgba(15,23,42,.72),transparent);
}
.nf-gallery-card-actions button{
  min-width:40px;
  min-height:36px;
  padding:0 10px;
  border-radius:8px;
  border:1px solid rgba(255,255,255,.35);
  background:rgba(15,23,42,.45);
  color:#fff;
  font-size:12px;
  font-weight:800;
  cursor:pointer;
}
.nf-gallery-card-actions button:hover:not(:disabled){
  background:rgba(15,23,42,.65);
}
.nf-gallery-card-actions button:disabled{
  opacity:.5;
  cursor:not-allowed;
}
.nf-gallery-badge{
  position:absolute;
  top:8px;
  left:8px;
  padding:4px 8px;
  border-radius:8px;
  background:rgba(15,23,42,.75);
  color:#fff;
  font-size:11px;
  font-weight:800;
  letter-spacing:.02em;
}
.nf-mejorar-seccion-focus{
  scroll-margin-top:72px;
}
.nf-upgrade-datos-basicos-nav{
  margin:0 0 12px;
  display:flex;
  align-items:center;
  flex-wrap:wrap;
  gap:8px 14px;
}
.nf-upgrade-datos-basicos-link{
  display:inline-flex;
  align-items:center;
  font-size:14px;
  font-weight:600;
  color:#6b7280;
  text-decoration:none;
  letter-spacing:-0.01em;
}
.nf-upgrade-datos-basicos-link:hover:not([aria-disabled="true"]){
  color:#4b5563;
  text-decoration:underline;
  text-underline-offset:3px;
}
.nf-upgrade-datos-basicos-link[aria-disabled="true"]{
  opacity:.55;
  pointer-events:none;
  cursor:default;
}
/** CTA principal de «Editar datos básicos» — botón secundario con borde, muy visible. */
.nf-upgrade-datos-basicos-cta{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:8px;
  font-size:14px;
  font-weight:800;
  line-height:1.2;
  color:#0f766e;
  background:#fff;
  border:2px solid #0f766e;
  border-radius:12px;
  padding:10px 18px;
  text-decoration:none;
  letter-spacing:-0.02em;
  box-shadow:0 1px 3px rgba(15,118,110,.12);
  transition:background .15s ease,color .15s ease,border-color .15s ease,box-shadow .15s ease;
  -webkit-tap-highlight-color:transparent;
}
.nf-upgrade-datos-basicos-cta:hover{
  background:#ecfdf5;
  color:#0d9488;
  border-color:#0d9488;
  text-decoration:none;
  box-shadow:0 4px 14px rgba(15,118,110,.18);
}
.nf-upgrade-datos-basicos-cta:active{
  transform:translateY(1px);
}
.nf-upgrade-datos-basicos-cta-icon{
  flex-shrink:0;
  color:currentColor;
  opacity:.95;
}
.nf-upgrade-datos-basicos-cta--compact{
  font-size:13px;
  padding:8px 14px;
  border-radius:999px;
}
.nf-locales-principal-badge{
  display:inline-flex;
  align-items:center;
  padding:4px 11px;
  border-radius:999px;
  font-size:12px;
  font-weight:800;
  letter-spacing:-0.02em;
  background:#ecfdf5;
  color:#0f766e;
  border:1px solid #6ee7b7;
}
.nf-locales-marca-principal-btn{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  padding:5px 12px;
  border-radius:999px;
  border:1.5px solid #0f766e;
  background:#fff;
  color:#0f766e;
  font-size:12px;
  font-weight:800;
  cursor:pointer;
  letter-spacing:-0.02em;
  font-family:inherit;
  line-height:1.2;
  transition:background .15s ease,color .15s ease,border-color .15s ease,box-shadow .15s ease;
  -webkit-tap-highlight-color:transparent;
}
.nf-locales-marca-principal-btn:hover{
  background:#ecfdf5;
  color:#0d9488;
  border-color:#0d9488;
  box-shadow:0 2px 8px rgba(15,118,110,.12);
}
.nf-locales-agregar-local-btn{
  margin-top:6px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:6px;
  padding:10px 18px;
  border-radius:999px;
  border:2px solid #0f766e;
  background:#fff;
  color:#0f766e;
  font-size:14px;
  font-weight:800;
  cursor:pointer;
  font-family:inherit;
  line-height:1.2;
  transition:background .15s ease,box-shadow .15s ease,border-color .15s ease,color .15s ease;
  -webkit-tap-highlight-color:transparent;
}
.nf-locales-agregar-local-btn:hover{
  background:#ecfdf5;
  color:#0d9488;
  border-color:#0d9488;
  box-shadow:0 2px 10px rgba(15,118,110,.14);
}
.nf-locales-ficha-card{
  border:1px solid #e2e8f0;
  border-radius:14px;
  padding:14px 16px 16px;
  margin-bottom:14px;
  background:#fff;
  box-shadow:0 1px 2px rgba(15,23,42,.04);
}
.nf-locales-ficha-card:last-child{
  margin-bottom:12px;
}
.nf-locales-ficha-card--after{
  margin-top:4px;
  padding-top:16px;
  border-top:1px solid #e2e8f0;
  border-radius:16px;
  background:linear-gradient(180deg,#f1f5f9 0%,#fff 52%);
}
.nf-locales-error-msg{
  margin-top:10px;
  max-width:min(100%,28rem);
  display:flex;
  gap:10px;
  align-items:flex-start;
  padding:11px 14px;
  border-radius:12px;
  border:1px solid #fecaca;
  background:#fef2f2;
  color:#991b1b;
  font-size:13px;
  font-weight:600;
  line-height:1.45;
}
.nf-locales-error-msg-icon{
  flex-shrink:0;
  line-height:1.35;
  font-size:1.05rem;
}
.nf-locales-error-msg-text{
  min-width:0;
}
.nf-upgrade-datos-basicos-pending{
  font-size:12px;
  font-weight:700;
  color:#64748b;
}
`;

type MejorarFichaFocusQ = "fotos" | "descripcion" | "redes";

/** Resalta solo la sección enlazada por ?focus=…; no atenúa el resto del formulario. */
function upgradeSeccionFocusClass(
  focus: MejorarFichaFocusQ | null | undefined,
  match: MejorarFichaFocusQ
): string {
  if (!focus || focus !== match) return "";
  return "nf-mejorar-seccion-focus";
}

function UrlThumbPreview({ url }: { url: string }) {
  const [ok, setOk] = useState(true);
  const empty = (
    <div
      style={{
        height: 56,
        borderRadius: 12,
        background: "linear-gradient(135deg, #f9fafb 0%, #e5e7eb 100%)",
        border: "1px dashed #d1d5db",
      }}
    />
  );
  if (!url.trim()) return empty;
  if (!ok) return empty;
  return (
    <img
      src={url}
      alt=""
      style={{
        width: "100%",
        height: 56,
        objectFit: "cover",
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        display: "block",
      }}
      onError={() => setOk(false)}
      referrerPolicy="no-referrer"
    />
  );
}

function normalizarWaHref(raw: string): string | null {
  const v = normalizeAndValidateChileWhatsappStrict(raw.trim());
  if (!v.ok) return null;
  return `https://wa.me/${v.normalized}`;
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () =>
      reject(reader.error || new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

function extractUploadPublicUrl(data: Record<string, unknown>): string {
  for (const key of ["url", "publicUrl", "public_url", "publicURL", "href"] as const) {
    const v = data[key];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return "";
}

async function uploadPanelImageFile(
  file: File,
  folder: string,
  context?: string
): Promise<string> {
  const ctx = context ?? folder;
  logMejorarFichaGaleria(`uploadPanelImageFile → inicio (${ctx})`, {
    name: file.name,
    size: file.size,
    type: file.type || "(vacío)",
    folder,
  });
  try {
    const base64 = await fileToDataUrl(file);
    logMejorarFichaGaleria(`uploadPanelImageFile base64 listo (${ctx})`);
    const res = await fetch("/api/upload-base64", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, base64, folder }),
    });
    const data = (await res.json()) as Record<string, unknown>;
    if (!res.ok || !data?.ok) {
      const msg =
        typeof data.error === "string" ? data.error : "No se pudo subir la imagen";
      logMejorarFichaGaleria(`uploadPanelImageFile respuesta no OK (${ctx})`, {
        httpStatus: res.status,
        error: msg,
      });
      throw new Error(msg);
    }
    const publicUrl = extractUploadPublicUrl(data);
    if (!publicUrl || !isPersistibleFotoUrl(publicUrl)) {
      logMejorarFichaGaleria(`uploadPanelImageFile URL inválida (${ctx})`, {
        publicUrl: publicUrl ? `${publicUrl.slice(0, 80)}…` : "(vacía)",
      });
      throw new Error(
        "No se obtuvo una URL de imagen válida. Revisa el almacenamiento (Supabase) en el proyecto."
      );
    }
    logMejorarFichaGaleria(`uploadPanelImageFile ← ok (${ctx})`, {
      urlSample: `${publicUrl.slice(0, 72)}…`,
    });
    return publicUrl;
  } catch (err) {
    logMejorarFichaGaleria(`uploadPanelImageFile ← excepción (${ctx})`, err);
    throw err;
  }
}

function compactGaleriaSlots(slots: string[]): string[] {
  const filled = slots
    .map((s) => String(s).trim())
    .filter(Boolean)
    .slice(0, 8);
  return Array.from({ length: 8 }, (_, i) => filled[i] ?? "");
}

function removeGaleriaAt(slots: string[], index: number): string[] {
  const copy = [...slots];
  if (index >= 0 && index < copy.length) copy[index] = "";
  return compactGaleriaSlots(copy);
}

function galeriaPayloadUrls(slots: string[]): string[] {
  return dedupeStrings(
    slots.map((x) => String(x).trim()).filter((u) => isPersistibleFotoUrl(u))
  ).slice(0, 8);
}

function dedupeStrings(list: string[]): string[] {
  return [...new Set(list.map((x) => String(x).trim()).filter(Boolean))];
}

async function patchNegocioMedia(
  emprendedorId: string,
  patch: { foto_principal_url?: string; galeria_urls?: string[] }
): Promise<{
  ok: boolean;
  message?: string;
  estado?: string;
  moderationMessage?: string;
}> {
  const res = await fetch(
    `/api/panel/negocio?id=${encodeURIComponent(emprendedorId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }
  );
  let data: Record<string, unknown> = {};
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    return { ok: false, message: "Respuesta inválida del servidor" };
  }
  if (!res.ok || !data.ok) {
    const msg =
      (typeof data.message === "string" && data.message.trim()) ||
      (typeof data.error === "string" && data.error.trim()) ||
      MSG_GUARDAR_FALLBACK;
    console.error("[panel] PATCH negocio media", { httpStatus: res.status, data });
    return { ok: false, message: msg };
  }
  const moderationMessage =
    typeof data.message === "string" && data.message.trim()
      ? data.message.trim()
      : undefined;
  const estado = typeof data.estado === "string" ? data.estado : undefined;
  return { ok: true, estado, moderationMessage };
}

async function patchBorradorMedia(
  borradorId: string,
  patch: { foto_principal_url?: string; galeria_urls?: string[] }
): Promise<{
  ok: boolean;
  message?: string;
  estado?: string;
  moderationMessage?: string;
}> {
  const res = await fetch(publicarBorradorByIdPath(borradorId), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
    credentials: "same-origin",
  });
  const rawText = await res.text();
  const parsedMedia = parsePublicarBorradorResponseText(rawText);
  if (!parsedMedia.ok) {
    logBorradorPatchFailure("patchBorradorMedia JSON inválido", {
      httpStatus: res.status,
      borradorId,
      rawSnippet: rawText.replace(/^\uFEFF/, "").trim().slice(0, 500),
      parseError: parsedMedia.parseError,
    });
    return { ok: false, message: MSG_GUARDAR_FALLBACK };
  }
  const data = parsedMedia.data;
  if (!res.ok || !data?.ok) {
    return {
      ok: false,
      message: userMessageForBorradorPatchResponse(res, data, rawText),
    };
  }
  return { ok: true };
}

function mapBorradorCoberturaTipoToForm(raw: string): CoberturaTipo {
  const t = raw.trim().toLowerCase();
  if (t === "varias_comunas") return "varias_comunas";
  if (t === "varias_regiones" || t === "regional") return "regional";
  if (t === "nacional") return "nacional";
  return "solo_comuna";
}

function mapFormCoberturaTipoToBorrador(t: CoberturaTipo): string {
  if (t === "solo_comuna") return "solo_mi_comuna";
  if (t === "varias_comunas") return "varias_comunas";
  if (t === "regional") return "varias_regiones";
  return "nacional";
}

function buildBorradorFullPatchFromForm(
  form: FormState,
  comunaBaseId: number,
  whatsappNormalized: string,
  whatsappSecundarioNormalized: string | null,
  comunasCatalog: ComunaCatalogRow[]
): Record<string, unknown> {
  const base = form.comunaBaseSlug.trim();
  const cobertura_tipo = mapFormCoberturaTipoToBorrador(form.coberturaTipo);

  let comunas_cobertura: string[] = [];
  let regiones_cobertura: string[] = [];
  if (form.coberturaTipo === "solo_comuna") {
    if (base) comunas_cobertura = [base];
  } else if (form.coberturaTipo === "varias_comunas") {
    comunas_cobertura = dedupeStrings(
      [base, ...form.comunasCoberturaSlugs.map((x) => String(x).trim()).filter(Boolean)]
    );
  } else if (form.coberturaTipo === "regional") {
    regiones_cobertura = dedupeStrings(
      form.regionesCoberturaSlugs.map((x) => String(x).trim()).filter(Boolean)
    );
  }

  const modalidades_atencion = modalidadesAtencionInputsToDbUnique(
    form.modalidadesAtencion.map((m) => String(m))
  );

  const igPatch = validateOptionalInstagram(form.instagram.trim());
  const webPatch = validateOptionalWebsite(form.web.trim());
  const emailPatch = validateRequiredPublicEmail(form.email);

  const localesPayload =
    form.modalidadesAtencion.includes("local_fisico") &&
    form.localesFisicos.length > 0
      ? serializeLocalesFisicosParaBorradorPatch(
          comunasCatalog,
          form.localesFisicos,
          { comunaBaseSlugFallback: form.comunaBaseSlug.trim() }
        )
      : [];

  return {
    nombre_emprendimiento: form.nombre.trim(),
    email: emailPatch.ok ? emailPatch.normalized : form.email.trim().toLowerCase(),
    whatsapp_principal: whatsappNormalized,
    whatsapp_secundario: whatsappSecundarioNormalized,
    frase_negocio: normalizeDescripcionCorta(form.descripcionCorta),
    descripcion_libre: normalizeDescripcionLarga(form.descripcionLarga),
    keywords_usuario: parseKeywordsUsuarioInputToTextArray(form.keywordsUsuario),
    mostrar_responsable_publico: form.responsable.trim().length > 0,
    nombre_responsable: form.responsable.trim(),
    instagram: igPatch.ok ? igPatch.normalized : form.instagram.trim(),
    sitio_web: webPatch.ok ? webPatch.normalized : form.web.trim(),
    foto_principal_url: form.fotoPrincipalUrl.trim(),
    galeria_urls: galeriaPayloadUrls(form.galeriaUrls),
    modalidades_atencion,
    cobertura_tipo,
    comuna_base_id: comunaBaseId,
    comunas_cobertura,
    regiones_cobertura,
    locales: localesPayload,
    ...(localesPayload.length === 0
      ? { direccion: null, direccion_referencia: null }
      : {}),
  };
}

type MejorarFichaPasoGuiadoId =
  | "fotos"
  | "contacto"
  | "trabajas"
  | "descripcionBasica";

const MEJORAR_FICHA_PASO_ORDEN: MejorarFichaPasoGuiadoId[] = [
  "fotos",
  "contacto",
  "trabajas",
  "descripcionBasica",
];

const MEJORAR_FICHA_PASO_MENSAJE_FALTA: Record<MejorarFichaPasoGuiadoId, string> = {
  fotos: "Agregar foto principal o logo",
  contacto: "Agregar tu WhatsApp",
  trabajas: "Elegir al menos una modalidad de atención",
  descripcionBasica:
    "Completar la descripción corta (desde «Gestiona tu ficha» o el bloque de descripción)",
};

function descripcionCortaBasicaOk(descripcionCorta: string): boolean {
  const norm = normalizeDescripcionCorta(descripcionCorta.trim());
  return validateDescripcionCortaPublicacion(norm).length === 0;
}

/**
 * Pasos guiados /mejorar-ficha (solo frontend).
 * Instagram, web, responsable, WhatsApp adicional y descripción larga no cuentan para el 100 %.
 */
function resumenProgresoMejorarFicha(form: FormState): {
  completo: Record<MejorarFichaPasoGuiadoId, boolean>;
  mensajeBanner: string;
  /** Segunda línea (solo cuando ya cumplís lo obligatorio): refuerzo fotos sin sensación de “100 %”. */
  mensajeBannerExtra: string | null;
  obligatoriosCompletos: boolean;
} {
  const completo: Record<MejorarFichaPasoGuiadoId, boolean> = {
    fotos: Boolean(form.fotoPrincipalUrl.trim()),
    contacto: Boolean(form.whatsapp.trim()),
    trabajas: form.modalidadesAtencion.length >= 1,
    descripcionBasica: descripcionCortaBasicaOk(form.descripcionCorta),
  };
  const faltan = MEJORAR_FICHA_PASO_ORDEN.filter((id) => !completo[id]);
  let mensajeBanner: string;
  let mensajeBannerExtra: string | null = null;
  if (faltan.length === 0) {
    /** Sin texto extra bajo el título: ya hay subtítulos arriba; evita duplicar el mensaje. */
    mensajeBanner = "";
    mensajeBannerExtra = null;
  } else if (faltan.length === 1) {
    mensajeBanner = `Te falta 1 cosa para completar tu ficha: ${MEJORAR_FICHA_PASO_MENSAJE_FALTA[faltan[0]]}.`;
  } else {
    const lista = faltan.map((id) => MEJORAR_FICHA_PASO_MENSAJE_FALTA[id]).join("; ");
    mensajeBanner = `Te faltan ${faltan.length} cosas para completar tu ficha: ${lista}.`;
  }
  return {
    completo,
    mensajeBanner,
    mensajeBannerExtra,
    obligatoriosCompletos: faltan.length === 0,
  };
}

function MejorarFichaPasoBadge({ completo }: { completo: boolean }) {
  return (
    <span
      className={
        completo
          ? "nf-upgrade-paso-badge nf-upgrade-paso-badge--ok"
          : "nf-upgrade-paso-badge nf-upgrade-paso-badge--en-revision"
      }
      role="status"
    >
      {completo ? "✔ Completo" : "Pendiente"}
    </span>
  );
}

function nombreComunaPreviewDesdeSlug(slug: string): string {
  const s = slug.trim();
  if (!s) return "";
  return COMUNAS.find((c) => c.slug === s)?.nombre ?? tituloDesdeSlug(s);
}

/** Emoji por modalidad en preview lateral (escaneo rápido). */
function iconoModalidadPreview(raw: string): string {
  const x = String(raw ?? "").trim().toLowerCase();
  if (x === "local_fisico" || x === "local" || x === "fisico") return "🏠";
  if (
    x === "domicilio" ||
    x === "delivery" ||
    x === "presencial_terreno" ||
    x === "presencial"
  ) {
    return "🚚";
  }
  if (x === "online") return "🌐";
  return "";
}

type CoberturaPreviewModel =
  | { kind: "empty" }
  | { kind: "text"; text: string }
  | {
      kind: "comunas";
      partes: string[];
      /** Si todas las comunas resueltas comparten región: nombres + este sufijo «(RM)». */
      regionCortaUnica?: string;
    };

/** Preview lateral: cobertura como texto fijo o listado de comunas (nombres desde catálogo). */
function buildCoberturaPreviewModel(
  form: FormState,
  comunaBase: ComunaOption | undefined,
  comunasCatalog: ComunaCatalogRow[]
): CoberturaPreviewModel {
  const baseNombre = comunaBase?.nombre?.trim() || "";
  const baseSlug = form.comunaBaseSlug.trim();
  const baseLabel =
    baseNombre ||
    (baseSlug ? tituloDesdeSlug(baseSlug) : "Sin comuna base");

  const extras = form.comunasCoberturaSlugs
    .map((x) => String(x).trim())
    .filter(Boolean);

  switch (form.coberturaTipo) {
    case "solo_comuna": {
      if (baseSlug) {
        const r = resolveComunaFromCatalog(comunasCatalog, baseSlug);
        if (r) return { kind: "text", text: formatComunaCatalogLabelCorto(r) };
      }
      if (baseNombre) {
        const short = getRegionShort(String(comunaBase?.regionNombre ?? "").trim());
        if (short) return { kind: "text", text: `${baseNombre} ${short}` };
      }
      return { kind: "text", text: baseLabel };
    }
    case "varias_comunas": {
      if (extras.length === 0) {
        if (baseSlug) {
          const r = resolveComunaFromCatalog(comunasCatalog, baseSlug);
          if (r) return { kind: "text", text: formatComunaCatalogLabelCorto(r) };
        }
        if (baseNombre) {
          const short = getRegionShort(String(comunaBase?.regionNombre ?? "").trim());
          if (short) return { kind: "text", text: `${baseNombre} ${short}` };
        }
        return { kind: "text", text: baseLabel };
      }
      const slugs = dedupeStrings([baseSlug, ...extras].filter(Boolean));
      const rows = slugs.map((slug) => resolveComunaFromCatalog(comunasCatalog, slug));
      const allResolved = slugs.length > 0 && rows.every((r) => r != null);

      if (!allResolved) {
        const partes = slugs
          .map((slug, i) => {
            const r = rows[i];
            return r
              ? formatComunaCatalogLabelCorto(r)
              : nombreComunaPreviewDesdeSlug(slug);
          })
          .filter(Boolean);
        if (partes.length === 0) {
          return { kind: "text", text: "Definí las comunas donde atiendes" };
        }
        return { kind: "comunas", partes };
      }

      const rs = rows as ComunaCatalogRow[];
      const shorts = rs.map((r) => getRegionShort(String(r.regionNombre ?? "").trim()));
      const s0 = shorts[0] || "";
      const unaSolaRegion = Boolean(s0 && shorts.every((s) => s === s0));
      if (unaSolaRegion && slugs.length > 1) {
        const partes = rs
          .map((r) => String(r.nombre ?? "").trim())
          .filter(Boolean);
        if (partes.length === 0) {
          return { kind: "text", text: "Definí las comunas donde atiendes" };
        }
        return { kind: "comunas", partes, regionCortaUnica: s0 };
      }
      const partes = rs.map((r) => formatComunaCatalogLabelCorto(r)).filter(Boolean);
      if (partes.length === 0) {
        return { kind: "text", text: "Definí las comunas donde atiendes" };
      }
      return { kind: "comunas", partes };
    }
    case "regional":
      return { kind: "text", text: "Atiende RM" };
    case "nacional":
      return { kind: "text", text: "Atiende todo Chile" };
    default:
      return { kind: "empty" };
  }
}

const COBERTURA_PREVIEW_VER_MAS_DESDE = 12;

function CoberturaComunasPreviewNombres({
  partes,
  regionCortaUnica,
}: {
  partes: string[];
  regionCortaUnica?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const namesKey = `${partes.join("\u0000")}\u0000${regionCortaUnica ?? ""}`;
  useEffect(() => {
    setExpanded(false);
  }, [namesKey]);

  const needsToggle = partes.length > COBERTURA_PREVIEW_VER_MAS_DESDE;
  const shown =
    needsToggle && !expanded
      ? partes.slice(0, COBERTURA_PREVIEW_VER_MAS_DESDE)
      : partes;
  const ocultas = partes.length - COBERTURA_PREVIEW_VER_MAS_DESDE;

  return (
    <span className="nf-upgrade-ficha-resumen-cobertura-nombres-root">
      <span className="nf-upgrade-ficha-resumen-cobertura-nombres">
        {shown.map((n, i) => (
          <React.Fragment key={`${n}-${i}`}>
            {i > 0 ? (
              <span className="nf-upgrade-ficha-resumen-cobertura-sep" aria-hidden>
                {" "}
                ·{" "}
              </span>
            ) : null}
            <span>{n}</span>
          </React.Fragment>
        ))}
      </span>
      {needsToggle && !expanded ? (
        <span className="nf-upgrade-ficha-resumen-cobertura-mas-cta">
          {" "}
          (+{ocultas} más)
        </span>
      ) : null}
      {regionCortaUnica ? (
        <span className="nf-upgrade-ficha-resumen-cobertura-reg-suf">
          {" "}
          ({regionCortaUnica})
        </span>
      ) : null}
      {needsToggle ? (
        <button
          type="button"
          className="nf-upgrade-ficha-resumen-larga-more"
          style={{ marginTop: 6 }}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Ver menos" : "Ver más"}
        </button>
      ) : null}
    </span>
  );
}

function instagramHrefParaPreview(raw: string): string | null {
  const v = validateOptionalInstagram(raw);
  if (!v.ok || !v.normalized) return null;
  return `https://instagram.com/${encodeURIComponent(v.normalized)}`;
}

function sitioWebHrefParaPreview(raw: string): string | null {
  const v = validateOptionalWebsite(raw);
  if (!v.ok || !v.normalized) return null;
  return v.normalized;
}

/** Vista previa tipo listado: foto principal + texto + WhatsApp (reactivo al formulario). */
function UpgradeFichaPublicaResumen({
  form,
  comunaBase,
  comunasCatalog,
  totalFotos,
}: {
  form: FormState;
  comunaBase: ComunaOption | undefined;
  comunasCatalog: ComunaCatalogRow[];
  totalFotos: number;
}) {
  const previewUid = useId();
  const fotoUrl = form.fotoPrincipalUrl.trim();
  const [fotoBroken, setFotoBroken] = useState(false);
  useEffect(() => {
    setFotoBroken(false);
  }, [fotoUrl]);

  const largaPreview = form.descripcionLarga.trim().replace(/\s+/g, " ").trim();
  const largaRef = useRef<HTMLParagraphElement | null>(null);
  const [largaExpanded, setLargaExpanded] = useState(false);
  const [largaHayOverflow, setLargaHayOverflow] = useState(false);

  useLayoutEffect(() => {
    setLargaExpanded(false);
  }, [largaPreview]);

  useLayoutEffect(() => {
    if (!largaPreview) {
      setLargaHayOverflow(false);
      return;
    }
    const el = largaRef.current;
    if (!el) return;
    if (largaExpanded) {
      setLargaHayOverflow(true);
      return;
    }
    const measure = () => {
      setLargaHayOverflow(el.scrollHeight > el.clientHeight + 1);
    };
    measure();
    const ro =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [largaPreview, largaExpanded]);

  const waHref = normalizarWaHref(form.whatsapp);
  const waLabelPreview = chileWhatsappStorageToDisplay(form.whatsapp.trim());
  const desc = displayCapitalizeFirst(
    clampDescripcionCortaFichaDisplay(form.descripcionCorta.trim())
  );
  const coberturaPreview = useMemo(
    () => buildCoberturaPreviewModel(form, comunaBase, comunasCatalog),
    [
      form.coberturaTipo,
      form.comunaBaseSlug,
      form.comunasCoberturaSlugs,
      comunaBase,
      comunasCatalog,
    ]
  );
  const modalidadPreviewItems = useMemo(() => {
    const seen = new Set<string>();
    const out: { key: string; label: string; icon: string }[] = [];
    for (const m of form.modalidadesAtencion) {
      const lab = etiquetaModalidadAtencion(m);
      if (!lab) continue;
      const dk = String(m ?? "").trim().toLowerCase();
      if (seen.has(dk)) continue;
      seen.add(dk);
      out.push({
        key: dk || lab,
        label: lab,
        icon: iconoModalidadPreview(m),
      });
    }
    return out;
  }, [form.modalidadesAtencion]);
  const igHref = instagramHrefParaPreview(form.instagram);
  const webHref = sitioWebHrefParaPreview(form.web);
  const igLabelPreview = formatInstagramDisplay(form.instagram.trim());
  const webLabelPreview = webHref ? formatWebsiteDisplay(webHref) : "";
  const comunaBaseDisplay = useMemo(() => {
    const slug = form.comunaBaseSlug.trim();
    if (slug) {
      const row = resolveComunaFromCatalog(comunasCatalog, slug);
      if (row) return formatComunaCatalogLabelCorto(row);
    }
    const name = comunaBase?.nombre?.trim();
    if (name) {
      const reg = String(comunaBase?.regionNombre ?? "").trim();
      const short = getRegionShort(reg);
      return short ? `${name} ${short}` : name;
    }
    if (slug) return tituloDesdeSlug(slug);
    return "Sin definir";
  }, [form.comunaBaseSlug, comunasCatalog, comunaBase]);

  const contactNamePreview = displayTitleCaseWords(form.responsable.trim());
  const showIgCta = Boolean(igHref);
  const localesPreview = form.modalidadesAtencion.includes("local_fisico")
    ? form.localesFisicos.filter(
        (l) => l.direccion.trim() && l.comunaSlug.trim()
      )
    : [];
  const showLocalDireccion = localesPreview.length > 0;

  return (
    <article className="nf-upgrade-ficha-resumen">
      <div className="nf-upgrade-ficha-resumen-foto">
        {fotoUrl && !fotoBroken ? (
          <div className="preview-image">
            <img
              key={fotoUrl}
              src={fotoUrl}
              alt=""
              referrerPolicy="no-referrer"
              onError={() => setFotoBroken(true)}
            />
          </div>
        ) : (
          <div className="nf-upgrade-ficha-resumen-foto-placeholder">
            {fotoBroken
              ? "No se pudo cargar la imagen"
              : totalFotos === 0
                ? "Sin fotos, generas menos confianza"
                : "Tu perfil se verá así sin fotos"}
          </div>
        )}
      </div>
      <div className="nf-upgrade-ficha-resumen-inner">
        <header className="nf-upgrade-ficha-resumen-head">
          <h2 className="nf-upgrade-ficha-resumen-nombre">
            {form.nombre.trim()
              ? displayTitleCaseWords(form.nombre.trim())
              : "Nombre del negocio"}
          </h2>
          <p className="nf-upgrade-ficha-resumen-desc">
            {desc || "Sin descripción corta todavía."}
          </p>
          {largaPreview ? (
            <>
              <p
                ref={largaRef}
                className={
                  "nf-upgrade-ficha-resumen-larga" +
                  (largaExpanded ? " nf-upgrade-ficha-resumen-larga--expanded" : "")
                }
              >
                {displayCapitalizeSentenceStarts(largaPreview)}
              </p>
              {largaHayOverflow ? (
                <button
                  type="button"
                  className="nf-upgrade-ficha-resumen-larga-more"
                  onClick={() => setLargaExpanded((v) => !v)}
                >
                  {largaExpanded ? "Ver menos" : "Ver descripción completa"}
                </button>
              ) : null}
            </>
          ) : null}
        </header>

        <section
          className="nf-upgrade-ficha-resumen-block"
          aria-labelledby={`${previewUid}-ubicacion`}
        >
          <h3 className="nf-upgrade-ficha-resumen-block-title" id={`${previewUid}-ubicacion`}>
            Ubicación
          </h3>
          <div className="nf-upgrade-ficha-resumen-block-rows">
            <p className="nf-upgrade-ficha-resumen-block-row">
              <span className="nf-upgrade-ficha-resumen-block-kicker nf-upgrade-ficha-resumen-kicker-inline">
                <span className="nf-upgrade-ficha-resumen-inline-icon" aria-hidden>
                  📍
                </span>
                <span>Comuna base</span>
              </span>
              <span className="nf-upgrade-ficha-resumen-block-value">{comunaBaseDisplay}</span>
            </p>
            {coberturaPreview.kind !== "empty" ? (
              <p className="nf-upgrade-ficha-resumen-block-row">
                <span className="nf-upgrade-ficha-resumen-block-kicker">Cobertura</span>
                <span className="nf-upgrade-ficha-resumen-block-value nf-upgrade-ficha-resumen-value-with-leading-icon">
                  <span className="nf-upgrade-ficha-resumen-inline-icon" aria-hidden>
                    🧭
                  </span>
                  {coberturaPreview.kind === "text" ? (
                    <span>{coberturaPreview.text}</span>
                  ) : (
                    <CoberturaComunasPreviewNombres
                      partes={coberturaPreview.partes}
                      regionCortaUnica={coberturaPreview.regionCortaUnica}
                    />
                  )}
                </span>
              </p>
            ) : null}
          </div>
        </section>

        {modalidadPreviewItems.length > 0 || showLocalDireccion ? (
          <section
            className="nf-upgrade-ficha-resumen-block"
            aria-labelledby={`${previewUid}-modalidades`}
          >
            <h3 className="nf-upgrade-ficha-resumen-block-title" id={`${previewUid}-modalidades`}>
              Forma de atención
            </h3>
            {modalidadPreviewItems.length > 0 ? (
              <div className="nf-upgrade-ficha-resumen-chips" aria-label="Modalidades">
                {modalidadPreviewItems.map((row) => (
                  <span key={row.key} className="nf-upgrade-ficha-resumen-chip">
                    {row.icon ? (
                      <span className="nf-upgrade-ficha-resumen-chip-icon" aria-hidden>
                        {row.icon}
                      </span>
                    ) : null}
                    {row.label}
                  </span>
                ))}
              </div>
            ) : null}
            {showLocalDireccion ? (
              <div
                className="nf-upgrade-ficha-resumen-block-row"
                style={{ marginTop: modalidadPreviewItems.length > 0 ? 10 : 0 }}
              >
                <span className="nf-upgrade-ficha-resumen-block-kicker">
                  {localesPreview.length > 1 ? "Locales" : "Dirección del local"}
                </span>
                <div className="nf-upgrade-ficha-resumen-block-value">
                  {localesPreview.map((l) => (
                    <p key={l.clientId} style={{ margin: "6px 0 0" }}>
                      <span style={{ display: "block", fontWeight: 700 }}>
                        {(() => {
                          const r = resolveComunaFromCatalog(comunasCatalog, l.comunaSlug);
                          return r
                            ? formatComunaCatalogLabelCorto(r)
                            : nombreComunaPreviewDesdeSlug(l.comunaSlug);
                        })()}
                      </span>
                      <span
                        className="nf-upgrade-ficha-resumen-value-with-leading-icon"
                        style={{ display: "flex", marginTop: 4 }}
                      >
                        <span className="nf-upgrade-ficha-resumen-inline-icon" aria-hidden>
                          📍
                        </span>
                        <span>{displayTitleCaseWords(l.direccion.trim())}</span>
                      </span>
                      {l.referencia.trim() ? (
                        <span style={{ display: "block", fontSize: 12, opacity: 0.85 }}>
                          {displayTitleCaseWords(l.referencia.trim())}
                        </span>
                      ) : null}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        <div className="nf-upgrade-ficha-resumen-contact">
          {contactNamePreview ? (
            <div className="nf-upgrade-ficha-resumen-contacto-nombre">
              <span className="nf-upgrade-ficha-resumen-contacto-nombre-k">
                Atendido por
              </span>
              <span className="nf-upgrade-ficha-resumen-contacto-nombre-v">
                {contactNamePreview}
              </span>
            </div>
          ) : null}
          <div
            className={
              showIgCta
                ? "nf-upgrade-ficha-resumen-cta-row"
                : "nf-upgrade-ficha-resumen-cta-row nf-upgrade-ficha-resumen-cta-row--single"
            }
          >
            <div className="nf-upgrade-ficha-resumen-cta-cell">
              {waHref ? (
                <a
                  href={waHref}
                  target="_blank"
                  rel="noreferrer"
                  className="nf-upgrade-ficha-resumen-wa-btn"
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      width: "100%",
                    }}
                  >
                    <WhatsAppGlyph />
                    <span
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                        minWidth: 0,
                      }}
                    >
                      <span className="block font-semibold">WhatsApp</span>
                      {waLabelPreview ? (
                        <span
                          className="block max-w-[14rem] truncate text-xs font-normal"
                          style={{ color: "rgba(255,255,255,0.92)" }}
                        >
                          {waLabelPreview}
                        </span>
                      ) : null}
                    </span>
                  </span>
                </a>
              ) : (
                <span className="nf-upgrade-ficha-resumen-wa-muted">
                  Agregá WhatsApp en la sección de contacto
                </span>
              )}
            </div>
            {showIgCta && igHref ? (
              <div className="nf-upgrade-ficha-resumen-cta-cell">
                <a
                  href={igHref}
                  target="_blank"
                  rel="noreferrer"
                  className="nf-upgrade-ficha-resumen-ig-btn"
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      width: "100%",
                    }}
                  >
                    <InstagramGlyph tone="brand" />
                    <span style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                      <span className="block font-semibold">Instagram</span>
                      {igLabelPreview ? (
                        <span
                          className="block max-w-[14rem] truncate text-xs font-normal"
                          style={{ color: "#475569" }}
                        >
                          {igLabelPreview}
                        </span>
                      ) : null}
                    </span>
                  </span>
                </a>
              </div>
            ) : null}
          </div>
          {webHref ? (
            <a
              href={webHref}
              target="_blank"
              rel="noreferrer"
              className="nf-upgrade-ficha-resumen-web-btn"
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  width: "100%",
                }}
              >
                <WebGlyph tone="brand" />
                <span style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                  <span className="block font-semibold">Sitio web</span>
                  {webLabelPreview ? (
                    <span
                      className="block max-w-[18rem] truncate text-xs font-normal"
                      style={{ color: "#475569" }}
                    >
                      {webLabelPreview}
                    </span>
                  ) : null}
                </span>
              </span>
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default function NegocioForm({
  id,
  postulacionBorradorId,
  mode = "full",
  focus = null,
  bannerRevision = false,
}: {
  id?: string;
  postulacionBorradorId?: string;
  mode?: "full" | "upgrade";
  focus?: MejorarFichaFocusQ | null;
  bannerRevision?: boolean;
}) {
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  /** `true` al montar si hay perfil que hidratar: evita un frame con placeholders de ejemplo antes del GET. */
  const [loading, setLoading] = useState(
    () =>
      Boolean(String(id ?? "").trim()) ||
      Boolean(String(postulacionBorradorId ?? "").trim()),
  );
  const [postSaveActionsOpen, setPostSaveActionsOpen] = useState(false);
  const [fichaPublicaSlug, setFichaPublicaSlug] = useState("");
  const [estadoPublicacion, setEstadoPublicacion] = useState("");
  const [moderacionMensaje, setModeracionMensaje] = useState("");
  const [emprendedorIdFromBorrador, setEmprendedorIdFromBorrador] =
    useState("");
  const fotoPrincipalFileRef = useRef<HTMLInputElement>(null);
  const galeriaFileRef = useRef<HTMLInputElement>(null);
  const [fotoPrincipalUploading, setFotoPrincipalUploading] = useState(false);
  const [galeriaUploading, setGaleriaUploading] = useState(false);
  /** Galería /mejorar-ficha: en pantallas sin hover, tap en miniatura abre acciones (solo UI). */
  const [galeriaThumbActionsOpenIndex, setGaleriaThumbActionsOpenIndex] = useState<
    number | null
  >(null);
  const [galeriaThumbTapReveal, setGaleriaThumbTapReveal] = useState(false);
  const [fotoPrincipalMsg, setFotoPrincipalMsg] = useState("");
  const [galeriaMsg, setGaleriaMsg] = useState("");
  const [mediaPersistMsg, setMediaPersistMsg] = useState("");
  const [upgradeSilentSave, setUpgradeSilentSave] = useState<
    "idle" | "saving" | "saved" | "err"
  >("idle");
  const [upgradeSilentErr, setUpgradeSilentErr] = useState("");
  /** Firma del perfil persistida (servidor o último guardado OK); para "Hay cambios sin guardar". */
  const [lastSavedProfileSig, setLastSavedProfileSig] = useState<string | null>(
    null
  );
  const mediaHydratedRef = useRef(false);
  const lastPersistedFotoRef = useRef("");
  const lastPersistedGaleriaKeyRef = useRef("");
  const upgradeProfileSaveLockRef = useRef(false);
  /** Evita que el autosync PATCH envíe galería vacía mientras hay previews blob: o subidas en curso. */
  const mediaUploadBusyRef = useRef(false);
  /** Tras tocar fotos/galería en «Mejorar ficha», `load()` no pisa foto ni galería con datos del servidor. Se resetea al cambiar id/borrador/mode. */
  const userModifiedMediaRef = useRef(false);
  const mediaLoadRouteKeyRef = useRef("");
  /** Cobertura (comunas extras / tipo / regiones): un GET tardío no debe revertir chips ya editados. */
  const userTouchedCoberturaRef = useRef(false);
  /** Invalida respuestas async de `load()` al desmontar o al re-ejecutar el efecto (Strict Mode / cambio de ruta). */
  const negocioProfileLoadIdRef = useRef(0);
  const [comunasCatalog, setComunasCatalog] = useState<ComunaCatalogRow[]>([]);
  const [comunasCatalogLoading, setComunasCatalogLoading] = useState(true);
  const comunasCatalogRef = useRef<ComunaCatalogRow[]>([]);
  /** Editor de locales físicos: colapsado por defecto; se abre con «Ver locales» o si hay error de validación. */
  const [localesFisicosEditorOpen, setLocalesFisicosEditorOpen] = useState(false);
  /**
   * Alineado con GET `/api/panel/negocio` (`tipoFicha`). En `completa` (trial/plan vigente) se exige
   * dirección si marcan local físico; en borrador/publicación previa se usa `basica`.
   */
  const [tipoFichaComercial, setTipoFichaComercial] = useState<
    "basica" | "completa"
  >("basica");

  const isUpgradeMode = mode === "upgrade";
  const searchParams = useSearchParams();

  const borradorSessionKey = useMemo(() => {
    const bid = postulacionBorradorId?.trim();
    /** v2: no guardar comuna/cobertura/modalidades — al hidratar no deben pisar lo que vino del servidor tras editar en /publicar. */
    return bid ? `nf_mejorar_ficha_borrador_cache_v2:${bid}` : "";
  }, [postulacionBorradorId]);

  const persistDraftSessionCache = useCallback(
    (next: FormState) => {
      if (!borradorSessionKey) return;
      if (typeof window === "undefined") return;
      try {
        const payload = {
          ts: Date.now(),
          form: {
            nombre: next.nombre,
            responsable: next.responsable,
            descripcionCorta: next.descripcionCorta,
            descripcionLarga: next.descripcionLarga,
            whatsapp: next.whatsapp,
            whatsappSecundario: next.whatsappSecundario,
            instagram: next.instagram,
            web: next.web,
            email: next.email,
          },
        };
        window.sessionStorage.setItem(borradorSessionKey, JSON.stringify(payload));
      } catch {
        // best-effort only
      }
    },
    [borradorSessionKey]
  );

  const hydrateDraftSessionCache = useCallback((): Partial<FormState> | null => {
    if (!borradorSessionKey) return null;
    if (typeof window === "undefined") return null;
    try {
      const raw = window.sessionStorage.getItem(borradorSessionKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { form?: Partial<FormState> };
      const form = parsed?.form;
      if (!form || typeof form !== "object") return null;
      /** Por si quedó caché antigua mezclada: nunca rehidratar geografía/modalidad desde sesión. */
      const {
        comunaBaseSlug: _b,
        coberturaTipo: _c,
        comunasCoberturaSlugs: _cc,
        regionesCoberturaSlugs: _r,
        modalidadesAtencion: _m,
        localesFisicos: _l,
        ...rest
      } = form as Partial<FormState>;
      return rest;
    } catch {
      return null;
    }
  }, [borradorSessionKey]);

  const datosBasicosHref = useMemo(() => {
    const carry = new URLSearchParams();
    const tokenQ = searchParams?.get("token")?.trim();
    const accessTokenQ = searchParams?.get("access_token")?.trim();
    const refreshTokenQ = searchParams?.get("refresh_token")?.trim();
    const hintComuna = searchParams?.get("comuna")?.trim();
    const hintServicio = searchParams?.get("servicio")?.trim();

    if (tokenQ) carry.set("token", tokenQ);
    if (accessTokenQ) carry.set("access_token", accessTokenQ);
    if (refreshTokenQ) carry.set("refresh_token", refreshTokenQ);
    if (hintComuna) carry.set("comuna", hintComuna);
    if (hintServicio) carry.set("servicio", hintServicio);
    const origenQ = searchParams?.get("origen")?.trim();
    if (origenQ) carry.set("origen", origenQ);
    const fromQ = searchParams?.get("from")?.trim();
    if (fromQ) carry.set("from", fromQ);

    const bid = postulacionBorradorId?.trim();
    if (bid) {
      carry.set("id", bid);
      carry.set("edicion_basica", "1");
      return `/publicar?${carry.toString()}`;
    }
    const eid = id?.trim();
    if (eid) {
      carry.set("id", eid);
      carry.set("edicion_basica", "1");
      return `/publicar?${carry.toString()}`;
    }
    return "";
  }, [postulacionBorradorId, id, searchParams]);

  const fichaPublicaHref = useMemo(
    () => buildFichaPublicaAmigaPath(form.comunaBaseSlug, fichaPublicaSlug),
    [form.comunaBaseSlug, fichaPublicaSlug]
  );

  const fichaPublicaEnSitioVisible = useMemo(
    () =>
      Boolean(fichaPublicaHref) &&
      emprendedorFichaVisiblePublicamente(estadoPublicacion),
    [fichaPublicaHref, estadoPublicacion]
  );

  const fichaEnRevision = useMemo(
    () =>
      normalizeEstadoPublicacionDb(estadoPublicacion) ===
      ESTADO_PUBLICACION.en_revision,
    [estadoPublicacion]
  );

  const fichaEstaPublicada = useMemo(
    () =>
      normalizeEstadoPublicacionDb(estadoPublicacion) ===
      ESTADO_PUBLICACION.publicado,
    [estadoPublicacion]
  );

  const applyPanelModeracionFromMedia = useCallback(
    (r: { estado?: string; moderationMessage?: string }) => {
      setEstadoPublicacion(
        normalizeEstadoPublicacionDb(r.estado ?? ESTADO_PUBLICACION.en_revision)
      );
      if (r.moderationMessage?.trim()) {
        setModeracionMensaje(r.moderationMessage.trim());
      }
    },
    []
  );

  /**
   * Edición desde panel: `origen=panel` o `from=panel`. Onboarding post-publicar no los trae.
   * Usado en post-guardado y para ocultar «Volver al panel» en el header si no aplica.
   */
  const flujoDesdePanel = useMemo(() => {
    const o = searchParams?.get("origen")?.trim().toLowerCase();
    const from = searchParams?.get("from")?.trim().toLowerCase();
    return o === "panel" || from === "panel";
  }, [searchParams]);

  const panelHref = useMemo(() => {
    const carry = new URLSearchParams();
    const tokenQ = searchParams?.get("token")?.trim();
    const accessTokenQ = searchParams?.get("access_token")?.trim();
    const refreshTokenQ = searchParams?.get("refresh_token")?.trim();
    if (tokenQ) carry.set("token", tokenQ);
    if (accessTokenQ) carry.set("access_token", accessTokenQ);
    if (refreshTokenQ) carry.set("refresh_token", refreshTokenQ);

    const qid = id?.trim() || emprendedorIdFromBorrador.trim();
    const base = qid ? `/panel?id=${encodeURIComponent(qid)}` : "/panel";
    const qs = carry.toString();
    if (!qs) return base;
    return `${base}${base.includes("?") ? "&" : "?"}${qs}`;
  }, [id, emprendedorIdFromBorrador, searchParams]);

  /** Home del sitio (post-guardado «Volver al inicio»); conserva token de URL si venía en magic link. */
  const siteHomeHref = useMemo(() => {
    const carry = new URLSearchParams();
    const tokenQ = searchParams?.get("token")?.trim();
    const accessTokenQ = searchParams?.get("access_token")?.trim();
    const refreshTokenQ = searchParams?.get("refresh_token")?.trim();
    if (tokenQ) carry.set("token", tokenQ);
    if (accessTokenQ) carry.set("access_token", accessTokenQ);
    if (refreshTokenQ) carry.set("refresh_token", refreshTokenQ);
    const qs = carry.toString();
    return qs ? `/?${qs}` : "/";
  }, [searchParams]);

  /** Vista previa con token opaco (mismo criterio que `/panel?token=`). */
  const previewFichaHref = useMemo(() => {
    const eid = (id?.trim() || emprendedorIdFromBorrador.trim());
    const tokenQ =
      searchParams?.get("token")?.trim() ||
      searchParams?.get("access_token")?.trim() ||
      "";
    if (!eid || !tokenQ) return "";
    const qs = new URLSearchParams({ token: tokenQ });
    return `/preview/${encodeURIComponent(eid)}?${qs.toString()}`;
  }, [id, emprendedorIdFromBorrador, searchParams]);

  useEffect(() => {
    comunasCatalogRef.current = comunasCatalog;
  }, [comunasCatalog]);

  useEffect(() => {
    let active = true;
    setComunasCatalogLoading(true);
    void (async () => {
      try {
        const res = await fetch("/api/comunas/catalogo", { cache: "no-store" });
        const j = (await res.json()) as {
          ok?: boolean;
          items?: ComunaCatalogRow[];
        };
        if (!active) return;
        if (j?.ok && Array.isArray(j.items) && j.items.length > 0) {
          setComunasCatalog(j.items);
        } else {
          setComunasCatalog([]);
        }
      } catch {
        if (active) setComunasCatalog([]);
      } finally {
        if (active) setComunasCatalogLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(hover: none)");
    const sync = () => {
      const tap = mq.matches;
      setGaleriaThumbTapReveal(tap);
      if (!tap) setGaleriaThumbActionsOpenIndex(null);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!galeriaThumbTapReveal || galeriaThumbActionsOpenIndex === null) return;
    const onDoc = (ev: MouseEvent) => {
      const t = ev.target;
      if (!(t instanceof Element)) return;
      if (t.closest(".nf-upgrade-galeria-thumb")) return;
      setGaleriaThumbActionsOpenIndex(null);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, [galeriaThumbTapReveal, galeriaThumbActionsOpenIndex]);

  useEffect(() => {
    setGaleriaThumbActionsOpenIndex(null);
  }, [form.galeriaUrls]);

  function touchUpgradeMedia() {
    if (isUpgradeMode) userModifiedMediaRef.current = true;
  }
  const persistMediaId = (id?.trim() || postulacionBorradorId?.trim() || "").trim();

  const comunaBase = useMemo(() => {
    return COMUNAS.find((c) => c.slug === form.comunaBaseSlug);
  }, [form.comunaBaseSlug]);

  const allowedComunaRowsForLocales = useMemo(
    () => comunaRowsPermitidosLocales(form, comunasCatalog),
    [
      form.coberturaTipo,
      form.comunaBaseSlug,
      form.comunasCoberturaSlugs.join(","),
      comunasCatalog,
    ]
  );

  const allowedComunaRowsForPrincipalLocal = useMemo(
    () => comunaRowsSoloComunaBase(form, comunasCatalog),
    [form.comunaBaseSlug, comunasCatalog]
  );

  const localesFisicosResumenLine = useMemo(() => {
    if (!form.modalidadesAtencion.includes("local_fisico")) return "";
    const list = form.localesFisicos;
    if (list.length === 0) {
      return `Podés cargar hasta ${MAX_LOCALES_FISICOS} direcciones de local.`;
    }
    const complete = list.filter((l) => l.direccion.trim() && l.comunaSlug.trim()).length;
    const principal = list.find((l) => l.esPrincipal) ?? list[0];
    const r = principal?.comunaSlug
      ? resolveComunaFromCatalog(comunasCatalog, principal.comunaSlug)
      : null;
    const comunaLabel = r
      ? formatComunaCatalogLabelCorto(r)
      : principal?.comunaSlug
        ? tituloDesdeSlug(principal.comunaSlug)
        : "";
    const oneLine =
      principal?.direccion.trim() && comunaLabel
        ? `${comunaLabel} — ${principal.direccion.trim()}`
        : null;
    if (list.length === 1) {
      return oneLine ?? "1 local · falta comuna o dirección";
    }
    return complete === list.length
      ? `${list.length} locales cargados`
      : `${list.length} locales · ${list.length - complete} sin completar`;
  }, [form.modalidadesAtencion, form.localesFisicos, comunasCatalog]);

  /** En chips de cobertura: si todas las comunas elegidas son de la misma región, no repetimos la región. */
  const coberturaChipsSoloNombre = useMemo(() => {
    if (form.coberturaTipo !== "varias_comunas") return false;
    const rows = form.comunasCoberturaSlugs
      .map((s) => resolveComunaFromCatalog(comunasCatalog, s))
      .filter((r): r is ComunaCatalogRow => r != null);
    if (rows.length === 0) return false;
    const regions = new Set(
      rows.map((r) => String(r.regionNombre ?? "").trim()).filter(Boolean)
    );
    return regions.size <= 1;
  }, [form.coberturaTipo, form.comunasCoberturaSlugs.join(","), comunasCatalog]);

  const localesComunaClampDeps = `${form.coberturaTipo}|${form.comunaBaseSlug}|${[...form.comunasCoberturaSlugs].sort().join(",")}|${form.modalidadesAtencion.join(",")}|${JSON.stringify(form.localesFisicos.map((l) => [l.clientId, l.comunaSlug]))}`;

  useEffect(() => {
    if (!form.modalidadesAtencion.includes("local_fisico")) return;
    if (comunasCatalog.length === 0) return;
    const catalogSnapshot = comunasCatalog;
    setForm((prev) => {
      if (!prev.modalidadesAtencion.includes("local_fisico")) return prev;
      const mode = localesComunaPickerModeFromCobertura(prev.coberturaTipo);
      const clamped = clampLocalesFisicosComunasWithCatalog(
        prev,
        catalogSnapshot,
        prev.localesFisicos,
        mode
      );
      const same =
        clamped.length === prev.localesFisicos.length &&
        clamped.every(
          (l, i) =>
            prev.localesFisicos[i] &&
            l.clientId === prev.localesFisicos[i].clientId &&
            l.comunaSlug === prev.localesFisicos[i].comunaSlug
        );
      if (same) return prev;
      return { ...prev, localesFisicos: clamped };
    });
  }, [localesComunaClampDeps, comunasCatalog]);

  useEffect(() => {
    if (!form.modalidadesAtencion.includes("local_fisico")) {
      setLocalesFisicosEditorOpen(false);
    }
  }, [form.modalidadesAtencion]);

  const mejorarFichaGuiado = useMemo(
    () => resumenProgresoMejorarFicha(form),
    [
      form.fotoPrincipalUrl,
      form.whatsapp,
      form.modalidadesAtencion,
      form.descripcionCorta,
    ]
  );

  const photoBlockHighlight = useMemo(() => {
    if (!isUpgradeMode) return false;
    if (focus === "fotos") return true;
    return !form.fotoPrincipalUrl.trim();
  }, [isUpgradeMode, focus, form.fotoPrincipalUrl]);

  const totalFotos = useMemo(() => {
    const principal = form.fotoPrincipalUrl.trim() ? 1 : 0;
    const galeriaCount = form.galeriaUrls.filter((u) => u.trim()).length;
    return principal + galeriaCount;
  }, [form.fotoPrincipalUrl, form.galeriaUrls]);

  const scrollToUpgradeFotosBlock = useCallback(() => {
    if (typeof document === "undefined") return;
    document
      .getElementById("mejorar-ficha-foco-fotos")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const upgradeProfileSaveSigRef = useRef("");
  const upgradeProfileSaveSig = useMemo(
    () =>
      JSON.stringify({
        nombre: form.nombre,
        responsable: form.responsable,
        mostrarResponsable: form.responsable.trim().length > 0,
        comunaBaseSlug: form.comunaBaseSlug,
        coberturaTipo: form.coberturaTipo,
        comunasCoberturaSlugs: form.comunasCoberturaSlugs,
        regionesCoberturaSlugs: form.regionesCoberturaSlugs,
        modalidadesAtencion: form.modalidadesAtencion,
        descripcionCorta: form.descripcionCorta,
        descripcionLarga: form.descripcionLarga,
        whatsapp: form.whatsapp,
        whatsappSecundario: form.whatsappSecundario,
        instagram: form.instagram,
        web: form.web,
        email: form.email,
        fotoPrincipalUrl: form.fotoPrincipalUrl,
        galeriaUrls: form.galeriaUrls,
        categoriaSlug: form.categoriaSlug,
        subcategoriasSlugs: form.subcategoriasSlugs,
        localesFisicos: form.localesFisicos,
      }),
    [
      isUpgradeMode,
      form.nombre,
      form.responsable,
      form.comunaBaseSlug,
      form.coberturaTipo,
      form.comunasCoberturaSlugs,
      form.regionesCoberturaSlugs,
      form.modalidadesAtencion,
      form.descripcionCorta,
      form.descripcionLarga,
      form.whatsapp,
      form.whatsappSecundario,
      form.instagram,
      form.web,
      form.email,
      form.fotoPrincipalUrl,
      form.galeriaUrls,
      form.categoriaSlug,
      form.subcategoriasSlugs,
      form.localesFisicos,
    ]
  );
  upgradeProfileSaveSigRef.current = upgradeProfileSaveSig;

  const upgradeProfileDirty =
    isUpgradeMode &&
    Boolean(persistMediaId) &&
    !loading &&
    lastSavedProfileSig != null &&
    upgradeProfileSaveSig !== lastSavedProfileSig;

  const postSaveBannerAnchorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!postSaveActionsOpen) return;
    const el = postSaveBannerAnchorRef.current;
    if (!el) return;
    window.requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [postSaveActionsOpen]);

  useEffect(() => {
    if (!nfPostSaveDebugEnabled()) return;
    // eslint-disable-next-line no-console
    console.info("[NegocioForm:postSave-debug]", {
      postSaveActionsOpen,
      isUpgradeMode,
      modeProp: mode,
      hasUnsavedChanges: upgradeProfileDirty,
      saving: isSubmitting || upgradeSilentSave === "saving",
      saveState: upgradeSilentSave,
      bannerRevisionProp: bannerRevision,
      fichaPublicaHrefPresent: Boolean(String(fichaPublicaHref ?? "").trim()),
      panelHref,
      persistMediaIdPresent: Boolean(String(persistMediaId ?? "").trim()),
      loading,
      postulacionBorradorIdPresent: Boolean(postulacionBorradorId?.trim()),
      idPresent: Boolean(id?.trim()),
    });
  }, [
    postSaveActionsOpen,
    isUpgradeMode,
    mode,
    upgradeProfileDirty,
    isSubmitting,
    upgradeSilentSave,
    bannerRevision,
    fichaPublicaHref,
    panelHref,
    persistMediaId,
    loading,
    postulacionBorradorId,
    id,
  ]);

  useEffect(() => {
    if (!isUpgradeMode || !persistMediaId) return;
    if (loading) setLastSavedProfileSig(null);
  }, [isUpgradeMode, persistMediaId, loading]);

  useEffect(() => {
    if (!isUpgradeMode || !persistMediaId || loading) return;
    if (!mediaHydratedRef.current) return;
    setLastSavedProfileSig(upgradeProfileSaveSigRef.current);
  }, [isUpgradeMode, persistMediaId, loading]);

  useEffect(() => {
    if (!isUpgradeMode || !focus) return;
    const elId =
      focus === "fotos"
        ? "mejorar-ficha-foco-fotos"
        : focus === "redes"
          ? "mejorar-ficha-foco-contacto"
          : focus === "descripcion"
            ? "mejorar-ficha-foco-descripcion"
            : null;
    if (!elId) return;
    const t = window.setTimeout(() => {
      document.getElementById(elId)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
    return () => window.clearTimeout(t);
  }, [isUpgradeMode, focus]);

  useEffect(() => {
    let active = true;
    negocioProfileLoadIdRef.current += 1;
    const loadId = negocioProfileLoadIdRef.current;

    const routeKey = `${id?.trim() ?? ""}|${postulacionBorradorId?.trim() ?? ""}|${mode}`;
    if (mediaLoadRouteKeyRef.current !== routeKey) {
      mediaLoadRouteKeyRef.current = routeKey;
      userModifiedMediaRef.current = false;
      userTouchedCoberturaRef.current = false;
    }

    const stale = () => !active || loadId !== negocioProfileLoadIdRef.current;

    async function load() {
      const empId = id?.trim();
      const borradorId = postulacionBorradorId?.trim();
      if (!empId && !borradorId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setPostSaveActionsOpen(false);
        setModeracionMensaje("");
        if (mode === "upgrade") {
          mediaHydratedRef.current = false;
        }

        if (borradorId) {
          setEstadoPublicacion("");
          setTipoFichaComercial("basica");
          const res = await fetch(publicarBorradorByIdPath(borradorId), {
            cache: "no-store",
          });
          const json = (await res.json()) as Record<string, unknown>;
          if (!res.ok || json?.ok !== true) {
            throw new Error(
              (typeof json.message === "string" && json.message) ||
                (typeof json.error === "string" && json.error) ||
                "No se pudo cargar la postulación"
            );
          }

          if (stale()) return;

          const empSlug = String(json.emprendedor_slug ?? "").trim();
          const empBid = String(json.emprendedor_id ?? "").trim();
          setFichaPublicaSlug(empSlug || empBid);
          setEmprendedorIdFromBorrador(empBid);

          const rawGaleria = Array.isArray(json.galeria_urls)
            ? json.galeria_urls
            : [];
          const galeriaUrlsNormalized: string[] = Array.from(
            { length: 8 },
            (_, i) =>
              i < rawGaleria.length ? String(rawGaleria[i] ?? "").trim() : ""
          );

          let coberturaTipo = mapBorradorCoberturaTipoToForm(
            String(json.cobertura_tipo ?? "")
          );
          const comunasCov = Array.isArray(json.comunas_cobertura)
            ? json.comunas_cobertura.map((x) => String(x).trim()).filter(Boolean)
            : [];
          if (coberturaTipo === "varias_comunas" && comunasCov.length === 0) {
            coberturaTipo = "solo_comuna";
          }
          const regionesCov = Array.isArray(json.regiones_cobertura)
            ? json.regiones_cobertura.map((x) => String(x).trim()).filter(Boolean)
            : [];

          const modRaw = modalidadesAtencionInputsToDbUnique(
            Array.isArray(json.modalidades_atencion)
              ? json.modalidades_atencion.map((x) => String(x))
              : []
          );
          const modalidadesMapped: ModalidadAtencion[] = [];
          for (const m of modRaw) {
            if (
              m === "local_fisico" ||
              m === "delivery" ||
              m === "domicilio" ||
              m === "online" ||
              m === "presencial_terreno"
            ) {
              modalidadesMapped.push(m);
            }
          }

          const nombreEmp = String(json.nombre_emprendimiento ?? "").trim();
          const nombreResp = String(json.nombre_responsable ?? "").trim();

          const serverFotoBorrador = isPersistibleFotoUrl(
            String(json.foto_principal_url ?? "").trim()
          )
            ? String(json.foto_principal_url).trim()
            : "";

          /** Evita pisar foto/galería locales si el usuario ya subió (touchUpgradeMedia) y el GET llega tarde. */
          const skipHydrateMedia =
            mode === "upgrade" && userModifiedMediaRef.current;

          if (mode === "upgrade") {
            if (!skipHydrateMedia) {
              lastPersistedFotoRef.current = String(
                json.foto_principal_url ?? ""
              ).trim();
              lastPersistedGaleriaKeyRef.current = JSON.stringify(
                galeriaPayloadUrls(galeriaUrlsNormalized)
              );
            }
            mediaHydratedRef.current = true;
            setMediaPersistMsg("");
          }

          if (stale()) return;

          setForm((prev) => ({
            ...prev,
            nombre: nombreEmp,
            responsable: nombreResp,
            comunaBaseSlug: String(json.comuna_base_slug ?? "").trim(),
            coberturaTipo: userTouchedCoberturaRef.current
              ? prev.coberturaTipo
              : coberturaTipo,
            comunasCoberturaSlugs: userTouchedCoberturaRef.current
              ? prev.comunasCoberturaSlugs
              : coberturaTipo === "varias_comunas"
                ? comunasCov
                : [],
            regionesCoberturaSlugs: userTouchedCoberturaRef.current
              ? prev.regionesCoberturaSlugs
              : coberturaTipo === "regional"
                ? regionesCov
                : [],
            modalidadesAtencion: modalidadesMapped,
            descripcionCorta: String(json.frase_negocio ?? "").trim(),
            descripcionLarga: descripcionLargaFormSinRedundancia(
              String(json.frase_negocio ?? "").trim(),
              String(json.descripcion_libre ?? "").trim()
            ),
            keywordsUsuario: keywordsUsuarioFromPanelJson(json as Record<string, unknown>),
            whatsapp: chileWhatsappStorageToDisplay(
              String(json.whatsapp_principal ?? "").trim()
            ),
            whatsappSecundario: String(json.whatsapp_secundario ?? "").trim()
              ? chileWhatsappStorageToDisplay(
                  String(json.whatsapp_secundario ?? "").trim()
                )
              : "",
            instagram: String(json.instagram ?? "").trim(),
            web: String(json.sitio_web ?? "").trim(),
            email: String(json.email ?? "")
              .trim()
              .toLowerCase(),
            ...(skipHydrateMedia
              ? {}
              : {
                  fotoPrincipalUrl: serverFotoBorrador,
                  galeriaUrls: galeriaUrlsNormalized,
                }),
            ...(() => {
              if (!modalidadesMapped.includes("local_fisico")) {
                return { localesFisicos: [] };
              }
              const j = json as Record<string, unknown>;
              const baseSlug = String(j.comuna_base_slug ?? "").trim();
              const locRaw = Array.isArray(j.locales) ? j.locales : [];
              const out: LocalFisicoFormItem[] = [];
              for (const row of locRaw) {
                if (row == null || typeof row !== "object" || Array.isArray(row)) continue;
                const o = row as Record<string, unknown>;
                out.push({
                  clientId: newLocalFisicoClientId(),
                  comunaSlug: String(o.comuna_slug ?? "").trim(),
                  direccion: String(o.direccion ?? "").trim(),
                  referencia: String(o.referencia ?? "").trim(),
                  esPrincipal: o.es_principal === true,
                });
              }
              const legacyDir = String(j.direccion ?? "").trim();
              if (out.length === 0 && legacyDir && baseSlug) {
                return {
                  localesFisicos: [
                    {
                      clientId: newLocalFisicoClientId(),
                      comunaSlug: baseSlug,
                      direccion: legacyDir,
                      referencia: String(j.direccion_referencia ?? "").trim(),
                      esPrincipal: true,
                    },
                  ],
                };
              }
              let finalLocales = out;
              if (finalLocales.length > 0 && !finalLocales.some((l) => l.esPrincipal)) {
                finalLocales = finalLocales.map((l, i) =>
                  i === 0 ? { ...l, esPrincipal: true } : { ...l, esPrincipal: false }
                );
              }
              return { localesFisicos: finalLocales };
            })(),
          }));
          if (stale()) return;
          const cached = hydrateDraftSessionCache();
          if (cached) {
            setForm((prev) => ({ ...prev, ...cached }));
          }
        } else if (empId) {
          const res = await fetch(panelNegocioGetUrlForHydrate(empId), {
            cache: "no-store",
          });

          const json = await res.json();
          if (!res.ok || !json?.ok || !json.item) {
            throw new Error(json?.message || json?.error || "No se pudo cargar el negocio");
          }

          if (stale()) return;

          setTipoFichaComercial(
            json.tipoFicha === "completa" ? "completa" : "basica"
          );

          setFichaPublicaSlug(
            panelSlugFichaPublicaDesdeItem(json.item as Record<string, unknown>)
          );
          setEmprendedorIdFromBorrador("");
          setEstadoPublicacion(
            normalizeEstadoPublicacionDb(
              String(
                (json.item as Record<string, unknown>).estado_publicacion ?? ""
              )
            )
          );

          const itemRaw = json.item as Partial<FormState>;
          const itemForMerge = userTouchedCoberturaRef.current
            ? stripPanelItemCoberturaForStaleHydrate(itemRaw)
            : itemRaw;
          const rawGaleria = Array.isArray(itemRaw.galeriaUrls)
            ? itemRaw.galeriaUrls
            : [];
          const galeriaUrlsNormalized: string[] = Array.from({ length: 8 }, (_, i) =>
            i < rawGaleria.length ? String(rawGaleria[i] ?? "").trim() : ""
          );
          const waSecLoaded = String(
            (itemRaw as { whatsappSecundario?: unknown }).whatsappSecundario ?? ""
          ).trim();

          /** Misma protección que borrador: GET tardío no borra previews/URLs ya elegidas. */
          const skipHydrateMedia =
            mode === "upgrade" && userModifiedMediaRef.current;

          if (mode === "upgrade") {
            if (!skipHydrateMedia) {
              lastPersistedFotoRef.current = String(
                itemRaw.fotoPrincipalUrl ?? ""
              ).trim();
              lastPersistedGaleriaKeyRef.current = JSON.stringify(
                galeriaPayloadUrls(galeriaUrlsNormalized)
              );
            }
            mediaHydratedRef.current = true;
            setMediaPersistMsg("");
          }

          if (stale()) return;

          setForm((prev) => {
            const merged: FormState = {
              ...prev,
              ...itemForMerge,
              galeriaUrls: galeriaUrlsNormalized,
              whatsappSecundario: waSecLoaded,
              localesFisicos: Array.isArray(itemRaw.localesFisicos)
                ? itemRaw.localesFisicos.map((x) => normalizeLocalFisicoFromUnknown(x))
                : prev.localesFisicos,
              descripcionLarga: descripcionLargaFormSinRedundancia(
                String(itemRaw.descripcionCorta ?? "").trim(),
                String(itemRaw.descripcionLarga ?? "").trim()
              ),
            };
            merged.whatsapp = chileWhatsappStorageToDisplay(
              String(merged.whatsapp ?? "").trim()
            );
            merged.whatsappSecundario = String(merged.whatsappSecundario ?? "").trim()
              ? chileWhatsappStorageToDisplay(String(merged.whatsappSecundario).trim())
              : "";
            if (skipHydrateMedia) {
              merged.fotoPrincipalUrl = prev.fotoPrincipalUrl;
              merged.galeriaUrls = prev.galeriaUrls;
            }
            if (
              merged.coberturaTipo === "varias_comunas" &&
              merged.comunasCoberturaSlugs.length === 0
            ) {
              merged.coberturaTipo = "solo_comuna";
            }
            return merged;
          });
        }
      } catch (error) {
        if (stale()) return;
        setErrors((prev) => ({
          ...prev,
          general:
            error instanceof Error
              ? error.message
              : "No se pudo cargar la información del negocio.",
        }));
      } finally {
        if (!stale()) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
      negocioProfileLoadIdRef.current += 1;
    };
  }, [id, postulacionBorradorId, mode]);

  useEffect(() => {
    if (!isUpgradeMode || !persistMediaId || loading || !mediaHydratedRef.current)
      return;

    const timer = window.setTimeout(async () => {
      if (mediaUploadBusyRef.current) return;
      const foto = form.fotoPrincipalUrl.trim();
      const galUrls = galeriaPayloadUrls(form.galeriaUrls);
      const galKey = JSON.stringify(galUrls);
      const patch: {
        foto_principal_url?: string;
        galeria_urls?: string[];
      } = {};
      if (foto !== lastPersistedFotoRef.current) {
        if (foto === "") {
          patch.foto_principal_url = "";
        } else if (isPersistibleFotoUrl(foto)) {
          patch.foto_principal_url = foto;
        }
      }
      if (galKey !== lastPersistedGaleriaKeyRef.current) {
        patch.galeria_urls = galUrls;
      }
      if (Object.keys(patch).length === 0) return;
      const borradorId = postulacionBorradorId?.trim();
      const r = borradorId
        ? await patchBorradorMedia(borradorId, patch)
        : await patchNegocioMedia(id!.trim(), patch);
      if (r.ok) {
        if (!borradorId) {
          applyPanelModeracionFromMedia({
            estado: r.estado,
            moderationMessage: r.moderationMessage,
          });
        }
        if ("foto_principal_url" in patch) {
          lastPersistedFotoRef.current = foto;
        }
        if ("galeria_urls" in patch) {
          lastPersistedGaleriaKeyRef.current = galKey;
        }
        setMediaPersistMsg("");
      } else {
        setMediaPersistMsg(r.message ?? "");
      }
    }, 750);

    return () => window.clearTimeout(timer);
  }, [
    isUpgradeMode,
    id,
    postulacionBorradorId,
    persistMediaId,
    loading,
    form.fotoPrincipalUrl,
    form.galeriaUrls,
    applyPanelModeracionFromMedia,
  ]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (postulacionBorradorId?.trim()) {
        persistDraftSessionCache(next);
      }
      return next;
    });
    setErrors((prev) => ({ ...prev, [key]: undefined, general: undefined }));
    setPostSaveActionsOpen(false);
  }

  function toggleModalidad(value: ModalidadAtencion) {
    const exists = form.modalidadesAtencion.includes(value);

    if (exists) {
      if (value === "local_fisico") {
        setLocalesFisicosEditorOpen(false);
      }
      setForm((prev) => ({
        ...prev,
        modalidadesAtencion: prev.modalidadesAtencion.filter((x) => x !== value),
        localesFisicos: value === "local_fisico" ? [] : prev.localesFisicos,
      }));
    } else {
      setForm((prev) => {
        const nextMods = [...prev.modalidadesAtencion, value];
        if (value !== "local_fisico") {
          return { ...prev, modalidadesAtencion: nextMods };
        }
        if (prev.localesFisicos.length > 0) {
          const withMods = { ...prev, modalidadesAtencion: nextMods };
          return withMods;
        }
        const base = prev.comunaBaseSlug.trim();
        return {
          ...prev,
          modalidadesAtencion: nextMods,
          localesFisicos: [
            {
              clientId: newLocalFisicoClientId(),
              comunaSlug: base,
              direccion: "",
              referencia: "",
              esPrincipal: true,
            },
          ],
        };
      });
      if (value === "local_fisico") {
        setLocalesFisicosEditorOpen(true);
      }
    }
    setErrors((prev) => ({
      ...prev,
      modalidadesAtencion: undefined,
      localesFisicos: undefined,
      general: undefined,
    }));
    setPostSaveActionsOpen(false);
  }

  function updateComunaBaseSlug(value: string) {
    setForm((prev) => {
      if (!prev.modalidadesAtencion.includes("local_fisico")) {
        return { ...prev, comunaBaseSlug: value };
      }
      if (prev.coberturaTipo === "solo_comuna") {
        return {
          ...prev,
          comunaBaseSlug: value,
          localesFisicos: prev.localesFisicos.map((l) => ({
            ...l,
            comunaSlug: value,
          })),
        };
      }
      return {
        ...prev,
        comunaBaseSlug: value,
        localesFisicos: prev.localesFisicos.map((l) =>
          l.esPrincipal ? { ...l, comunaSlug: value } : l
        ),
      };
    });
    setErrors((prev) => ({ ...prev, comunaBaseSlug: undefined, general: undefined }));
    setPostSaveActionsOpen(false);
  }

  function addLocalFisico() {
    setForm((prev) => {
      if (!prev.modalidadesAtencion.includes("local_fisico")) return prev;
      if (prev.localesFisicos.length >= MAX_LOCALES_FISICOS) return prev;
      const isFirst = prev.localesFisicos.length === 0;
      const mode = localesComunaPickerModeFromCobertura(prev.coberturaTipo);
      const rows = comunaRowsPermitidosLocales(prev, comunasCatalogRef.current);
      /** Solo el primer local del listado se precarga con comuna base; 2.º y 3.º quedan sin comuna hasta que el usuario elige. */
      let defaultSlug = "";
      if (isFirst) {
        defaultSlug = prev.comunaBaseSlug.trim();
        if (mode === "solo_base" && rows[0]) {
          defaultSlug = rows[0].slug;
        } else if (mode === "fixed_list" && rows.length > 0) {
          const canon = resolveComunaFromCatalog(comunasCatalogRef.current, defaultSlug)?.slug;
          defaultSlug =
            canon && rows.some((r) => r.slug === canon) ? canon : rows[0].slug;
        }
      }
      return {
        ...prev,
        localesFisicos: [
          ...prev.localesFisicos,
          {
            clientId: newLocalFisicoClientId(),
            comunaSlug: defaultSlug,
            direccion: "",
            referencia: "",
            esPrincipal: isFirst,
          },
        ],
      };
    });
    setPostSaveActionsOpen(false);
  }

  function removeLocalFisico(clientId: string) {
    setForm((prev) => {
      const next = prev.localesFisicos.filter((l) => l.clientId !== clientId);
      if (next.length === 0) return { ...prev, localesFisicos: next };
      /** No auto-asignar principal: si quitó el principal, debe elegir otro en la UI. */
      return { ...prev, localesFisicos: next, comunaBaseSlug: prev.comunaBaseSlug };
    });
    setPostSaveActionsOpen(false);
  }

  function patchLocalFisico(
    clientId: string,
    partial: Partial<Omit<LocalFisicoFormItem, "clientId">>
  ) {
    setForm((prev) => {
      const cat = comunasCatalogRef.current;
      let next = prev.localesFisicos.map((l) =>
        l.clientId === clientId ? { ...l, ...partial } : l
      );
      const row = next.find((l) => l.clientId === clientId);
      if (!row) return prev;

      if (partial.esPrincipal === true) {
        if (!principalLocalComunaMatchesBase(prev.comunaBaseSlug, row.comunaSlug, cat)) {
          queueMicrotask(() => {
            setErrors((e) => ({
              ...e,
              localesFisicos:
                "El principal debe estar en tu comuna base. Elige esa comuna en este local o ve a «Editar datos básicos» y usa «Cambiar comuna» allí para cambiar tu comuna base.",
            }));
          });
          return prev;
        }
        next = next.map((l) => ({ ...l, esPrincipal: l.clientId === clientId }));
        return { ...prev, localesFisicos: next };
      }

      if (
        row.esPrincipal &&
        Object.prototype.hasOwnProperty.call(partial, "comunaSlug")
      ) {
        if (!principalLocalComunaMatchesBase(prev.comunaBaseSlug, row.comunaSlug, cat)) {
          queueMicrotask(() => {
            setErrors((e) => ({
              ...e,
              localesFisicos:
                "El principal debe coincidir con tu comuna base.",
            }));
          });
          return prev;
        }
      }

      return { ...prev, localesFisicos: next };
    });
    setErrors((prev) => ({ ...prev, localesFisicos: undefined, general: undefined }));
    setPostSaveActionsOpen(false);
  }

  function toggleComunaCobertura(slug: string) {
    setForm((prev) => {
      const exists = prev.comunasCoberturaSlugs.includes(slug);
      const nextSlugs = exists
        ? prev.comunasCoberturaSlugs.filter((x) => x !== slug)
        : [...prev.comunasCoberturaSlugs, slug];

      let coberturaTipo = prev.coberturaTipo;
      if (coberturaTipo === "varias_comunas" && nextSlugs.length === 0) {
        coberturaTipo = "solo_comuna";
      }

      const next = { ...prev, comunasCoberturaSlugs: nextSlugs, coberturaTipo };
      const clamped = clampLocalesFisicosComunasWithCatalog(
        next,
        comunasCatalogRef.current,
        next.localesFisicos,
        localesComunaPickerModeFromCobertura(next.coberturaTipo)
      );
      return { ...next, localesFisicos: clamped, comunaBaseSlug: next.comunaBaseSlug };
    });
    userTouchedCoberturaRef.current = true;
    setErrors((prev) => ({
      ...prev,
      comunasCoberturaSlugs: undefined,
      general: undefined,
    }));
    setPostSaveActionsOpen(false);
  }

  function handleCoberturaChange(value: string) {
    const cobertura = value as CoberturaTipo;

    setForm((prev) => {
      const next = {
        ...prev,
        coberturaTipo: cobertura,
        comunasCoberturaSlugs:
          cobertura === "varias_comunas" ? prev.comunasCoberturaSlugs : [],
        regionesCoberturaSlugs:
          cobertura === "regional" ? prev.regionesCoberturaSlugs : [],
      };
      const clamped = clampLocalesFisicosComunasWithCatalog(
        next,
        comunasCatalogRef.current,
        next.localesFisicos,
        localesComunaPickerModeFromCobertura(next.coberturaTipo)
      );
      return { ...next, localesFisicos: clamped, comunaBaseSlug: next.comunaBaseSlug };
    });
    userTouchedCoberturaRef.current = true;

    setErrors((prev) => ({
      ...prev,
      coberturaTipo: undefined,
      comunasCoberturaSlugs: undefined,
      general: undefined,
    }));
    setPostSaveActionsOpen(false);
  }

  function handleGaleriaChange(index: number, value: string) {
    const next = [...form.galeriaUrls];
    next[index] = value;
    updateField("galeriaUrls", next);
  }

  function galeriaUrlsFromMultiline(raw: string): string[] {
    const lines = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const taken = lines.slice(0, 8);
    return Array.from({ length: 8 }, (_, i) => taken[i] ?? "");
  }

  function galeriaMultilineValue(urls: string[]): string {
    return urls.map((u) => u.trim()).filter(Boolean).join("\n");
  }

  async function handleFotoPrincipalFilePick(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (
      !file.type.startsWith("image/") &&
      !/\.(jpe?g|png|gif|webp|heic|heif|bmp)$/i.test(file.name)
    ) {
      setFotoPrincipalMsg("El archivo debe ser una imagen (JPG, PNG, etc.).");
      return;
    }
    touchUpgradeMedia();
    mediaUploadBusyRef.current = true;
    setFotoPrincipalUploading(true);
    setFotoPrincipalMsg("");
    const previousUrl = form.fotoPrincipalUrl.trim();
    const previewUrl = URL.createObjectURL(file);
    updateField("fotoPrincipalUrl", previewUrl);
    try {
      const url = await uploadPanelImageFile(
        file,
        "panel/foto-principal",
        "foto principal (botón)"
      );
      updateField("fotoPrincipalUrl", url);
      if (isUpgradeMode && persistMediaId) {
        const borradorId = postulacionBorradorId?.trim();
        const r = borradorId
          ? await patchBorradorMedia(borradorId, { foto_principal_url: url })
          : await patchNegocioMedia(id!.trim(), { foto_principal_url: url });
        if (r.ok) {
          if (!borradorId) {
            applyPanelModeracionFromMedia({
              estado: r.estado,
              moderationMessage: r.moderationMessage,
            });
          }
          lastPersistedFotoRef.current = url;
          setMediaPersistMsg("");
        } else {
          setMediaPersistMsg(r.message ?? MSG_GALERIA_PERSIST_FALLA);
        }
      }
    } catch (err) {
      updateField("fotoPrincipalUrl", previousUrl);
      setFotoPrincipalMsg(
        err instanceof Error ? err.message : "No se pudo subir la foto principal."
      );
    } finally {
      URL.revokeObjectURL(previewUrl);
      mediaUploadBusyRef.current = false;
      setFotoPrincipalUploading(false);
    }
  }

  async function persistUpgradeMedia(patch: {
    foto_principal_url?: string;
    galeria_urls?: string[];
  }) {
    if (!isUpgradeMode || !persistMediaId) return { ok: true as const };
    logMejorarFichaGaleria("persistUpgradeMedia → inicio", {
      keys: Object.keys(patch),
      galeriaCount: Array.isArray(patch.galeria_urls)
        ? patch.galeria_urls.length
        : undefined,
    });
    const borradorId = postulacionBorradorId?.trim();
    const r = borradorId
      ? await patchBorradorMedia(borradorId, patch)
      : await patchNegocioMedia(id!.trim(), patch);
    logMejorarFichaGaleria("persistUpgradeMedia ← resultado", {
      ok: r.ok,
      message: r.ok ? undefined : r.message,
    });
    if (r.ok) {
      if (!borradorId) {
        applyPanelModeracionFromMedia({
          estado: r.estado,
          moderationMessage: r.moderationMessage,
        });
      }
      if ("foto_principal_url" in patch) {
        lastPersistedFotoRef.current = String(patch.foto_principal_url ?? "");
      }
      if ("galeria_urls" in patch) {
        const gal = Array.isArray(patch.galeria_urls) ? patch.galeria_urls : [];
        lastPersistedGaleriaKeyRef.current = JSON.stringify(gal);
      }
      setMediaPersistMsg("");
    } else {
      setMediaPersistMsg(r.message ?? MSG_GALERIA_PERSIST_FALLA);
    }
    return r;
  }

  async function handleGaleriaFilesPick(e: React.ChangeEvent<HTMLInputElement>) {
    logMejorarFichaGaleria("input onChange", {
      filesEnEvento: e.target.files?.length ?? 0,
    });
    /** Copia antes de `value=""`: en Chromium el FileList del input es vivo y se vacía al resetear. */
    const picked = e.target.files ? Array.from(e.target.files) : [];
    logMejorarFichaGaleria("handleGaleriaFilesPick inicio", {
      pickedLength: picked.length,
    });
    e.target.value = "";
    if (picked.length === 0) {
      logMejorarFichaGaleria("RETURN temprano: 0 archivos (lista vacía tras copiar)");
      return;
    }

    const galFilled = form.galeriaUrls.filter((u) => u.trim()).length;
    const galRoom = 8 - galFilled;
    const principalEmpty = !form.fotoPrincipalUrl.trim();
    const maxNew = galRoom + (principalEmpty ? 1 : 0);
    if (maxNew <= 0) {
      logMejorarFichaGaleria("RETURN temprano: sin cupo", {
        maxNew,
        galFilled,
        galRoom,
        principalEmpty,
      });
      setGaleriaMsg("Ya alcanzaste el máximo de fotos. Quita alguna antes de añadir más.");
      return;
    }

    const imageFiles = picked.filter(
      (f) =>
        f.type.startsWith("image/") ||
        /\.(jpe?g|png|gif|webp|heic|heif|bmp)$/i.test(f.name)
    );
    logMejorarFichaGaleria("archivos filtrados como imagen", {
      imageFilesLength: imageFiles.length,
      pickedLength: picked.length,
      detalle: picked.map((f) => ({ name: f.name, type: f.type || "(vacío)" })),
    });
    if (imageFiles.length === 0) {
      logMejorarFichaGaleria("RETURN temprano: ningún archivo pasó filtro imagen");
      setGaleriaMsg("Selecciona archivos de imagen.");
      return;
    }

    const take = imageFiles.slice(0, maxNew);
    if (imageFiles.length > maxNew) {
      setGaleriaMsg(
        `Solo hay espacio para ${maxNew} foto(s) más; se subirán las primeras ${take.length}.`
      );
    }

    touchUpgradeMedia();
    mediaUploadBusyRef.current = true;
    setGaleriaUploading(true);
    setGaleriaMsg(MSG_GALERIA_SUBIENDO);
    let next = [...form.galeriaUrls];
    let principalPreviewUrl: string | null = null;
    let principalUploadSucceeded = false;
    let principalHadFailure = false;
    let galleryHadSuccess = false;
    let galleryHadFailure = false;
    let persistBatchFailed = false;
    try {
      let queue = [...take];
      if (principalEmpty && queue.length > 0) {
        const firstFile = queue[0];
        const previousPrincipal = form.fotoPrincipalUrl.trim();
        principalPreviewUrl = URL.createObjectURL(firstFile);
        logMejorarFichaGaleria("preview principal (blob) antes de subir");
        updateField("fotoPrincipalUrl", principalPreviewUrl);
        try {
          const url = await uploadPanelImageFile(
            firstFile,
            "panel/foto-principal",
            "principal (primera del lote)"
          );
          queue = queue.slice(1);
          updateField("fotoPrincipalUrl", url);
          principalUploadSucceeded = true;
          if (isUpgradeMode && persistMediaId) {
            const r = await persistUpgradeMedia({ foto_principal_url: url });
            if (!r.ok) {
              persistBatchFailed = true;
              setMediaPersistMsg(r.message ?? MSG_GALERIA_PERSIST_FALLA);
            }
          }
        } catch (principalErr) {
          logMejorarFichaGaleria("fallo subida foto principal (primera del lote)", principalErr);
          principalHadFailure = true;
          updateField("fotoPrincipalUrl", previousPrincipal);
          queue = queue.slice(1);
        } finally {
          if (principalPreviewUrl) {
            URL.revokeObjectURL(principalPreviewUrl);
            principalPreviewUrl = null;
          }
        }
      }
      const roomAfter = 8 - next.filter((u) => u.trim()).length;
      const toGallery = queue.slice(0, roomAfter);
      logMejorarFichaGaleria("cola galería", {
        toGalleryCount: toGallery.length,
        roomAfter,
      });
      for (let gi = 0; gi < toGallery.length; gi++) {
        const file = toGallery[gi];
        const idx = next.findIndex((u) => !String(u).trim());
        if (idx === -1) {
          logMejorarFichaGaleria("loop galería: sin slot libre, break", { gi });
          break;
        }
        const slotPreview = URL.createObjectURL(file);
        next[idx] = slotPreview;
        logMejorarFichaGaleria(`updateField galería preview blob slot ${idx}`, {
          archivo: gi + 1,
          de: toGallery.length,
          name: file.name,
        });
        updateField("galeriaUrls", [...next]);
        try {
          const url = await uploadPanelImageFile(
            file,
            "panel/galeria",
            `galería slot ${idx} (${gi + 1}/${toGallery.length})`
          );
          URL.revokeObjectURL(slotPreview);
          next[idx] = url;
          galleryHadSuccess = true;
          logMejorarFichaGaleria(`slot ${idx} reemplazado por URL persistible`);
          updateField("galeriaUrls", [...next]);
        } catch (loopErr) {
          logMejorarFichaGaleria(`fallo subida galería slot ${idx}`, loopErr);
          galleryHadFailure = true;
          URL.revokeObjectURL(slotPreview);
          next[idx] = "";
          updateField("galeriaUrls", [...next]);
        }
      }
      if (isUpgradeMode && persistMediaId && toGallery.length > 0) {
        const payload = galeriaPayloadUrls(next);
        logMejorarFichaGaleria("persistUpgradeMedia galería (fin de lote)", {
          payloadLength: payload.length,
        });
        const r = await persistUpgradeMedia({ galeria_urls: payload });
        if (!r.ok) {
          persistBatchFailed = true;
          setMediaPersistMsg(r.message ?? MSG_GALERIA_PERSIST_FALLA);
        }
      }

      if (galleryHadFailure || principalHadFailure) {
        setGaleriaMsg(MSG_GALERIA_UNA_FALLA);
      } else if (
        (galleryHadSuccess || principalUploadSucceeded) &&
        !persistBatchFailed
      ) {
        setGaleriaMsg(MSG_GALERIA_OK);
      } else if (persistBatchFailed && (galleryHadSuccess || principalUploadSucceeded)) {
        setGaleriaMsg("");
      } else if (toGallery.length === 0 && !principalUploadSucceeded) {
        setGaleriaMsg("");
      }
    } catch (err) {
      logMejorarFichaGaleria("handleGaleriaFilesPick error inesperado (outer)", err);
      setGaleriaMsg(
        err instanceof Error ? err.message : "No se pudo subir una o más fotos."
      );
    } finally {
      mediaUploadBusyRef.current = false;
      setGaleriaUploading(false);
      logMejorarFichaGaleria("handleGaleriaFilesPick finally (busy liberado)");
    }
  }

  async function removePrincipalUpgrade() {
    const p = form.fotoPrincipalUrl.trim();
    if (!p) return;
    touchUpgradeMedia();
    const slots = [...form.galeriaUrls];
    const gi = slots.findIndex((s) => s.trim());
    if (gi >= 0) {
      const promote = slots[gi].trim();
      slots[gi] = "";
      const nextSlots = compactGaleriaSlots(slots);
      updateField("fotoPrincipalUrl", promote);
      updateField("galeriaUrls", nextSlots);
      await persistUpgradeMedia({
        foto_principal_url: promote,
        galeria_urls: galeriaPayloadUrls(nextSlots),
      });
    } else {
      updateField("fotoPrincipalUrl", "");
      await persistUpgradeMedia({ foto_principal_url: "" });
    }
  }

  async function markGaleriaAsPrincipalUpgrade(galleryIndex: number) {
    const slots = [...form.galeriaUrls];
    const picked = slots[galleryIndex]?.trim();
    if (!picked) return;
    touchUpgradeMedia();
    const oldP = form.fotoPrincipalUrl.trim();
    slots[galleryIndex] = oldP;
    const nextSlots = compactGaleriaSlots(slots);
    updateField("fotoPrincipalUrl", picked);
    updateField("galeriaUrls", nextSlots);
    await persistUpgradeMedia({
      foto_principal_url: picked,
      galeria_urls: galeriaPayloadUrls(nextSlots),
    });
  }

  async function removeGaleriaSlotUpgrade(index: number) {
    touchUpgradeMedia();
    const next = removeGaleriaAt(form.galeriaUrls, index);
    updateField("galeriaUrls", next);
    if (!isUpgradeMode || !persistMediaId) return;
    await persistUpgradeMedia({ galeria_urls: galeriaPayloadUrls(next) });
  }

  function validateForm(): FormErrors {
    const nextErrors: FormErrors = {};

    if (form.nombre.trim().length < 3) {
      nextErrors.nombre = "Ingresa un nombre de negocio válido.";
    }

    if (!form.comunaBaseSlug) {
      nextErrors.comunaBaseSlug = "Selecciona una comuna base.";
    }

    if (!form.coberturaTipo) {
      nextErrors.coberturaTipo = "Selecciona el tipo de cobertura.";
    }

    if (
      form.coberturaTipo === "varias_comunas" &&
      form.comunasCoberturaSlugs.length < 1
    ) {
      nextErrors.comunasCoberturaSlugs =
        "Agregá al menos una comuna adicional o cambiá la cobertura a «Solo mi comuna».";
    }

    if (form.modalidadesAtencion.length < 1) {
      nextErrors.modalidadesAtencion =
        "Selecciona al menos una modalidad de atención.";
    }

    const cortaNorm = normalizeDescripcionCorta(form.descripcionCorta);
    const cortaErrs = validateDescripcionCortaPublicacion(cortaNorm);
    if (cortaErrs.length) {
      nextErrors.descripcionCorta =
        primeraValidacionDescripcion(cortaErrs) ??
        `La descripción corta debe tener entre ${DESCRIPCION_CORTA_MIN} y ${DESCRIPCION_CORTA_MAX} caracteres.`;
    }
    const largaNorm = normalizeDescripcionLarga(form.descripcionLarga);
    const largaErrs = validateDescripcionLarga(largaNorm);
    if (largaErrs.length) {
      nextErrors.descripcionLarga =
        primeraValidacionDescripcion(largaErrs) ?? "La descripción larga es demasiado extensa.";
    }

    if (!form.whatsapp.trim()) {
      nextErrors.whatsapp = "El WhatsApp es obligatorio.";
    } else {
      const priWa = normalizeAndValidateChileWhatsappStrict(form.whatsapp.trim());
      if (!priWa.ok) {
        nextErrors.whatsapp =
          "WhatsApp no válido. En Chile son 9 dígitos: 912345678, 56912345678 o +56912345678 (sin dígitos de más).";
      }
    }

    const waSecTrim = form.whatsappSecundario.trim();
    if (waSecTrim) {
      const secVal = normalizeAndValidateChileWhatsappStrict(waSecTrim);
      if (!secVal.ok) {
        nextErrors.whatsappSecundario =
          "Ingresa un WhatsApp válido de Chile (ej: 9XXXXXXXX o +569XXXXXXXX).";
      } else {
        const priVal = normalizeAndValidateChileWhatsappStrict(form.whatsapp.trim());
        if (priVal.ok && secVal.normalized === priVal.normalized) {
          nextErrors.whatsappSecundario = "No puede ser igual al WhatsApp principal.";
        }
      }
    }

    const igValForm = validateOptionalInstagram(form.instagram.trim());
    if (!igValForm.ok) {
      nextErrors.instagram = igValForm.message;
    }

    const webValForm = validateOptionalWebsite(form.web.trim());
    if (!webValForm.ok) {
      nextErrors.web = webValForm.message;
    }

    const emailValForm = validateRequiredPublicEmail(form.email);
    if (!emailValForm.ok) {
      nextErrors.email = emailValForm.message;
    }

    if (!form.fotoPrincipalUrl.trim()) {
      nextErrors.fotoPrincipalUrl = "La foto principal o logo es obligatoria.";
    }

    /**
     * Con `local_fisico`, el PATCH del borrador exige ubicación (locales o legacy en servidor).
     * La validación no puede depender solo de ficha "completa": en plan básico también se envía
     * `locales: []` + `direccion: null` y el API responde 400 — el guardado automático fallaba sin
     * error de campo previo.
     */
    if (form.modalidadesAtencion.includes("local_fisico")) {
      const locs = form.localesFisicos;
      if (locs.length === 0) {
        nextErrors.localesFisicos =
          "Agrega al menos un local con comuna y dirección.";
      } else {
        const principals = locs.filter((l) => l.esPrincipal);
        if (principals.length === 0) {
          nextErrors.localesFisicos =
            "Seleccioná cuál es tu local principal.";
        } else if (principals.length > 1) {
          nextErrors.localesFisicos =
            "Solo un local puede ser principal.";
        } else {
          const incomplete = locs.some(
            (l) =>
              !String(l.comunaSlug ?? "").trim() ||
              !String(l.direccion ?? "").trim()
          );
          if (incomplete) {
            nextErrors.localesFisicos =
              "Cada local debe tener comuna y dirección completas.";
          } else {
            const principal = principals[0];
            if (
              !principalLocalComunaMatchesBase(
                form.comunaBaseSlug,
                principal.comunaSlug,
                comunasCatalog
              )
            ) {
              nextErrors.localesFisicos =
                "El principal debe coincidir con tu comuna base. Ajusta ese local o ve a «Editar datos básicos» y usa «Cambiar comuna» allí para cambiar la base.";
            }
          }
        }
      }
    }

    return nextErrors;
  }

  async function persistProfileOrThrow(): Promise<void> {
    const validationErrors = validateForm();
    const vKeys = Object.keys(validationErrors);
    if (vKeys.length > 0) {
      const msg = vKeys
        .map((k) => validationErrors[k as keyof FormErrors])
        .find((m): m is string => typeof m === "string" && Boolean(m));
      throw new Error(msg || MSG_GUARDAR_FALLBACK);
    }

    if (postulacionBorradorId?.trim()) {
      const bid = postulacionBorradorId.trim();
      const slugForComunaBase = form.comunaBaseSlug.trim();
      const comunaRes = await fetch(
        `/api/comunas/by-slug?slug=${encodeURIComponent(slugForComunaBase)}`,
        { cache: "no-store" }
      );
      let comunaJson: Record<string, unknown> = {};
      try {
        comunaJson = (await comunaRes.json()) as Record<string, unknown>;
      } catch {
        comunaJson = {};
      }
      const rawComunaId = comunaJson.id;
      const comunaIdNum =
        comunaJson.ok === true &&
        (typeof rawComunaId === "number" || typeof rawComunaId === "string")
          ? Number(rawComunaId)
          : NaN;
      const comunaId = Number.isFinite(comunaIdNum) ? Math.trunc(comunaIdNum) : null;
      if (!comunaRes.ok || comunaId == null) {
        throw new Error(
          (typeof comunaJson.error === "string" && comunaJson.error) ||
            "No pudimos resolver tu comuna base."
        );
      }

      const waCheck = normalizeAndValidateChileWhatsappStrict(form.whatsapp.trim());
      if (!waCheck.ok) {
        throw new Error(UPGRADE_WA_INVALID);
      }

      let waSecPatch: string | null = null;
      const secTrim = form.whatsappSecundario.trim();
      if (secTrim) {
        const secCheck = normalizeAndValidateChileWhatsappStrict(secTrim);
        if (!secCheck.ok) {
          throw new Error(UPGRADE_WA_SEC_INVALID);
        }
        if (secCheck.normalized === waCheck.normalized) {
          throw new Error(UPGRADE_WA_SEC_DUP);
        }
        waSecPatch = secCheck.normalized;
      }

      const patchBody = buildBorradorFullPatchFromForm(
        form,
        comunaId,
        waCheck.normalized,
        waSecPatch,
        comunasCatalogRef.current
      );
      const res = await fetch(publicarBorradorByIdPath(bid), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchBody),
        credentials: "same-origin",
      });
      const rawText = await res.text();
      const parsedPersist = parsePublicarBorradorResponseText(rawText);
      if (!parsedPersist.ok) {
        logBorradorPatchFailure("persistProfileOrThrow JSON inválido", {
          httpStatus: res.status,
          borradorId: bid,
          rawSnippet: rawText.replace(/^\uFEFF/, "").trim().slice(0, 500),
          parseError: parsedPersist.parseError,
        });
        throw new Error(MSG_GUARDAR_FALLBACK);
      }
      const data = parsedPersist.data;
      if (!res.ok || !data?.ok) {
        throw new Error(userMessageForBorradorPatchResponse(res, data, rawText));
      }
      return;
    }

    const waSecNorm = form.whatsappSecundario.trim()
      ? normalizeAndValidateChileWhatsappStrict(form.whatsappSecundario.trim())
      : null;
    const whatsapp_secundario_put =
      waSecNorm && waSecNorm.ok ? waSecNorm.normalized : null;

    const waPriPut = normalizeAndValidateChileWhatsappStrict(form.whatsapp.trim());
    if (!waPriPut.ok) {
      throw new Error(UPGRADE_WA_INVALID);
    }
    const igPut = validateOptionalInstagram(form.instagram.trim());
    if (!igPut.ok) {
      throw new Error(igPut.message);
    }
    const webPut = validateOptionalWebsite(form.web.trim());
    if (!webPut.ok) {
      throw new Error(webPut.message);
    }
    const emailPut = validateRequiredPublicEmail(form.email);
    if (!emailPut.ok) {
      throw new Error(emailPut.message);
    }

    const payload = {
      nombre: form.nombre.trim(),
      responsable_nombre: form.responsable.trim(),
      mostrar_responsable: form.responsable.trim().length > 0,

      categoria_slug: form.categoriaSlug,
      subcategorias_slugs: form.subcategoriasSlugs,

      comuna_base_slug: form.comunaBaseSlug,
      cobertura_tipo: form.coberturaTipo,
      comunas_cobertura_slugs:
        form.coberturaTipo === "varias_comunas"
          ? form.comunasCoberturaSlugs
          : [],

      modalidades_atencion: form.modalidadesAtencion,

      descripcion_corta: normalizeDescripcionCorta(form.descripcionCorta),
      descripcion_larga: normalizeDescripcionLarga(form.descripcionLarga),
      keywords_usuario: parseKeywordsUsuarioInputToTextArray(form.keywordsUsuario),

      whatsapp: waPriPut.normalized,
      whatsapp_secundario: whatsapp_secundario_put,
      instagram: igPut.normalized,
      web: webPut.normalized,
      email: emailPut.normalized,

      foto_principal_url: form.fotoPrincipalUrl.trim(),
      galeria_urls: form.galeriaUrls.map((x) => x.trim()).filter(Boolean),

      locales:
        form.modalidadesAtencion.includes("local_fisico") &&
        form.localesFisicos.length > 0
          ? form.localesFisicos.map((l) => ({
              comuna_slug: l.comunaSlug.trim(),
              direccion: l.direccion.trim(),
              referencia: l.referencia.trim() || null,
              es_principal: l.esPrincipal,
            }))
          : [],
    };

    const empId = id?.trim();
    const url = empId
      ? `/api/panel/negocio?id=${encodeURIComponent(empId)}`
      : "/api/panel/negocios";
    const method = empId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const rawText = await res.text();
    let data: {
      ok?: boolean;
      message?: string;
      error?: string;
      estado?: string;
    } | null = null;

    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch {
      throw new Error(
        isUpgradeMode
          ? MSG_GUARDAR_FALLBACK
          : `La API no devolvió JSON válido. Respuesta: ${rawText.slice(0, 200)}`
      );
    }

    if (!res.ok || !data?.ok) {
      throw new Error(
        data?.message ||
          data?.error ||
          (isUpgradeMode
            ? MSG_GUARDAR_FALLBACK
            : "No se pudo guardar el emprendimiento")
      );
    }

    if (empId) {
      setEstadoPublicacion(
        normalizeEstadoPublicacionDb(
          typeof data.estado === "string"
            ? data.estado
            : ESTADO_PUBLICACION.en_revision
        )
      );
      const mm =
        typeof data.message === "string" ? data.message.trim() : "";
      setModeracionMensaje(mm);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const nextErrors = validateForm();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      if (nfPostSaveDebugEnabled()) {
        // eslint-disable-next-line no-console
        console.info("[NegocioForm:handleSubmit] sin setPostSaveActionsOpen: validateForm con errores", {
          errorKeys: Object.keys(nextErrors),
          isUpgradeMode,
        });
      }
      return;
    }

    try {
      upgradeProfileSaveLockRef.current = true;
      setIsSubmitting(true);
      if (isUpgradeMode && persistMediaId) {
        setUpgradeSilentSave("saving");
        setUpgradeSilentErr("");
      }
      await persistProfileOrThrow();
      if (nfPostSaveDebugEnabled()) {
        // eslint-disable-next-line no-console
        console.info("[NegocioForm:handleSubmit] persist OK → setPostSaveActionsOpen(true)", {
          isUpgradeMode,
        });
      }
      setPostSaveActionsOpen(true);
      if (isUpgradeMode && persistMediaId) {
        setLastSavedProfileSig(upgradeProfileSaveSigRef.current);
        setUpgradeSilentSave("saved");
        setUpgradeSilentErr("");
      }
    } catch (error) {
      if (error instanceof Error && error.message === UPGRADE_WA_INVALID) {
        setErrors((prev) => ({
          ...prev,
          whatsapp:
            "Ingresa un WhatsApp válido de Chile (ej: 9XXXXXXXX o +569XXXXXXXX)",
        }));
        if (isUpgradeMode && persistMediaId) {
          setUpgradeSilentSave("idle");
          setUpgradeSilentErr("");
        }
      } else if (
        error instanceof Error &&
        error.message === UPGRADE_WA_SEC_INVALID
      ) {
        setErrors((prev) => ({
          ...prev,
          whatsappSecundario:
            "Ingresa un WhatsApp válido de Chile (ej: 9XXXXXXXX o +569XXXXXXXX)",
        }));
        if (isUpgradeMode && persistMediaId) {
          setUpgradeSilentSave("idle");
          setUpgradeSilentErr("");
        }
      } else if (error instanceof Error && error.message === UPGRADE_WA_SEC_DUP) {
        setErrors((prev) => ({
          ...prev,
          whatsappSecundario: "No puede ser igual al WhatsApp principal.",
        }));
        if (isUpgradeMode && persistMediaId) {
          setUpgradeSilentSave("idle");
          setUpgradeSilentErr("");
        }
      } else if (
        error instanceof Error &&
        error.message === MSG_LOCAL_FISICO_SIN_UBICACION
      ) {
        setErrors((prev) => ({
          ...prev,
          localesFisicos: MSG_LOCAL_FISICO_SIN_UBICACION,
        }));
        if (isUpgradeMode && persistMediaId) {
          setUpgradeSilentSave("idle");
          setUpgradeSilentErr("");
        }
      } else {
        console.error("[mejorar-ficha] handleSubmit / persistProfileOrThrow", error);
        const msg =
          error instanceof Error ? error.message : MSG_GUARDAR_FALLBACK;
        setErrors((prev) => ({
          ...prev,
          general: msg,
        }));
        if (isUpgradeMode && persistMediaId) {
          setUpgradeSilentSave("err");
          setUpgradeSilentErr(msg);
        }
      }
    } finally {
      setIsSubmitting(false);
      upgradeProfileSaveLockRef.current = false;
    }
  }

  useEffect(() => {
    if (!isUpgradeMode || !persistMediaId || loading) return;

    const timer = window.setTimeout(() => {
      void (async () => {
        if (upgradeProfileSaveLockRef.current) return;
        const nextErrors = validateForm();
        if (Object.keys(nextErrors).length > 0) {
          setUpgradeSilentSave((s) => (s === "saved" ? s : "idle"));
          return;
        }
        setUpgradeSilentSave("saving");
        upgradeProfileSaveLockRef.current = true;
        try {
          await persistProfileOrThrow();
          setLastSavedProfileSig(upgradeProfileSaveSigRef.current);
          setUpgradeSilentSave("saved");
          setUpgradeSilentErr("");
          setErrors((prev) => ({ ...prev, general: undefined }));
        } catch (err) {
          if (
            err instanceof Error &&
            (err.message === UPGRADE_WA_INVALID ||
              err.message === UPGRADE_WA_SEC_INVALID ||
              err.message === UPGRADE_WA_SEC_DUP)
          ) {
            setUpgradeSilentSave("idle");
          } else if (
            err instanceof Error &&
            err.message === MSG_LOCAL_FISICO_SIN_UBICACION
          ) {
            setUpgradeSilentSave("idle");
            setErrors((prev) => ({
              ...prev,
              localesFisicos: MSG_LOCAL_FISICO_SIN_UBICACION,
            }));
          } else {
            console.error("[mejorar-ficha] guardado automático falló", err);
            setUpgradeSilentSave("err");
            setUpgradeSilentErr(
              err instanceof Error ? err.message : MSG_GUARDAR_FALLBACK
            );
          }
        } finally {
          upgradeProfileSaveLockRef.current = false;
        }
      })();
    }, 1400);

    return () => window.clearTimeout(timer);
  }, [
    upgradeProfileSaveSig,
    isUpgradeMode,
    persistMediaId,
    loading,
    id,
    postulacionBorradorId,
  ]);

  const hasLocalesErr = Boolean(errors.localesFisicos);
  const localesPanelOpen = localesFisicosEditorOpen || hasLocalesErr;

  const awaitingPerfilHidratado =
    loading &&
    (Boolean(id?.trim()) || Boolean(postulacionBorradorId?.trim()));

  if (awaitingPerfilHidratado) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          minHeight: "min(72vh, 640px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          padding: "32px 20px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 800,
            color: "#0f172a",
            letterSpacing: "-0.02em",
          }}
        >
          Cargando tu ficha…
        </p>
        <p style={{ margin: 0, fontSize: 14, color: "#64748b", fontWeight: 600 }}>
          Estamos trayendo tus datos. Solo un momento.
        </p>
      </div>
    );
  }

  if (postSaveActionsOpen) {
    return (
      <>
        <style
          dangerouslySetInnerHTML={{
            __html: flujoDesdePanel
              ? POST_SAVE_PANEL_SIMPLE_STYLES
              : POST_SAVE_NAV_STYLES,
          }}
        />
        <div
          ref={postSaveBannerAnchorRef}
          role="document"
          aria-labelledby="nf-post-save-screen-title"
          style={{
            minHeight: "min(100dvh, 960px)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            paddingTop: "80px",
            padding: "80px 20px 48px",
            boxSizing: "border-box",
            background: flujoDesdePanel ? "#f8fafc" : "#f8fafc",
          }}
        >
          <div
            className={
              flujoDesdePanel ? "nf-post-save-panel-simple" : "nf-post-save-nav"
            }
            style={{
              maxWidth: 520,
              width: "100%",
              margin: 0,
              textAlign: "center",
            }}
            role="status"
          >
            {flujoDesdePanel ? (
              <>
                <p
                  id="nf-post-save-screen-title"
                  className="nf-post-save-panel-simple-title"
                >
                  Guardado correctamente
                </p>
                <div
                  className="nf-post-save-nav-actions"
                  style={{
                    justifyContent: "center",
                    flexDirection: "column",
                    alignItems: "stretch",
                    maxWidth: 360,
                    margin: "0 auto",
                  }}
                >
                  <button
                    type="button"
                    className="nf-post-save-nav-btn nf-post-save-nav-btn--primary"
                    onClick={() => setPostSaveActionsOpen(false)}
                  >
                    Seguir editando
                  </button>
                  <Link
                    href={panelHref}
                    className="nf-post-save-nav-btn nf-post-save-nav-btn--secondary"
                  >
                    Volver al panel
                  </Link>
                  {fichaEstaPublicada && fichaPublicaHref ? (
                    <button
                      type="button"
                      className="nf-post-save-nav-btn nf-post-save-nav-btn--ghost"
                      onClick={() => {
                        window.open(
                          fichaPublicaHref,
                          "_blank",
                          "noopener,noreferrer"
                        );
                      }}
                    >
                      Ver mi ficha
                    </button>
                  ) : (
                    <p
                      className="nf-post-save-nav-sub"
                      style={{
                        textAlign: "center",
                        margin: "2px 0 0",
                        color: "#64748b",
                        fontWeight: 600,
                      }}
                    >
                      Tu ficha aún no está publicada. La revisaremos antes de que esté visible.
                    </p>
                  )}
                  {previewFichaHref ? (
                    <button
                      type="button"
                      className="nf-post-save-nav-btn nf-post-save-nav-btn--ghost"
                      onClick={() => {
                        window.open(
                          previewFichaHref,
                          "_blank",
                          "noopener,noreferrer"
                        );
                      }}
                    >
                      Ver vista previa de mi ficha
                    </button>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <p
                  id="nf-post-save-screen-title"
                  className="nf-post-save-nav-title"
                  style={{ textAlign: "center" }}
                >
                  Tu emprendimiento fue guardado y está en revisión
                </p>
                <p className="nf-post-save-nav-sub" style={{ textAlign: "center" }}>
                  Mientras tanto, puedes seguir mejorando tu ficha o volver al inicio.
                </p>
                <div
                  className="nf-post-save-nav-actions"
                  style={{
                    justifyContent: "center",
                    flexDirection: "column",
                    alignItems: "stretch",
                    maxWidth: 360,
                    margin: "0 auto",
                  }}
                >
                  <button
                    type="button"
                    className="nf-post-save-nav-btn nf-post-save-nav-btn--primary"
                    onClick={() => setPostSaveActionsOpen(false)}
                  >
                    Seguir mejorando mi ficha
                  </button>
                  <Link
                    href={siteHomeHref}
                    className="nf-post-save-nav-btn nf-post-save-nav-btn--secondary"
                  >
                    Volver al inicio
                  </Link>
                  {fichaEstaPublicada && fichaPublicaHref ? (
                    <button
                      type="button"
                      className="nf-post-save-nav-btn nf-post-save-nav-btn--ghost"
                      onClick={() => {
                        window.open(
                          fichaPublicaHref,
                          "_blank",
                          "noopener,noreferrer"
                        );
                      }}
                    >
                      Ver cómo se ve mi ficha
                    </button>
                  ) : (
                    <p
                      className="nf-post-save-nav-sub"
                      style={{
                        textAlign: "center",
                        margin: "2px 0 0",
                        color: "#64748b",
                        fontWeight: 600,
                      }}
                    >
                      Tu ficha aún no está publicada. La revisaremos antes de que esté visible.
                    </p>
                  )}
                  {previewFichaHref ? (
                    <button
                      type="button"
                      className="nf-post-save-nav-btn nf-post-save-nav-btn--ghost"
                      onClick={() => {
                        window.open(
                          previewFichaHref,
                          "_blank",
                          "noopener,noreferrer"
                        );
                      }}
                    >
                      Ver vista previa de mi ficha
                    </button>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </div>
      </>
    );
  }

  /*
   * Referencia — avisos de revisión / moderación en el formulario (no incluye pantalla post-guardado):
   * - Caja ámbar al inicio del `<form>` si moderación o ficha no visible.
   * - `nf-mejorar-ficha-banner--revision` si `bannerRevision`.
   * - Footer upgrade: `nf-upgrade-autosave-footer` (autosave / fotos / revisión).
   */
  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "grid",
        gap: 22,
      }}
    >
      {id?.trim() &&
      !postulacionBorradorId?.trim() &&
      !loading &&
      (moderacionMensaje.trim() ||
        (estadoPublicacion &&
          !emprendedorFichaVisiblePublicamente(estadoPublicacion))) ? (
        <div
          role="status"
          style={{
            border: "1px solid #e5e7eb",
            borderLeft: "3px solid #0f766e",
            background: "#ffffff",
            color: "#475569",
            borderRadius: 14,
            padding: "14px 16px",
            fontSize: 14,
            lineHeight: 1.45,
            fontWeight: 600,
          }}
        >
          {moderacionMensaje.trim()
            ? moderacionMensaje.trim()
            : fichaEnRevision
              ? "Tu ficha está en revisión. Te avisaremos cuando sea aprobada."
              : "Tu ficha no es visible en el sitio público hasta que un administrador la apruebe."}
        </div>
      ) : null}

      {isUpgradeMode ? (
        <>
          <style dangerouslySetInnerHTML={{ __html: NF_UPGRADE_STYLES }} />
          {bannerRevision ? (
            <div
              className="nf-mejorar-ficha-banner nf-mejorar-ficha-banner--revision"
              role="status"
            >
              <p
                className="nf-mejorar-ficha-banner-text"
                style={{ margin: 0, fontWeight: 600 }}
              >
                Tu emprendimiento está en revisión. Te avisaremos cuando esté publicado.
                Puedes seguir mejorando tu ficha.
              </p>
            </div>
          ) : null}
          <div
            id="mejorar-ficha-foco-descripcion"
            className={[
              "nf-upgrade-datos-basicos-nav",
              upgradeSeccionFocusClass(focus, "descripcion"),
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {flujoDesdePanel ? (
              <Link href={panelHref} className="nf-upgrade-datos-basicos-link">
                ← Volver al panel
              </Link>
            ) : null}
            {datosBasicosHref ? (
              <Link
                href={datosBasicosHref}
                className="nf-upgrade-datos-basicos-cta"
                aria-label="Editar datos básicos del emprendimiento"
              >
                <Pencil className="nf-upgrade-datos-basicos-cta-icon" size={18} strokeWidth={2.25} aria-hidden />
                Editar datos básicos
              </Link>
            ) : null}
          </div>
          <header style={{ marginBottom: 0 }}>
            <h1
              style={{
                margin: 0,
                fontSize: 28,
                fontWeight: 900,
                color: "#0f172a",
                letterSpacing: "-0.03em",
                lineHeight: 1.15,
              }}
            >
              Mejora tu perfil
            </h1>
            <p
              style={{
                margin: "8px 0 0",
                fontSize: 15,
                lineHeight: 1.45,
                color: "#334155",
                fontWeight: 600,
                maxWidth: 640,
              }}
            >
              Completa tu ficha para recibir más mensajes
            </p>
            <p
              style={{
                margin: "6px 0 0",
                fontSize: 13,
                lineHeight: 1.45,
                color: "#64748b",
                fontWeight: 500,
                maxWidth: 640,
              }}
            >
              Haz que más personas te escriban. Sube fotos de tu trabajo y revisa tu contacto: es
              lo que más influye en que te contacten.
            </p>
            {mejorarFichaGuiado.mensajeBanner.trim() ? (
              <div className="nf-upgrade-checklist-inline nf-upgrade-checklist-inline--guiado">
                <p className="nf-upgrade-progreso-guiado-text">
                  {mejorarFichaGuiado.mensajeBanner}
                </p>
                {mejorarFichaGuiado.mensajeBannerExtra ? (
                  <p
                    className="nf-upgrade-progreso-opcional-hint"
                    style={{ marginTop: 6 }}
                  >
                    {mejorarFichaGuiado.mensajeBannerExtra}
                  </p>
                ) : null}
              </div>
            ) : null}
          </header>
          <div className="nf-upgrade-root">
            <div className="nf-upgrade-editor-layout">
              <div className="nf-upgrade-editor-main">
              <div className="nf-upgrade-fotos-pane">
                <div
                  id="mejorar-ficha-foco-fotos"
                  className="nf-upgrade-fotos-pane-inner nf-upgrade-fotos-visual"
                >
                  <div className="nf-upgrade-fotos-paso-head">
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        gap: "8px 10px",
                        minWidth: 0,
                      }}
                    >
                      <h2 className="nf-upgrade-fotos-paso-title">Fotos</h2>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "#94a3b8" }}>(al menos 3)</span>
                    </div>
                    <MejorarFichaPasoBadge completo={mejorarFichaGuiado.completo.fotos} />
                  </div>
                  <div className="nf-upgrade-fotos-pitch">
                    <p className="nf-upgrade-fotos-pitch-title">
                      Fotos reales generan confianza
                    </p>
                    <p className="nf-upgrade-fotos-pitch-sub">
                      Esto es lo que más influye en que te escriban
                    </p>
                  </div>
                  <input
                    ref={fotoPrincipalFileRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleFotoPrincipalFilePick}
                  />
                  <input
                    ref={galeriaFileRef}
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: "none" }}
                    onChange={(ev) => void handleGaleriaFilesPick(ev)}
                  />
                  {mediaPersistMsg ? (
                    <p
                      style={{
                        margin: "0 0 8px",
                        fontSize: 12,
                        color: "#b45309",
                        fontWeight: 600,
                        lineHeight: 1.45,
                      }}
                    >
                      {mediaPersistMsg}
                    </p>
                  ) : null}
                  {errors.fotoPrincipalUrl ? (
                    <p
                      style={{
                        margin: "0 0 8px",
                        fontSize: 12,
                        color: "#b91c1c",
                        fontWeight: 600,
                      }}
                    >
                      {errors.fotoPrincipalUrl}
                    </p>
                  ) : null}
                  {fotoPrincipalMsg ? (
                    <p
                      style={{
                        margin: "0 0 8px",
                        fontSize: 12,
                        color: "#b45309",
                        fontWeight: 600,
                      }}
                    >
                      {fotoPrincipalMsg}
                    </p>
                  ) : null}
                  <div className="nf-upgrade-fotos-dual-cards">
                    <section
                      className={[
                        "nf-mejorar-ficha-fotos-subcard",
                        "nf-mejorar-ficha-fotos-subcard--principal",
                        photoBlockHighlight ? "nf-mejorar-ficha-fotos-subcard--focus" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <p className="nf-upgrade-fotos-col-label">
                        Foto principal o logo
                      </p>
                      <div className="nf-upgrade-principal-visual">
                        {form.fotoPrincipalUrl.trim() ? (
                          <img
                            className="nf-upgrade-principal-visual-img"
                            key={form.fotoPrincipalUrl.trim()}
                            src={form.fotoPrincipalUrl.trim()}
                            alt=""
                            referrerPolicy="no-referrer"
                          />
                        ) : null}
                        <button
                          type="button"
                          className={[
                            "nf-upgrade-principal-hit",
                            form.fotoPrincipalUrl.trim()
                              ? "nf-upgrade-principal-hit--onphoto"
                              : "nf-upgrade-principal-hit--empty",
                          ].join(" ")}
                          disabled={fotoPrincipalUploading}
                          onClick={() => fotoPrincipalFileRef.current?.click()}
                          aria-label={
                            form.fotoPrincipalUrl.trim()
                              ? "Cambiar foto principal o logo"
                              : "Subir foto principal o logo"
                          }
                        >
                          <svg
                            className="nf-upgrade-principal-cam-svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            aria-hidden
                          >
                            <path d="M9 3 7.17 5H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2h-3.17L15 3H9zm3 15a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-2a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
                          </svg>
                          {form.fotoPrincipalUrl.trim() ? (
                            <span className="nf-upgrade-principal-hit-photo-line">
                              Cambiar foto
                            </span>
                          ) : (
                            <span style={{ textAlign: "center", lineHeight: 1.35, maxWidth: 200 }}>
                              Tocá para subir
                              <span
                                style={{
                                  display: "block",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  opacity: 0.85,
                                  marginTop: 4,
                                }}
                              >
                                Foto principal o logo
                              </span>
                            </span>
                          )}
                        </button>
                      </div>
                      <div className="nf-upgrade-principal-actions">
                        <button
                          type="button"
                          className="nf-upgrade-principal-cta"
                          disabled={fotoPrincipalUploading}
                          onClick={() => fotoPrincipalFileRef.current?.click()}
                        >
                          {fotoPrincipalUploading
                            ? "Subiendo…"
                            : form.fotoPrincipalUrl.trim()
                              ? "Cambiar"
                              : "Subir foto principal"}
                        </button>
                        {form.fotoPrincipalUrl.trim() ? (
                          <button
                            type="button"
                            className="nf-upgrade-principal-quitar-link"
                            disabled={fotoPrincipalUploading}
                            onClick={() => updateField("fotoPrincipalUrl", "")}
                          >
                            Quitar
                          </button>
                        ) : null}
                      </div>
                    </section>
                    <section className="nf-mejorar-ficha-fotos-subcard nf-mejorar-ficha-fotos-subcard--galeria">
                      <div className="nf-upgrade-galeria-head">
                        <h3 className="nf-upgrade-galeria-title">Galería</h3>
                        <span
                          className="nf-upgrade-galeria-max-hint"
                          title="Podés subir hasta 8 fotos en la galería."
                        >
                          Máx. 8 fotos
                        </span>
                      </div>
                      {galeriaMsg ? (
                        <p
                          style={{
                            margin: "0 0 8px",
                            fontSize: 12,
                            color: "#b45309",
                            fontWeight: 600,
                          }}
                        >
                          {galeriaMsg}
                        </p>
                      ) : null}
                      <div className="nf-upgrade-galeria-strip">
                        {form.galeriaUrls.map((url, index) =>
                          url.trim() ? (
                            <div
                              key={`gal-${index}-${url.trim().slice(-24)}`}
                              className={[
                                "nf-upgrade-galeria-thumb",
                                galeriaThumbTapReveal &&
                                galeriaThumbActionsOpenIndex === index
                                  ? "nf-upgrade-galeria-thumb--actions-open"
                                  : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                              onClick={(e) => {
                                if (!galeriaThumbTapReveal) return;
                                if (
                                  (e.target as HTMLElement).closest("button")
                                ) {
                                  return;
                                }
                                setGaleriaThumbActionsOpenIndex((prev) =>
                                  prev === index ? null : index
                                );
                              }}
                            >
                              <img src={url.trim()} alt="" referrerPolicy="no-referrer" />
                              <div className="nf-upgrade-galeria-thumb-actions">
                                <button
                                  type="button"
                                  aria-label="Marcar como principal"
                                  disabled={galeriaUploading}
                                  onClick={() => void markGaleriaAsPrincipalUpgrade(index)}
                                >
                                  Marcar como principal
                                </button>
                                <button
                                  type="button"
                                  className="nf-upgrade-galeria-quitar-link"
                                  aria-label={`Quitar foto ${index + 1}`}
                                  disabled={galeriaUploading}
                                  onClick={() => void removeGaleriaSlotUpgrade(index)}
                                >
                                  Quitar
                                </button>
                              </div>
                            </div>
                          ) : null
                        )}
                        {form.galeriaUrls.filter((u) => u.trim()).length < 8 ? (
                          <button
                            type="button"
                            className="nf-upgrade-galeria-add"
                            disabled={galeriaUploading}
                            onClick={() => {
                              logMejorarFichaGaleria("botón Agregar más fotos click", {
                                refOk: Boolean(galeriaFileRef.current),
                                galeriaUploading,
                              });
                              galeriaFileRef.current?.click();
                            }}
                          >
                            <span style={{ fontSize: 18 }} aria-hidden>
                              📷
                            </span>
                            {galeriaUploading
                              ? "Subiendo…"
                              : "Subir más fotos de tu trabajo"}
                          </button>
                        ) : null}
                      </div>
                    </section>
                  </div>
                </div>
              </div>

            <section
              id="mejorar-ficha-foco-contacto"
              className={[
                "nf-upgrade-section",
                "nf-upgrade-section-protagonist",
                "nf-upgrade-section-contacto",
                upgradeSeccionFocusClass(focus, "redes"),
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className="nf-upgrade-paso-title-row nf-upgrade-section-contacto-title-row">
                <h2 className="nf-upgrade-section-contacto-title">Cómo te contactan</h2>
                <MejorarFichaPasoBadge
                  completo={mejorarFichaGuiado.completo.contacto}
                />
              </div>
              <p className="nf-upgrade-section-contacto-sub">
                WhatsApp, redes y web: que sepan cómo te escriben después de ver tu ficha.
              </p>
              <div className="nf-upgrade-contacto-grid nf-upgrade-contacto-grid--pair">
                <div className="nf-upgrade-contacto-pair-cell nf-upgrade-contacto-wa-principal">
                  <ContactoUpgradeLabel icon={<WhatsAppGlyph />} required emphasize>
                    WhatsApp
                  </ContactoUpgradeLabel>
                  <TextInput
                    value={form.whatsapp}
                    onChange={(value) =>
                      updateField("whatsapp", sanitizeChileWhatsappInput(value))
                    }
                    onBlur={(e) => {
                      const t = e.currentTarget.value.trim();
                      if (!t) {
                        setErrors((p) => ({
                          ...p,
                          whatsapp: "El WhatsApp es obligatorio.",
                          general: undefined,
                        }));
                        return;
                      }
                      const v = normalizeAndValidateChileWhatsappStrict(t);
                      if (v.ok) {
                        updateField("whatsapp", formatChileWhatsappDisplay(v.normalized));
                      } else {
                        setErrors((p) => ({
                          ...p,
                          whatsapp:
                            "WhatsApp no válido. En Chile son 9 dígitos: 912345678, 56912345678 o +56912345678 (sin dígitos de más).",
                          general: undefined,
                        }));
                      }
                    }}
                    placeholder="+56912345678"
                    inputMode="tel"
                    autoComplete="tel"
                    type="tel"
                    maxLength={12}
                    error={errors.whatsapp}
                  />
                </div>
                <div className="nf-upgrade-contacto-pair-cell nf-upgrade-contacto-wa-secundario">
                  <ContactoUpgradeLabel icon={<WhatsAppGlyph />} emphasize>
                    WhatsApp adicional
                  </ContactoUpgradeLabel>
                  <TextInput
                    value={form.whatsappSecundario}
                    onChange={(value) =>
                      updateField(
                        "whatsappSecundario",
                        sanitizeChileWhatsappInput(value)
                      )
                    }
                    onBlur={(e) => {
                      const t = e.currentTarget.value.trim();
                      if (!t) {
                        setErrors((p) => ({
                          ...p,
                          whatsappSecundario: undefined,
                          general: undefined,
                        }));
                        return;
                      }
                      const v = normalizeAndValidateChileWhatsappStrict(t);
                      if (v.ok) {
                        updateField(
                          "whatsappSecundario",
                          formatChileWhatsappDisplay(v.normalized)
                        );
                      } else {
                        setErrors((p) => ({
                          ...p,
                          whatsappSecundario:
                            "Ingresa un WhatsApp válido de Chile (ej: 9XXXXXXXX o +569XXXXXXXX).",
                          general: undefined,
                        }));
                      }
                    }}
                    placeholder="+56912345678"
                    inputMode="tel"
                    autoComplete="tel"
                    type="tel"
                    maxLength={12}
                    error={errors.whatsappSecundario}
                  />
                </div>
                <div className="nf-upgrade-contacto-pair-cell nf-upgrade-contacto-instagram-wrap nf-upgrade-contacto-field">
                  <ContactoUpgradeLabel icon={<InstagramGlyph tone="brand" />}>
                    Instagram
                  </ContactoUpgradeLabel>
                  <TextInput
                    value={form.instagram}
                    onChange={(value) =>
                      updateField("instagram", value.replace(/\s/g, ""))
                    }
                    onBlur={(e) => {
                      const t = e.currentTarget.value.trim();
                      if (!t) {
                        setErrors((p) => ({
                          ...p,
                          instagram: undefined,
                          general: undefined,
                        }));
                        return;
                      }
                      const v = validateOptionalInstagram(t);
                      if (!v.ok) {
                        setErrors((p) => ({
                          ...p,
                          instagram: v.message,
                          general: undefined,
                        }));
                        return;
                      }
                      updateField("instagram", v.normalized);
                    }}
                    placeholder="@elmecanico_12 o instagram.com/elmecanico_12"
                    maxLength={120}
                    error={errors.instagram}
                  />
                </div>
                <div className="nf-upgrade-contacto-pair-cell nf-upgrade-contacto-web-wrap nf-upgrade-contacto-field">
                  <ContactoUpgradeLabel icon={<WebGlyph tone="neutral" />}>
                    Sitio web
                  </ContactoUpgradeLabel>
                  <TextInput
                    value={form.web}
                    onChange={(value) =>
                      updateField("web", value.replace(/[\s,]/g, ""))
                    }
                    onBlur={(e) => {
                      const t = e.currentTarget.value.trim();
                      if (!t) {
                        setErrors((p) => ({ ...p, web: undefined, general: undefined }));
                        return;
                      }
                      const v = validateOptionalWebsite(t);
                      if (!v.ok) {
                        setErrors((p) => ({
                          ...p,
                          web: v.message,
                          general: undefined,
                        }));
                        return;
                      }
                      updateField("web", v.normalized);
                    }}
                    placeholder="https://elmecanico.cl"
                    maxLength={200}
                    error={errors.web}
                  />
                </div>
                <div className="nf-upgrade-contacto-pair-cell nf-upgrade-contacto-nombre-row nf-upgrade-contacto-field nf-upgrade-contacto-field--60" style={{ padding: "12px 14px 14px", borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0", boxSizing: "border-box" }}>
                  <ContactoUpgradeLabel icon={<UserCircleGlyph />}>
                    Nombre de contacto (opcional)
                  </ContactoUpgradeLabel>
                  <TextInput
                    value={form.responsable}
                    onChange={(value) => updateField("responsable", value)}
                    placeholder="Opcional"
                    error={errors.responsable}
                  />
                  <p className="nf-form-field-hint">
                    Este nombre se mostrará públicamente en tu ficha para que los clientes sepan con quién están hablando.
                  </p>
                </div>
              </div>
            </section>

            <section
              id="mejorar-ficha-foco-trabajas"
              className={[
                "nf-upgrade-section",
                "nf-upgrade-section-protagonist",
              ].join(" ")}
            >
              <div className="nf-upgrade-paso-title-row" style={{ margin: "0 0 4px" }}>
                <h2 className="nf-upgrade-paso-sec-title">Cómo trabajas</h2>
                <MejorarFichaPasoBadge
                  completo={mejorarFichaGuiado.completo.trabajas}
                />
              </div>
              <p
                style={{
                  margin: "0 0 14px",
                  fontSize: 12,
                  color: "#64748b",
                  fontWeight: 600,
                  lineHeight: 1.4,
                }}
              >
                Elige una o varias opciones.
              </p>
              <FieldLabel required>Modalidad</FieldLabel>
              <div
                style={{
                  border: errors.modalidadesAtencion
                    ? "1px solid #dc2626"
                    : "1px solid #d1d5db",
                  borderRadius: 14,
                  padding: 10,
                }}
              >
                <div
                  className={[
                    "nf-upgrade-modalidad-cards",
                    errors.modalidadesAtencion
                      ? "nf-upgrade-modalidad-cards--error"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {MEJORAR_FICHA_MODALIDAD_TARJETAS.map(
                    ({ modalidad, titulo, subtitulo, Icon }) => {
                      const checked =
                        form.modalidadesAtencion.includes(modalidad);
                      return (
                        <button
                          key={modalidad}
                          type="button"
                          className={[
                            "nf-upgrade-modalidad-card",
                            checked
                              ? "nf-upgrade-modalidad-card--active"
                              : "nf-upgrade-modalidad-card--inactive",
                          ].join(" ")}
                          aria-pressed={checked}
                          onClick={() => toggleModalidad(modalidad)}
                        >
                          {checked ? (
                            <span
                              className="nf-upgrade-modalidad-card-check"
                              aria-hidden
                            >
                              <Check size={13} strokeWidth={2.75} />
                            </span>
                          ) : null}
                          <span className="nf-upgrade-modalidad-card-icon-wrap">
                            <Icon
                              className="nf-upgrade-modalidad-card-icon"
                              size={20}
                              strokeWidth={1.75}
                              aria-hidden
                            />
                          </span>
                          <span className="nf-upgrade-modalidad-card-text">
                            <span className="nf-upgrade-modalidad-card-title">
                              {titulo}
                            </span>
                            <span className="nf-upgrade-modalidad-card-sub">
                              {subtitulo}
                            </span>
                          </span>
                        </button>
                      );
                    }
                  )}
                </div>
                {form.modalidadesAtencion.includes("presencial_terreno") ? (
                  <div style={{ marginTop: 12 }}>
                    <CheckboxPill
                      variant="filter"
                      size="large"
                      checked
                      onClick={() => toggleModalidad("presencial_terreno")}
                    >
                      A domicilio / Delivery (registro anterior)
                    </CheckboxPill>
                  </div>
                ) : null}
              </div>
              {errors.modalidadesAtencion ? (
                <div style={{ marginTop: 6, fontSize: 13, color: "#b91c1c" }}>
                  {errors.modalidadesAtencion}
                </div>
              ) : null}
              {form.modalidadesAtencion.includes("local_fisico") ? (
                <div
                  className="nf-upgrade-direccion-local"
                  aria-labelledby="nf-tus-locales-fisicos-title"
                >
                  <h3
                    id="nf-tus-locales-fisicos-title"
                    className="nf-upgrade-paso-sec-title"
                    style={{ margin: "14px 0 6px", fontSize: 16 }}
                  >
                    Tus locales físicos
                  </h3>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                      marginBottom: localesPanelOpen ? 12 : 0,
                    }}
                  >
                    <p
                      className="nf-upgrade-direccion-local-hint"
                      style={{ margin: 0, flex: "1 1 220px" }}
                    >
                      {localesFisicosResumenLine}
                    </p>
                    {!hasLocalesErr ? (
                      <button
                        type="button"
                        onClick={() => setLocalesFisicosEditorOpen((o) => !o)}
                        aria-expanded={localesPanelOpen}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          flexShrink: 0,
                          padding: "8px 14px",
                          borderRadius: 12,
                          border: "1px solid #cbd5e1",
                          background: "#fff",
                          fontWeight: 800,
                          fontSize: 14,
                          cursor: "pointer",
                          color: "#0f172a",
                        }}
                      >
                        <ChevronDown
                          size={18}
                          aria-hidden
                          style={{
                            transform: localesPanelOpen ? "rotate(180deg)" : "none",
                            transition: "transform 0.2s ease",
                          }}
                        />
                        {localesPanelOpen ? "Ocultar locales" : "Ver locales"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="nf-upgrade-datos-basicos-cta nf-upgrade-datos-basicos-cta--compact"
                        style={{ flexShrink: 0 }}
                        onClick={() => setLocalesFisicosEditorOpen(true)}
                        aria-expanded={localesPanelOpen}
                      >
                        <Pencil
                          className="nf-upgrade-datos-basicos-cta-icon"
                          size={16}
                          strokeWidth={2.25}
                          aria-hidden
                        />
                        Revisá los datos del local
                      </button>
                    )}
                  </div>
                  {localesPanelOpen ? (
                    <>
                  <p
                    className="nf-upgrade-direccion-local-hint"
                    style={{ marginTop: 0, marginBottom: 12 }}
                  >
                    Puedes agregar hasta {MAX_LOCALES_FISICOS} locales. Uno debe ser principal.
                  </p>
                  {form.localesFisicos.length > 0 &&
                  !form.localesFisicos.some((l) => l.esPrincipal) ? (
                    <div
                      role="status"
                      style={{
                        marginBottom: 12,
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid #fcd34d",
                        background: "#fffbeb",
                        color: "#92400e",
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      Eliminaste el local principal. Elige cuál de los que quedan es el principal
                      con «Marcar como principal» en una tarjeta.
                    </div>
                  ) : null}
                  {form.localesFisicos.map((loc, idx) => (
                    <div
                      key={loc.clientId}
                      className={[
                        "nf-locales-ficha-card",
                        idx > 0 ? "nf-locales-ficha-card--after" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 10,
                          gap: 12,
                          flexWrap: "wrap",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            flexWrap: "wrap",
                            minWidth: 0,
                          }}
                        >
                          <span style={{ fontWeight: 800, fontSize: 14 }}>
                            Local {idx + 1}
                          </span>
                          {loc.esPrincipal ? (
                            <span className="nf-locales-principal-badge">Principal</span>
                          ) : (
                            <button
                              type="button"
                              className="nf-locales-marca-principal-btn"
                              onClick={() =>
                                patchLocalFisico(loc.clientId, { esPrincipal: true })
                              }
                              aria-label="Marcar como principal"
                            >
                              Marcar como principal
                            </button>
                          )}
                        </div>
                        {form.localesFisicos.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => removeLocalFisico(loc.clientId)}
                            style={{
                              border: "none",
                              background: "transparent",
                              color: "#b91c1c",
                              fontWeight: 700,
                              fontSize: 13,
                              cursor: "pointer",
                              textDecoration: "underline",
                              flexShrink: 0,
                            }}
                          >
                            Quitar
                          </button>
                        ) : null}
                      </div>
                      <div style={{ display: "grid", gap: 10 }}>
                        <FieldLabel required>Comuna</FieldLabel>
                        <LocalesComunaPicker
                          mode={
                            loc.esPrincipal
                              ? "solo_base"
                              : localesComunaPickerModeFromCobertura(form.coberturaTipo)
                          }
                          catalog={comunasCatalog}
                          catalogLoading={comunasCatalogLoading}
                          allowedRows={
                            loc.esPrincipal
                              ? allowedComunaRowsForPrincipalLocal
                              : allowedComunaRowsForLocales
                          }
                          valueSlug={loc.comunaSlug}
                          onChange={(v) =>
                            patchLocalFisico(loc.clientId, { comunaSlug: v })
                          }
                          emptyFixedHint={
                            loc.esPrincipal
                              ? "El local principal usa tu comuna base. Para cambiarla, ve a «Editar datos básicos»."
                              : form.coberturaTipo === "solo_comuna"
                                ? "La comuna base se define en «Editar datos básicos»; este local queda en esa comuna."
                                : "Cada local adicional puede estar en la comuna base o en las comunas de cobertura que agregaste arriba."
                          }
                          soloBaseSubcopy={
                            loc.esPrincipal && form.coberturaTipo !== "solo_comuna"
                              ? "El local principal va siempre en tu comuna base. Para cambiarla, ve a «Editar datos básicos»."
                              : undefined
                          }
                        />
                        <FieldLabel required>Dirección</FieldLabel>
                        <TextInput
                          dense
                          value={loc.direccion}
                          onChange={(v) => patchLocalFisico(loc.clientId, { direccion: v })}
                          placeholder="Calle, número…"
                        />
                        <FieldLabel>Referencia (opcional)</FieldLabel>
                        <TextInput
                          dense
                          value={loc.referencia}
                          onChange={(v) => patchLocalFisico(loc.clientId, { referencia: v })}
                          placeholder="Ej. local 2, entre calles, piso"
                        />
                      </div>
                    </div>
                  ))}
                  {form.localesFisicos.length < MAX_LOCALES_FISICOS ? (
                    <button
                      type="button"
                      className="nf-locales-agregar-local-btn"
                      onClick={addLocalFisico}
                    >
                      + Agregar local
                    </button>
                  ) : null}
                  {errors.localesFisicos ? (
                    <div className="nf-locales-error-msg" role="alert">
                      <span className="nf-locales-error-msg-icon" aria-hidden>
                        ⚠️
                      </span>
                      <span className="nf-locales-error-msg-text">
                        {errors.localesFisicos}
                      </span>
                    </div>
                  ) : null}
                    </>
                  ) : null}
                </div>
              ) : null}
            </section>

            <section className="nf-upgrade-section nf-upgrade-section-protagonist">
              <h2
                className="nf-upgrade-paso-sec-title"
                style={{ margin: "0 0 6px" }}
              >
                Cuenta más sobre tu negocio (opcional)
              </h2>
              <p className="nf-upgrade-seccion-opcional-hint">
                Opcional: puede ayudarte a recibir más contactos
              </p>
              <TextArea
                value={form.descripcionLarga}
                onChange={(value) => updateField("descripcionLarga", value)}
                placeholder="Servicios, experiencia, horarios, zonas…"
                error={errors.descripcionLarga}
                rows={6}
              />
            </section>

            <section className="nf-upgrade-section">
              <h2
                className="nf-upgrade-paso-sec-title"
                style={{ margin: "0 0 6px" }}
              >
                Palabras clave (opcional)
              </h2>
              <p className="nf-upgrade-seccion-opcional-hint">
                Opcional: ayudan a clasificar tu ficha y mejorar búsquedas. No se muestran públicamente.
              </p>
              <TextInput
                value={form.keywordsUsuario}
                onChange={(value) => updateField("keywordsUsuario", value)}
                placeholder="Ej: pan amasado, empanadas, kuchen"
                dense
              />
            </section>

            <div className="nf-upgrade-submit">
              {errors.general ? (
                <div
                  style={{
                    border: "1px solid #fecaca",
                    background: "#fef2f2",
                    color: "#b91c1c",
                    borderRadius: 16,
                    padding: 14,
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {errors.general}
                </div>
              ) : null}
              {persistMediaId ? (
                <div className="nf-upgrade-submit-footer-stack">
                  <button
                    type="submit"
                    className="nf-upgrade-save-primary-btn"
                    disabled={isSubmitting || loading}
                  >
                    {isSubmitting ? "Guardando..." : "Guardar cambios"}
                  </button>
                  <div
                    className={[
                      "nf-upgrade-autosave-footer",
                      upgradeSilentSave === "err"
                        ? "nf-upgrade-autosave-footer--error"
                        : "",
                      lastSavedProfileSig == null &&
                      upgradeSilentSave !== "err" &&
                      !isSubmitting &&
                      upgradeSilentSave !== "saving"
                        ? "nf-upgrade-autosave-footer--neutral"
                        : "",
                      upgradeProfileDirty &&
                      upgradeSilentSave !== "err" &&
                      !isSubmitting &&
                      upgradeSilentSave !== "saving" &&
                      lastSavedProfileSig != null
                        ? "nf-upgrade-autosave-footer--pending"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {upgradeSilentSave === "err" ? (
                      <>
                        <p
                          className="nf-upgrade-autosave-footer-title nf-upgrade-autosave-footer-title--error"
                        >
                          {MSG_GUARDAR_FALLBACK}
                        </p>
                        {upgradeSilentErr &&
                        upgradeSilentErr !== MSG_GUARDAR_FALLBACK ? (
                          <p className="nf-upgrade-autosave-footer-err">
                            {upgradeSilentErr}
                          </p>
                        ) : null}
                      </>
                    ) : isSubmitting || upgradeSilentSave === "saving" ? (
                      <>
                        <p className="nf-upgrade-autosave-footer-title">Guardando...</p>
                        <p className="nf-upgrade-autosave-footer-sub">
                          Puedes seguir editando; no cierres la pestaña.
                        </p>
                      </>
                    ) : upgradeProfileDirty ? (
                      <>
                        <p className="nf-upgrade-autosave-footer-title nf-upgrade-autosave-footer-title--pending">
                          Hay cambios sin guardar
                        </p>
                        <p className="nf-upgrade-autosave-footer-sub nf-upgrade-autosave-footer-sub--pending">
                          Haz clic en «Guardar cambios» para confirmar. También guardamos automáticamente cuando el formulario es válido.
                        </p>
                      </>
                    ) : lastSavedProfileSig == null ? (
                      <>
                        <p className="nf-upgrade-autosave-footer-title nf-upgrade-autosave-footer-title--muted">
                          Cargando perfil…
                        </p>
                        <p className="nf-upgrade-autosave-footer-sub nf-upgrade-autosave-footer-sub--muted">
                          En un momento podrás guardar.
                        </p>
                      </>
                    ) : totalFotos < 3 ? (
                      <>
                        <p className="nf-upgrade-autosave-footer-title">
                          Guardado. ¿Qué quieres hacer ahora?
                        </p>
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 10,
                            marginTop: 10,
                          }}
                        >
                          {datosBasicosHref ? (
                            <Link
                              href={datosBasicosHref}
                              className="nf-upgrade-datos-basicos-cta"
                              style={{ alignSelf: "flex-start", width: "auto", minHeight: 0 }}
                              aria-label="Editar datos básicos del emprendimiento"
                            >
                              <Pencil className="nf-upgrade-datos-basicos-cta-icon" size={18} strokeWidth={2.25} aria-hidden />
                              Editar datos básicos
                            </Link>
                          ) : null}
                          <button
                            type="button"
                            className="nf-upgrade-save-primary-btn"
                            style={{
                              alignSelf: "flex-start",
                              background: "#111827",
                            }}
                            onClick={scrollToUpgradeFotosBlock}
                          >
                            Seguir mejorando la ficha
                          </button>
                          {fichaPublicaEnSitioVisible && fichaPublicaHref ? (
                            <a
                              href={fichaPublicaHref}
                              target="_blank"
                              rel="noreferrer"
                              className="nf-upgrade-save-secondary-link"
                              style={{
                                alignSelf: "center",
                                fontSize: 13,
                                textDecoration: "underline",
                                padding: "10px 6px",
                              }}
                            >
                              Ver cómo quedará mi perfil
                            </a>
                          ) : null}
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="nf-upgrade-autosave-footer-title">
                          Tu perfil se actualizará después de revisión. Puedes seguir mejorándolo
                          mientras tanto.
                        </p>
                        <p className="nf-upgrade-autosave-footer-sub">
                          Guardando en segundo plano mientras editas.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "stretch",
                    gap: 8,
                    paddingTop: 4,
                  }}
                >
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      width: "100%",
                      minHeight: 52,
                      padding: "0 18px",
                      borderRadius: 14,
                      border: "none",
                      background: isSubmitting ? "#94a3b8" : "#111827",
                      color: "#fff",
                      fontWeight: 800,
                      fontSize: 15,
                      cursor: isSubmitting ? "not-allowed" : "pointer",
                    }}
                  >
                    {isSubmitting ? "Guardando..." : "Guardar y continuar"}
                  </button>
                </div>
              )}
            </div>
            </div>
            <aside
              className="nf-upgrade-editor-preview"
              aria-label="Vista previa de tu ficha pública"
            >
              {totalFotos >= 3 ? (
                <p
                  style={{
                    margin: "0 0 10px",
                    fontSize: 13,
                    lineHeight: 1.35,
                    color: "#64748b",
                    fontWeight: 600,
                  }}
                >
                  Así te verán tus clientes
                </p>
              ) : totalFotos > 0 ? (
                <p
                  style={{
                    margin: "0 0 10px",
                    fontSize: 13,
                    lineHeight: 1.35,
                    color: "#64748b",
                    fontWeight: 600,
                  }}
                >
                  Tu perfil puede verse mejor con más fotos
                </p>
              ) : null}
              <UpgradeFichaPublicaResumen
                form={form}
                comunaBase={comunaBase}
                comunasCatalog={comunasCatalog}
                totalFotos={totalFotos}
              />
            </aside>
          </div>
          </div>
        </>
      ) : (
        <>
      <PanelCard
          title="Información básica"
          subtitle="Define el nombre del negocio y los datos principales que verán las personas en su ficha pública."
        >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 18,
          }}
        >
          <div style={{ gridColumn: "1 / -1" }}>
            <FieldLabel required>Nombre del negocio</FieldLabel>
            <TextInput
              value={form.nombre}
              onChange={(value) => updateField("nombre", value)}
              placeholder="Nombre de tu negocio"
              error={errors.nombre}
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <FieldLabel>Nombre de contacto (opcional)</FieldLabel>
            <TextInput
              value={form.responsable}
              onChange={(value) => updateField("responsable", value)}
              placeholder="Ej: Juan Pérez (opcional)"
              error={errors.responsable}
            />
            <p className="nf-form-field-hint">
              Este nombre se mostrará públicamente en tu ficha para que los clientes sepan con quién están hablando.
            </p>
          </div>
        </div>
        </PanelCard>

      <PanelCard
          title="Ubicación y cobertura"
          subtitle="Tu comuna base y hasta dónde llega tu negocio."
        >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 18,
          }}
        >
          <div>
            <FieldLabel required>Comuna base</FieldLabel>
            <SelectInput
              value={form.comunaBaseSlug}
              onChange={(value) => updateComunaBaseSlug(value)}
              placeholder={comunasCatalogLoading ? "Cargando comunas…" : "Selecciona comuna"}
              error={errors.comunaBaseSlug}
              options={comunasCatalog.map((item) => ({
                value: item.slug,
                label: formatComunaCatalogLabel(item),
              }))}
            />
          </div>

          <div>
            <FieldLabel required>Cobertura</FieldLabel>
            <SelectInput
              value={form.coberturaTipo}
              onChange={handleCoberturaChange}
              error={errors.coberturaTipo}
              options={[
                { value: "solo_comuna", label: "Solo mi comuna" },
                { value: "varias_comunas", label: "Varias comunas" },
                { value: "regional", label: "Toda la región" },
                { value: "nacional", label: "Todo Chile" },
              ]}
            />
          </div>

          {form.coberturaTipo === "varias_comunas" ? (
            <div style={{ gridColumn: "1 / -1" }}>
              <FieldLabel required>¿En qué otras comunas atiendes? Agregalas acá</FieldLabel>

              <div
                style={{
                  border: errors.comunasCoberturaSlugs
                    ? "1px solid #dc2626"
                    : "1px solid #d1d5db",
                  borderRadius: 14,
                  padding: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                {form.comunasCoberturaSlugs.length > 0 ? (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    {[...form.comunasCoberturaSlugs]
                      .sort((a, b) => {
                        const ra = resolveComunaFromCatalog(comunasCatalog, a);
                        const rb = resolveComunaFromCatalog(comunasCatalog, b);
                        const la = ra
                          ? coberturaChipsSoloNombre
                            ? String(ra.nombre).trim()
                            : formatComunaCatalogLabel(ra)
                          : a;
                        const lb = rb
                          ? coberturaChipsSoloNombre
                            ? String(rb.nombre).trim()
                            : formatComunaCatalogLabel(rb)
                          : b;
                        return la.localeCompare(lb, "es");
                      })
                      .map((slug) => {
                        const row = resolveComunaFromCatalog(comunasCatalog, slug);
                        const label = row
                          ? coberturaChipsSoloNombre
                            ? String(row.nombre).trim()
                            : formatComunaCatalogLabel(row)
                          : slug;
                        const quitarAria =
                          row && String(row.regionNombre ?? "").trim()
                            ? `Quitar ${String(row.nombre).trim()}, ${String(row.regionNombre).trim()}`
                            : `Quitar ${label}`;
                        return (
                          <span
                            key={slug}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "6px 10px 6px 12px",
                              borderRadius: 999,
                              border: "1px solid #cbd5e1",
                              background: "#fff",
                              fontSize: 14,
                              fontWeight: 600,
                              color: "#0f172a",
                              maxWidth: "100%",
                            }}
                          >
                            <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                              {label}
                            </span>
                            <button
                              type="button"
                              aria-label={quitarAria}
                              onClick={() => toggleComunaCobertura(slug)}
                              style={{
                                flexShrink: 0,
                                border: "none",
                                background: "#f1f5f9",
                                color: "#475569",
                                width: 26,
                                height: 26,
                                borderRadius: 999,
                                cursor: "pointer",
                                fontSize: 18,
                                lineHeight: 1,
                                padding: 0,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                  </div>
                ) : null}

                <CoberturaComunasAddAutocomplete
                  catalog={comunasCatalog}
                  catalogLoading={comunasCatalogLoading}
                  comunaBaseSlug={form.comunaBaseSlug}
                  selectedSlugs={form.comunasCoberturaSlugs}
                  onAdd={(slug) => toggleComunaCobertura(slug)}
                />
              </div>

              {errors.comunasCoberturaSlugs ? (
                <div style={{ marginTop: 6, fontSize: 13, color: "#b91c1c" }}>
                  {errors.comunasCoberturaSlugs}
                </div>
              ) : null}
            </div>
          ) : null}

          {comunaBase &&
          !(
            form.coberturaTipo === "varias_comunas" &&
            form.comunasCoberturaSlugs.length === 0
          ) ? (
            <div
              style={{
                gridColumn: "1 / -1",
                border: "1px solid #dbeafe",
                background: "#eff6ff",
                borderRadius: 16,
                padding: 14,
                fontSize: 14,
                color: "#1e40af",
              }}
            >
              <strong>Resumen:</strong>{" "}
              {form.coberturaTipo === "solo_comuna"
                ? `Atiende en ${comunaBase.nombre}.`
                : form.coberturaTipo === "varias_comunas"
                  ? `Base ${comunaBase.nombre} y otras comunas.`
                  : form.coberturaTipo === "regional"
                    ? `Base ${comunaBase.nombre}, alcance regional.`
                    : `Base ${comunaBase.nombre}, alcance nacional.`}
            </div>
          ) : null}
        </div>
        </PanelCard>

      <PanelCard
        title="Fotos"
        subtitle="Foto principal y galería: mostrá tu negocio con imágenes claras."
      >
        <style dangerouslySetInnerHTML={{ __html: NF_UPGRADE_STYLES }} />
        <p
          style={{
            margin: "0 0 18px",
            fontSize: 14,
            lineHeight: 1.5,
            color: "#475569",
            fontWeight: 600,
          }}
        >
          Subí fotos reales de tu trabajo, local o servicios. Evitá imágenes que no representen
          tu negocio.
        </p>
        <input
          ref={fotoPrincipalFileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleFotoPrincipalFilePick}
        />
        <input
          ref={galeriaFileRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={(ev) => void handleGaleriaFilesPick(ev)}
        />

        <div style={{ marginBottom: 22 }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: "#0f172a",
              marginBottom: 6,
            }}
          >
            Foto principal
          </div>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "#64748b" }}>
            Logo o foto representativa. Es obligatoria y es la primera que ven en tu ficha.
          </p>
          {errors.fotoPrincipalUrl ? (
            <p style={{ margin: "0 0 10px", fontSize: 13, color: "#b91c1c", fontWeight: 700 }}>
              {errors.fotoPrincipalUrl}
            </p>
          ) : null}
          <div className="nf-gallery-grid" style={{ maxWidth: 420 }}>
            <div className="nf-gallery-card nf-gallery-card--principal">
              {form.fotoPrincipalUrl.trim() ? (
                <img
                  className="nf-gallery-card-img"
                  src={form.fotoPrincipalUrl.trim()}
                  alt=""
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="nf-gallery-card-empty">
                  Subí tu foto principal
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Obligatoria</span>
                </div>
              )}
              <div className="nf-gallery-card-actions">
                <button
                  type="button"
                  disabled={fotoPrincipalUploading}
                  onClick={() => fotoPrincipalFileRef.current?.click()}
                >
                  {fotoPrincipalUploading ? "Subiendo…" : "Cambiar"}
                </button>
                {form.fotoPrincipalUrl.trim() ? (
                  <button
                    type="button"
                    disabled={fotoPrincipalUploading}
                    onClick={() => updateField("fotoPrincipalUrl", "")}
                  >
                    Quitar
                  </button>
                ) : null}
              </div>
              <div className="nf-gallery-badge">Principal</div>
            </div>
          </div>
        </div>

        <div
          style={{
            borderTop: "1px solid #e5e7eb",
            paddingTop: 22,
            marginTop: 4,
          }}
        >
          <div
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: "#0f172a",
              marginBottom: 6,
            }}
          >
            Galería
          </div>
          <p style={{ margin: "0 0 14px", fontSize: 13, color: "#64748b" }}>
            Opcional. Hasta 8 fotos más para mostrar trabajos, productos o tu local.
          </p>
          <div className="nf-gallery-grid">
            {form.galeriaUrls
              .map((u, idx) => ({ url: String(u || "").trim(), idx }))
              .filter((x) => x.url)
              .map(({ url, idx }) => (
                <div key={`g-${idx}-${url.slice(-20)}`} className="nf-gallery-card">
                  <img className="nf-gallery-card-img" src={url} alt="" referrerPolicy="no-referrer" />
                  <div className="nf-gallery-card-actions">
                    <button
                      type="button"
                      disabled={galeriaUploading}
                      onClick={() => void markGaleriaAsPrincipalUpgrade(idx)}
                    >
                      Marcar como principal
                    </button>
                    <button
                      type="button"
                      disabled={galeriaUploading}
                      onClick={() => void removeGaleriaSlotUpgrade(idx)}
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              ))}

            {form.galeriaUrls.filter((u) => String(u || "").trim()).length < 8 ? (
              <button
                type="button"
                className="nf-gallery-card nf-gallery-card--add"
                disabled={galeriaUploading}
                onClick={() => galeriaFileRef.current?.click()}
              >
                <span style={{ fontSize: 18 }} aria-hidden>
                  📷
                </span>
                {galeriaUploading ? "Subiendo…" : "Agregar a la galería"}
              </button>
            ) : null}
          </div>
        </div>
        </PanelCard>

      <PanelCard
          title="Descripción del negocio"
          subtitle="La frase corta es lo primero que leen: debe sonar a negocio concreto, no a lista de palabras."
        >
        <div style={{ display: "grid", gap: 18 }}>
          <div>
            <FieldLabel required>Frase corta (qué hacés, dónde y tu especialidad)</FieldLabel>
            <TextArea
              value={form.descripcionCorta}
              onChange={(value) => updateField("descripcionCorta", value)}
              placeholder="Mecánico a domicilio en Maipú. Frenos, neumáticos y mantenciones."
              error={errors.descripcionCorta}
              rows={3}
            />
            <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280", lineHeight: 1.45 }}>
              En una sola frase: qué ofrecés, zona o comuna donde atendés y lo que más te
              caracteriza. {form.descripcionCorta.length}/{DESCRIPCION_CORTA_MAX} (mín.{" "}
              {DESCRIPCION_CORTA_MIN}, sin saltos de línea)
            </div>
          </div>

          <div>
            <FieldLabel>Descripción detallada</FieldLabel>
            <TextArea
              value={form.descripcionLarga}
              onChange={(value) => updateField("descripcionLarga", value)}
              placeholder="Explica mejor tus productos, horarios, experiencia, tipos de servicio o cualquier dato útil."
              error={errors.descripcionLarga}
              rows={6}
            />
          </div>
        </div>
        </PanelCard>

      <PanelCard
          title="Contacto"
          subtitle="La mayoría de clientes te escribe por WhatsApp; el correo lo usamos para avisos de tu cuenta."
        >
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div
            style={{
              borderRadius: 16,
              border: "2px solid #bbf7d0",
              background: "linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%)",
              padding: "18px 18px 16px",
            }}
          >
            <ContactoUpgradeLabel icon={<WhatsAppGlyph />} required emphasize>
              WhatsApp principal
            </ContactoUpgradeLabel>
            <TextInput
              value={form.whatsapp}
              onChange={(value) =>
                      updateField("whatsapp", sanitizeChileWhatsappInput(value))
                    }
              onBlur={(e) => {
                const t = e.currentTarget.value.trim();
                if (!t) {
                  setErrors((p) => ({
                    ...p,
                    whatsapp: "El WhatsApp es obligatorio.",
                    general: undefined,
                  }));
                  return;
                }
                const v = normalizeAndValidateChileWhatsappStrict(t);
                if (v.ok) {
                  updateField("whatsapp", formatChileWhatsappDisplay(v.normalized));
                } else {
                  setErrors((p) => ({
                    ...p,
                    whatsapp:
                      "WhatsApp no válido. En Chile son 9 dígitos: 912345678, 56912345678 o +56912345678 (sin dígitos de más).",
                    general: undefined,
                  }));
                }
              }}
              placeholder="+56912345678"
              inputMode="tel"
              autoComplete="tel"
              type="tel"
              maxLength={12}
              error={errors.whatsapp}
            />
            <p style={{ margin: "10px 0 0", fontSize: 13, color: "#166534", fontWeight: 600 }}>
              Es el canal principal: revisá que sea el número donde atiendes pedidos.
            </p>
          </div>

          <div>
            <ContactoUpgradeLabel icon={<WhatsAppGlyph />}>
              WhatsApp adicional (opcional)
            </ContactoUpgradeLabel>
            <TextInput
              value={form.whatsappSecundario}
              onChange={(value) =>
                updateField("whatsappSecundario", sanitizeChileWhatsappInput(value))
              }
              onBlur={(e) => {
                const t = e.currentTarget.value.trim();
                if (!t) {
                  setErrors((p) => ({
                    ...p,
                    whatsappSecundario: undefined,
                    general: undefined,
                  }));
                  return;
                }
                const v = normalizeAndValidateChileWhatsappStrict(t);
                if (v.ok) {
                  updateField(
                    "whatsappSecundario",
                    formatChileWhatsappDisplay(v.normalized)
                  );
                } else {
                  setErrors((p) => ({
                    ...p,
                    whatsappSecundario:
                      "Ingresa un WhatsApp válido de Chile (ej: 9XXXXXXXX o +569XXXXXXXX).",
                    general: undefined,
                  }));
                }
              }}
              placeholder="+56912345678"
              inputMode="tel"
              autoComplete="tel"
              type="tel"
              maxLength={12}
              error={errors.whatsappSecundario}
            />
          </div>

          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginTop: 4,
            }}
          >
            Otros datos públicos
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 18,
            }}
          >
            <div>
              <ContactoUpgradeLabel icon={<InstagramGlyph />}>Instagram</ContactoUpgradeLabel>
              <TextInput
                value={form.instagram}
                onChange={(value) =>
                  updateField("instagram", value.replace(/\s/g, ""))
                }
                onBlur={(e) => {
                  const t = e.currentTarget.value.trim();
                  if (!t) {
                    setErrors((p) => ({
                      ...p,
                      instagram: undefined,
                      general: undefined,
                    }));
                    return;
                  }
                  const v = validateOptionalInstagram(t);
                  if (!v.ok) {
                    setErrors((p) => ({
                      ...p,
                      instagram: v.message,
                      general: undefined,
                    }));
                    return;
                  }
                  updateField("instagram", v.normalized);
                }}
                placeholder="@elmecanico_12 o instagram.com/elmecanico_12"
                maxLength={120}
                error={errors.instagram}
              />
            </div>

            <div>
              <ContactoUpgradeLabel icon={<WebGlyph />}>Sitio web</ContactoUpgradeLabel>
              <TextInput
                value={form.web}
                onChange={(value) =>
                      updateField("web", value.replace(/[\s,]/g, ""))
                    }
                onBlur={(e) => {
                  const t = e.currentTarget.value.trim();
                  if (!t) {
                    setErrors((p) => ({ ...p, web: undefined, general: undefined }));
                    return;
                  }
                  const v = validateOptionalWebsite(t);
                  if (!v.ok) {
                    setErrors((p) => ({
                      ...p,
                      web: v.message,
                      general: undefined,
                    }));
                    return;
                  }
                  updateField("web", v.normalized);
                }}
                placeholder="https://elmecanico.cl"
                maxLength={200}
                error={errors.web}
              />
            </div>
          </div>

          <div>
            <FieldLabel required>Correo electrónico</FieldLabel>
            <TextInput
              type="email"
              value={form.email}
              onChange={(value) => updateField("email", value)}
              onBlur={(e) => {
                const t = e.currentTarget.value.trim();
                if (!t) {
                  setErrors((p) => ({
                    ...p,
                    email: "El correo electrónico es obligatorio.",
                    general: undefined,
                  }));
                  return;
                }
                const ev = validateRequiredPublicEmail(t);
                if (!ev.ok) {
                  setErrors((p) => ({
                    ...p,
                    email: ev.message,
                    general: undefined,
                  }));
                  return;
                }
                updateField("email", ev.normalized);
              }}
              placeholder="contacto@tunegocio.cl"
              autoComplete="email"
              inputMode="email"
              maxLength={254}
              error={errors.email}
            />
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "#64748b" }}>
              Para notificaciones del panel; puede ser distinto al WhatsApp.
            </p>
          </div>
        </div>
        </PanelCard>

      <PanelCard
          title="Cómo atiende"
          subtitle="Elige una o más modalidades. Los datos de local solo aparecen si marcas «Local físico»."
        >
        <FieldLabel required>Modalidad de atención</FieldLabel>

        <div
          style={{
            border: errors.modalidadesAtencion
              ? "1px solid #dc2626"
              : "1px solid #d1d5db",
            borderRadius: 14,
            padding: 10,
          }}
        >
          <style dangerouslySetInnerHTML={{ __html: NF_UPGRADE_STYLES }} />
          <div
            className={[
              "nf-upgrade-modalidad-cards",
              errors.modalidadesAtencion ? "nf-upgrade-modalidad-cards--error" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {MEJORAR_FICHA_MODALIDAD_TARJETAS.map(
              ({ modalidad, titulo, subtitulo, Icon }) => {
                const checked = form.modalidadesAtencion.includes(modalidad);
                return (
                  <button
                    key={modalidad}
                    type="button"
                    className={[
                      "nf-upgrade-modalidad-card",
                      checked
                        ? "nf-upgrade-modalidad-card--active"
                        : "nf-upgrade-modalidad-card--inactive",
                    ].join(" ")}
                    aria-pressed={checked}
                    onClick={() => toggleModalidad(modalidad)}
                  >
                    {checked ? (
                      <span className="nf-upgrade-modalidad-card-check" aria-hidden>
                        <Check size={13} strokeWidth={2.75} />
                      </span>
                    ) : null}
                    <span className="nf-upgrade-modalidad-card-icon-wrap">
                      <Icon
                        className="nf-upgrade-modalidad-card-icon"
                        size={20}
                        strokeWidth={1.75}
                        aria-hidden
                      />
                    </span>
                    <span className="nf-upgrade-modalidad-card-text">
                      <span className="nf-upgrade-modalidad-card-title">{titulo}</span>
                      <span className="nf-upgrade-modalidad-card-sub">{subtitulo}</span>
                    </span>
                  </button>
                );
              }
            )}
          </div>
        </div>

        {form.modalidadesAtencion.includes("presencial_terreno") ? (
          <div style={{ marginTop: 12 }}>
            <CheckboxPill
              variant="filter"
              checked
              onClick={() => toggleModalidad("presencial_terreno")}
            >
              A domicilio / Delivery (registro anterior)
            </CheckboxPill>
          </div>
        ) : null}

        {errors.modalidadesAtencion ? (
          <div style={{ marginTop: 6, fontSize: 13, color: "#b91c1c" }}>
            {errors.modalidadesAtencion}
          </div>
        ) : null}

        {form.modalidadesAtencion.includes("local_fisico") ? (
          <div style={{ marginTop: 18 }}>
            <FieldLabel>Locales físicos</FieldLabel>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                marginBottom: localesPanelOpen ? 12 : 0,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: "#6b7280",
                  flex: "1 1 220px",
                }}
              >
                {localesFisicosResumenLine}
              </p>
              {!hasLocalesErr ? (
                <button
                  type="button"
                  onClick={() => setLocalesFisicosEditorOpen((o) => !o)}
                  aria-expanded={localesPanelOpen}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    flexShrink: 0,
                    padding: "8px 14px",
                    borderRadius: 14,
                    border: "1px solid #d1d5db",
                    background: "#fff",
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: "pointer",
                    color: "#111827",
                  }}
                >
                  <ChevronDown
                    size={18}
                    aria-hidden
                    style={{
                      transform: localesPanelOpen ? "rotate(180deg)" : "none",
                      transition: "transform 0.2s ease",
                    }}
                  />
                  {localesPanelOpen ? "Ocultar locales" : "Ver locales"}
                </button>
              ) : (
                <button
                  type="button"
                  className="nf-upgrade-datos-basicos-cta nf-upgrade-datos-basicos-cta--compact"
                  style={{ flexShrink: 0 }}
                  onClick={() => setLocalesFisicosEditorOpen(true)}
                  aria-expanded={localesPanelOpen}
                >
                  <Pencil
                    className="nf-upgrade-datos-basicos-cta-icon"
                    size={16}
                    strokeWidth={2.25}
                    aria-hidden
                  />
                  Revisá los datos del local
                </button>
              )}
            </div>
            {localesPanelOpen ? (
              <>
            <p style={{ margin: "0 0 12px", fontSize: 13, color: "#6b7280" }}>
              Hasta {MAX_LOCALES_FISICOS} locales. El principal define la comuna base.
            </p>
            {form.localesFisicos.length > 0 &&
            !form.localesFisicos.some((l) => l.esPrincipal) ? (
              <div
                role="status"
                style={{
                  marginBottom: 12,
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid #fcd34d",
                  background: "#fffbeb",
                  color: "#92400e",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Eliminaste el local principal. Elige otro con «Marcar como principal».
              </div>
            ) : null}
            {form.localesFisicos.map((loc, idx) => (
              <div
                key={loc.clientId}
                className={[
                  "nf-locales-ficha-card",
                  idx > 0 ? "nf-locales-ficha-card--after" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 10,
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      flexWrap: "wrap",
                      minWidth: 0,
                    }}
                  >
                    <span style={{ fontWeight: 800, fontSize: 14 }}>Local {idx + 1}</span>
                    {loc.esPrincipal ? (
                      <span className="nf-locales-principal-badge">Principal</span>
                    ) : (
                      <button
                        type="button"
                        className="nf-locales-marca-principal-btn"
                        onClick={() =>
                          patchLocalFisico(loc.clientId, { esPrincipal: true })
                        }
                        aria-label="Marcar como principal"
                      >
                        Marcar como principal
                      </button>
                    )}
                  </div>
                  {form.localesFisicos.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeLocalFisico(loc.clientId)}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: "#b91c1c",
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: "pointer",
                        textDecoration: "underline",
                        flexShrink: 0,
                      }}
                    >
                      Quitar
                    </button>
                  ) : null}
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                  <FieldLabel required>Comuna</FieldLabel>
                  <LocalesComunaPicker
                    mode={
                      loc.esPrincipal
                        ? "solo_base"
                        : localesComunaPickerModeFromCobertura(form.coberturaTipo)
                    }
                    catalog={comunasCatalog}
                    catalogLoading={comunasCatalogLoading}
                    allowedRows={
                      loc.esPrincipal
                        ? allowedComunaRowsForPrincipalLocal
                        : allowedComunaRowsForLocales
                    }
                    valueSlug={loc.comunaSlug}
                    onChange={(v) =>
                      patchLocalFisico(loc.clientId, { comunaSlug: v })
                    }
                    emptyFixedHint={
                      loc.esPrincipal
                        ? "El local principal usa tu comuna base. Para cambiarla, ve a «Editar datos básicos»."
                        : form.coberturaTipo === "solo_comuna"
                          ? "La comuna base se define en «Editar datos básicos»; este local queda en esa comuna."
                          : "Cada local adicional puede estar en la comuna base o en las comunas de cobertura que agregaste arriba."
                    }
                    soloBaseSubcopy={
                      loc.esPrincipal && form.coberturaTipo !== "solo_comuna"
                        ? "El local principal va siempre en tu comuna base. Para cambiarla, ve a «Editar datos básicos»."
                        : undefined
                    }
                  />
                  <FieldLabel required>Dirección</FieldLabel>
                  <TextInput
                    value={loc.direccion}
                    onChange={(v) => patchLocalFisico(loc.clientId, { direccion: v })}
                    placeholder="Calle, número…"
                  />
                  <FieldLabel>Referencia (opcional)</FieldLabel>
                  <TextInput
                    value={loc.referencia}
                    onChange={(v) => patchLocalFisico(loc.clientId, { referencia: v })}
                    placeholder="Ej. local 2, entre calles"
                  />
                </div>
              </div>
            ))}
            {form.localesFisicos.length < MAX_LOCALES_FISICOS ? (
              <button
                type="button"
                className="nf-locales-agregar-local-btn"
                onClick={addLocalFisico}
              >
                + Agregar local
              </button>
            ) : null}
            {errors.localesFisicos ? (
              <div className="nf-locales-error-msg" role="alert">
                <span className="nf-locales-error-msg-icon" aria-hidden>
                  ⚠️
                </span>
                <span className="nf-locales-error-msg-text">
                  {errors.localesFisicos}
                </span>
              </div>
            ) : null}
              </>
            ) : null}
          </div>
        ) : null}
        </PanelCard>

      {errors.general ? (
        <div
          style={{
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#b91c1c",
            borderRadius: 16,
            padding: 14,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {errors.general}
        </div>
      ) : null}

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 12,
        }}
      >
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            minHeight: 50,
            padding: "0 18px",
            borderRadius: 14,
            border: "none",
            background: isSubmitting ? "#94a3b8" : "#111827",
            color: "#fff",
            fontWeight: 800,
            fontSize: 14,
            cursor: isSubmitting ? "not-allowed" : "pointer",
          }}
        >
          {isSubmitting ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
        </>
      )}
    </form>
  );
}