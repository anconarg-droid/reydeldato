"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  calcularCompletitudDesdeFormulario,
  type PerfilCompleto,
} from "@/lib/calcularCompletitudEmprendedor";
import { isPersistibleFotoUrl } from "@/lib/isPersistibleFotoUrl";

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
  regionesCoberturaSlugs: string[];

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
  regionesCoberturaSlugs: [],

  modalidadesAtencion: [],

  descripcionCorta: "",
  descripcionLarga: "",

  whatsapp: "",
  instagram: "",
  web: "",
  email: "",

  fotoPrincipalUrl: "",
  galeriaUrls: Array.from({ length: 8 }, () => ""),
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
  dense = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  type?: string;
  dense?: boolean;
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
          minHeight: dense ? 40 : 50,
          borderRadius: dense ? 10 : 14,
          border: error ? "1px solid #dc2626" : "1px solid #d1d5db",
          padding: dense ? "0 10px" : "0 14px",
          fontSize: dense ? 13 : 15,
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

const NF_UPGRADE_STYLES = `
.nf-upgrade-root{width:100%;max-width:1320px;margin:0 auto;box-sizing:border-box}
@media (max-width:1023px){
  .nf-upgrade-root{display:flex;flex-direction:column;gap:20px}
  .nf-upgrade-p{order:1}.nf-upgrade-v{order:2}.nf-upgrade-g{order:3}.nf-upgrade-d{order:4}.nf-upgrade-c{order:5}.nf-upgrade-pr{order:6}.nf-upgrade-s{order:7}
  .nf-upgrade-s{
    position:sticky;
    bottom:0;
    z-index:30;
    margin-top:8px;
    padding-top:12px;
    padding-bottom:max(12px, env(safe-area-inset-bottom, 0px));
    background:linear-gradient(180deg, rgba(249,250,251,0) 0%, rgba(249,250,251,0.94) 12%, #f9fafb 20%, #f9fafb 100%);
    border-top:1px solid #e5e7eb;
  }
}
@media (min-width:1024px){
  .nf-upgrade-root{
    display:grid;
    grid-template-columns:1.05fr 0.95fr;
    gap:clamp(20px,2.5vw,32px);
    align-items:start
  }
  .nf-upgrade-p,.nf-upgrade-v,.nf-upgrade-g,.nf-upgrade-d,.nf-upgrade-c,.nf-upgrade-s{grid-column:1}
  .nf-upgrade-pr{
    grid-column:2;
    grid-row:1/7;
    position:sticky;
    top:max(1rem, env(safe-area-inset-top, 0px));
    align-self:start;
    max-height:min(100dvh - 2.75rem, 100vh - 2.75rem);
    overflow:auto;
    overscroll-behavior:contain;
    scrollbar-gutter:stable
  }
}
.nf-mejorar-ficha-banner{
  margin-bottom:16px;
  padding:12px 16px;
  border-radius:14px;
  border:1px solid #fde68a;
  background:linear-gradient(180deg,#fffbeb 0%,#fff 100%);
  box-shadow:0 4px 14px rgba(245,158,11,0.12);
}
.nf-mejorar-ficha-banner-title{
  margin:0 0 4px;
  font-size:15px;
  font-weight:900;
  color:#78350f;
  letter-spacing:-0.02em;
}
.nf-mejorar-ficha-banner-text{
  margin:0;
  font-size:13px;
  line-height:1.45;
  color:#92400e;
  font-weight:600;
}
.nf-mejorar-foco-dim{
  opacity:0.38;
  filter:saturate(0.88);
  transition:opacity 0.25s ease, filter 0.25s ease;
  pointer-events:auto;
}
.nf-mejorar-foco-highlight{
  scroll-margin-top:96px;
  outline:3px solid rgba(245,158,11,0.88);
  outline-offset:6px;
  border-radius:20px;
  transition:outline-color 0.35s ease;
  animation:nf-mejorar-foco-pulse 3s ease-out 1;
}
@keyframes nf-mejorar-foco-pulse{
  0%,100%{outline-color:rgba(245,158,11,0.88);}
  40%{outline-color:rgba(251,191,36,1);}
}
`;

type MejorarFichaFocusQ = "fotos" | "descripcion" | "redes";

function upgradeFocoWrap(
  zone:
    | "fotos-main"
    | "fotos-gal"
    | "redes"
    | "desc-larga"
    | "desc-corta"
    | "meta",
  focus: MejorarFichaFocusQ | null | undefined
): string {
  if (!focus) return "";
  if (zone === "meta") return "nf-mejorar-foco-dim";
  const hit =
    (focus === "fotos" && (zone === "fotos-main" || zone === "fotos-gal")) ||
    (focus === "redes" && zone === "redes") ||
    (focus === "descripcion" &&
      (zone === "desc-larga" || zone === "desc-corta"));
  if (hit) return "nf-mejorar-foco-highlight";
  return "nf-mejorar-foco-dim";
}

function upgradeFocoDimIfActive(
  focus: MejorarFichaFocusQ | null | undefined
): string {
  return focus ? "nf-mejorar-foco-dim" : "";
}

function upgradeFocoDescCorta(
  focus: MejorarFichaFocusQ | null | undefined
): string {
  if (!focus) return "";
  if (focus === "descripcion") return "nf-mejorar-foco-highlight";
  return "nf-mejorar-foco-dim";
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

function coberturaResumen(
  form: FormState,
  comunaBase: ComunaOption | undefined
): string {
  if (form.coberturaTipo === "solo_comuna") {
    return comunaBase
      ? `Solo atiende en ${comunaBase.nombre}`
      : "Solo mi comuna";
  }
  if (form.coberturaTipo === "varias_comunas") {
    return "Atiende en varias comunas";
  }
  if (form.coberturaTipo === "regional") {
    return "Atiende a nivel regional";
  }
  return "Atiende a nivel nacional";
}

function modalidadEtiquetas(form: FormState): string[] {
  const out: string[] = [];
  if (form.modalidadesAtencion.includes("local_fisico")) out.push("Local físico");
  if (form.modalidadesAtencion.includes("domicilio")) out.push("A domicilio");
  if (form.modalidadesAtencion.includes("online")) out.push("Online");
  return out;
}

function normalizarWaHref(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  if (d.length < 8) return null;
  const n = d.startsWith("56") ? d : `56${d.replace(/^0+/, "")}`;
  return `https://wa.me/${n}`;
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

async function uploadPanelImageFile(file: File, folder: string): Promise<string> {
  const base64 = await fileToDataUrl(file);
  const res = await fetch("/api/upload-base64", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, base64, folder }),
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok || !data?.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : "No se pudo subir la imagen"
    );
  }
  const publicUrl = extractUploadPublicUrl(data);
  if (!publicUrl || !isPersistibleFotoUrl(publicUrl)) {
    throw new Error(
      "No se obtuvo una URL de imagen válida. Revisa el almacenamiento (Supabase) en el proyecto."
    );
  }
  return publicUrl;
}

function appendGaleriaUrlToFirstEmpty(slots: string[], url: string): string[] {
  const out = [...slots];
  const idx = out.findIndex((u) => !String(u).trim());
  if (idx === -1) return out;
  out[idx] = url;
  return out;
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

function UpgradeLivePreview({
  form,
  comunaBase,
}: {
  form: FormState;
  comunaBase: ComunaOption | undefined;
}) {
  const galeriaFilled = form.galeriaUrls
    .map((u) => u.trim())
    .filter(Boolean);
  const hasHero = form.fotoPrincipalUrl.trim().length > 0;
  const [heroOk, setHeroOk] = useState(true);
  const waHref = normalizarWaHref(form.whatsapp);
  const mods = modalidadEtiquetas(form);

  return (
    <section
      className="nf-upgrade-live-preview"
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 28,
        background: "#fff",
        boxShadow: "0 18px 50px rgba(15,23,42,0.08)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "clamp(168px, min(32vh, 28vw), 280px)",
          minHeight: 168,
          maxHeight: 280,
          background: hasHero && heroOk
            ? undefined
            : "linear-gradient(145deg, #f1f5f9 0%, #e2e8f0 45%, #cbd5f5 100%)",
          position: "relative",
        }}
      >
        {hasHero && heroOk ? (
          <img
            src={form.fotoPrincipalUrl}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
            onError={() => setHeroOk(false)}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#64748b",
              fontSize: 14,
              fontWeight: 600,
              padding: 24,
              textAlign: "center",
            }}
          >
            Vista previa · Agrega una foto principal para destacar
          </div>
        )}
      </div>

      <div style={{ padding: "22px 24px 26px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
          {form.categoriaSlug ? (
            <span
              style={{
                borderRadius: 999,
                background: "#f3f4f6",
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 700,
                color: "#374151",
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
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {comunaBase.nombre}
            </span>
          ) : (
            <span
              style={{
                borderRadius: 999,
                background: "#f9fafb",
                color: "#6b7280",
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Comuna pendiente
            </span>
          )}
        </div>

        <h2
          style={{
            margin: "0 0 10px",
            fontSize: 26,
            lineHeight: 1.15,
            fontWeight: 900,
            color: "#0f172a",
          }}
        >
          {form.nombre.trim() || "Nombre de tu negocio"}
        </h2>

        <p
          style={{
            margin: "0 0 16px",
            fontSize: 16,
            lineHeight: 1.55,
            color: "#475569",
          }}
        >
          {form.descripcionCorta.trim() ||
            "Tu frase o descripción corta aparecerá aquí."}
        </p>

        {galeriaFilled.length > 0 ? (
          <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
            {galeriaFilled.slice(0, 8).map((u, i) => (
              <img
                key={`${i}-${u.slice(0, 24)}`}
                src={u}
                alt=""
                style={{
                  width: 72,
                  height: 72,
                  objectFit: "cover",
                  borderRadius: 12,
                  flexShrink: 0,
                  border: "1px solid #e2e8f0",
                }}
                referrerPolicy="no-referrer"
              />
            ))}
          </div>
        ) : null}

        <div
          style={{
            fontSize: 14,
            color: "#334155",
            lineHeight: 1.55,
            marginBottom: 12,
          }}
        >
          <strong style={{ color: "#0f172a" }}>Cobertura:</strong>{" "}
          {coberturaResumen(form, comunaBase)}
        </div>

        {mods.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {mods.map((m) => (
              <span
                key={m}
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  color: "#475569",
                }}
              >
                {m}
              </span>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 16 }}>
            Indica cómo atiendes en configuración avanzada.
          </p>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
          {form.instagram.trim() ? (
            <a
              href={`https://instagram.com/${form.instagram.replace(/^@/, "")}`}
              target="_blank"
              rel="noreferrer"
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#c026d3",
                textDecoration: "none",
              }}
            >
              Instagram
            </a>
          ) : null}
          {form.web.trim() ? (
            <a
              href={
                form.web.startsWith("http") ? form.web : `https://${form.web}`
              }
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: 13, fontWeight: 700, color: "#2563eb", textDecoration: "none" }}
            >
              Sitio web
            </a>
          ) : null}
        </div>

        {waHref ? (
          <a
            href={waHref}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "block",
              textAlign: "center",
              padding: "14px 18px",
              borderRadius: 14,
              background: "#16a34a",
              color: "#fff",
              fontWeight: 800,
              fontSize: 16,
              textDecoration: "none",
            }}
          >
            Hablar por WhatsApp
          </a>
        ) : (
          <div
            style={{
              textAlign: "center",
              padding: "14px 18px",
              borderRadius: 14,
              background: "#e2e8f0",
              color: "#64748b",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            Agrega un WhatsApp válido en avanzado para activar el botón
          </div>
        )}
      </div>
    </section>
  );
}

export default function NegocioForm({
  id,
  mode = "full",
  focus = null,
}: {
  id?: string;
  mode?: "full" | "upgrade";
  focus?: MejorarFichaFocusQ | null;
}) {
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savedOk, setSavedOk] = useState("");
  const fotoPrincipalFileRef = useRef<HTMLInputElement>(null);
  const galeriaFileRef = useRef<HTMLInputElement>(null);
  const [fotoPrincipalUploading, setFotoPrincipalUploading] = useState(false);
  const [galeriaUploading, setGaleriaUploading] = useState(false);
  const [fotoPrincipalMsg, setFotoPrincipalMsg] = useState("");
  const [galeriaMsg, setGaleriaMsg] = useState("");

  const isUpgradeMode = mode === "upgrade";
  const showEmailInUpgrade = !isUpgradeMode || !form.email.trim();

  const subcategoriasDisponibles = useMemo(() => {
    if (!form.categoriaSlug) return [];
    return SUBCATEGORIAS.filter(
      (item) => item.categoriaSlug === form.categoriaSlug
    );
  }, [form.categoriaSlug]);

  const comunaBase = useMemo(() => {
    return COMUNAS.find((c) => c.slug === form.comunaBaseSlug);
  }, [form.comunaBaseSlug]);

  const completitud: PerfilCompleto | null = useMemo(() => {
    if (!id || loading) return null;
    return calcularCompletitudDesdeFormulario({
      nombre: form.nombre,
      whatsapp: form.whatsapp,
      fotoPrincipalUrl: form.fotoPrincipalUrl,
      descripcionCorta: form.descripcionCorta,
      comunaBaseSlug: form.comunaBaseSlug,
      categoriaSlug: form.categoriaSlug,
      coberturaTipo: form.coberturaTipo,
      comunasCoberturaSlugs: form.comunasCoberturaSlugs,
      regionesCoberturaSlugs: form.regionesCoberturaSlugs,
      modalidadesAtencion: form.modalidadesAtencion,
      instagram: form.instagram,
      web: form.web,
      descripcionLarga: form.descripcionLarga,
      galeriaUrls: form.galeriaUrls,
    });
  }, [
    id,
    loading,
    form.nombre,
    form.whatsapp,
    form.fotoPrincipalUrl,
    form.descripcionCorta,
    form.comunaBaseSlug,
    form.categoriaSlug,
    form.coberturaTipo,
    form.comunasCoberturaSlugs,
    form.regionesCoberturaSlugs,
    form.modalidadesAtencion,
    form.instagram,
    form.web,
    form.descripcionLarga,
    form.galeriaUrls,
  ]);

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
        const rawGaleria = Array.isArray(item.galeriaUrls) ? item.galeriaUrls : [];
        const galeriaUrlsNormalized: string[] = Array.from({ length: 8 }, (_, i) =>
          i < rawGaleria.length ? String(rawGaleria[i] ?? "").trim() : ""
        );

        setForm((prev) => ({
          ...prev,
          ...item,
          galeriaUrls: galeriaUrlsNormalized,
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

  useEffect(() => {
    if (!isUpgradeMode || !focus || loading) return;
    const anchor: Record<MejorarFichaFocusQ, string> = {
      fotos: "mejorar-ficha-foco-fotos",
      redes: "mejorar-ficha-foco-redes",
      descripcion: "mejorar-ficha-foco-descripcion",
    };
    const t = window.setTimeout(() => {
      document.getElementById(anchor[focus])?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 140);
    return () => window.clearTimeout(t);
  }, [isUpgradeMode, focus, loading, id]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined, general: undefined }));
    setSavedOk("");
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
      regionesCoberturaSlugs:
        cobertura === "regional" ? prev.regionesCoberturaSlugs : [],
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
    if (!file.type.startsWith("image/")) {
      setFotoPrincipalMsg("El archivo debe ser una imagen (JPG, PNG, etc.).");
      return;
    }
    setFotoPrincipalUploading(true);
    setFotoPrincipalMsg("");
    try {
      const url = await uploadPanelImageFile(file, "panel/foto-principal");
      updateField("fotoPrincipalUrl", url);
    } catch (err) {
      setFotoPrincipalMsg(
        err instanceof Error ? err.message : "No se pudo subir la foto principal."
      );
    } finally {
      setFotoPrincipalUploading(false);
    }
  }

  async function handleGaleriaFilesPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    e.target.value = "";
    if (!files?.length) return;

    const room = 8 - form.galeriaUrls.filter((u) => u.trim()).length;
    if (room <= 0) {
      setGaleriaMsg("Ya tienes 8 fotos. Quita alguna antes de añadir más.");
      return;
    }

    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      setGaleriaMsg("Selecciona archivos de imagen.");
      return;
    }

    const take = imageFiles.slice(0, room);
    if (imageFiles.length > room) {
      setGaleriaMsg(
        `Solo hay espacio para ${room} foto(s) más; se subirán las primeras ${take.length}.`
      );
    } else {
      setGaleriaMsg("");
    }

    setGaleriaUploading(true);
    let next = [...form.galeriaUrls];
    try {
      for (const file of take) {
        const url = await uploadPanelImageFile(file, "panel/galeria");
        next = appendGaleriaUrlToFirstEmpty(next, url);
      }
      updateField("galeriaUrls", next);
      if (imageFiles.length <= room) setGaleriaMsg("");
    } catch (err) {
      setGaleriaMsg(
        err instanceof Error ? err.message : "No se pudo subir una o más fotos."
      );
    } finally {
      setGaleriaUploading(false);
    }
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

      setSavedOk("Cambios guardados correctamente.");
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
      {savedOk ? (
        <div
          style={{
            border: "1px solid #86efac",
            background: "#ecfdf5",
            color: "#166534",
            borderRadius: 16,
            padding: 14,
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          {savedOk}
        </div>
      ) : null}

      {isUpgradeMode ? (
        <>
          <style dangerouslySetInnerHTML={{ __html: NF_UPGRADE_STYLES }} />
          {focus ? (
            <div className="nf-mejorar-ficha-banner" role="status">
              <p className="nf-mejorar-ficha-banner-title">Mejora rápida</p>
              <p className="nf-mejorar-ficha-banner-text">
                {focus === "fotos"
                  ? "Actualiza tu foto principal y suma imágenes a la galería."
                  : focus === "redes"
                    ? "Indica Instagram y sitio web para que te encuentren."
                    : "Mejora tu descripción detallada aquí y la corta en «Datos de tu negocio»."}
              </p>
            </div>
          ) : null}
          <div className="nf-upgrade-root">
            <div
              className={`nf-upgrade-p ${upgradeFocoWrap("meta", focus)}`.trim()}
            >
              {completitud ? (
                <section
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: 20,
                    background: "linear-gradient(180deg,#ffffff 0%,#f8fafc 100%)",
                    padding: "18px 20px",
                    boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 16,
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <h2
                        style={{
                          margin: 0,
                          fontSize: 20,
                          fontWeight: 900,
                          color: "#0f172a",
                          letterSpacing: "-0.02em",
                          lineHeight: 1.15,
                        }}
                      >
                        Completar mi ficha
                      </h2>
                      <p
                        style={{
                          margin: "6px 0 0",
                          fontSize: 14,
                          lineHeight: 1.5,
                          color: "#64748b",
                        }}
                      >
                        {completitud.subtituloPagina}
                      </p>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div
                        style={{
                          fontSize: 24,
                          fontWeight: 900,
                          color: "#0f172a",
                          lineHeight: 1,
                        }}
                      >
                        {completitud.porcentaje}%
                      </div>
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 10,
                          fontWeight: 800,
                          color: "#94a3b8",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        Completitud
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      height: 8,
                      borderRadius: 999,
                      background: "#e5e7eb",
                      overflow: "hidden",
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${completitud.porcentaje}%`,
                        borderRadius: 999,
                        background:
                          completitud.porcentaje < 50
                            ? "#dc2626"
                            : completitud.porcentaje < 80
                              ? "#ca8a04"
                              : "#16a34a",
                        transition: "width 0.25s ease",
                      }}
                    />
                  </div>

                  <p
                    style={{
                      margin: "0 0 12px",
                      fontSize: 13,
                      lineHeight: 1.55,
                      color: "#475569",
                    }}
                  >
                    {completitud.mensajeProgreso}
                  </p>

                  {completitud.faltantes.length > 0 ? (
                    <div
                      style={{
                        borderRadius: 14,
                        background: "#f1f5f9",
                        border: "1px solid #e2e8f0",
                        padding: "12px 14px",
                      }}
                    >
                      <p
                        style={{
                          margin: "0 0 8px",
                          fontSize: 13,
                          fontWeight: 800,
                          color: "#0f172a",
                        }}
                      >
                        Te faltan {completitud.faltantes.length}{" "}
                        {completitud.faltantes.length === 1 ? "punto" : "puntos"}{" "}
                        para el 100%:
                      </p>
                      <ul
                        style={{
                          margin: 0,
                          paddingLeft: 18,
                          fontSize: 13,
                          color: "#334155",
                          lineHeight: 1.65,
                        }}
                      >
                        {completitud.faltantes.map((f) => (
                          <li key={f.label}>
                            {f.label}{" "}
                            <span style={{ color: "#64748b", fontWeight: 600 }}>
                              (+{f.bonusPuntos}%)
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </section>
              ) : loading ? (
                <section
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 20,
                    background: "#fff",
                    padding: 22,
                    textAlign: "center",
                    fontSize: 14,
                    color: "#64748b",
                    fontWeight: 600,
                  }}
                >
                  Cargando el estado de tu ficha…
                </section>
              ) : null}
            </div>

            <div className="nf-upgrade-v">
              <section
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 22,
                  background: "#fff",
                  padding: 22,
                }}
              >
                <div className={upgradeFocoDimIfActive(focus)}>
                  <h2
                    style={{
                      margin: "0 0 6px",
                      fontSize: 20,
                      fontWeight: 900,
                      color: "#0f172a",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    Haz que tu ficha se vea mejor
                  </h2>
                  <p
                    style={{
                      margin: "0 0 20px",
                      fontSize: 14,
                      lineHeight: 1.55,
                      color: "#64748b",
                    }}
                  >
                    Empieza por la imagen y lo que la gente ve al primer vistazo. Los cambios
                    se reflejan al instante en la vista previa a la derecha.
                  </p>
                </div>

                <div style={{ display: "grid", gap: 22 }}>
                  <div
                    id="mejorar-ficha-foco-fotos"
                    className={upgradeFocoWrap("fotos-main", focus)}
                  >
                    <FieldLabel required>Foto principal</FieldLabel>
                    <p
                      style={{
                        margin: "-4px 0 12px",
                        fontSize: 13,
                        color: "#64748b",
                        lineHeight: 1.45,
                      }}
                    >
                      Sube una imagen desde tu teléfono o computador, o pega un enlace si la
                      foto ya está en internet.
                    </p>
                    <input
                      ref={fotoPrincipalFileRef}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={handleFotoPrincipalFilePick}
                    />
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 12,
                        alignItems: "center",
                        marginBottom: 12,
                      }}
                    >
                      <button
                        type="button"
                        disabled={fotoPrincipalUploading}
                        onClick={() => fotoPrincipalFileRef.current?.click()}
                        style={{
                          minHeight: 46,
                          padding: "0 18px",
                          borderRadius: 12,
                          border: "1px solid #0f172a",
                          background: fotoPrincipalUploading ? "#e2e8f0" : "#0f172a",
                          color: fotoPrincipalUploading ? "#64748b" : "#fff",
                          fontWeight: 800,
                          fontSize: 14,
                          cursor: fotoPrincipalUploading ? "not-allowed" : "pointer",
                        }}
                      >
                        {fotoPrincipalUploading
                          ? "Subiendo…"
                          : "Elegir o subir foto"}
                      </button>
                      <span style={{ fontSize: 13, color: "#64748b" }}>
                        Galería del dispositivo o cámara
                      </span>
                    </div>
                    {fotoPrincipalMsg ? (
                      <p
                        style={{
                          margin: "0 0 12px",
                          fontSize: 13,
                          color: "#b45309",
                          fontWeight: 600,
                        }}
                      >
                        {fotoPrincipalMsg}
                      </p>
                    ) : null}
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 14,
                        alignItems: "flex-start",
                      }}
                    >
                      <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                        <span
                          style={{
                            display: "block",
                            fontSize: 12,
                            fontWeight: 700,
                            color: "#64748b",
                            marginBottom: 6,
                          }}
                        >
                          O pega el enlace de la imagen
                        </span>
                        <TextInput
                          value={form.fotoPrincipalUrl}
                          onChange={(value) => updateField("fotoPrincipalUrl", value)}
                          placeholder="https://…"
                          error={errors.fotoPrincipalUrl}
                        />
                      </div>
                      <div style={{ flex: "0 0 112px" }}>
                        <span
                          style={{
                            display: "block",
                            fontSize: 11,
                            fontWeight: 700,
                            color: "#94a3b8",
                            marginBottom: 6,
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                          }}
                        >
                          Vista previa
                        </span>
                        <UrlThumbPreview url={form.fotoPrincipalUrl} />
                      </div>
                    </div>
                  </div>

                  <div
                    id="mejorar-ficha-foco-redes"
                    className={upgradeFocoWrap("redes", focus)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 18,
                    }}
                  >
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
                  </div>

                  <div
                    id="mejorar-ficha-foco-descripcion"
                    className={upgradeFocoWrap("desc-larga", focus)}
                  >
                    <FieldLabel>Descripción detallada</FieldLabel>
                    <p
                      style={{
                        margin: "-4px 0 10px",
                        fontSize: 13,
                        color: "#64748b",
                        lineHeight: 1.45,
                      }}
                    >
                      Aquí puedes ampliar qué ofreces, horarios o experiencia: es el texto
                      largo que complementa tu frase principal.
                    </p>
                    <TextArea
                      value={form.descripcionLarga}
                      onChange={(value) => updateField("descripcionLarga", value)}
                      placeholder="Por ejemplo: qué servicios das, años de experiencia, zonas donde trabajas a domicilio, promociones…"
                      error={errors.descripcionLarga}
                      rows={6}
                    />
                  </div>
                </div>
              </section>
            </div>

            <div
              className={`nf-upgrade-g ${upgradeFocoWrap("fotos-gal", focus)}`.trim()}
            >
              <section
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 22,
                  background: "#fff",
                  padding: 22,
                }}
              >
                <h2
                  style={{
                    margin: "0 0 6px",
                    fontSize: 20,
                    fontWeight: 900,
                    color: "#0f172a",
                    letterSpacing: "-0.02em",
                  }}
                >
                  Agrega más fotos
                </h2>
                <p
                  style={{
                    margin: "0 0 16px",
                    fontSize: 14,
                    lineHeight: 1.55,
                    color: "#64748b",
                  }}
                >
                  Elige fotos desde tu galería o cámara (hasta{" "}
                  <strong style={{ color: "#334155" }}>8</strong> en total). Se suben al
                  almacenamiento del sitio y quedan listas para tu ficha pública.
                </p>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#334155" }}>
                    Fotos en la galería
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: "#0f172a",
                      padding: "6px 12px",
                      borderRadius: 999,
                      background: "#f1f5f9",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    {
                      form.galeriaUrls.filter((u) => String(u).trim().length > 0)
                        .length
                    }{" "}
                    de 8
                  </span>
                </div>
                <input
                  ref={galeriaFileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: "none" }}
                  onChange={handleGaleriaFilesPick}
                />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
                  <button
                    type="button"
                    disabled={
                      galeriaUploading ||
                      form.galeriaUrls.filter((u) => u.trim()).length >= 8
                    }
                    onClick={() => galeriaFileRef.current?.click()}
                    style={{
                      minHeight: 46,
                      padding: "0 18px",
                      borderRadius: 12,
                      border: "1px solid #0f172a",
                      background:
                        galeriaUploading ||
                        form.galeriaUrls.filter((u) => u.trim()).length >= 8
                          ? "#e2e8f0"
                          : "#0f172a",
                      color:
                        galeriaUploading ||
                        form.galeriaUrls.filter((u) => u.trim()).length >= 8
                          ? "#64748b"
                          : "#fff",
                      fontWeight: 800,
                      fontSize: 14,
                      cursor:
                        galeriaUploading ||
                        form.galeriaUrls.filter((u) => u.trim()).length >= 8
                          ? "not-allowed"
                          : "pointer",
                    }}
                  >
                    {galeriaUploading ? "Subiendo…" : "Elegir fotos del dispositivo"}
                  </button>
                  <span style={{ fontSize: 13, color: "#64748b", alignSelf: "center" }}>
                    Puedes elegir varias a la vez
                  </span>
                </div>
                {galeriaMsg ? (
                  <p
                    style={{
                      margin: "0 0 12px",
                      fontSize: 13,
                      color: "#b45309",
                      fontWeight: 600,
                    }}
                  >
                    {galeriaMsg}
                  </p>
                ) : null}
                {form.galeriaUrls.some((u) => u.trim()) ? (
                  <div style={{ marginBottom: 16 }}>
                    <span
                      style={{
                        display: "block",
                        fontSize: 12,
                        fontWeight: 800,
                        color: "#475569",
                        marginBottom: 10,
                      }}
                    >
                      Tus fotos ({form.galeriaUrls.filter((u) => u.trim()).length})
                    </span>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 12,
                        alignItems: "flex-start",
                      }}
                    >
                      {form.galeriaUrls.map((url, index) =>
                        url.trim() ? (
                          <div
                            key={`${index}-${url.slice(0, 32)}`}
                            style={{
                              width: 92,
                              textAlign: "center",
                              position: "relative",
                            }}
                          >
                            <button
                              type="button"
                              aria-label={`Quitar foto ${index + 1}`}
                              onClick={() =>
                                updateField("galeriaUrls", removeGaleriaAt(form.galeriaUrls, index))
                              }
                              style={{
                                position: "absolute",
                                top: -8,
                                right: -6,
                                width: 26,
                                height: 26,
                                borderRadius: 999,
                                border: "1px solid #e2e8f0",
                                background: "#fff",
                                color: "#64748b",
                                fontWeight: 900,
                                fontSize: 16,
                                lineHeight: 1,
                                cursor: "pointer",
                                boxShadow: "0 2px 8px rgba(15,23,42,0.08)",
                              }}
                            >
                              ×
                            </button>
                            <UrlThumbPreview url={url} />
                            <span
                              style={{
                                display: "block",
                                marginTop: 6,
                                fontSize: 11,
                                fontWeight: 700,
                                color: "#94a3b8",
                              }}
                            >
                              {index + 1}
                            </span>
                          </div>
                        ) : null
                      )}
                    </div>
                  </div>
                ) : (
                  <p
                    style={{
                      margin: "0 0 16px",
                      fontSize: 13,
                      color: "#94a3b8",
                      fontStyle: "italic",
                    }}
                  >
                    Aún no hay fotos en la galería.
                  </p>
                )}
                <details style={{ marginTop: 4 }}>
                  <summary
                    style={{
                      cursor: "pointer",
                      fontSize: 14,
                      fontWeight: 800,
                      color: "#475569",
                    }}
                  >
                    ¿La imagen ya está en internet? Pegar enlaces
                  </summary>
                  <p
                    style={{
                      margin: "12px 0 8px",
                      fontSize: 13,
                      color: "#64748b",
                      lineHeight: 1.45,
                    }}
                  >
                    Una dirección por línea (máximo 8). Útil si la foto ya está en otra web.
                  </p>
                  <TextArea
                    value={galeriaMultilineValue(form.galeriaUrls)}
                    onChange={(value) =>
                      updateField("galeriaUrls", galeriaUrlsFromMultiline(value))
                    }
                    placeholder={
                      "https://ejemplo.cl/foto1.jpg\nhttps://ejemplo.cl/foto2.jpg"
                    }
                    rows={4}
                  />
                </details>
              </section>
            </div>

            <div
              className={`nf-upgrade-pr ${upgradeFocoWrap("meta", focus)}`.trim()}
            >
              <p
                style={{
                  margin: "0 0 10px",
                  fontSize: 11,
                  fontWeight: 800,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Cómo te verán
              </p>
              <UpgradeLivePreview form={form} comunaBase={comunaBase} />
            </div>

            <div className="nf-upgrade-d">
              <section
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 22,
                  background: "#fff",
                  padding: 22,
                }}
              >
                <h2
                  style={{
                    margin: "0 0 6px",
                    fontSize: 20,
                    fontWeight: 900,
                    color: "#0f172a",
                    letterSpacing: "-0.02em",
                  }}
                >
                  Datos de tu negocio
                </h2>
                <p
                  style={{
                    margin: "0 0 20px",
                    fontSize: 14,
                    lineHeight: 1.55,
                    color: "#64748b",
                  }}
                >
                  Nombre, contacto y ubicación: son lo que la gente usa para encontrarte y
                  escribirte. Mantenlos claros y al día.
                </p>

                <div style={{ display: "grid", gap: 22 }}>
                  <div
                    className={upgradeFocoDimIfActive(focus)}
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
                        id="mostrarResponsableUpgrade"
                        type="checkbox"
                        checked={form.mostrarResponsable}
                        onChange={(e) =>
                          updateField("mostrarResponsable", e.target.checked)
                        }
                      />
                      <label
                        htmlFor="mostrarResponsableUpgrade"
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

                  <div className={upgradeFocoDescCorta(focus)}>
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

                  <div
                    className={upgradeFocoDimIfActive(focus)}
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
                    {showEmailInUpgrade ? (
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
                    ) : null}
                  </div>

                  <div
                    className={upgradeFocoDimIfActive(focus)}
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

                  <div className={upgradeFocoDimIfActive(focus)}>
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
                  </div>
                </div>
              </section>
            </div>

            <div
              className={`nf-upgrade-c ${upgradeFocoWrap("meta", focus)}`.trim()}
            >
              <section
                style={{
                  border: "1px solid #e8ecf1",
                  borderRadius: 22,
                  background: "#fafbfd",
                  padding: 22,
                }}
              >
                <h2
                  style={{
                    margin: "0 0 6px",
                    fontSize: 20,
                    fontWeight: 900,
                    color: "#0f172a",
                    letterSpacing: "-0.02em",
                  }}
                >
                  Clasificación del negocio (opcional)
                </h2>
                <p
                  style={{
                    margin: "0 0 20px",
                    fontSize: 14,
                    lineHeight: 1.55,
                    color: "#64748b",
                  }}
                >
                  Si antes usabas categoría en el sitio, puedes mantenerla. No es obligatoria
                  para guardar esta ficha.
                </p>

                <div style={{ display: "grid", gap: 22 }}>
                  <div>
                    <FieldLabel>Categoría principal</FieldLabel>
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

                  <div>
                    <FieldLabel>Subcategorías</FieldLabel>
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
                        background: "#fff",
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
                          Elige una categoría arriba para ver subcategorías disponibles.
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
              </section>
            </div>

            <div className="nf-upgrade-s">
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
                  {isSubmitting
                    ? "Guardando..."
                    : completitud
                      ? completitud.porcentaje < 80
                        ? "Completar mi ficha"
                        : "Seguir mejorando mi ficha"
                      : "Guardar cambios"}
                </button>
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    lineHeight: 1.45,
                    color: "#6b7280",
                    textAlign: "center",
                  }}
                >
                  Los cambios quedan guardados en tu ficha pública al confirmar.
                </p>
              </div>
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
        subtitle="La foto principal es obligatoria. Luego puedes agregar hasta 8 imágenes en la galería."
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