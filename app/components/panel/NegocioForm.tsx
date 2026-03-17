"use client";

import { useEffect, useMemo, useState } from "react";

type CategoriaOption = {
  slug: string;
  nombre: string;
};

type SubcategoriaOption = {
  slug: string;
  nombre: string;
  categoriaSlug: string;
};

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
  | "domicilio"
  | "online";

type FormState = {
  nombre: string;
  responsable: string;
  mostrarResponsable: boolean;

  categoriaSlug: string;
  subcategoriasSlugs: string[];

  comunaBaseSlug: string;
  coberturaTipo: CoberturaTipo;
  comunasCoberturaSlugs: string[];

  modalidadesAtencion: ModalidadAtencion[];

  descripcionCorta: string;
  descripcionLarga: string;

  whatsapp: string;
  instagram: string;
  web: string;
  email: string;

  fotoPrincipalUrl: string;
  galeriaUrls: string[];
};

type FormErrors = Partial<Record<keyof FormState, string>> & {
  general?: string;
};

const CATEGORIAS: CategoriaOption[] = [
  { slug: "servicios-profesionales", nombre: "Servicios Profesionales" },
  { slug: "hogar-construccion", nombre: "Hogar y Construcción" },
  { slug: "gastronomia-alimentos", nombre: "Gastronomía y Alimentos" },
  { slug: "mascotas", nombre: "Mascotas" },
  { slug: "salud-bienestar", nombre: "Salud y Bienestar" },
  { slug: "belleza-estetica", nombre: "Belleza y Estética" },
  { slug: "educacion-clases", nombre: "Educación y Clases" },
  { slug: "eventos-celebraciones", nombre: "Eventos y Celebraciones" },
  { slug: "tecnologia-reparaciones", nombre: "Tecnología y Reparaciones" },
  { slug: "transporte-logistica", nombre: "Transporte y Logística" },
];

const SUBCATEGORIAS: SubcategoriaOption[] = [
  { slug: "gasfiteria", nombre: "Gasfitería", categoriaSlug: "hogar-construccion" },
  { slug: "electricidad", nombre: "Electricidad", categoriaSlug: "hogar-construccion" },
  { slug: "pintura", nombre: "Pintura", categoriaSlug: "hogar-construccion" },
  { slug: "maderas", nombre: "Maderas", categoriaSlug: "hogar-construccion" },
  { slug: "carpinteria", nombre: "Carpintería", categoriaSlug: "hogar-construccion" },

  { slug: "sushi", nombre: "Sushi", categoriaSlug: "gastronomia-alimentos" },
  { slug: "delivery", nombre: "Delivery", categoriaSlug: "gastronomia-alimentos" },
  { slug: "cafeteria", nombre: "Cafetería", categoriaSlug: "gastronomia-alimentos" },
  { slug: "panaderia", nombre: "Panadería", categoriaSlug: "gastronomia-alimentos" },

  { slug: "veterinaria", nombre: "Veterinaria", categoriaSlug: "mascotas" },
  { slug: "pet-shop", nombre: "Pet shop", categoriaSlug: "mascotas" },

  { slug: "abogados", nombre: "Abogados", categoriaSlug: "servicios-profesionales" },
  { slug: "contabilidad", nombre: "Contabilidad", categoriaSlug: "servicios-profesionales" },

  { slug: "psicologia", nombre: "Psicología", categoriaSlug: "salud-bienestar" },
  { slug: "masajes", nombre: "Masajes", categoriaSlug: "salud-bienestar" },

  { slug: "peluqueria", nombre: "Peluquería", categoriaSlug: "belleza-estetica" },
  { slug: "unas", nombre: "Uñas", categoriaSlug: "belleza-estetica" },

  { slug: "clases-particulares", nombre: "Clases particulares", categoriaSlug: "educacion-clases" },
  { slug: "ingles", nombre: "Inglés", categoriaSlug: "educacion-clases" },
];

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

const INITIAL_STATE: FormState = {
  nombre: "",
  responsable: "",
  mostrarResponsable: false,

  categoriaSlug: "",
  subcategoriasSlugs: [],

  comunaBaseSlug: "",
  coberturaTipo: "solo_comuna",
  comunasCoberturaSlugs: [],

  modalidadesAtencion: [],

  descripcionCorta: "",
  descripcionLarga: "",

  whatsapp: "",
  instagram: "",
  web: "",
  email: "",

  fotoPrincipalUrl: "",
  galeriaUrls: ["", "", "", ""],
};

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

function TextInput({
  value,
  onChange,
  placeholder,
  error,
  type = "text",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  type?: string;
}) {
  return (
    <>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
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
      />
      {error ? (
        <div style={{ marginTop: 6, fontSize: 13, color: "#b91c1c" }}>
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
        value={value}
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
        value={value}
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

function CheckboxPill({
  checked,
  onClick,
  children,
}: {
  checked: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: checked ? "1px solid #111827" : "1px solid #d1d5db",
        background: checked ? "#111827" : "#fff",
        color: checked ? "#fff" : "#111827",
        borderRadius: 999,
        padding: "10px 14px",
        fontSize: 14,
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

export default function NegocioForm({ id }: { id?: string }) {
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  const subcategoriasDisponibles = useMemo(() => {
    if (!form.categoriaSlug) return [];
    return SUBCATEGORIAS.filter(
      (item) => item.categoriaSlug === form.categoriaSlug
    );
  }, [form.categoriaSlug]);

  const comunaBase = useMemo(() => {
    return COMUNAS.find((c) => c.slug === form.comunaBaseSlug);
  }, [form.comunaBaseSlug]);

  useEffect(() => {
    async function load() {
      if (!id) return;

      try {
        setLoading(true);
        const res = await fetch(`/api/panel/negocio?id=${encodeURIComponent(id)}`, {
          cache: "no-store",
        });

        const json = await res.json();
        if (!res.ok || !json?.ok || !json.item) {
          throw new Error(json?.message || json?.error || "No se pudo cargar el negocio");
        }

        const item = json.item as Partial<FormState>;

        setForm((prev) => ({
          ...prev,
          ...item,
        }));
      } catch (error) {
        setErrors((prev) => ({
          ...prev,
          general:
            error instanceof Error
              ? error.message
              : "No se pudo cargar la información del negocio.",
        }));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined, general: undefined }));
  }

  function toggleSubcategoria(slug: string) {
    const exists = form.subcategoriasSlugs.includes(slug);

    if (exists) {
      updateField(
        "subcategoriasSlugs",
        form.subcategoriasSlugs.filter((x) => x !== slug)
      );
    } else {
      updateField("subcategoriasSlugs", [...form.subcategoriasSlugs, slug]);
    }
  }

  function toggleModalidad(value: ModalidadAtencion) {
    const exists = form.modalidadesAtencion.includes(value);

    if (exists) {
      updateField(
        "modalidadesAtencion",
        form.modalidadesAtencion.filter((x) => x !== value)
      );
    } else {
      updateField("modalidadesAtencion", [...form.modalidadesAtencion, value]);
    }
  }

  function toggleComunaCobertura(slug: string) {
    const exists = form.comunasCoberturaSlugs.includes(slug);

    if (exists) {
      updateField(
        "comunasCoberturaSlugs",
        form.comunasCoberturaSlugs.filter((x) => x !== slug)
      );
    } else {
      updateField("comunasCoberturaSlugs", [...form.comunasCoberturaSlugs, slug]);
    }
  }

  function handleCategoriaChange(value: string) {
    setForm((prev) => ({
      ...prev,
      categoriaSlug: value,
      subcategoriasSlugs: [],
    }));
    setErrors((prev) => ({
      ...prev,
      categoriaSlug: undefined,
      subcategoriasSlugs: undefined,
      general: undefined,
    }));
  }

  function handleCoberturaChange(value: string) {
    const cobertura = value as CoberturaTipo;

    setForm((prev) => ({
      ...prev,
      coberturaTipo: cobertura,
      comunasCoberturaSlugs:
        cobertura === "varias_comunas" ? prev.comunasCoberturaSlugs : [],
    }));

    setErrors((prev) => ({
      ...prev,
      coberturaTipo: undefined,
      comunasCoberturaSlugs: undefined,
      general: undefined,
    }));
  }

  function handleGaleriaChange(index: number, value: string) {
    const next = [...form.galeriaUrls];
    next[index] = value;
    updateField("galeriaUrls", next);
  }

  function validateForm(): FormErrors {
    const nextErrors: FormErrors = {};

    if (form.nombre.trim().length < 3) {
      nextErrors.nombre = "Ingresa un nombre de negocio válido.";
    }

    if (form.responsable.trim().length < 3) {
      nextErrors.responsable = "Ingresa el nombre del responsable.";
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
        "Selecciona al menos una comuna donde atiendes.";
    }

    if (form.modalidadesAtencion.length < 1) {
      nextErrors.modalidadesAtencion =
        "Selecciona al menos una modalidad de atención.";
    }

    if (form.descripcionCorta.trim().length < 20) {
      nextErrors.descripcionCorta =
        "La descripción corta debe tener al menos 20 caracteres.";
    }

    if (!form.whatsapp.trim()) {
      nextErrors.whatsapp = "El WhatsApp es obligatorio.";
    }

    if (!form.email.trim()) {
      nextErrors.email = "El email es obligatorio.";
    }

    if (!form.fotoPrincipalUrl.trim()) {
      nextErrors.fotoPrincipalUrl = "La foto principal es obligatoria.";
    }

    return nextErrors;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const nextErrors = validateForm();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        nombre: form.nombre.trim(),
        responsable_nombre: form.responsable.trim(),
        mostrar_responsable: form.mostrarResponsable,

        categoria_slug: form.categoriaSlug,
        subcategorias_slugs: form.subcategoriasSlugs,

        comuna_base_slug: form.comunaBaseSlug,
        cobertura_tipo: form.coberturaTipo,
        comunas_cobertura_slugs:
          form.coberturaTipo === "varias_comunas"
            ? form.comunasCoberturaSlugs
            : [],

        modalidades_atencion: form.modalidadesAtencion,

        descripcion_corta: form.descripcionCorta.trim(),
        descripcion_larga: form.descripcionLarga.trim(),

        whatsapp: form.whatsapp.trim(),
        instagram: form.instagram.trim(),
        web: form.web.trim(),
        email: form.email.trim(),

        foto_principal_url: form.fotoPrincipalUrl.trim(),
        galeria_urls: form.galeriaUrls.map((x) => x.trim()).filter(Boolean),
      };

      const url = id ? `/api/panel/negocio?id=${encodeURIComponent(id)}` : "/api/panel/negocios";
      const method = id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const rawText = await res.text();
      let data: any = null;

      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        throw new Error(
          `La API no devolvió JSON válido. Respuesta: ${rawText.slice(0, 200)}`
        );
      }

      if (!res.ok || !data?.ok) {
        throw new Error(
          data?.message || data?.error || "No se pudo guardar el emprendimiento"
        );
      }

      alert("Emprendimiento enviado correctamente para revisión");
      window.location.href = "/admin/pendientes";
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        general:
          error instanceof Error
            ? error.message
            : "Ocurrió un error inesperado.",
      }));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "grid",
        gap: 22,
      }}
    >
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
              placeholder="Ej: Maderas Valenzuela"
              error={errors.nombre}
            />
          </div>

          <div>
            <FieldLabel required>Responsable del negocio</FieldLabel>
            <TextInput
              value={form.responsable}
              onChange={(value) => updateField("responsable", value)}
              placeholder="Ej: Rodrigo González"
              error={errors.responsable}
            />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginTop: 32,
            }}
          >
            <input
              id="mostrarResponsable"
              type="checkbox"
              checked={form.mostrarResponsable}
              onChange={(e) => updateField("mostrarResponsable", e.target.checked)}
            />
            <label
              htmlFor="mostrarResponsable"
              style={{
                fontSize: 14,
                color: "#374151",
                cursor: "pointer",
              }}
            >
              Mostrar este nombre públicamente
            </label>
          </div>
        </div>
      </PanelCard>

      <PanelCard
        title="Clasificación heredada (opcional)"
        subtitle="Esta es la clasificación por categoría y subcategoría que usábamos antes. Puedes mantenerla si ya la tienes, pero la búsqueda prioriza tipo de actividad, sector y etiquetas."
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 18,
          }}
        >
          <div>
            <FieldLabel>Categoría principal (opcional)</FieldLabel>
            <SelectInput
              value={form.categoriaSlug}
              onChange={handleCategoriaChange}
              placeholder="Selecciona categoría"
              error={errors.categoriaSlug}
              options={CATEGORIAS.map((item) => ({
                value: item.slug,
                label: item.nombre,
              }))}
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <FieldLabel>Subcategorías (opcional)</FieldLabel>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                minHeight: 50,
                alignItems: "flex-start",
                border: errors.subcategoriasSlugs
                  ? "1px solid #dc2626"
                  : "1px solid #d1d5db",
                borderRadius: 14,
                padding: 12,
              }}
            >
              {subcategoriasDisponibles.length ? (
                subcategoriasDisponibles.map((item) => (
                  <CheckboxPill
                    key={item.slug}
                    checked={form.subcategoriasSlugs.includes(item.slug)}
                    onClick={() => toggleSubcategoria(item.slug)}
                  >
                    {item.nombre}
                  </CheckboxPill>
                ))
              ) : (
                <span style={{ fontSize: 14, color: "#6b7280" }}>
                  Primero selecciona una categoría principal si quieres usar la
                  clasificación heredada.
                </span>
              )}
            </div>

            {errors.subcategoriasSlugs ? (
              <div style={{ marginTop: 6, fontSize: 13, color: "#b91c1c" }}>
                {errors.subcategoriasSlugs}
              </div>
            ) : null}
          </div>
        </div>
      </PanelCard>

      <PanelCard
        title="Ubicación y cobertura"
        subtitle="La comuna es clave en Rey del Dato. Define bien tu comuna base y hasta dónde atiendes."
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
              onChange={(value) => updateField("comunaBaseSlug", value)}
              placeholder="Selecciona comuna"
              error={errors.comunaBaseSlug}
              options={COMUNAS.map((item) => ({
                value: item.slug,
                label: `${item.nombre} · ${item.regionNombre}`,
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
              <FieldLabel required>Comunas donde atiende</FieldLabel>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  border: errors.comunasCoberturaSlugs
                    ? "1px solid #dc2626"
                    : "1px solid #d1d5db",
                  borderRadius: 14,
                  padding: 12,
                }}
              >
                {COMUNAS.filter((item) => item.slug !== form.comunaBaseSlug).map(
                  (item) => (
                    <CheckboxPill
                      key={item.slug}
                      checked={form.comunasCoberturaSlugs.includes(item.slug)}
                      onClick={() => toggleComunaCobertura(item.slug)}
                    >
                      {item.nombre}
                    </CheckboxPill>
                  )
                )}
              </div>

              {errors.comunasCoberturaSlugs ? (
                <div style={{ marginTop: 6, fontSize: 13, color: "#b91c1c" }}>
                  {errors.comunasCoberturaSlugs}
                </div>
              ) : null}
            </div>
          ) : null}

          {comunaBase ? (
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
              <strong>Resumen territorial:</strong>{" "}
              {form.coberturaTipo === "solo_comuna"
                ? `Solo atiende en ${comunaBase.nombre}.`
                : form.coberturaTipo === "varias_comunas"
                ? `Su comuna base es ${comunaBase.nombre} y además atiende en varias comunas.`
                : form.coberturaTipo === "regional"
                ? `Su comuna base es ${comunaBase.nombre} y atiende a nivel regional.`
                : `Su comuna base es ${comunaBase.nombre} y atiende a nivel nacional.`}
            </div>
          ) : null}
        </div>
      </PanelCard>

      <PanelCard
        title="Cómo atiende"
        subtitle="Indica la forma de atención para que las personas entiendan rápido si tienes local, atiendes a domicilio o trabajas online."
      >
        <FieldLabel required>Modalidad de atención</FieldLabel>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            border: errors.modalidadesAtencion
              ? "1px solid #dc2626"
              : "1px solid #d1d5db",
            borderRadius: 14,
            padding: 12,
          }}
        >
          <CheckboxPill
            checked={form.modalidadesAtencion.includes("local_fisico")}
            onClick={() => toggleModalidad("local_fisico")}
          >
            🏪 Local físico
          </CheckboxPill>

          <CheckboxPill
            checked={form.modalidadesAtencion.includes("domicilio")}
            onClick={() => toggleModalidad("domicilio")}
          >
            🚚 Atención a domicilio
          </CheckboxPill>

          <CheckboxPill
            checked={form.modalidadesAtencion.includes("online")}
            onClick={() => toggleModalidad("online")}
          >
            💻 Online
          </CheckboxPill>
        </div>

        {errors.modalidadesAtencion ? (
          <div style={{ marginTop: 6, fontSize: 13, color: "#b91c1c" }}>
            {errors.modalidadesAtencion}
          </div>
        ) : null}
      </PanelCard>

      <PanelCard
        title="Descripción del negocio"
        subtitle="La descripción corta es clave. Debe explicar qué haces y, si se puede, dónde atiendes."
      >
        <div style={{ display: "grid", gap: 18 }}>
          <div>
            <FieldLabel required>Descripción corta</FieldLabel>
            <TextArea
              value={form.descripcionCorta}
              onChange={(value) => updateField("descripcionCorta", value)}
              placeholder="Ej: Venta de maderas y cortes a medida en Calera de Tango. Atención rápida por WhatsApp."
              error={errors.descripcionCorta}
              rows={3}
            />
            <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
              {form.descripcionCorta.length}/140 recomendado
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
        subtitle="El contacto directo es lo más importante. WhatsApp y email deben estar sí o sí."
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 18,
          }}
        >
          <div>
            <FieldLabel required>WhatsApp</FieldLabel>
            <TextInput
              value={form.whatsapp}
              onChange={(value) => updateField("whatsapp", value)}
              placeholder="+56912345678"
              error={errors.whatsapp}
            />
          </div>

          <div>
            <FieldLabel>Instagram</FieldLabel>
            <TextInput
              value={form.instagram}
              onChange={(value) => updateField("instagram", value)}
              placeholder="@tunegocio"
              error={errors.instagram}
            />
          </div>

          <div>
            <FieldLabel>Sitio web</FieldLabel>
            <TextInput
              value={form.web}
              onChange={(value) => updateField("web", value)}
              placeholder="www.tunegocio.cl"
              error={errors.web}
            />
          </div>

          <div>
            <FieldLabel required>Correo</FieldLabel>
            <TextInput
              type="email"
              value={form.email}
              onChange={(value) => updateField("email", value)}
              placeholder="contacto@tunegocio.cl"
              error={errors.email}
            />
          </div>
        </div>
      </PanelCard>

      <PanelCard
        title="Fotos"
        subtitle="La foto principal es obligatoria. Luego puedes agregar hasta 4 imágenes más para completar la galería."
      >
        <div style={{ display: "grid", gap: 18 }}>
          <div>
            <FieldLabel required>Foto principal</FieldLabel>
            <TextInput
              value={form.fotoPrincipalUrl}
              onChange={(value) => updateField("fotoPrincipalUrl", value)}
              placeholder="https://..."
              error={errors.fotoPrincipalUrl}
            />
          </div>

          <div>
            <FieldLabel>Galería</FieldLabel>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
              }}
            >
              {form.galeriaUrls.map((url, index) => (
                <TextInput
                  key={index}
                  value={url}
                  onChange={(value) => handleGaleriaChange(index, value)}
                  placeholder={`Foto adicional ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </PanelCard>

      <PanelCard
        title="Vista rápida"
        subtitle="Esto te ayuda a revisar si tu información se entiende antes de guardar."
      >
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 22,
            padding: 18,
            background: "#fafafa",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 12,
            }}
          >
            {form.categoriaSlug ? (
              <span
                style={{
                  borderRadius: 999,
                  background: "#f3f4f6",
                  padding: "6px 10px",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {CATEGORIAS.find((x) => x.slug === form.categoriaSlug)?.nombre}
              </span>
            ) : null}

            {comunaBase ? (
              <span
                style={{
                  borderRadius: 999,
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  padding: "6px 10px",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                📍 {comunaBase.nombre}
              </span>
            ) : null}
          </div>

          <div
            style={{
              marginBottom: 10,
              fontSize: 30,
              lineHeight: 1.02,
              fontWeight: 900,
              color: "#111827",
            }}
          >
            {form.nombre || "Nombre del negocio"}
          </div>

          <div
            style={{
              marginBottom: 10,
              fontSize: 16,
              lineHeight: 1.6,
              color: "#4b5563",
            }}
          >
            {form.descripcionCorta ||
              "Aquí aparecerá una frase clara sobre tu negocio."}
          </div>

          <div
            style={{
              fontSize: 14,
              lineHeight: 1.6,
              color: "#374151",
            }}
          >
            <strong>Cobertura:</strong>{" "}
            {form.coberturaTipo === "solo_comuna"
              ? comunaBase
                ? `Solo atiende en ${comunaBase.nombre}`
                : "Solo mi comuna"
              : form.coberturaTipo === "varias_comunas"
              ? "Atiende en varias comunas"
              : form.coberturaTipo === "regional"
              ? "Atiende a nivel regional"
              : "Atiende a nivel nacional"}
          </div>
        </div>
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
          type="button"
          style={{
            minHeight: 50,
            padding: "0 18px",
            borderRadius: 14,
            border: "1px solid #d1d5db",
            background: "#fff",
            color: "#111827",
            fontWeight: 800,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Guardar borrador
        </button>

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
          {isSubmitting ? "Guardando..." : "Publicar negocio"}
        </button>
      </div>
    </form>
  );
}