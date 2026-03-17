"use client";

import type { FormData } from "./PublicarClient";

type SetField = <K extends keyof FormData>(key: K, value: FormData[K]) => void;

export default function PasoInformacionBasica({
  form,
  errors,
  setField,
  nextStep,
}: {
  form: FormData;
  errors: Record<string, string>;
  setField: SetField;
  nextStep: () => void;
}) {
  return (
    <div style={cardStyle}>
      <h2 style={titleStyle}>Información básica</h2>

      <div style={gridStyle}>
        <div>
          <label style={labelStyle}>Nombre del emprendimiento *</label>
          <input
            value={form.nombre}
            onChange={(e) => setField("nombre", e.target.value)}
            placeholder="Ej: Gasfitería Maipú Pro"
            style={inputStyle}
          />
          {errors.nombre ? <p style={errorStyle}>{errors.nombre}</p> : null}
        </div>

        <div>
          <label style={labelStyle}>Frase del negocio (opcional)</label>
          <input
            type="text"
            value={form.fraseNegocio}
            onChange={(e) => setField("fraseNegocio", e.target.value.slice(0, 120))}
            placeholder="Ej: Pan amasado todos los días, gasfiter urgente 24 horas, clases de matemáticas para niños"
            maxLength={120}
            style={inputStyle}
          />
          <div style={helperStyle}>
            Se mostrará en la ficha debajo del nombre. Máx. 120 caracteres.
          </div>
        </div>

        <div>
          <label style={labelStyle}>Nombre del responsable *</label>
          <input
            value={form.responsable}
            onChange={(e) => setField("responsable", e.target.value)}
            placeholder="Ej: Rodrigo González"
            style={inputStyle}
          />
          {errors.responsable ? (
            <p style={errorStyle}>{errors.responsable}</p>
          ) : null}

          <div style={helperStyle}>
            Este nombre se usa para validar el emprendimiento. Puedes ocultarlo públicamente.
          </div>

          <label style={checkboxRowStyle}>
            <input
              type="checkbox"
              checked={form.ocultarResponsable}
              onChange={(e) => setField("ocultarResponsable", e.target.checked)}
            />
            <span>No mostrar mi nombre públicamente</span>
          </label>
        </div>

        <div>
          <label style={labelStyle}>Email *</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setField("email", e.target.value)}
            placeholder="nombre@correo.com"
            style={inputStyle}
          />
          <div style={helperStyle}>
            Usa un correo válido. Ejemplo: nombre@correo.com
          </div>
          {errors.email ? <p style={errorStyle}>{errors.email}</p> : null}
        </div>

        <div>
          <label style={labelStyle}>WhatsApp principal *</label>
          <input
            type="tel"
            value={form.whatsapp}
            onChange={(e) => setField("whatsapp", e.target.value)}
            placeholder="+56912345678 o 912345678"
            style={inputStyle}
          />
          <div style={helperStyle}>
            Será el principal medio de contacto con clientes. Acepta 912345678 o +56912345678.
          </div>
          {errors.whatsapp ? (
            <p style={errorStyle}>{errors.whatsapp}</p>
          ) : null}
        </div>

        <div>
          <label style={labelStyle}>WhatsApp secundario (opcional)</label>
          <input
            type="tel"
            value={form.whatsappSecundario}
            onChange={(e) => setField("whatsappSecundario", e.target.value)}
            placeholder="+56987654321"
            style={inputStyle}
          />
          <div style={helperStyle}>
            Máximo 2 WhatsApp por emprendimiento. Debe ser distinto al principal.
          </div>
          {errors.whatsappSecundario ? (
            <p style={errorStyle}>{errors.whatsappSecundario}</p>
          ) : null}
        </div>

        <div>
          <label style={labelStyle}>Instagram</label>
          <input
            value={form.instagram}
            onChange={(e) => setField("instagram", e.target.value)}
            placeholder="@tuemprendimiento o instagram.com/tuemprendimiento"
            style={inputStyle}
          />
          <div style={helperStyle}>
            Acepta usuario (@negocio) o link de Instagram.
          </div>
        </div>

        <div>
          <label style={labelStyle}>Sitio web</label>
          <input
            value={form.web}
            onChange={(e) => setField("web", e.target.value)}
            placeholder="www.tusitio.cl o tusitio.cl"
            style={inputStyle}
          />
          <div style={helperStyle}>
            Acepta dominio con o sin https://. Se guardará con https://
          </div>
        </div>
      </div>

      <div style={footerStyle}>
        <div />

        <button type="button" onClick={nextStep} style={primaryButtonStyle}>
          Continuar
        </button>
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 26,
  padding: 28,
};

const titleStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 900,
  margin: "0 0 20px",
  lineHeight: 1.05,
  letterSpacing: "-0.02em",
  color: "#111827",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0,1fr))",
  gap: 18,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontWeight: 900,
  fontSize: 13,
  marginBottom: 6,
  color: "#111827",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 48,
  borderRadius: 12,
  border: "1px solid #d1d5db",
  padding: "0 14px",
  fontSize: 15,
  color: "#111827",
  background: "#fff",
};

const helperStyle: React.CSSProperties = {
  fontSize: 12,
  marginTop: 6,
  color: "#6b7280",
  lineHeight: 1.5,
};

const helperBoxStyle: React.CSSProperties = {
  fontSize: 12,
  marginTop: 8,
  color: "#374151",
  lineHeight: 1.5,
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: "10px 12px",
};

const errorStyle: React.CSSProperties = {
  color: "#b91c1c",
  fontSize: 12,
  marginTop: 6,
  fontWeight: 700,
};

const checkboxRowStyle: React.CSSProperties = {
  marginTop: 10,
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 13,
  color: "#374151",
};

const footerStyle: React.CSSProperties = {
  marginTop: 28,
  paddingTop: 20,
  borderTop: "1px solid #e5e7eb",
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
};

const primaryButtonStyle: React.CSSProperties = {
  background: "#111827",
  color: "#fff",
  border: "none",
  padding: "12px 20px",
  borderRadius: 12,
  fontWeight: 800,
  cursor: "pointer",
};