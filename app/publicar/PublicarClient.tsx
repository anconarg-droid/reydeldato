"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
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

/** Mínimo de caracteres para descripcion_negocio */
export const MIN_DESCRIPCION_NEGOCIO = 40;
/** Palabras clave: mínimo y máximo */
export const KEYWORDS_MIN = 1;
export const KEYWORDS_MAX = 10;

/** Un local físico: nombre opcional, dirección, comuna y si es el principal (máx. 1 principal). */
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
  /** WhatsApp principal (obligatorio). */
  whatsapp: string;
  /** WhatsApp secundario opcional; máximo 2 WhatsApp por emprendimiento. */
  whatsappSecundario: string;
  instagram: string;
  web: string;

  /** Frase corta opcional: solo para tarjeta y ficha, no se usa en clasificación. */
  fraseNegocio: string;
  /** Descripción del producto/servicio. Usado para clasificación, tarjeta (si no hay frase) y ficha. */
  descripcionNegocio: string;
  fotoPrincipal: File | null;
  galeria: File[];

  /** Productos o servicios detectados automáticamente desde la descripción (solo lectura para el usuario). */
  productosDetectados: string[];

  /** Si tiene locales físicos (sí = mostrar hasta 3 locales). */
  tieneLocalFisico: boolean;
  /** Locales físicos (0–3). Si hay locales, uno debe ser principal; comuna_base se toma del principal. */
  locales: LocalFormItem[];

  /** Comuna base cuando no hay locales físicos (comuna principal declarada). */
  comunaBase: string;
  /** Dirección única (solo cuando no hay locales y modalidad incluye "local"); legacy. */
  direccion: string;
  modalidades: string[];

  coberturaTipo: string;
  comunasCobertura: string[];
  regionesCobertura: string[];

  categoriaSlug: string;
  subcategorias: string[];

  /** Palabras clave con origen: auto (sugeridas) o manual. Se reemplazan solo las auto al refrescar sugerencias. */
  keywordItems: { value: string; source: "auto" | "manual" }[];

  /** Clasificación inteligente (opcional): tipo, sector, tags, confianza, fuente */
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
};

const INITIAL_FORM: FormData = {
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

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

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

function normalizeKeywords(input: string[]) {
  return [...new Set(input.map((x) => x.trim().toLowerCase()).filter(Boolean))];
}

/** Valores únicos de keywordItems preservando orden (manual primero). Para validación y payload. */
function getKeywordValues(items: { value: string; source: string }[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const v = item.value.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 40);
    if (!v || seen.has(v)) continue;
    seen.add(v);
    result.push(v);
  }
  return result;
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
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState("");
  const [draftId, setDraftId] = useState<string | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function setField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/publicar/borrador", { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data?.ok && data?.id) setDraftId(data.id);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const autosave = useCallback(() => {
    if (!draftId) return;
    const hasNombre = form.nombre.trim().length >= 3;
    const hasWhatsapp = isValidChileMobile(normalizeChilePhone(form.whatsapp));
    const hasComuna = form.comunaBase.trim().length > 0;
    const hasDescripcion = form.descripcionNegocio.trim().length >= MIN_DESCRIPCION_NEGOCIO;
    if (!hasNombre && !hasWhatsapp && !hasComuna && !hasDescripcion) return;

    const payload: Record<string, string> = {};
    if (hasNombre) payload.nombre = form.nombre.trim();
    if (hasWhatsapp) payload.whatsapp = normalizeChilePhone(form.whatsapp);
    if (hasComuna) payload.comuna_base_slug = form.comunaBase;
    if (hasDescripcion) payload.descripcion_negocio = form.descripcionNegocio.trim();
    if (form.fraseNegocio.trim()) payload.frase_negocio = form.fraseNegocio.trim().slice(0, 120);

    fetch(`/api/publicar/borrador/${draftId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {});
  }, [draftId, form.nombre, form.whatsapp, form.comunaBase, form.descripcionNegocio, form.fraseNegocio]);

  useEffect(() => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(autosave, 800);
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [autosave]);

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

  function validateStep(currentStep: number) {
    const nextErrors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!form.nombre.trim()) {
        nextErrors.nombre = "Ingresa el nombre del emprendimiento.";
      } else if (form.nombre.trim().length < 3) {
        nextErrors.nombre = "El nombre debe tener al menos 3 caracteres.";
      }

      if (!form.responsable.trim()) {
        nextErrors.responsable = "Ingresa el nombre del responsable.";
      } else if (form.responsable.trim().length < 3) {
        nextErrors.responsable =
          "El nombre del responsable debe tener al menos 3 caracteres.";
      }

      if (!form.email.trim()) {
        nextErrors.email = "Ingresa el email.";
      } else if (!isValidEmail(form.email)) {
        nextErrors.email = "Ingresa un email válido. Ej: nombre@correo.com";
      }

      const normalized = normalizeChilePhone(form.whatsapp);

      if (!form.whatsapp.trim()) {
        nextErrors.whatsapp = "Ingresa el WhatsApp principal.";
      } else if (!isValidChileMobile(normalized)) {
        nextErrors.whatsapp =
          "Ingresa un WhatsApp válido de Chile. Ej: 912345678 o +56912345678";
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
    }

    if (currentStep === 2) {
      const descLen = form.descripcionNegocio.trim().length;
      if (descLen < MIN_DESCRIPCION_NEGOCIO) {
        nextErrors.descripcionNegocio = `Describe el producto o servicio que ofreces (mínimo ${MIN_DESCRIPCION_NEGOCIO} caracteres). Evita frases promocionales.`;
      }

      if (!form.fotoPrincipal) {
        nextErrors.fotoPrincipal = "Debes subir una foto principal.";
      }

      if (form.galeria.length > 6) {
        nextErrors.galeria = "Puedes subir máximo 6 imágenes en la galería.";
      }
    }

    if (currentStep === 3) {
      if (!form.comunaBase) {
        nextErrors.comunaBase = "Selecciona la comuna base.";
      }
      const exigeLocales = form.tieneLocalFisico || form.modalidades.includes("local");
      if (exigeLocales) {
        if (form.locales.length === 0) {
          nextErrors.locales = "Agrega al menos un local con dirección y comuna.";
        } else {
          const principal = form.locales.find((l) => l.es_principal);
          if (!principal) {
            nextErrors.locales = "Marca un local como principal.";
          } else {
            const sinDireccion = form.locales.some((l) => !l.direccion.trim());
            const sinComuna = form.locales.some((l) => !l.comuna_slug);
            if (sinDireccion || sinComuna) {
              nextErrors.locales = "Completa dirección y comuna de cada local.";
            }
          }
        }
      }

      if (!form.coberturaTipo) {
        nextErrors.coberturaTipo = "Selecciona la cobertura.";
      }

      if (
        form.coberturaTipo === "varias_comunas" &&
        !form.comunasCobertura.length
      ) {
        nextErrors.comunasCobertura =
          "Selecciona al menos una comuna de cobertura.";
      }

      if (
        form.coberturaTipo === "varias_regiones" &&
        !form.regionesCobertura.length
      ) {
        nextErrors.regionesCobertura =
          "Selecciona al menos una región de cobertura.";
      }

      if (!form.modalidades.length) {
        nextErrors.modalidades =
          "Selecciona al menos una modalidad de atención.";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function normalizeStepOneFields() {
    setForm((prev) => ({
      ...prev,
      nombre: prev.nombre.trim(),
      responsable: prev.responsable.trim(),
      email: prev.email.trim().toLowerCase(),
      fraseNegocio: prev.fraseNegocio.trim().slice(0, 120),
      whatsapp: normalizeChilePhone(prev.whatsapp) || prev.whatsapp.trim(),
      whatsappSecundario: prev.whatsappSecundario ? (normalizeChilePhone(prev.whatsappSecundario) || prev.whatsappSecundario.trim()) : "",
      web: normalizeWebsite(prev.web),
      instagram: normalizeInstagram(prev.instagram),
      keywordItems: prev.keywordItems.map((k) => ({
        value: k.value.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 40),
        source: k.source,
      })),
    }));
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

  async function submitForm() {
    if (saving) return;

    setServerError("");

    if (!validateStep(2) || !validateStep(3)) return;

    try {
      setSaving(true);

      const fotoPrincipalBase64 = form.fotoPrincipal
        ? await fileToDataUrl(form.fotoPrincipal)
        : "";
      const galeriaBase64: string[] = [];
      for (const f of form.galeria) {
        // eslint-disable-next-line no-await-in-loop
        galeriaBase64.push(await fileToDataUrl(f));
      }

      const payload = {
        ...(draftId ? { draft_id: draftId } : {}),
        nombre: form.nombre.trim(),
        responsable_nombre: form.responsable.trim(),
        ocultar_responsable: form.ocultarResponsable,

        email: form.email.trim().toLowerCase(),
        whatsapp: normalizeChilePhone(form.whatsapp),
        whatsapp_principal: normalizeChilePhone(form.whatsapp),
        whatsapp_secundario: form.whatsappSecundario.trim()
          ? normalizeChilePhone(form.whatsappSecundario)
          : undefined,
        instagram: normalizeInstagram(form.instagram),
        sitio_web: normalizeWebsite(form.web),

        frase_negocio: form.fraseNegocio.trim().slice(0, 120) || undefined,
        descripcion_negocio: form.descripcionNegocio.trim(),

        productos_detectados: form.productosDetectados,

        tiene_local_fisico: form.tieneLocalFisico,
        locales: form.tieneLocalFisico
          ? form.locales.map((l) => ({
              nombre_local: l.nombre_local?.trim() || undefined,
              direccion: l.direccion.trim(),
              comuna_slug: l.comuna_slug,
              es_principal: l.es_principal,
            }))
          : [],
        comuna_base_slug: form.comunaBase,
        direccion: form.direccion.trim(),

        nivel_cobertura: form.coberturaTipo,
        comunas_cobertura_slugs: form.comunasCobertura,
        regiones_cobertura_slugs: form.regionesCobertura,

        modalidades: form.modalidades,

        keywords: (form.productosDetectados || []).slice(0, KEYWORDS_MAX),

        foto_principal_nombre_archivo: form.fotoPrincipal?.name || "",
        galeria_nombres_archivos: form.galeria.map((f) => f.name),
        foto_principal_base64: fotoPrincipalBase64,
        galeria_base64: galeriaBase64,
      };

      const res = await fetch("/api/publicar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        setServerError(data?.error || "No se pudo guardar el emprendimiento.");
        return;
      }

      const estadoPublicacion = data.item?.estado_publicacion as string | undefined;
      const slug = data.item?.slug as string | undefined;

      if (estadoPublicacion === "pendiente_aprobacion" || estadoPublicacion === "pendiente_verificacion") {
        setSubmitted(true);
        return;
      }

      if (slug && estadoPublicacion === "publicado") {
        router.push(`/emprendedor/${slug}`);
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
            Publica tu emprendimiento
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
            Crea tu ficha para aparecer cuando alguien busque servicios,
            productos o datos en tu comuna.
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

        {step === 1 && (
          <PasoInformacionBasica
            form={form}
            errors={errors}
            setField={setField}
            nextStep={nextStep}
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
            Tu emprendimiento fue recibido correctamente y quedó pendiente de
            verificación antes de publicarse.
          </div>
        ) : null}
      </section>
    </main>
  );
}