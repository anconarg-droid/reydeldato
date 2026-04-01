"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { isPersistibleFotoUrl } from "@/lib/isPersistibleFotoUrl";
import { getEmailTypoSuggestion, isValidEmailFormat } from "@/lib/validateEmail";
import {
  PUBLICAR_BORRADOR_PATH,
  publicarBorradorByIdPath,
} from "@/lib/publicarApi";
import { normalizeChilePhone, isValidChileMobile } from "@/utils/phone";
import { normalizeWebsite } from "@/utils/url";
import PasoInformacionBasica from "./PasoInformacionBasica";
import PasoDescripcionImagenes from "./PasoDescripcionImagenes";
import PasoUbicacionCobertura from "./PasoUbicacionCobertura";
import PasoVistaPrevia from "./PasoVistaPrevia";

export type Categoria = {
  id: string;
  nombre: string;
  slug: string;
};

export type Subcategoria = {
  id: string;
  categoria_id: string;
  nombre: string;
  slug: string;
  is_destacada?: boolean | null;
  orden_destacada?: number | null;
};

export type Comuna = {
  id: string;
  nombre: string;
  slug: string;
  region_id?: string | null;
  region_nombre?: string | null;
  display_name?: string | null;
};

export type Region = {
  id: string;
  nombre: string;
  slug: string;
};

export const MIN_DESCRIPCION_NEGOCIO = 40;
export const KEYWORDS_MIN = 1;
export const KEYWORDS_MAX = 10;

export type LocalFormItem = {
  nombre_local?: string;
  direccion: string;
  comuna_slug: string;
  es_principal: boolean;
};

export type FormData = {
  nombre: string;
  responsable: string;
  ocultarResponsable: boolean;

  email: string;
  whatsapp: string;
  whatsappSecundario: string;
  instagram: string;
  web: string;

  fraseNegocio: string;
  descripcionNegocio: string;
  /** Opcional, no visible públicamente (input de texto con comas). */
  keywordsUsuario: string;
  fotoPrincipal: File | null;
  galeria: File[];

  productosDetectados: string[];

  tieneLocalFisico: boolean;
  locales: LocalFormItem[];
  comunaBase: string;
  direccion: string;
  modalidades: string[];

  coberturaTipo: string;
  comunasCobertura: string[];
  regionesCobertura: string[];

  categoriaSlug: string;
  subcategorias: string[];

  keywordItems: { value: string; source: "auto" | "manual" }[];

  clasificacion?: {
    tipo_actividad?: string;
    sector_slug?: string;
    tags_slugs?: string[];
    keywords_clasificacion?: string[];
    clasificacion_confianza?: number;
    clasificacion_fuente?: string;
  } | null;
};

type Props = {
  categorias: Categoria[];
  subcategorias: Subcategoria[];
  comunas: Comuna[];
  regiones: Region[];
  /** Valores iniciales opcionales (p. ej. borrador o prellenado desde servidor). */
  initialData?: Partial<FormData>;
  /** Variante de flujo; reservado para UI simplificada vs avanzada. */
  mode?: "advanced" | "simple";
};

export const INITIAL_FORM: FormData = {
  nombre: "",
  responsable: "",
  ocultarResponsable: true,

  email: "",
  whatsapp: "",
  whatsappSecundario: "",
  instagram: "",
  web: "",

  fraseNegocio: "",
  descripcionNegocio: "",
  keywordsUsuario: "",
  fotoPrincipal: null,
  galeria: [],

  productosDetectados: [],

  tieneLocalFisico: false,
  locales: [],
  comunaBase: "",
  direccion: "",
  modalidades: [],

  coberturaTipo: "",
  comunasCobertura: [],
  regionesCobertura: [],

  categoriaSlug: "",
  subcategorias: [],

  keywordItems: [],

  clasificacion: undefined,
};

function normalizeInstagram(input: string) {
  let raw = input.trim();

  if (!raw) return "";

  raw = raw.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "");
  raw = raw.replace(/^@/, "");
  raw = raw.replace(/\/+$/, "");
  raw = raw.split("?")[0];
  raw = raw.split("/")[0];

  return raw.trim();
}

function buildComunaIdMap(comunas: Comuna[]) {
  const bySlug = new Map<string, number>();
  for (const comuna of comunas) {
    const idNum = Number(comuna.id);
    if (comuna.slug && Number.isInteger(idNum)) {
      bySlug.set(comuna.slug, idNum);
    }
  }
  return bySlug;
}

function buildCategoriaIdMap(categorias: Categoria[]) {
  const bySlug = new Map<string, number>();
  for (const categoria of categorias) {
    const idNum = Number(categoria.id);
    if (categoria.slug && Number.isInteger(idNum)) {
      bySlug.set(categoria.slug, idNum);
    }
  }
  return bySlug;
}

function buildSubcategoriaIdMap(subcategorias: Subcategoria[]) {
  const bySlug = new Map<string, number>();
  for (const sub of subcategorias) {
    const idNum = Number(sub.id);
    if (sub.slug && Number.isInteger(idNum)) {
      bySlug.set(sub.slug, idNum);
    }
  }
  return bySlug;
}

function normalizeCoberturaTipoForPayload(coberturaTipo: string): string {
  return coberturaTipo;
}

function StepBadge({
  index,
  title,
  active,
  done,
  onClick,
}: {
  index: number;
  title: string;
  active: boolean;
  done: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        borderRadius: 14,
        border: active ? "1px solid #93c5fd" : "1px solid #e5e7eb",
        background: active ? "#eff6ff" : "#fff",
        cursor: onClick ? "pointer" : "default",
        width: "100%",
        textAlign: "left",
        font: "inherit",
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: done ? "#2563eb" : active ? "#dbeafe" : "#f3f4f6",
          color: done ? "#fff" : "#111827",
          fontWeight: 900,
          fontSize: 13,
        }}
      >
        {index}
      </div>

      <div
        style={{
          fontWeight: 800,
          fontSize: 14,
          color: "#111827",
        }}
      >
        {title}
      </div>
    </button>
  );
}

export default function PublicarClient({
  categorias,
  subcategorias,
  comunas,
  regiones,
  initialData,
  mode = "advanced",
}: Props) {
  const router = useRouter();

  const comunaIdMapRef = useRef(buildComunaIdMap(comunas));
  const categoriaIdMapRef = useRef(buildCategoriaIdMap(categorias));
  const subcategoriaIdMapRef = useRef(buildSubcategoriaIdMap(subcategorias));

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>({
    ...INITIAL_FORM,
    ...initialData,
  });

  useEffect(() => {
    if (!initialData) return;
    setForm((prev) => ({
      ...prev,
      ...initialData,
    }));
  }, [initialData]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState("");
  const [draftId, setDraftId] = useState<string | null>(null);
  const [creatingDraft, setCreatingDraft] = useState(false);

  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftIdRef = useRef<string | null>(null);
  const creatingDraftRef = useRef(false);

  useEffect(() => {
    draftIdRef.current = draftId;
  }, [draftId]);

  useEffect(() => {
    creatingDraftRef.current = creatingDraft;
  }, [creatingDraft]);

  const formChecklistItems = useMemo(() => {
    if (submitted || mode === "advanced") return [];
    const items: string[] = [];

    if (!form.nombre.trim()) {
      items.push("Nombre del emprendimiento");
    }

    const normalized = normalizeChilePhone(form.whatsapp);
    if (!isValidChileMobile(normalized)) {
      items.push("WhatsApp válido");
    }

    if (form.descripcionNegocio.trim().length < MIN_DESCRIPCION_NEGOCIO) {
      items.push(
        `Descripción mínima (${MIN_DESCRIPCION_NEGOCIO} caracteres)`
      );
    }

    if (!form.comunaBase.trim()) {
      items.push("Comuna base");
    }

    if (!form.coberturaTipo.trim()) {
      items.push("Cobertura");
    }

    if (
      form.coberturaTipo === "varias_comunas" &&
      form.comunasCobertura.length < 2
    ) {
      items.push("Al menos 2 comunas (incluyendo la base)");
    }

    return items;
  }, [
    submitted,
    mode,
    form.nombre,
    form.whatsapp,
    form.descripcionNegocio,
    form.comunaBase,
    form.coberturaTipo,
    form.comunasCobertura,
  ]);

  function setField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleArrayValue(
    key: "modalidades" | "comunasCobertura" | "regionesCobertura" | "subcategorias",
    value: string,
    max?: number
  ) {
    setForm((prev) => {
      const current = prev[key];
      const exists = current.includes(value);

      if (exists) {
        return { ...prev, [key]: current.filter((x) => x !== value) };
      }

      if (max && current.length >= max) {
        return prev;
      }

      return { ...prev, [key]: [...current, value] };
    });
  }

  function normalizeStepOneFields() {
    setForm((prev) => ({
      ...prev,
      nombre: prev.nombre.trim(),
      responsable: prev.responsable.trim(),
      email: prev.email.trim().toLowerCase(),
      fraseNegocio: prev.fraseNegocio.trim().slice(0, 120),
      whatsapp: normalizeChilePhone(prev.whatsapp) || prev.whatsapp.trim(),
      whatsappSecundario: prev.whatsappSecundario
        ? normalizeChilePhone(prev.whatsappSecundario) || prev.whatsappSecundario.trim()
        : "",
      web: normalizeWebsite(prev.web),
      instagram: normalizeInstagram(prev.instagram),
    }));
  }

  function validateStep(currentStep: number) {
    const nextErrors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!form.nombre.trim()) {
        nextErrors.nombre = "Ingresa el nombre del emprendimiento.";
      } else if (form.nombre.trim().length < 3) {
        nextErrors.nombre = "El nombre debe tener al menos 3 caracteres.";
      }

      const normalized = normalizeChilePhone(form.whatsapp);

      if (!form.whatsapp.trim()) {
        nextErrors.whatsapp = "Ingresa el WhatsApp principal.";
      } else if (!isValidChileMobile(normalized)) {
        nextErrors.whatsapp =
          "Ingresa un WhatsApp válido de Chile. Ej: 912345678 o +56912345678";
      }

      if (form.email.trim() && !isValidEmailFormat(form.email)) {
        nextErrors.email = "Ingresa un email válido. Ej: nombre@correo.com";
      } else if (form.email.trim()) {
        const typo = getEmailTypoSuggestion(form.email);
        if (typo) {
          nextErrors.email = `Revisa el dominio: parece un error. ¿Quisiste decir ${typo.suggestedEmail}?`;
        } else if (!isValidEmailFormat(form.email)) {
          // fallback por si se coló un caso raro
          nextErrors.email = "Ingresa un email válido. Ej: nombre@correo.com";
        }
      }

      if (form.whatsappSecundario.trim()) {
        const sec = normalizeChilePhone(form.whatsappSecundario);
        if (!isValidChileMobile(sec)) {
          nextErrors.whatsappSecundario =
            "El WhatsApp secundario debe ser válido (ej: 912345678 o +56912345678).";
        } else if (form.whatsapp.trim() && normalizeChilePhone(form.whatsapp) === sec) {
          nextErrors.whatsappSecundario =
            "El WhatsApp secundario debe ser distinto al principal.";
        }
      }

      if (!form.comunaBase.trim()) {
        nextErrors.comunaBase = "Selecciona la comuna base.";
      }

      if (!form.coberturaTipo.trim()) {
        nextErrors.coberturaTipo = "Selecciona la cobertura.";
      }

      if (form.coberturaTipo === "varias_comunas") {
        const base = form.comunaBase.trim();
        const arr = Array.isArray(form.comunasCobertura) ? form.comunasCobertura : [];
        const hasBase = base && arr.includes(base);
        if (!hasBase) {
          nextErrors.comunasCobertura =
            "Tu comuna base debe quedar incluida en comunas de cobertura.";
        } else if (arr.length < 2) {
          nextErrors.comunasCobertura =
            "Debes seleccionar al menos 2 comunas (incluyendo la base).";
        } else if (arr.length > 8) {
          nextErrors.comunasCobertura =
            "Puedes seleccionar máximo 8 comunas (incluyendo tu comuna base).";
        }
      }
    }

    if (currentStep === 2) {
      const descLen = form.descripcionNegocio.trim().length;
      if (descLen < MIN_DESCRIPCION_NEGOCIO) {
        nextErrors.descripcionNegocio = `Describe el producto o servicio que ofreces (mínimo ${MIN_DESCRIPCION_NEGOCIO} caracteres).`;
      }

      if (!form.fotoPrincipal) {
        nextErrors.fotoPrincipal = "Debes subir una foto principal.";
      }

      if (form.galeria.length > 6) {
        nextErrors.galeria = "Puedes subir máximo 6 imágenes en la galería.";
      }
    }

    if (currentStep === 3) {
      // Paso 3 queda para datos opcionales (locales/modalidades/dirección) más adelante.
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function nextStep() {
    if (!validateStep(step)) return;

    if (step === 1) {
      normalizeStepOneFields();
    }

    setServerError("");
    setStep((prev) => Math.min(prev + 1, 4));
  }

  function prevStep() {
    setServerError("");
    setStep((prev) => Math.max(prev - 1, 1));
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

  async function uploadFileToLocalApi(file: File, folder = "postulaciones") {
    const base64 = await fileToDataUrl(file);

    const res = await fetch("/api/upload-base64", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filename: file.name,
        base64,
        folder,
      }),
    });

    const data = (await res.json()) as Record<string, unknown>;
    console.log("upload response:", data);
    if (!res.ok || !data?.ok) {
      throw new Error(
        typeof data.error === "string" ? data.error : "No se pudo subir el archivo"
      );
    }
    const keys = ["url", "publicUrl", "public_url", "publicURL", "href"] as const;
    let url = "";
    for (const k of keys) {
      const t = data[k] != null ? String(data[k]).trim() : "";
      if (t) {
        url = t;
        break;
      }
    }
    if (!url && data.url != null) url = String(data.url).trim();
    console.log("public image chosen:", url);
    if (!url || !isPersistibleFotoUrl(url)) {
      throw new Error(
        "El servidor no devolvió una URL pública válida para la imagen (evitamos placeholders)."
      );
    }
    return url;
  }

  async function ensureDraftExists(currentForm: FormData): Promise<string | null> {
    if (draftIdRef.current) return draftIdRef.current;
    if (creatingDraftRef.current) return null;

    const nombre = currentForm.nombre.trim();
    const whatsapp = normalizeChilePhone(currentForm.whatsapp);

    if (nombre.length < 3) return null;
    if (!isValidChileMobile(whatsapp)) return null;

    creatingDraftRef.current = true;
    setCreatingDraft(true);

    try {
      const createPayload: Record<string, unknown> = {
        nombre,
        whatsapp,
        paso_actual: step,
      };

      if (currentForm.responsable.trim()) {
        createPayload.responsable = currentForm.responsable.trim();
      }

      if (currentForm.email.trim()) {
        createPayload.email = currentForm.email.trim().toLowerCase();
      }

      if (currentForm.fraseNegocio.trim()) {
        createPayload.fraseNegocio = currentForm.fraseNegocio.trim().slice(0, 120);
      }

      if (currentForm.descripcionNegocio.trim()) {
        createPayload.descripcionNegocio = currentForm.descripcionNegocio.trim();
      }

      const res = await fetch(PUBLICAR_BORRADOR_PATH, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createPayload),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok || !data?.id) {
        throw new Error(data?.error || "No se pudo crear el borrador.");
      }

      const newDraftId = String(data.id);
      draftIdRef.current = newDraftId;
      setDraftId(newDraftId);

      return newDraftId;
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : "No se pudo crear el borrador."
      );
      return null;
    } finally {
      creatingDraftRef.current = false;
      setCreatingDraft(false);
    }
  }

  const autosave = useCallback(async () => {
    const currentForm = form;
    const currentDraftId = await ensureDraftExists(currentForm);

    if (!currentDraftId) return;

    const payload: Record<string, unknown> = {
      paso_actual: step,
    };

    const nombre = currentForm.nombre.trim();
    if (nombre) payload.nombre = nombre;

    const whatsapp = normalizeChilePhone(currentForm.whatsapp);
    if (isValidChileMobile(whatsapp)) {
      payload.whatsapp = whatsapp;
    }

    if (currentForm.responsable.trim()) {
      payload.responsable = currentForm.responsable.trim();
    }

    if (currentForm.email.trim()) {
      payload.email = currentForm.email.trim().toLowerCase();
    }

    payload.ocultarResponsable = currentForm.ocultarResponsable;

    if (currentForm.whatsappSecundario.trim()) {
      const sec = normalizeChilePhone(currentForm.whatsappSecundario);
      if (isValidChileMobile(sec)) {
        payload.whatsappSecundario = sec;
      }
    }

    if (currentForm.instagram.trim()) {
      payload.instagram = normalizeInstagram(currentForm.instagram);
    }

    if (currentForm.web.trim()) {
      payload.web = normalizeWebsite(currentForm.web);
    }

    if (currentForm.fraseNegocio.trim()) {
      payload.fraseNegocio = currentForm.fraseNegocio.trim().slice(0, 120);
    }

    if (currentForm.descripcionNegocio.trim()) {
      payload.descripcionNegocio = currentForm.descripcionNegocio.trim();
    }

    if (currentForm.keywordsUsuario?.trim()) {
      payload.keywords_usuario = currentForm.keywordsUsuario.trim();
    }

    const comunaBaseId = comunaIdMapRef.current.get(currentForm.comunaBase);
    if (comunaBaseId) {
      payload.comuna_base_id = comunaBaseId;
    }

    if (currentForm.coberturaTipo) {
      payload.cobertura_tipo = normalizeCoberturaTipoForPayload(
        currentForm.coberturaTipo
      );
    }

    payload.comunas_cobertura = currentForm.comunasCobertura;

    if (currentForm.regionesCobertura.length > 0) {
      payload.regiones_cobertura = currentForm.regionesCobertura;
    }

    if (currentForm.modalidades.length > 0) {
      payload.modalidades_atencion = currentForm.modalidades;
    }

    const categoriaId = categoriaIdMapRef.current.get(currentForm.categoriaSlug);
    if (categoriaId) {
      payload.categoriaId = categoriaId;
    }

    if (currentForm.subcategorias.length > 0) {
      const subIds = currentForm.subcategorias
        .map((slug) => subcategoriaIdMapRef.current.get(slug))
        .filter((x): x is number => Number.isInteger(x));

      if (subIds.length > 0) {
        payload.subcategoriasIds = subIds;
      }
    }

    if (currentForm.clasificacion?.clasificacion_confianza != null) {
      payload.clasificacion_confianza =
        currentForm.clasificacion.clasificacion_confianza;
    }

    if (currentForm.clasificacion?.clasificacion_fuente) {
      payload.clasificacion_fuente = currentForm.clasificacion.clasificacion_fuente;
    }

    if (currentForm.clasificacion?.tipo_actividad) {
      payload.tipo_actividad = currentForm.clasificacion.tipo_actividad;
    }

    if (currentForm.clasificacion?.sector_slug) {
      payload.sector_slug = currentForm.clasificacion.sector_slug;
    }

    if (
      Array.isArray(currentForm.clasificacion?.tags_slugs) &&
      currentForm.clasificacion?.tags_slugs.length
    ) {
      payload.tags_slugs = currentForm.clasificacion.tags_slugs;
    }

    try {
      await fetch(publicarBorradorByIdPath(currentDraftId), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      // silencio para no romper UX
    }
  }, [form, step]);

  useEffect(() => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      void autosave();
    }, 2000);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [autosave]);

  async function submitForm() {
    if (saving) return;

    setServerError("");

    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) return;

    try {
      setSaving(true);

      let currentDraftId = await ensureDraftExists(form);
      if (!currentDraftId) {
        setServerError("No se pudo crear el borrador antes de enviar.");
        return;
      }

      const fotoPrincipalUrl = form.fotoPrincipal
        ? await uploadFileToLocalApi(form.fotoPrincipal, "postulaciones/foto-principal")
        : null;

      const galeriaUrls: string[] = [];
      for (const file of form.galeria.slice(0, 6)) {
        // eslint-disable-next-line no-await-in-loop
        const url = await uploadFileToLocalApi(file, "postulaciones/galeria");
        galeriaUrls.push(url);
      }

      const comunaBaseId = comunaIdMapRef.current.get(form.comunaBase) ?? null;
      const categoriaId = categoriaIdMapRef.current.get(form.categoriaSlug) ?? null;
      const subcategoriasIds = form.subcategorias
        .map((slug) => subcategoriaIdMapRef.current.get(slug))
        .filter((x): x is number => Number.isInteger(x));

      const payload: Record<string, unknown> = {
        paso_actual: 4,
        estado: "pendiente_revision",

        nombre: form.nombre.trim(),
        responsable: form.responsable.trim(),
        ocultarResponsable: form.ocultarResponsable,

        email: form.email.trim().toLowerCase(),
        whatsapp: normalizeChilePhone(form.whatsapp),
        whatsappSecundario: form.whatsappSecundario.trim()
          ? normalizeChilePhone(form.whatsappSecundario)
          : "",
        instagram: normalizeInstagram(form.instagram),
        web: normalizeWebsite(form.web),

        fraseNegocio: form.fraseNegocio.trim().slice(0, 120),
        descripcionNegocio: form.descripcionNegocio.trim(),
        keywords_usuario: form.keywordsUsuario.trim(),

        foto_principal_url: fotoPrincipalUrl,
        galeria_urls: galeriaUrls,

        comuna_base_id: comunaBaseId,
        cobertura_tipo: normalizeCoberturaTipoForPayload(form.coberturaTipo),
        comunas_cobertura: form.comunasCobertura,
        regiones_cobertura: form.regionesCobertura,
        ...(form.modalidades.length > 0
          ? { modalidades_atencion: form.modalidades }
          : {}),

        categoriaId,
        subcategoriasIds,

        clasificacion_confianza:
          form.clasificacion?.clasificacion_confianza ?? null,
        clasificacion_fuente:
          form.clasificacion?.clasificacion_fuente ?? null,
        tipo_actividad:
          form.clasificacion?.tipo_actividad ?? null,
        sector_slug:
          form.clasificacion?.sector_slug ?? null,
        tags_slugs:
          form.clasificacion?.tags_slugs ?? [],
      };

      const patchRes = await fetch(publicarBorradorByIdPath(currentDraftId), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const patchData = await patchRes.json();

      if (!patchRes.ok || !patchData?.ok) {
        setServerError(
          patchData?.error || "No se pudo actualizar la postulación."
        );
        return;
      }

      const enviarRes = await fetch("/api/publicar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          draft_id: currentDraftId,
        }),
      });

      const enviarData = await enviarRes.json();

      if (!enviarRes.ok || !enviarData?.ok) {
        setServerError(
          enviarData?.error || "No se pudo enviar la postulación a revisión."
        );
        return;
      }

      setSubmitted(true);
    } catch (_error) {
      setServerError("Ocurrió un error al guardar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <header
        style={{
          borderBottom: "1px solid #e5e7eb",
          background: "#fff",
        }}
      >
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            padding: "14px 20px",
            fontSize: 24,
            fontWeight: 900,
            color: "#111827",
          }}
        >
          Rey del Dato
        </div>
      </header>

      <section
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "28px 20px 56px",
        }}
      >
        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 26,
            padding: 28,
            marginBottom: 22,
          }}
        >
          <h1
            style={{
              margin: "0 0 10px",
              fontSize: 40,
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              color: "#111827",
            }}
          >
            {mode === "advanced"
              ? "Mejora tu ficha"
              : "Publica tu emprendimiento"}
          </h1>

          <p
            style={{
              margin: 0,
              color: "#4b5563",
              fontSize: 16,
              lineHeight: 1.6,
              maxWidth: 760,
            }}
          >
            {mode === "advanced"
              ? "Ya tienes una ficha base. Ahora puedes agregar más información para que tu emprendimiento se vea más completo y atractivo."
              : "Crea tu ficha para aparecer cuando alguien busque servicios, productos o datos en tu comuna."}
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0,1fr))",
            gap: 12,
            marginBottom: 22,
          }}
        >
          <StepBadge
            index={1}
            title="Información básica"
            active={step === 1}
            done={step > 1}
            onClick={() => setStep(1)}
          />
          <StepBadge
            index={2}
            title="Descripción e imágenes"
            active={step === 2}
            done={step > 2}
            onClick={() => setStep(2)}
          />
          <StepBadge
            index={3}
            title="Ubicación y cobertura"
            active={step === 3}
            done={step > 3}
            onClick={() => setStep(3)}
          />
          <StepBadge
            index={4}
            title="Vista previa"
            active={step === 4}
            done={false}
            onClick={() => setStep(4)}
          />
        </div>

        {creatingDraft ? (
          <div
            style={{
              marginBottom: 16,
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              color: "#1d4ed8",
              padding: 14,
              borderRadius: 14,
              fontWeight: 700,
            }}
          >
            {mode === "advanced"
              ? "Guardando cambios..."
              : "Guardando borrador..."}
          </div>
        ) : null}

        {formChecklistItems.length > 0 ? (
          <div
            style={{
              background: "#fff7ed",
              border: "1px solid #fdba74",
              padding: 14,
              borderRadius: 12,
              marginBottom: 16,
            }}
          >
            <strong style={{ color: "#9a3412" }}>Te falta completar:</strong>
            <ul
              style={{
                marginTop: 8,
                marginBottom: 0,
                paddingLeft: 20,
                color: "#7c2d12",
                lineHeight: 1.5,
              }}
            >
              {formChecklistItems.map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {step === 1 && (
          <PasoInformacionBasica
            form={form}
            errors={errors}
            setField={setField}
            submitForm={nextStep}
            comunas={comunas}
          />
        )}

        {step === 2 && (
          <PasoDescripcionImagenes
            form={form}
            errors={errors}
            setField={setField}
            nextStep={nextStep}
            prevStep={prevStep}
          />
        )}

        {step === 3 && (
          <PasoUbicacionCobertura
            form={form}
            errors={errors}
            comunas={comunas}
            regiones={regiones}
            setField={setField}
            toggleArrayValue={toggleArrayValue}
            nextStep={nextStep}
            prevStep={prevStep}
          />
        )}

        {step === 4 && (
          <PasoVistaPrevia
            form={form}
            categorias={categorias}
            subcategorias={subcategorias}
            comunas={comunas}
            regiones={regiones}
            prevStep={prevStep}
            submitForm={submitForm}
            saving={saving}
            mode={mode}
          />
        )}

        {serverError ? (
          <div
            style={{
              marginTop: 18,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#991b1b",
              padding: 16,
              borderRadius: 14,
              fontWeight: 700,
              lineHeight: 1.5,
            }}
          >
            {serverError}
          </div>
        ) : null}

        {submitted ? (
          <div
            style={{
              marginTop: 18,
              background: "#ecfdf5",
              border: "1px solid #86efac",
              color: "#166534",
              padding: 16,
              borderRadius: 14,
              fontWeight: 700,
              lineHeight: 1.5,
            }}
          >
            {mode === "advanced"
              ? "Tus cambios fueron guardados correctamente."
              : "Tu emprendimiento fue recibido correctamente y quedó pendiente de revisión antes de publicarse."}
          </div>
        ) : null}
      </section>
    </main>
  );
}