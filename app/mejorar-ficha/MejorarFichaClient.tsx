"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useRouter } from "next/navigation";
import {
  buildInstagramUrl,
  buildWebsiteUrl,
  buildWhatsappUrl,
} from "@/lib/formatPublicLinks";
import { isPersistibleFotoUrl } from "@/lib/isPersistibleFotoUrl";
import { publicarBorradorByIdPath } from "@/lib/publicarApi";
import { normalizeAndValidateChileWhatsappStrict } from "@/utils/phone";

const MAX_GALERIA = 6;
const AUTOSAVE_DEBOUNCE_MS = 800;
/** IDs de `window.setTimeout` en el cliente (evita choque Node `Timeout` vs `number`). */
type BrowserTimeoutId = number;
/** Alineado con validación de publicar (descripción corta). */
const MIN_DESCRIPCION_BASE = 40;

export type MejorarFichaInitial = {
  foto_principal_url: string | null;
  galeria_urls: string[] | null;
  email?: string | null;
  instagram: string | null;
  sitio_web: string | null;
  descripcion_libre: string | null;
  direccion: string | null;
  /** Referencia opcional (entre calles, piso, etc.). */
  direccion_referencia: string | null;
  nombre_responsable: string | null;
  mostrar_responsable_publico: boolean;
  nombre_emprendimiento: string;
  frase_negocio: string;
  comuna_nombre: string | null;
  whatsapp: string | null;
  descripcion_corta: string | null;
  /** Slug público si la postulación ya tiene emprendedor vinculado. */
  ficha_publica_slug: string | null;
  /** Modalidades de atención (ej. "local"); si incluye local, la dirección es obligatoria. */
  modalidades_atencion: string[] | null;
};

type Props = {
  postulacionId: string;
  draftFound: boolean;
  initial: MejorarFichaInitial;
};

function s(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

/** Prioridad: error → message → details (string, array o objeto). */
function backendPatchErrorText(data: Record<string, unknown>): string {
  const err = data?.error;
  if (typeof err === "string" && s(err)) return s(err);
  const msg = data?.message;
  if (typeof msg === "string" && s(msg)) return s(msg);
  const det = data?.details;
  if (typeof det === "string" && s(det)) return s(det);
  if (Array.isArray(det)) {
    return det
      .map((x) => String(x))
      .join(" ")
      .trim();
  }
  if (det != null && typeof det === "object") {
    try {
      return JSON.stringify(det);
    } catch {
      return String(det);
    }
  }
  const hint = data?.hint;
  if (typeof hint === "string" && s(hint)) return s(hint);
  return "";
}

/** Borde/ fondo suave cuando el campo está completo (sin checklist). */
function withFieldCompleteRow(base: CSSProperties, complete: boolean): CSSProperties {
  if (!complete) return base;
  return {
    ...base,
    borderColor: "#86efac",
    background: "#f8fdf9",
    boxShadow: "0 0 0 1px rgba(22, 163, 74, 0.16)",
  };
}

function IconInstagram({ color = "#E1306C" }: { color?: string }) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      aria-hidden
      style={{ flexShrink: 0, display: "block" }}
    >
      <path
        fill={color}
        d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
      />
    </svg>
  );
}

function IconWeb({
  color = "#64748b",
}: {
  color?: string;
}) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      style={{ flexShrink: 0, display: "block" }}
    >
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
      <path
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        d="M2 12h20M12 2a15.3 15.3 0 0 1 0 20 15.3 15.3 0 0 1 0-20"
      />
    </svg>
  );
}

/** Icono de texto / párrafos (misma familia visual que Instagram y web). */
function IconDescripcion({ color = "#64748b" }: { color?: string }) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      style={{ flexShrink: 0, display: "block" }}
    >
      <path
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 6h12M8 12h12M8 18h8M4 6h.01M4 12h.01M4 18h.01"
      />
    </svg>
  );
}

/** URL pública en distintas formas de respuesta (sin tocar el route). */
function extractPublicImageUrl(data: Record<string, unknown>): string {
  for (const key of ["url", "publicUrl", "public_url", "publicURL", "href"] as const) {
    const t = s(data[key]);
    if (t) return t;
  }
  return "";
}

/** Evita que el navegador muestre una imagen cacheada vieja si la URL se repite. */
function fotoPrincipalImgSrc(rawUrl: string, cacheNonce: number): string {
  const u = s(rawUrl);
  if (!u) return "";
  if (u.startsWith("blob:") || u.startsWith("data:")) return u;
  const bust = cacheNonce < 1 ? 1 : cacheNonce;
  const sep = u.includes("?") ? "&" : "?";
  return `${u}${sep}cb=${bust}`;
}

/** Vista previa: blob temporal o URL persistible; nunca placehold.co / placeholder en <img>. */
function fotoPrincipalSeMuestraEnUI(raw: string): boolean {
  const t = s(raw);
  if (!t) return false;
  if (t.toLowerCase().startsWith("blob:")) return true;
  return isPersistibleFotoUrl(t);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () =>
      reject(reader.error || new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

async function uploadFileToLocalApi(file: File, folder: string): Promise<string> {
  const base64 = await fileToDataUrl(file);
  const res = await fetch("/api/upload-base64", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, base64, folder }),
  });
  const data = (await res.json()) as Record<string, unknown>;
  console.log("upload response:", data);
  if (!res.ok || !data?.ok) {
    throw new Error(s(data.error) || "No se pudo subir el archivo");
  }
  const publicUrl = extractPublicImageUrl(data);
  console.log("public image chosen:", publicUrl);
  if (!publicUrl) {
    throw new Error(
      s(data.error) || "El servidor no devolvió URL pública de la imagen"
    );
  }
  if (!isPersistibleFotoUrl(publicUrl)) {
    throw new Error(
      "El servidor devolvió una URL de prueba o inválida; configurá Storage (Supabase) para obtener una URL pública real."
    );
  }
  return publicUrl;
}

function buildPatchPayload(
  foto_principal_url: string,
  galeriaUrls: string[],
  nombreBase: string,
  emailContacto: string,
  whatsappBase: string,
  descripcionBase: string,
  instagram: string,
  website: string,
  descripcionLarga: string,
  direccion: string,
  direccionReferencia: string,
  nombreResponsable: string,
  mostrarResponsable: boolean,
  modalidadesAtencion: string[]
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    mostrar_responsable_publico: mostrarResponsable,
    galeria_urls: [...galeriaUrls],
  };

  const nombre = s(nombreBase);
  if (nombre) payload.nombre_emprendimiento = nombre;

  const email = s(emailContacto).toLowerCase();
  if (email) payload.email = email;

  const waRaw = s(whatsappBase);
  if (waRaw) {
    const waCheck = normalizeAndValidateChileWhatsappStrict(waRaw);
    if (waCheck.ok) payload.whatsapp_principal = waCheck.normalized;
  }

  const descBase = s(descripcionBase);
  if (descBase) payload.frase_negocio = descBase;

  const foto = s(foto_principal_url);
  if (isPersistibleFotoUrl(foto)) payload.foto_principal_url = foto;

  const ig = s(instagram);
  if (ig) payload.instagram = ig;

  const web = s(website);
  if (web) payload.sitio_web = web;

  const desc = s(descripcionLarga);
  if (desc) payload.descripcion_libre = desc;

  const dir = s(direccion);
  if (dir) payload.direccion = dir;

  const refDir = s(direccionReferencia);
  if (refDir) payload.direccion_referencia = refDir;

  const resp = s(nombreResponsable);
  if (resp) payload.nombre_responsable = resp;

  if (modalidadesAtencion.length > 0) {
    payload.modalidades_atencion = modalidadesAtencion;
  }

  return payload;
}

export default function MejorarFichaClient({
  postulacionId,
  draftFound,
  initial,
}: Props) {
  const router = useRouter();
  const fotoHeroSectionRef = useRef<HTMLDivElement | null>(null);
  const galeriaSectionRef = useRef<HTMLDivElement | null>(null);
  const initialFotoFromServer = s(initial.foto_principal_url);
  const [foto_principal_url, setFoto_principal_url] = useState(
    isPersistibleFotoUrl(initialFotoFromServer) ? initialFotoFromServer : ""
  );
  const [galeriaUrls, setGaleriaUrls] = useState<string[]>(
    Array.isArray(initial.galeria_urls)
      ? initial.galeria_urls.map((u) => s(u)).filter(Boolean)
      : []
  );
  const [instagram, setInstagram] = useState(s(initial.instagram));
  const [website, setWebsite] = useState(s(initial.sitio_web));
  const [nombreBase, setNombreBase] = useState(s(initial.nombre_emprendimiento));
  const [emailContacto, setEmailContacto] = useState(() =>
    s(initial.email).toLowerCase()
  );
  const [whatsappBase, setWhatsappBase] = useState(s(initial.whatsapp));
  const [descripcionBase, setDescripcionBase] = useState(
    s(initial.descripcion_corta) || s(initial.frase_negocio)
  );
  const descripcionBaseInicial = s(initial.descripcion_corta) || s(initial.frase_negocio);
  const descripcionLibreInicial = s(initial.descripcion_libre);
  const [descripcionLarga, setDescripcionLarga] = useState(
    descripcionLibreInicial === descripcionBaseInicial ? "" : descripcionLibreInicial
  );
  const [direccion, setDireccion] = useState(s(initial.direccion));
  const [direccionReferencia, setDireccionReferencia] = useState(
    s(initial.direccion_referencia)
  );
  const [nombreResponsable, setNombreResponsable] = useState(
    s(initial.nombre_responsable)
  );
  const [mostrarResponsable, setMostrarResponsable] = useState(
    Boolean(initial.mostrar_responsable_publico)
  );
  const [otrosLugares, setOtrosLugares] = useState("");

  const [modalidadesAtencion, setModalidadesAtencion] = useState<string[]>(
    Array.isArray(initial.modalidades_atencion)
      ? initial.modalidades_atencion
          .map((x) => s(x).toLowerCase())
          .filter(Boolean)
      : []
  );

  const [isSaving, setIsSaving] = useState(false);
  const [hasEverSaved, setHasEverSaved] = useState(false);
  const [errorToast, setErrorToast] = useState<{
    message: string;
    visible: boolean;
    exit: boolean;
  }>({ message: "", visible: false, exit: false });
  const errorToastTimersRef = useRef<BrowserTimeoutId[]>([]);
  const [successToast, setSuccessToast] = useState<{
    message: string;
    visible: boolean;
    exit: boolean;
  }>({ message: "", visible: false, exit: false });
  const successToastTimersRef = useRef<BrowserTimeoutId[]>([]);
  const [guardarUiPhase, setGuardarUiPhase] = useState<
    "idle" | "saving" | "success"
  >("idle");
  const saveGen = useRef(0);
  const skipAutosaveMount = useRef(true);
  const fotoPrincipalInputRef = useRef<HTMLInputElement>(null);
  const galeriaFileInputRef = useRef<HTMLInputElement>(null);
  const instagramInputRef = useRef<HTMLInputElement>(null);
  const websiteInputRef = useRef<HTMLInputElement>(null);
  const descripcionLargaRef = useRef<HTMLTextAreaElement>(null);
  const direccionInputRef = useRef<HTMLInputElement>(null);
  /** Última URL persistible (no blob); para revertir si falla el upload. */
  const lastGoodFotoUrl = useRef(
    isPersistibleFotoUrl(initialFotoFromServer) ? initialFotoFromServer : ""
  );
  const hadInitialFoto = isPersistibleFotoUrl(initialFotoFromServer);
  const [previewPhotoNonce, setPreviewPhotoNonce] = useState(hadInitialFoto ? 1 : 0);
  const [fotoToast, setFotoToast] = useState<{ visible: boolean; exit: boolean }>({
    visible: false,
    exit: false,
  });
  const fotoToastTimers = useRef<BrowserTimeoutId[]>([]);

  const atiendeLocal = useMemo(() => {
    return modalidadesAtencion.some((x) => {
      const value = s(x).toLowerCase();
      return value === "local" || value === "local_fisico";
    });
  }, [modalidadesAtencion]);

  /** Al pasar de local físico activo a inactivo, limpiar dirección (comportamiento explícito). */
  const prevAtiendeLocalRef = useRef(atiendeLocal);
  useEffect(() => {
    const prev = prevAtiendeLocalRef.current;
    if (prev === true && atiendeLocal === false) {
      setDireccion("");
      setDireccionReferencia("");
    }
    prevAtiendeLocalRef.current = atiendeLocal;
  }, [atiendeLocal]);

  const nombreOk = !!s(nombreBase);
  const emailOk = !!s(emailContacto);
  const whatsappCheck = useMemo(() => {
    if (!s(whatsappBase)) return { ok: true, normalized: "" };
    return normalizeAndValidateChileWhatsappStrict(whatsappBase);
  }, [whatsappBase]);
  const waOk = whatsappCheck.ok && !!s(whatsappBase);
  const descBaseOk =
    Math.max(s(descripcionBase).length, s(initial.frase_negocio).length) >=
    MIN_DESCRIPCION_BASE;
  const igOk = !!s(instagram);
  const webOk = !!s(website);
  const descLargaOk = s(descripcionLarga).length > 0;

  function dismissErrorToast() {
    errorToastTimersRef.current.forEach((t) => clearTimeout(t));
    errorToastTimersRef.current = [];
    setErrorToast({ message: "", visible: false, exit: false });
  }

  function dismissSuccessToast() {
    successToastTimersRef.current.forEach((t) => clearTimeout(t));
    successToastTimersRef.current = [];
    setSuccessToast({ message: "", visible: false, exit: false });
  }

  function showSuccessToast(raw: string) {
    const message = s(raw) || "Listo.";
    dismissErrorToast();
    successToastTimersRef.current.forEach((t) => clearTimeout(t));
    successToastTimersRef.current = [];
    setSuccessToast({ message, visible: true, exit: false });
    const tFade = window.setTimeout(() => {
      setSuccessToast((prev) => ({ ...prev, exit: true }));
    }, 3600);
    const tRemove = window.setTimeout(() => {
      setSuccessToast({ message: "", visible: false, exit: false });
      successToastTimersRef.current = [];
    }, 4200);
    successToastTimersRef.current = [tFade, tRemove];
  }

  function showErrorToast(raw: string) {
    const message = s(raw) || "Algo salió mal. Intenta de nuevo.";
    dismissSuccessToast();
    errorToastTimersRef.current.forEach((t) => clearTimeout(t));
    errorToastTimersRef.current = [];
    setErrorToast({ message, visible: true, exit: false });
    const tFade = window.setTimeout(() => {
      setErrorToast((prev) => ({ ...prev, exit: true }));
    }, 3600);
    const tRemove = window.setTimeout(() => {
      setErrorToast({ message: "", visible: false, exit: false });
      errorToastTimersRef.current = [];
    }, 4200);
    errorToastTimersRef.current = [tFade, tRemove];
  }

  async function saveDraftNow(
    myGen: number,
    mode: "autosave" | "manual" = "autosave"
  ): Promise<boolean> {
    setIsSaving(true);
    dismissSuccessToast();
    dismissErrorToast();
    let patchPayload: Record<string, unknown> = {};
    try {
      if (s(whatsappBase) && !whatsappCheck.ok) {
        setIsSaving(false);
        showErrorToast(
          mode === "manual"
            ? "No se pudieron guardar los cambios"
            : "Ingresa un WhatsApp válido de Chile (ej: 9XXXXXXXX o +569XXXXXXXX)"
        );
        return false;
      }

      patchPayload = buildPatchPayload(
        foto_principal_url,
        galeriaUrls,
        nombreBase,
        emailContacto,
        whatsappBase,
        descripcionBase,
        instagram,
        website,
        descripcionLarga,
        direccion,
        direccionReferencia,
        nombreResponsable,
        mostrarResponsable,
        modalidadesAtencion
      );

      console.log(
        "[mejorar-ficha] PATCH payload enviado:",
        JSON.parse(JSON.stringify(patchPayload))
      );

      const res = await fetch(publicarBorradorByIdPath(postulacionId), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchPayload),
      });

      const responseText = await res.text();
      let data: Record<string, unknown> = {};
      const trimmed = responseText.trim();
      if (!trimmed) {
        data = {
          error: `Respuesta vacía del servidor (HTTP ${res.status})`,
          message: `Respuesta vacía del servidor (HTTP ${res.status})`,
        };
      } else {
        try {
          const parsed: unknown = JSON.parse(trimmed);
          if (
            parsed != null &&
            typeof parsed === "object" &&
            !Array.isArray(parsed)
          ) {
            data = parsed as Record<string, unknown>;
          } else {
            data = {
              error: `Respuesta JSON inválida (HTTP ${res.status})`,
              message: trimmed.slice(0, 400),
            };
          }
        } catch {
          data = {
            error: `Respuesta no JSON (HTTP ${res.status})`,
            message: trimmed.slice(0, 400),
          };
        }
      }

      if (myGen !== saveGen.current) {
        setIsSaving(false);
        return false;
      }

      if (!res.ok || !data?.ok) {
        setIsSaving(false);
        const detail = backendPatchErrorText(data);
        const logLine = [
          `[mejorar-ficha] PATCH falló HTTP ${res.status}`,
          `cuerpo (máx 600 chars): ${trimmed.slice(0, 600)}`,
          `payload: ${JSON.stringify(patchPayload)}`,
          `parseado: ${JSON.stringify(data)}`,
        ].join("\n");
        console.error(logLine);
        const fallback =
          mode === "manual"
            ? "No se pudieron guardar los cambios"
            : "No se pudo actualizar la postulación.";
        showErrorToast(detail || fallback);
        return false;
      }

      setIsSaving(false);
      setHasEverSaved(true);
      return true;
    } catch (e) {
      if (myGen !== saveGen.current) {
        setIsSaving(false);
        return false;
      }
      console.error("[mejorar-ficha] PATCH excepción (red/parse u otro)", {
        err: e,
        payloadEnviado: patchPayload,
      });
      setIsSaving(false);
      const fallback =
        mode === "manual"
          ? "No se pudieron guardar los cambios"
          : "Error desconocido al guardar.";
      showErrorToast(e instanceof Error ? e.message || fallback : fallback);
      return false;
    }
  }

  async function handleGuardarMejorasClick() {
    if (guardarUiPhase !== "idle") return;
    setGuardarUiPhase("saving");
    const myGen = ++saveGen.current;
    const ok = await saveDraftNow(myGen, "manual");
    if (!ok) {
      setGuardarUiPhase("idle");
      return;
    }
    showSuccessToast("Tus cambios fueron guardados");
    setGuardarUiPhase("success");
    await new Promise((r) => window.setTimeout(r, 1000));
    setGuardarUiPhase("idle");
    router.push("/");
  }

  useEffect(() => {
    if (!postulacionId || !draftFound) return;
    if (skipAutosaveMount.current) {
      skipAutosaveMount.current = false;
      return;
    }

    const timer = setTimeout(() => {
      const myGen = ++saveGen.current;
      void saveDraftNow(myGen, "autosave");
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [
    postulacionId,
    draftFound,
    foto_principal_url,
    galeriaUrls,
    nombreBase,
    emailContacto,
    whatsappBase,
    descripcionBase,
    instagram,
    website,
    descripcionLarga,
    direccion,
    direccionReferencia,
    nombreResponsable,
    mostrarResponsable,
    modalidadesAtencion,
  ]);

  useEffect(() => {
    return () => {
      fotoToastTimers.current.forEach((t) => clearTimeout(t));
      fotoToastTimers.current = [];
      errorToastTimersRef.current.forEach((t) => clearTimeout(t));
      errorToastTimersRef.current = [];
      successToastTimersRef.current.forEach((t) => clearTimeout(t));
      successToastTimersRef.current = [];
    };
  }, []);

  const initialEmailNorm = s(initial.email).toLowerCase();
  useEffect(() => {
    setEmailContacto(initialEmailNorm);
  }, [initialEmailNorm]);

  function queueFotoToastTimers() {
    fotoToastTimers.current.forEach((t) => clearTimeout(t));
    fotoToastTimers.current = [];
    const t1 = window.setTimeout(() => {
      setFotoToast({ visible: true, exit: true });
    }, 2400);
    const t2 = window.setTimeout(() => {
      setFotoToast({ visible: false, exit: false });
    }, 3200);
    fotoToastTimers.current = [t1, t2];
  }

  /** Update directo en BD vía API (equivalente a `.update({ foto_principal_url })` en Supabase). Sin debounce. */
  async function persistFotoPrincipalImmediate(publicUrl: string): Promise<boolean> {
    const id = s(postulacionId);
    if (!id || !draftFound) {
      console.warn(
        "[mejorar-ficha] persistFotoPrincipalImmediate omitido (sin id o borrador):",
        { id, draftFound }
      );
      return false;
    }
    const url = s(publicUrl);
    if (!isPersistibleFotoUrl(url)) {
      console.warn(
        "[mejorar-ficha] persistFotoPrincipalImmediate omitido (URL no persistible):",
        url
      );
      showErrorToast(
        "La URL de la imagen no se puede guardar en el borrador (valor inválido)."
      );
      return false;
    }
    console.log("Saving foto_principal_url:", url);
    setIsSaving(true);
    try {
      const fotoPayload = { foto_principal_url: url };
      console.log("[mejorar-ficha] PATCH foto_principal payload:", fotoPayload);
      const res = await fetch(publicarBorradorByIdPath(id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fotoPayload),
      });
      let data: Record<string, unknown> = {};
      try {
        data = (await res.json()) as Record<string, unknown>;
      } catch {
        data = { error: `HTTP ${res.status} (sin JSON)` };
      }
      if (!res.ok || !data?.ok) {
        const detail =
          s(data.error) ||
          s(data.message) ||
          (Array.isArray(data.details)
            ? (data.details as string[]).join(" ")
            : "");
        console.error("[mejorar-ficha] PATCH foto falló", {
          status: res.status,
          respuesta: data,
          payload: fotoPayload,
        });
        showErrorToast(detail || "No se pudo guardar la foto en tu postulación.");
        return false;
      }
      setHasEverSaved(true);
      return true;
    } catch (err) {
      showErrorToast(
        err instanceof Error ? err.message : "Error al guardar la foto."
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function onFotoPrincipalChange(files: FileList | null) {
    const input = fotoPrincipalInputRef.current;
    const file = files?.[0];
    if (!file) return;
    dismissErrorToast();
    const prevHadCommittedFoto = !!s(lastGoodFotoUrl.current);
    let blobUrl: string | null = null;
    try {
      blobUrl = URL.createObjectURL(file);
      setFoto_principal_url(blobUrl);
      setPreviewPhotoNonce((n) => n + 1);

      const raw = await uploadFileToLocalApi(file, "postulaciones/foto-principal");
      const url = s(raw);
      if (!url) {
        if (blobUrl) URL.revokeObjectURL(blobUrl);
        setFoto_principal_url(lastGoodFotoUrl.current);
        showErrorToast("No se pudo obtener la URL pública de la imagen.");
        return;
      }
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        blobUrl = null;
      }
      console.log("public image chosen before setFoto_principal_url:", url);
      // Orden: URL obtenida → estado → persistir en BD (sin depender del autosave).
      setFoto_principal_url(url);
      lastGoodFotoUrl.current = url;
      setPreviewPhotoNonce((n) => n + 1);
      if (process.env.NODE_ENV === "development") {
        console.log(
          "[mejorar-ficha] form.foto_principal_url tras upload OK:",
          url
        );
      }
      const persisted = await persistFotoPrincipalImmediate(url);
      if (!persisted && process.env.NODE_ENV === "development") {
        console.error(
          "[mejorar-ficha] persistFotoPrincipalImmediate falló; URL en Storage pero quizá no en fila:",
          url
        );
      }
      if (!prevHadCommittedFoto) {
        setFotoToast({ visible: true, exit: false });
        queueFotoToastTimers();
      }
    } catch (e) {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      setFoto_principal_url(lastGoodFotoUrl.current);
      showErrorToast(e instanceof Error ? e.message : "Error al subir foto");
    } finally {
      if (input) input.value = "";
    }
  }

  async function onGaleriaChange(files: FileList | null) {
    if (!files?.length) return;
    const next = [...galeriaUrls];
    for (const file of Array.from(files)) {
      if (next.length >= MAX_GALERIA) break;
      try {
        // eslint-disable-next-line no-await-in-loop
        const url = await uploadFileToLocalApi(file, "postulaciones/galeria");
        next.push(url);
      } catch (e) {
        showErrorToast(e instanceof Error ? e.message : "Error al subir galería");
        break;
      }
    }
    setGaleriaUrls(next);
  }

  function removeGaleriaAt(index: number) {
    setGaleriaUrls((prev) => prev.filter((_, i) => i !== index));
  }

  if (!postulacionId) {
    return (
      <main style={pageStyle}>
        <section style={narrowStyle}>
          <div style={cardStyle}>
            <h1 style={h1Style}>Mejorar ficha</h1>
            <p style={pStyle}>
              Abre esta página desde el enlace que recibiste al publicar (debe incluir{" "}
              <code style={codeStyle}>?id=...</code>).
            </p>
            <button type="button" onClick={() => router.push("/")} style={btnSecondary}>
              Volver al inicio
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (!draftFound) {
    return (
      <main style={pageStyle}>
        <section style={narrowStyle}>
          <div style={cardStyle}>
            <h1 style={h1Style}>No encontramos esta postulación</h1>
            <p style={pStyle}>
              Revisa que el enlace sea correcto o que la postulación siga en revisión.
            </p>
            <button type="button" onClick={() => router.push("/")} style={btnSecondary}>
              Volver al inicio
            </button>
          </div>
        </section>
      </main>
    );
  }

  const previewDescPrincipal = s(descripcionBase) || s(initial.frase_negocio) || "";

  /** `<img src>` usa bust de caché en URLs http (no blob/data). */
  const fotoPrincipalRaw = s(foto_principal_url);
  const fotoPrincipalDisplaySrc = fotoPrincipalSeMuestraEnUI(fotoPrincipalRaw)
    ? fotoPrincipalImgSrc(foto_principal_url, previewPhotoNonce)
    : "";
  const hasFotoPrincipal = fotoPrincipalDisplaySrc.length > 0;
  const photoAnimActive = previewPhotoNonce > (hadInitialFoto ? 1 : 0);

  const fichaSlug = s(initial.ficha_publica_slug);
  const verFichaHref =
    fichaSlug !== "" ? `/emprendedor/${encodeURIComponent(fichaSlug)}` : null;

  function scrollToSubirFotoPrincipal() {
    fotoHeroSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    window.setTimeout(() => fotoPrincipalInputRef.current?.click(), 280);
  }

  function toggleModalidad(tipo: string) {
    setModalidadesAtencion((prev) => {
      const normalized = s(tipo).toLowerCase();
      if (!normalized) return prev;

      if (normalized === "local" || normalized === "local_fisico") {
        const hasLocal = prev.some((x) => {
          const value = s(x).toLowerCase();
          return value === "local" || value === "local_fisico";
        });
        if (hasLocal) {
          return prev.filter((x) => {
            const value = s(x).toLowerCase();
            return value !== "local" && value !== "local_fisico";
          });
        }
        return [
          ...prev.filter((x) => {
            const value = s(x).toLowerCase();
            return value !== "local" && value !== "local_fisico";
          }),
          "local_fisico",
        ];
      }

      if (prev.includes(normalized)) {
        return prev.filter((x) => x !== normalized);
      }

      return [...prev, normalized];
    });
  }

  const previewWaUrl = buildWhatsappUrl(
    whatsappCheck.ok ? whatsappCheck.normalized || s(whatsappBase) : ""
  );
  const previewIgUrl = buildInstagramUrl(s(instagram));
  const previewWebUrl = buildWebsiteUrl(s(website));
  const hasPreviewCtas = !!(previewWaUrl || previewIgUrl || previewWebUrl);

  return (
    <main style={pageStyle}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
@keyframes mejorar-ficha-photo-in {
  from { opacity: 0; transform: scale(0.94); }
  to { opacity: 1; transform: scale(1); }
}
.mejorar-ficha-preview-photo-wrap {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.mejorar-ficha-preview-photo-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.mejorar-ficha-preview-photo-wrap--anim img {
  animation: mejorar-ficha-photo-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
.mejorar-ficha-preview-img-hero {
  aspect-ratio: 4 / 2.75;
  min-height: 160px;
  box-shadow: inset 0 -1px 0 rgba(15,23,42,0.06);
}
.mejorar-ficha-preview-img-hero .mejorar-ficha-preview-photo-wrap img {
  transform-origin: center center;
  min-height: 100%;
}
.mejorar-ficha-preview-photo-trigger {
  position: relative;
  width: 100%;
  border: 0;
  padding: 0;
  text-align: inherit;
  background: transparent;
  cursor: pointer;
}
.mejorar-ficha-preview-photo-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.52);
  color: #fff;
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 0.01em;
  opacity: 0;
  transition: opacity 0.18s ease;
}
.mejorar-ficha-preview-photo-trigger:hover .mejorar-ficha-preview-photo-overlay,
.mejorar-ficha-preview-photo-trigger:focus-visible .mejorar-ficha-preview-photo-overlay {
  opacity: 1;
}
.mejorar-ficha-preview-photo-empty {
  gap: 6px;
}
.mejorar-ficha-foto-toast {
  margin-top: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  color: #334155;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.35;
  opacity: 1;
  transform: translateY(0);
  transition: opacity 0.45s ease, transform 0.45s ease;
}
.mejorar-ficha-foto-toast.mejorar-ficha-foto-toast--exit {
  opacity: 0;
  transform: translateY(-6px);
}
.mejorar-ficha-error-toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  width: min(440px, calc(100vw - 32px));
  z-index: 10000;
  padding: 12px 16px;
  border-radius: 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.45;
  box-shadow: 0 12px 40px rgba(15, 23, 42, 0.16);
  text-align: center;
  opacity: 1;
  transition: opacity 0.38s ease, transform 0.38s ease;
  pointer-events: none;
}
.mejorar-ficha-error-toast.mejorar-ficha-error-toast--exit {
  opacity: 0;
  transform: translateX(-50%) translateY(12px);
}
.mejorar-ficha-success-toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  width: min(440px, calc(100vw - 32px));
  z-index: 10001;
  padding: 12px 16px;
  border-radius: 12px;
  background: #ecfdf5;
  border: 1px solid #86efac;
  color: #166534;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.45;
  box-shadow: 0 12px 40px rgba(15, 23, 42, 0.12);
  text-align: center;
  opacity: 1;
  transition: opacity 0.38s ease, transform 0.38s ease;
  pointer-events: none;
}
.mejorar-ficha-success-toast.mejorar-ficha-success-toast--exit {
  opacity: 0;
  transform: translateX(-50%) translateY(12px);
}
.mejorar-ficha-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 300px);
  gap: 18px;
  align-items: start;
}
@media (max-width: 900px) {
  .mejorar-ficha-layout {
    grid-template-columns: 1fr;
  }
  .mejorar-ficha-sticky {
    position: static !important;
    top: auto !important;
  }
}
`,
        }}
      />
      <section style={narrowStyle}>
        <header style={topBarStyle}>
          <div style={topBarLeftStyle}>
            <h1 style={h1CompactStyle}>Mejora tu ficha</h1>
          </div>
        </header>

        <div className="mejorar-ficha-layout">
          <div style={guidedColumnStyle}>
            <input
              ref={fotoPrincipalInputRef}
              type="file"
              accept="image/*"
              tabIndex={-1}
              onChange={(e) => void onFotoPrincipalChange(e.target.files)}
              style={hiddenFileInputStyle}
            />
            <input
              ref={galeriaFileInputRef}
              type="file"
              accept="image/*"
              multiple
              tabIndex={-1}
              onChange={(e) => void onGaleriaChange(e.target.files)}
              style={hiddenFileInputStyle}
            />
            <section style={guidedNavStyle}>
              <div style={guidedExpandBodyStyle}>
                <div ref={fotoHeroSectionRef} style={galeriaHeroWrapStyle}>
                  <div style={mejorarBlockTitleStyle}>Muestra tu trabajo</div>
                  <div style={mejorarBlockLeadStyle}>
                    Una foto hace que tu ficha se vea más confiable
                  </div>
                  <button
                    type="button"
                    onClick={() => fotoPrincipalInputRef.current?.click()}
                    style={btnSubirFotoProtagonistaStyle}
                  >
                    Sube tu logo o foto principal
                  </button>

                  <div ref={galeriaSectionRef} style={galeriaSubBlockStyle}>
                    <div style={galeriaSubTitleStyle}>Completa tu galería de fotos</div>
                    <p style={galeriaHintStyle}>
                      Puedes agregar hasta 6 imágenes para mostrar tu trabajo.
                    </p>
                    <div style={galeriaMicrocopyWrapStyle}>
                      <p style={galeriaMicrocopyPrimaryStyle}>
                        Subir más fotos aumenta la confianza y los contactos
                      </p>
                      <p style={galeriaMicrocopySecondaryStyle}>
                        <span style={galeriaMicrocopySecondaryLabelStyle}>Más adelante:</span>{" "}
                        Con más fotos destacas frente a otros negocios
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => galeriaFileInputRef.current?.click()}
                      style={btnGaleriaSecundariaStyle}
                    >
                      {galeriaUrls.length ? "Agregar más fotos" : "Agregar fotos a la galería"}
                    </button>
                    {galeriaUrls.length ? (
                      <div style={galeriaGridStyle}>
                        {galeriaUrls.map((url, index) => (
                          <div key={`${url}-${index}`} style={galeriaItemStyle}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt="" style={galeriaImgStyle} />
                            <button
                              type="button"
                              onClick={() => removeGaleriaAt(index)}
                              style={linkBtnStyle}
                            >
                              Quitar
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                {fotoToast.visible ? (
                  <div
                    className={
                      fotoToast.exit
                        ? "mejorar-ficha-foto-toast mejorar-ficha-foto-toast--exit"
                        : "mejorar-ficha-foto-toast"
                    }
                    role="status"
                  >
                    Foto guardada
                  </div>
                ) : null}

                <div style={mejorarBlockStyle}>
                  <div style={mejorarBlockTitleStyle}>
                    Haz que tu ficha gane más confianza
                  </div>
                  <div style={mejorarBlockLeadStyle}>
                    Instagram, sitio web y una descripción opcional hacen que tu perfil se sienta
                    claro y cercano.
                  </div>

                  <div style={fieldStyleSecondary}>
                    <label style={labelSecondaryStyle}>Instagram del negocio</label>
                    <div style={withFieldCompleteRow(inputIconRowStyle, igOk)}>
                      <IconInstagram />
                      <input
                        ref={instagramInputRef}
                        value={instagram}
                        onChange={(e) => setInstagram(e.target.value)}
                        placeholder="@tunegocio o link de Instagram"
                        style={inputIconFieldStyle}
                      />
                      {igOk ? <span style={fieldMicroCheckStyle}>✓</span> : null}
                    </div>
                  </div>

                  <div style={fieldStyleSecondary}>
                    <label style={labelSecondaryStyle}>Sitio web</label>
                    <div style={withFieldCompleteRow(inputIconRowStyle, webOk)}>
                      <IconWeb />
                      <input
                        ref={websiteInputRef}
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="https://..."
                        style={inputIconFieldStyle}
                      />
                      {webOk ? <span style={fieldMicroCheckStyle}>✓</span> : null}
                    </div>
                  </div>

                  <div style={fieldStyleSecondary}>
                    <label style={labelSecondaryStyle}>
                      Descripción más completa (opcional)
                    </label>
                    <div
                      style={withFieldCompleteRow(textareaIconRowStyle, descLargaOk)}
                    >
                      <span style={textareaIconLeadStyle}>
                        <IconDescripcion />
                      </span>
                      <textarea
                        ref={descripcionLargaRef}
                        value={descripcionLarga}
                        onChange={(e) => setDescripcionLarga(e.target.value)}
                        placeholder="Agrega más detalles: experiencia, tipos de trabajo, zonas donde atiendes u otra información importante."
                        style={textareaIconFieldStyle}
                        rows={6}
                      />
                      {descLargaOk ? <span style={fieldMicroCheckStyle}>✓</span> : null}
                    </div>
                  </div>
                </div>

                <div style={mejorarBlockStyle}>
                  <div style={mejorarBlockTitleStyle}>Cómo trabajas</div>
                  <div style={mejorarBlockLeadStyle}>
                    Puedes elegir una o varias modalidades: cada emprendimiento es distinto y no todas
                    encajan en una sola categoría. Marcar lo que te aplica ayuda a que te contacten por el
                    canal correcto y entiendan cómo trabajas.
                  </div>

                  <div style={fieldStyleSecondary}>
                    <label style={labelSecondaryStyle}>Modalidad (elige una o varias)</label>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {[
                        { id: "local_fisico", label: "🏠 Local físico" },
                        { id: "presencial", label: "🚚 A domicilio" },
                        { id: "online", label: "💻 Online" },
                      ].map((item) => {
                        const selected =
                          item.id === "local_fisico"
                            ? modalidadesAtencion.some((x) => {
                                const value = s(x).toLowerCase();
                                return value === "local" || value === "local_fisico";
                              })
                            : modalidadesAtencion.includes(item.id);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => toggleModalidad(item.id)}
                            style={{
                              padding: "10px 14px",
                              borderRadius: 10,
                              border: selected ? "2px solid #2563eb" : "1px solid #cbd5e1",
                              background: selected ? "#eff6ff" : "#fff",
                              color: "#111827",
                              fontWeight: 700,
                              cursor: "pointer",
                              fontFamily: "inherit",
                            }}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {atiendeLocal ? (
                    <>
                      <div style={subBlockTitleStyle}>Tu local</div>
                      <div style={addressGroupStyle}>
                        <div style={fieldStyleSecondary}>
                          <label style={labelSecondaryStyle}>
                            Dirección principal del local
                          </label>
                          <p style={direccionInlineHelperStyle}>
                            Puedes agregar hasta 3 locales más adelante. Por ahora deja tu dirección
                            principal.
                          </p>
                          <input
                            ref={direccionInputRef}
                            value={direccion}
                            onChange={(e) => setDireccion(e.target.value)}
                            placeholder="Ej: Av. Siempre Viva 123, Maipú"
                            style={withFieldCompleteRow(inputSecondaryStyle, !!s(direccion))}
                          />
                        </div>
                        <div style={fieldStyleSecondary}>
                          <label style={labelSecondaryStyle}>Referencia (opcional)</label>
                          <textarea
                            value={direccionReferencia}
                            onChange={(e) => setDireccionReferencia(e.target.value)}
                            placeholder="Ej: frente a la plaza, local rojo, segundo piso"
                            style={textareaSmallStyle}
                            rows={2}
                          />
                        </div>
                      </div>

                      <div style={subBlockTitleStyle}>Cobertura: otros lugares donde atiendes</div>
                      <div style={fieldStyleSecondary}>
                        <label style={labelSecondaryStyle}>
                          Otros lugares (opcional)
                        </label>
                        <input
                          value={otrosLugares}
                          onChange={(e) => setOtrosLugares(e.target.value)}
                          placeholder="Ej: también en San Bernardo y Maipú"
                          style={withFieldCompleteRow(
                            inputSecondaryStyle,
                            !!s(otrosLugares)
                          )}
                        />
                      </div>
                    </>
                  ) : (
                    <div style={helperSecondaryStyle}>
                      Si atiendes con local físico, marca “Local físico” y agrega tu dirección.
                    </div>
                  )}
                </div>

                <div style={mejorarBlockStyle}>
                  <div style={mejorarBlockTitleStyle}>Datos de tu negocio</div>
                  <div style={mejorarBlockLeadStyle}>
                    Lo que ingresaste al postular. Puedes corregirlo aquí cuando quieras.
                  </div>
                  <div>
                    <div style={fieldStyleSecondary}>
                      <label style={labelSecondaryStyle}>Nombre del negocio</label>
                      <input
                        value={nombreBase}
                        onChange={(e) => setNombreBase(e.target.value)}
                        placeholder="Nombre de tu negocio"
                        style={withFieldCompleteRow(inputSecondaryStyle, nombreOk)}
                      />
                    </div>

                    <div style={fieldStyleSecondary}>
                      <label style={labelSecondaryStyle}>WhatsApp</label>
                      <input
                        value={whatsappBase}
                        onChange={(e) => setWhatsappBase(e.target.value)}
                        placeholder="9XXXXXXXX o +569XXXXXXXX"
                        style={withFieldCompleteRow(inputSecondaryStyle, waOk)}
                      />
                      {!whatsappCheck.ok ? (
                        <div style={errorBoxStyle}>
                          Ingresa un WhatsApp válido de Chile (ej: 9XXXXXXXX o +569XXXXXXXX)
                        </div>
                      ) : null}
                    </div>

                    <div style={fieldStyleSecondary}>
                      <label style={labelSecondaryStyle}>Email (interno)</label>
                      <input
                        type="email"
                        value={emailContacto}
                        onChange={(e) => setEmailContacto(e.target.value)}
                        placeholder="nombre@dominio.com"
                        style={withFieldCompleteRow(inputSecondaryStyle, emailOk)}
                      />
                      <div style={helperSecondaryStyle}>
                        Solo para notificaciones y acceso a tu panel. No se muestra en la ficha.
                      </div>
                    </div>

                    <div style={fieldStyleSecondary}>
                      <label style={labelSecondaryStyle}>Descripción base</label>
                      <textarea
                        value={descripcionBase}
                        onChange={(e) => setDescripcionBase(e.target.value)}
                        placeholder="Ej: Panadería con pan amasado, empanadas y pasteles por encargo en San Bernardo."
                        rows={3}
                        style={withFieldCompleteRow(
                          textareaSecondaryStyle,
                          descBaseOk
                        )}
                      />
                      <div style={helperSecondaryStyle}>
                        Incluye qué ofreces (productos/servicios) y la comuna donde atiendes.
                      </div>
                    </div>
                  </div>
                </div>

                <div style={bottomCtaRowStyle}>
                  <button
                    type="button"
                    onClick={() => void handleGuardarMejorasClick()}
                    disabled={guardarUiPhase !== "idle"}
                    aria-busy={guardarUiPhase === "saving"}
                    style={{
                      ...btnPrimaryBottomStyle,
                      ...(guardarUiPhase !== "idle"
                        ? { opacity: 0.85, cursor: "not-allowed" as const }
                        : {}),
                    }}
                  >
                    {guardarUiPhase === "saving"
                      ? "Guardando..."
                      : guardarUiPhase === "success"
                        ? "Guardado ✓"
                        : "Guardar mejoras"}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/")}
                    style={btnSecondaryBottomStyle}
                  >
                    Volver al inicio
                  </button>
                </div>
              </div>
            </section>
          </div>

          <aside
            id="mejorar-ficha-vista-previa"
            style={previewColStyle}
            aria-label="Vista previa pública"
          >
            <div className="mejorar-ficha-sticky" style={previewStickyStyle}>
              <h2 style={previewPublicHeadingStyle}>Así podría verse tu ficha</h2>
              {!hasFotoPrincipal ? (
                <p style={previewFotoHintAboveCardStyle}>
                  Tu ficha se verá mejor al agregar una foto
                </p>
              ) : null}
              <div style={!hasFotoPrincipal ? previewCardMutedStyle : previewCardStyle}>
                {hasFotoPrincipal ? (
                  <button
                    type="button"
                    onClick={() => fotoPrincipalInputRef.current?.click()}
                    style={previewImgBoxStyle}
                    className="mejorar-ficha-preview-photo-trigger mejorar-ficha-preview-img-hero"
                    aria-label="Cambiar foto principal"
                  >
                    <>
                      <div
                        key={previewPhotoNonce}
                        className={
                          photoAnimActive
                            ? "mejorar-ficha-preview-photo-wrap mejorar-ficha-preview-photo-wrap--anim"
                            : "mejorar-ficha-preview-photo-wrap"
                        }
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={fotoPrincipalDisplaySrc} alt="" />
                      </div>
                      <span className="mejorar-ficha-preview-photo-overlay">
                        Cambiar foto
                      </span>
                    </>
                  </button>
                ) : (
                  <div
                    style={previewImgBoxStyle}
                    className="mejorar-ficha-preview-img-hero"
                    aria-hidden
                  >
                    <div
                      style={previewImgEmptyInnerStyle}
                      className="mejorar-ficha-preview-photo-empty"
                    >
                      <span style={previewEmptyThumbStyle} aria-hidden>
                        📷
                      </span>
                      <span style={previewPlaceholderStyle}>
                        Tu foto principal aparecerá aquí
                      </span>
                      <button
                        type="button"
                        onClick={() => scrollToSubirFotoPrincipal()}
                        style={previewFotoSecondaryLinkStyle}
                      >
                        Ir a subir foto principal
                      </button>
                    </div>
                  </div>
                )}
                <div style={previewBodyStyle}>
                  <div style={previewComunaStyle}>
                    📍 {initial.comuna_nombre || "Comuna"}
                  </div>
                  <h3 style={previewTitleStyle}>
                    {s(nombreBase) || "Tu emprendimiento"}
                  </h3>
                  <p
                    style={
                      previewDescPrincipal ? previewFraseStyle : previewFraseEmptyStyle
                    }
                  >
                    {previewDescPrincipal ||
                      "La descripción corta de tu negocio se muestra aquí cuando la tenés cargada."}
                  </p>
                  {hasPreviewCtas ? (
                    <div style={previewCtaColStyle}>
                      {previewWaUrl ? (
                        <a
                          href={previewWaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={previewWhatsappHeroStyle}
                        >
                          Chatear por WhatsApp
                        </a>
                      ) : null}
                      {(previewIgUrl || previewWebUrl) ? (
                        <div style={previewCtaSecondaryRowStyle}>
                          {previewIgUrl ? (
                            <a
                              href={previewIgUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={previewCtaPillStyle}
                            >
                              Instagram
                            </a>
                          ) : null}
                          {previewWebUrl ? (
                            <a
                              href={previewWebUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={previewCtaPillStyle}
                            >
                              Sitio web
                            </a>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div style={previewMetaMutedRowStyle}>
                      <span>Instagram</span>
                      <span>Sitio web</span>
                      <span>WhatsApp</span>
                    </div>
                  )}
                </div>
              </div>
              <p style={previewDescComplementStyle}>
                {hasFotoPrincipal
                  ? "Así se verá tu ficha cuando esté publicada."
                  : "Usa el botón de la izquierda para agregar tu logo o foto principal."}
              </p>

              <div style={previewResponsableAsideStyle}>
                <p style={previewResponsableAsideIntroStyle}>
                  Mostrar quién atiende genera más confianza
                </p>
                <label style={labelSecondaryStyle}>Nombre de quien atiende (opcional)</label>
                <input
                  value={nombreResponsable}
                  onChange={(e) => setNombreResponsable(e.target.value)}
                  placeholder="Ej: Daniela, Juan, equipo de atención"
                  style={inputSecondaryStyle}
                />
                <label style={checkRowSecondaryStyle}>
                  <input
                    type="checkbox"
                    checked={mostrarResponsable}
                    onChange={(e) => setMostrarResponsable(e.target.checked)}
                  />
                  <span>Mostrar en ficha pública</span>
                </label>
              </div>
            </div>
          </aside>
        </div>
      </section>
      {errorToast.visible ? (
        <div
          role="alert"
          className={
            errorToast.exit
              ? "mejorar-ficha-error-toast mejorar-ficha-error-toast--exit"
              : "mejorar-ficha-error-toast"
          }
        >
          {errorToast.message}
        </div>
      ) : null}
      {successToast.visible ? (
        <div
          role="status"
          className={
            successToast.exit
              ? "mejorar-ficha-success-toast mejorar-ficha-success-toast--exit"
              : "mejorar-ficha-success-toast"
          }
        >
          {successToast.message}
        </div>
      ) : null}
    </main>
  );
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  background: "#f1f5f9",
};

const narrowStyle: CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
  padding: "12px 16px 28px",
};

const topBarStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  marginBottom: 8,
};

const topBarLeftStyle: CSSProperties = {
  flex: "1 1 240px",
  minWidth: 0,
};

const topBarProgressTextStyle: CSSProperties = {
  margin: "4px 0 0",
  color: "#64748b",
  fontSize: 13,
  lineHeight: 1.4,
};

const topBarRightStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 8,
  justifyContent: "flex-end",
};

const h1CompactStyle: CSSProperties = {
  margin: 0,
  fontSize: 22,
  fontWeight: 900,
  color: "#0f172a",
  lineHeight: 1.25,
};

const autosavePillStyle: CSSProperties = {
  padding: "4px 10px",
  borderRadius: 999,
  fontWeight: 700,
  fontSize: 11,
};

const autosaveSaving: CSSProperties = {
  background: "#e0e7ff",
  color: "#3730a3",
};

const autosaveSavedCompact: CSSProperties = {
  background: "#ecfdf5",
  color: "#047857",
  border: "1px solid #a7f3d0",
};

const estadoPillStyle: CSSProperties = {
  padding: "6px 14px",
  borderRadius: 999,
  fontWeight: 800,
  fontSize: 13,
};

const estadoPillCompact: CSSProperties = {
  padding: "4px 10px",
  fontSize: 12,
  fontWeight: 700,
};

const estadoBaja: CSSProperties = {
  background: "#ffedd5",
  color: "#9a3412",
};

const estadoMedia: CSSProperties = {
  background: "#fef9c3",
  color: "#854d0e",
};

const estadoAlta: CSSProperties = {
  background: "#dcfce7",
  color: "#166534",
};

const btnVerFichaHeaderStyle: CSSProperties = {
  padding: "6px 12px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#1e40af",
  fontWeight: 800,
  fontSize: 12,
  cursor: "pointer",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  fontFamily: "inherit",
};

const btnInicioHeaderStyle: CSSProperties = {
  padding: "6px 12px",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  color: "#475569",
  fontWeight: 700,
  fontSize: 12,
  cursor: "pointer",
  fontFamily: "inherit",
};

const direccionLocalHintBoxStyle: CSSProperties = {
  marginBottom: 10,
  padding: "8px 10px",
  borderRadius: 10,
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  color: "#1e40af",
  fontSize: 13,
  fontWeight: 600,
  lineHeight: 1.45,
};

const labelObligatorioSuffixStyle: CSSProperties = {
  fontWeight: 600,
  color: "#b45309",
};

const btnGaleriaPickStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "8px 14px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#1d4ed8",
  fontWeight: 800,
  fontSize: 13,
  cursor: "pointer",
  fontFamily: "inherit",
  marginBottom: 10,
};

const errorBoxStyle: CSSProperties = {
  background: "#fef2f2",
  border: "1px solid #fecaca",
  color: "#991b1b",
  padding: "8px 12px",
  borderRadius: 10,
  marginBottom: 8,
  fontWeight: 600,
  fontSize: 13,
};

const guidedColumnStyle: CSSProperties = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  padding: "18px 20px 20px",
  boxShadow: "0 1px 8px rgba(15,23,42,0.04)",
  minWidth: 0,
};

const guidedNavStyle: CSSProperties = {
  width: "100%",
};

const guidedChecklistUlStyle: CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: 0,
};

const guidedChecklistLiStyle: CSSProperties = {
  listStyle: "none",
  paddingBottom: 12,
  marginBottom: 12,
  borderBottom: "1px solid #f1f5f9",
};

const guidedRowHeaderStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 22px auto",
  alignItems: "center",
  columnGap: 8,
  fontSize: 13,
  lineHeight: 1.35,
};

const guidedExpandWrapperStyle: CSSProperties = {
  marginTop: 10,
  paddingTop: 12,
  borderTop: "1px solid #e2e8f0",
};

const guidedExpandBodyStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 0,
};

const mejorarBlockStyle: CSSProperties = {
  marginTop: 14,
  paddingTop: 14,
  borderTop: "1px solid #f1f5f9",
};

const mejorarBlockTitleStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 900,
  color: "#0f172a",
  letterSpacing: "-0.01em",
  marginBottom: 6,
};

const mejorarBlockLeadStyle: CSSProperties = {
  margin: "0 0 10px",
  fontSize: 12,
  lineHeight: 1.45,
  color: "#64748b",
  fontWeight: 600,
};

const addressGroupStyle: CSSProperties = {
  padding: 12,
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  marginBottom: 10,
};

const subBlockTitleStyle: CSSProperties = {
  marginTop: 10,
  marginBottom: 6,
  fontSize: 12,
  fontWeight: 900,
  color: "#0f172a",
};

const textareaSmallStyle: CSSProperties = {
  width: "100%",
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  padding: 8,
  fontSize: 13,
  resize: "vertical",
  lineHeight: 1.45,
  background: "#f8fafc",
};

const keyProgressWrapStyle: CSSProperties = {
  marginBottom: 12,
  padding: 12,
  borderRadius: 14,
  border: "1px solid #e2e8f0",
  background: "#fff",
};

const keyProgressTitleStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 900,
  color: "#0f172a",
  marginBottom: 8,
};

const keyProgressRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
};

const keyProgressChipBaseStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 800,
  border: "1px solid #e2e8f0",
};

const keyProgressChipOkStyle: CSSProperties = {
  ...keyProgressChipBaseStyle,
  background: "#ecfdf5",
  border: "1px solid #a7f3d0",
  color: "#065f46",
};

const keyProgressChipTodoStyle: CSSProperties = {
  ...keyProgressChipBaseStyle,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  color: "#64748b",
};

const keyProgressItemBaseStyle: CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  background: "#fff",
  fontSize: 13,
  fontWeight: 900,
  color: "#0f172a",
  cursor: "pointer",
  fontFamily: "inherit",
};

const keyProgressItemOkStyle: CSSProperties = {
  ...keyProgressItemBaseStyle,
  background: "#ecfdf5",
  border: "1px solid #a7f3d0",
  color: "#065f46",
  cursor: "default",
};

const keyProgressItemTodoStyle: CSSProperties = {
  ...keyProgressItemBaseStyle,
  background: "#fff",
  border: "1px solid #e2e8f0",
  color: "#0f172a",
};

const keyProgressItemStatusStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 900,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  flexShrink: 0,
};

const bottomCtaRowStyle: CSSProperties = {
  marginTop: 14,
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
  alignItems: "center",
};

const btnPrimaryBottomStyle: CSSProperties = {
  minHeight: 44,
  padding: "0 14px",
  borderRadius: 12,
  border: "none",
  background: "#0f172a",
  color: "#fff",
  fontWeight: 900,
  fontSize: 14,
  cursor: "pointer",
  fontFamily: "inherit",
};

const btnSecondaryBottomStyle: CSSProperties = {
  minHeight: 44,
  padding: "0 14px",
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 900,
  fontSize: 14,
  cursor: "pointer",
  fontFamily: "inherit",
};

const galeriaHeroWrapStyle: CSSProperties = {
  marginTop: 16,
  padding: 16,
  borderRadius: 16,
  border: "1px solid #fde68a",
  background: "linear-gradient(180deg, #fffbeb 0%, #fff 65%)",
  boxShadow: "0 10px 24px rgba(245,158,11,0.10)",
};

const galeriaHeroTitleStyle: CSSProperties = {
  fontSize: 15,
  fontWeight: 900,
  color: "#78350f",
  letterSpacing: "-0.01em",
  marginBottom: 6,
};

const galeriaHeroCtaStyle: CSSProperties = {
  width: "100%",
  minHeight: 76,
  borderRadius: 14,
  border: "2px dashed #f59e0b",
  background: "linear-gradient(180deg, #fff7ed 0%, #fffbeb 100%)",
  color: "#92400e",
  fontWeight: 900,
  fontSize: 15,
  cursor: "pointer",
  fontFamily: "inherit",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
};

const btnSubirFotoProtagonistaStyle: CSSProperties = {
  width: "100%",
  minHeight: 52,
  marginTop: 6,
  borderRadius: 12,
  border: "none",
  background: "#0f172a",
  color: "#fff",
  fontWeight: 900,
  fontSize: 16,
  cursor: "pointer",
  fontFamily: "inherit",
};

const galeriaSubBlockStyle: CSSProperties = {
  marginTop: 18,
  paddingTop: 16,
  borderTop: "1px solid rgba(245, 158, 11, 0.35)",
};

const galeriaSubTitleStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 900,
  color: "#78350f",
  marginBottom: 6,
};

const btnGaleriaSecundariaStyle: CSSProperties = {
  width: "100%",
  minHeight: 48,
  marginTop: 4,
  borderRadius: 12,
  border: "2px solid #f59e0b",
  background: "#fff",
  color: "#92400e",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
  fontFamily: "inherit",
};

const mejorarDetailsStyle: CSSProperties = {
  marginTop: 14,
  paddingTop: 14,
  borderTop: "1px solid #f1f5f9",
};

const mejorarDetailsSummaryStyle: CSSProperties = {
  cursor: "pointer",
  listStyle: "none",
  fontSize: 13,
  color: "#0f172a",
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "baseline",
};

const mejorarDetailsSummaryHintStyle: CSSProperties = {
  fontSize: 12,
  color: "#64748b",
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const mejorarDetailsEditStyle: CSSProperties = {
  color: "#1d4ed8",
  textDecoration: "underline",
  textUnderlineOffset: 2,
  fontWeight: 900,
};

const guidedExpandLeadStyle: CSSProperties = {
  margin: "0 0 10px",
  fontSize: 13,
  lineHeight: 1.5,
  color: "#64748b",
};

const guidedEditarBtnStyle: CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#475569",
  fontWeight: 700,
  fontSize: 11,
  cursor: "pointer",
  padding: 0,
  fontFamily: "inherit",
  textDecoration: "underline",
  textUnderlineOffset: 2,
};

const previewPublicHeadingStyle: CSSProperties = {
  margin: "0 0 10px",
  fontSize: 15,
  fontWeight: 900,
  color: "#0f172a",
  letterSpacing: "-0.02em",
  lineHeight: 1.25,
};

const previewFotoHintAboveCardStyle: CSSProperties = {
  margin: "0 0 12px",
  fontSize: 13,
  fontWeight: 700,
  color: "#64748b",
  lineHeight: 1.45,
};

const compactChecklistHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 12,
  gap: 8,
};

const compactChecklistTitleStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 900,
  color: "#0f172a",
  letterSpacing: "-0.02em",
};

const compactChecklistScoreStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  color: "#64748b",
  flexShrink: 0,
};

const compactChecklistIconStyle: CSSProperties = {
  textAlign: "center",
  fontWeight: 900,
  fontSize: 11,
  width: 18,
};

const compactChecklistLabelStyle: CSSProperties = {
  minWidth: 0,
  fontWeight: 600,
};

const compactChecklistActionCellStyle: CSSProperties = {
  justifySelf: "end",
  textAlign: "right" as const,
  minWidth: 0,
};

const compactChecklistCtaBtnStyle: CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#1d4ed8",
  fontWeight: 700,
  fontSize: 11,
  cursor: "pointer",
  padding: 0,
  fontFamily: "inherit",
  textDecoration: "underline",
  textUnderlineOffset: 2,
};

const compactChecklistCtaLinkStyle: CSSProperties = {
  ...compactChecklistCtaBtnStyle,
  display: "inline-flex",
  alignItems: "center",
};

const previewColStyle: CSSProperties = {
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const previewStickyStyle: CSSProperties = {
  position: "sticky",
  top: 12,
};

const previewMissingFotoBannerStyle: CSSProperties = {
  margin: "10px 0 12px",
  padding: 14,
  borderRadius: 14,
  border: "1px solid #fed7aa",
  background: "linear-gradient(180deg, #fff7ed 0%, #fffbeb 100%)",
  boxShadow: "0 10px 24px rgba(245,158,11,0.10)",
};

const previewMissingFotoTitleStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 900,
  color: "#78350f",
  marginBottom: 4,
};

const previewMissingFotoTextStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "#92400e",
  lineHeight: 1.45,
  marginBottom: 10,
};

const previewMissingFotoCtaStyle: CSSProperties = {
  width: "100%",
  minHeight: 40,
  borderRadius: 12,
  border: "1px solid #f59e0b",
  background: "#f59e0b",
  color: "#fff",
  fontWeight: 900,
  fontSize: 13,
  cursor: "pointer",
  fontFamily: "inherit",
};

const cardStyle: CSSProperties = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  padding: 20,
  boxShadow: "0 4px 14px rgba(15,23,42,0.05)",
};

const h1Style: CSSProperties = {
  margin: "0 0 10px",
  fontSize: 22,
  fontWeight: 900,
  color: "#0f172a",
};

const fieldStyleSecondary: CSSProperties = { marginBottom: 8 };

const labelSecondaryStyle: CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 700,
  marginBottom: 4,
  color: "#64748b",
};

const helperSecondaryStyle: CSSProperties = {
  marginTop: 4,
  marginBottom: 0,
  color: "#6b7280",
  fontSize: 12,
  lineHeight: 1.4,
};

const galeriaBigCtaStyle: CSSProperties = {
  width: "100%",
  minHeight: 74,
  borderRadius: 12,
  border: "2px dashed #93c5fd",
  background: "#eff6ff",
  color: "#1e3a8a",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
  fontFamily: "inherit",
};

const galeriaHintStyle: CSSProperties = {
  margin: "6px 2px 0",
  color: "#64748b",
  fontSize: 12,
};

const galeriaMicrocopyWrapStyle: CSSProperties = {
  marginTop: 10,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(245, 158, 11, 0.28)",
  background: "rgba(255, 251, 235, 0.55)",
};

const galeriaMicrocopyPrimaryStyle: CSSProperties = {
  margin: 0,
  color: "#92400e",
  fontSize: 12,
  fontWeight: 800,
  lineHeight: 1.45,
};

const galeriaMicrocopySecondaryStyle: CSSProperties = {
  margin: "8px 0 0",
  color: "#78350f",
  fontSize: 12,
  fontWeight: 700,
  lineHeight: 1.45,
};

const galeriaMicrocopySecondaryLabelStyle: CSSProperties = {
  fontWeight: 900,
};

const direccionInlineHelperStyle: CSSProperties = {
  margin: "0 0 6px",
  color: "#64748b",
  fontSize: 12,
  lineHeight: 1.4,
};

const btnSaveBottomStyle: CSSProperties = {
  marginTop: 10,
  width: "fit-content",
  minHeight: 38,
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#334155",
  fontWeight: 700,
  fontSize: 13,
  padding: "0 12px",
  cursor: "pointer",
  fontFamily: "inherit",
};

const inputSecondaryStyle: CSSProperties = {
  width: "100%",
  minHeight: 42,
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  padding: "0 11px",
  fontSize: 14,
  background: "#fafafa",
};

const inputIconRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "100%",
  minHeight: 42,
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  padding: "0 12px",
  boxSizing: "border-box",
  background: "#fafafa",
};

const inputIconFieldStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  minHeight: 40,
  border: "none",
  padding: "0 4px 0 0",
  fontSize: 14,
  background: "transparent",
  outline: "none",
};

const textareaIconRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  width: "100%",
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  padding: "10px 12px",
  boxSizing: "border-box",
  background: "#fafafa",
};

const textareaIconLeadStyle: CSSProperties = {
  flexShrink: 0,
  paddingTop: 2,
  lineHeight: 0,
};

const textareaIconFieldStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  minHeight: 120,
  border: "none",
  padding: 0,
  margin: 0,
  fontSize: 14,
  lineHeight: 1.45,
  resize: "vertical" as const,
  background: "transparent",
  outline: "none",
  fontFamily: "inherit",
};

const fieldMicroCheckStyle: CSSProperties = {
  flexShrink: 0,
  alignSelf: "flex-start",
  marginTop: 4,
  color: "#16a34a",
  fontSize: 15,
  fontWeight: 800,
  lineHeight: 1,
};

const textareaSecondaryStyle: CSSProperties = {
  width: "100%",
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  padding: 10,
  fontSize: 14,
  resize: "vertical",
  lineHeight: 1.45,
  background: "#fafafa",
};

const checkRowSecondaryStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 13,
  color: "#64748b",
  cursor: "pointer",
  marginTop: 2,
};

const pStyle: CSSProperties = {
  margin: "0 0 12px",
  color: "#475569",
  lineHeight: 1.55,
};

const pMutedStyle: CSSProperties = {
  margin: "0 0 14px",
  fontSize: 14,
  color: "#64748b",
  lineHeight: 1.5,
};

const fileInputStyle: CSSProperties = {
  width: "100%",
  fontSize: 14,
  marginBottom: 10,
};

const hiddenFileInputStyle: CSSProperties = {
  display: "none",
};

const mainPhotoFrameStyle: CSSProperties = { marginTop: 4, position: "relative" as const };

const mainPhotoAnimWrapStyle: CSSProperties = {
  borderRadius: 12,
  overflow: "hidden",
  maxHeight: 240,
};

const mainPhotoImgStyle: CSSProperties = {
  width: "100%",
  maxHeight: 240,
  objectFit: "cover",
  display: "block",
};

const fotoEmptyStateStyle: CSSProperties = {
  width: "100%",
  minHeight: 200,
  borderRadius: 16,
  border: "2px solid #fcd34d",
  background: "linear-gradient(165deg, #fffbeb 0%, #fff 45%, #fff7ed 100%)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "22px 20px 24px",
  textAlign: "center" as const,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)",
};

const fotoEmptyIllustrationStyle: CSSProperties = {
  marginBottom: 14,
  filter: "drop-shadow(0 4px 12px rgba(245,158,11,0.15))",
};

const fotoEmptySvgStyle: CSSProperties = {
  display: "block",
};

const fotoEmptyCtaLineStyle: CSSProperties = {
  margin: "0 0 8px",
  fontSize: 16,
  fontWeight: 900,
  color: "#78350f",
  lineHeight: 1.35,
  maxWidth: 300,
};

const fotoEmptySubStyle: CSSProperties = {
  margin: "0 0 18px",
  fontSize: 14,
  color: "#92400e",
  lineHeight: 1.45,
  fontWeight: 600,
  maxWidth: 300,
  opacity: 0.92,
};

const btnSubirFotoStyle: CSSProperties = {
  padding: "12px 22px",
  borderRadius: 12,
  border: "none",
  background: "#1d4ed8",
  color: "#fff",
  fontWeight: 900,
  fontSize: 15,
  cursor: "pointer",
  fontFamily: "inherit",
  boxShadow: "0 6px 16px rgba(29,78,216,0.25)",
};

const fotoActionsRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 14,
  marginTop: 10,
  alignItems: "center",
};

const linkBtnStyle: CSSProperties = {
  background: "none",
  border: "none",
  color: "#2563eb",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: 13,
  padding: 0,
};

const linkBtnMutedStyle: CSSProperties = {
  background: "none",
  border: "none",
  color: "#94a3b8",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: 13,
  padding: 0,
};

const galeriaGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
  gap: 10,
  marginTop: 10,
};

const galeriaItemStyle: CSSProperties = { textAlign: "center" as const };
const galeriaImgStyle: CSSProperties = {
  width: "100%",
  aspectRatio: "1",
  objectFit: "cover",
  borderRadius: 10,
};

const btnSecondary: CSSProperties = {
  padding: "10px 18px",
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  background: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

const previewCardStyle: CSSProperties = {
  background: "#fff",
  borderRadius: 12,
  overflow: "hidden",
  border: "1px solid #e2e8f0",
  boxShadow: "0 4px 16px rgba(15,23,42,0.06)",
};

const previewCardMutedStyle: CSSProperties = {
  ...previewCardStyle,
  opacity: 0.88,
  border: "1px dashed #fbbf24",
  boxShadow: "0 2px 10px rgba(15,23,42,0.05)",
};

const previewImgBoxStyle: CSSProperties = {
  aspectRatio: "4/3",
  minHeight: 168,
  background: "#fffbeb",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const previewImgEmptyInnerStyle: CSSProperties = {
  margin: 10,
  width: "calc(100% - 20px)",
  height: "calc(100% - 20px)",
  minHeight: 112,
  borderRadius: 14,
  border: "2px dashed #fbbf24",
  background: "linear-gradient(180deg, #ffffff 0%, #fffbeb 100%)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  boxSizing: "border-box" as const,
};

const previewEmptyThumbStyle: CSSProperties = {
  fontSize: 30,
  lineHeight: 1,
  opacity: 0.95,
};

const previewPlaceholderStyle: CSSProperties = {
  color: "#92400e",
  fontWeight: 800,
  fontSize: 13,
  letterSpacing: "-0.01em",
};

const previewEmptyHintLineStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "#b45309",
  opacity: 0.9,
};

const previewBodyStyle: CSSProperties = {
  padding: "12px 14px 14px",
  background: "#fff",
  borderTop: "1px solid #e2e8f0",
};

const previewComunaStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  color: "#2563eb",
  marginBottom: 6,
};

const previewTitleStyle: CSSProperties = {
  margin: "0 0 10px",
  fontSize: 22,
  fontWeight: 900,
  color: "#020617",
  letterSpacing: "-0.04em",
  lineHeight: 1.15,
};

const previewFraseStyle: CSSProperties = {
  margin: "0 0 10px",
  fontSize: 15,
  fontWeight: 600,
  color: "#1e293b",
  lineHeight: 1.55,
  whiteSpace: "pre-wrap" as const,
};

const previewFraseEmptyStyle: CSSProperties = {
  margin: "0 0 10px",
  fontSize: 14,
  fontWeight: 500,
  color: "#64748b",
  lineHeight: 1.5,
  fontStyle: "italic" as const,
};

const previewDescComplementStyle: CSSProperties = {
  margin: "0 0 12px",
  fontSize: 14,
  fontWeight: 500,
  color: "#475569",
  lineHeight: 1.5,
  whiteSpace: "pre-wrap" as const,
  paddingTop: 8,
  borderTop: "1px solid #e2e8f0",
};

const previewFotoSecondaryLinkStyle: CSSProperties = {
  marginTop: 8,
  background: "none",
  border: "none",
  padding: 0,
  color: "#2563eb",
  fontWeight: 700,
  fontSize: 12,
  cursor: "pointer",
  fontFamily: "inherit",
  textDecoration: "underline",
  textUnderlineOffset: 2,
};

const previewResponsableAsideStyle: CSSProperties = {
  marginTop: 16,
  padding: 14,
  borderRadius: 14,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
};

const previewResponsableAsideIntroStyle: CSSProperties = {
  margin: "0 0 10px",
  fontSize: 13,
  fontWeight: 800,
  color: "#0f172a",
  lineHeight: 1.35,
};

const previewCtaColStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "stretch",
  gap: 8,
  marginTop: 6,
  marginBottom: 8,
};

const previewCtaSecondaryRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
};

const previewWhatsappHeroStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "12px 16px",
  borderRadius: 12,
  background: "linear-gradient(180deg, #22c55e 0%, #16a34a 100%)",
  color: "#fff",
  fontSize: 15,
  fontWeight: 900,
  textDecoration: "none",
  border: "2px solid #15803d",
  boxShadow: "0 4px 14px rgba(22,163,74,0.45), inset 0 1px 0 rgba(255,255,255,0.2)",
  letterSpacing: "-0.02em",
};

const previewCtaPillStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "9px 14px",
  borderRadius: 10,
  background: "#f8fafc",
  color: "#0f172a",
  fontSize: 13,
  fontWeight: 800,
  textDecoration: "none",
  border: "1px solid #cbd5e1",
};

const previewMetaMutedRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  fontSize: 11,
  fontWeight: 700,
  color: "#cbd5e1",
  textTransform: "uppercase" as const,
  letterSpacing: "0.06em",
  marginTop: 4,
  marginBottom: 8,
};

const codeStyle: CSSProperties = {
  background: "#f1f5f9",
  padding: "2px 6px",
  borderRadius: 4,
  fontSize: 13,
};
