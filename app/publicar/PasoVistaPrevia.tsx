"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  Categoria,
  Comuna,
  FormData,
  Region,
  Subcategoria,
} from "./PublicarClient";

export default function PasoVistaPrevia({
  form,
  categorias,
  subcategorias,
  comunas,
  regiones,
  prevStep,
  submitForm,
  saving,
}: {
  form: FormData;
  categorias: Categoria[];
  subcategorias: Subcategoria[];
  comunas: Comuna[];
  regiones: Region[];
  prevStep: () => void;
  submitForm: () => void;
  saving: boolean;
}) {
  const categoria = useMemo(() => {
    return categorias.find((c) => c.slug === form.categoriaSlug) || null;
  }, [categorias, form.categoriaSlug]);

  const comunaBase = useMemo(() => {
    return comunas.find((c) => c.slug === form.comunaBase) || null;
  }, [comunas, form.comunaBase]);

  const subcategoriasSeleccionadas = useMemo(() => {
    return subcategorias.filter((s) => form.subcategorias.includes(s.slug));
  }, [subcategorias, form.subcategorias]);

  const comunasCoberturaNombres = useMemo(() => {
    return comunas
      .filter((c) => form.comunasCobertura.includes(c.slug))
      .map((c) => c.nombre);
  }, [comunas, form.comunasCobertura]);

  const regionesCoberturaNombres = useMemo(() => {
    return regiones
      .filter((r) => form.regionesCobertura.includes(r.slug))
      .map((r) => r.nombre);
  }, [regiones, form.regionesCobertura]);

  const modalidadesTexto = useMemo(() => {
    return form.modalidades.map((m) => {
      if (m === "local") return "Local físico";
      if (m === "presencial") return "Atención a domicilio";
      if (m === "online") return "Online";
      return m;
    });
  }, [form.modalidades]);

  const [fotoPrincipalUrl, setFotoPrincipalUrl] = useState<string | null>(null);
  const [galeriaUrls, setGaleriaUrls] = useState<string[]>([]);

  useEffect(() => {
    if (form.fotoPrincipal) {
      const url = URL.createObjectURL(form.fotoPrincipal);
      setFotoPrincipalUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setFotoPrincipalUrl(null);
  }, [form.fotoPrincipal]);

  useEffect(() => {
    const files = form.galeria.slice(0, 6);
    if (files.length === 0) {
      setGaleriaUrls([]);
      return;
    }
    const urls = files.map((f) => URL.createObjectURL(f));
    setGaleriaUrls(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [form.galeria]);

  const coberturaTexto = useMemo(() => {
    if (form.coberturaTipo === "solo_mi_comuna") {
      return comunaBase?.nombre || "Solo mi comuna";
    }

    if (form.coberturaTipo === "varias_comunas") {
      return comunasCoberturaNombres.join(" · ");
    }

    if (form.coberturaTipo === "regional") {
      return regionesCoberturaNombres.join(" · ");
    }

    if (form.coberturaTipo === "nacional") {
      return "Todo Chile";
    }

    return "";
  }, [
    form.coberturaTipo,
    comunaBase,
    comunasCoberturaNombres,
    regionesCoberturaNombres,
  ]);

  return (
    <div style={cardStyle}>
      <h2 style={sectionTitle}>Vista previa</h2>

      <div style={infoBoxStyle}>
        Revisa cómo se verá tu emprendimiento antes de enviarlo para revisión.
      </div>

      <div style={previewGridStyle}>
        <div style={previewColumnStyle}>
          <h3 style={miniTitleStyle}>Así te verán cuando te busquen</h3>

          <article style={searchCardStyle}>
            <div style={imageMockStyle}>
              {fotoPrincipalUrl ? (
                <img src={fotoPrincipalUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                "Foto principal"
              )}
            </div>

            <div style={{ padding: 18 }}>
              <div style={badgeStyle}>
                {comunaBase ? `📍 ${comunaBase.nombre}` : "📍 Tu comuna"}
              </div>
              {coberturaTexto ? (
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
                  También atiende en: {coberturaTexto}
                </div>
              ) : null}

              <h4 style={cardTitleStyle}>
                {form.nombre || "Nombre de tu emprendimiento"}
              </h4>

              {(categoria || subcategoriasSeleccionadas.length > 0) ? (
                <>
                  {categoria ? (
                    <div style={metaStyle}>{categoria.nombre}</div>
                  ) : null}
                  {subcategoriasSeleccionadas.length ? (
                    <div style={chipsWrapStyle}>
                      {subcategoriasSeleccionadas.slice(0, 3).map((sub) => (
                        <span key={sub.id} style={chipStyle}>
                          {sub.nombre}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : (
                <div style={metaStyle}>Categoría: en revisión</div>
              )}

              {modalidadesTexto.length > 0 ? (
                <div style={{ fontSize: 13, color: "#4b5563", marginBottom: 8 }}>
                  {form.modalidades.map((m) => {
                    if (m === "local") return <span key={m}>🏪 Local físico </span>;
                    if (m === "presencial") return <span key={m}>🚚 Atención a domicilio </span>;
                    if (m === "online") return <span key={m}>💻 Online </span>;
                    return null;
                  })}
                </div>
              ) : null}

              <p style={descStyle}>
                {form.fraseNegocio.trim() ||
                  form.descripcionNegocio.trim().slice(0, 160) ||
                  "Aquí aparecerá la frase o descripción de tu emprendimiento."}
              </p>

              <div style={fakeButtonRowStyle}>
                <span style={darkFakeButtonStyle}>Ver detalles</span>
                <span style={greenFakeButtonStyle}>WhatsApp</span>
              </div>
            </div>
          </article>
        </div>

        <div style={previewColumnStyle}>
          <h3 style={miniTitleStyle}>Así se verá tu ficha completa</h3>

          <section style={detailCardStyle}>
            <div style={heroImageMockStyle}>
              {fotoPrincipalUrl ? (
                <img src={fotoPrincipalUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                "Foto principal"
              )}
            </div>

            <div style={{ padding: 22 }}>
              <h3 style={detailTitleStyle}>
                {form.nombre || "Nombre de tu emprendimiento"}
              </h3>
              {form.fraseNegocio.trim() ? (
                <p style={{ fontSize: 15, color: "#4b5563", fontWeight: 600, marginBottom: 12 }}>
                  {form.fraseNegocio.trim()}
                </p>
              ) : null}

              <div style={detailMetaWrapStyle}>
                {comunaBase ? (
                  <span style={detailMetaItemStyle}>📍 {comunaBase.nombre}</span>
                ) : null}

                {categoria ? (
                  <span style={detailMetaItemStyle}>{categoria.nombre}</span>
                ) : (
                  <span style={detailMetaItemStyle}>Categoría: en revisión</span>
                )}
              </div>

              <div style={ctaRowStyle}>
                <span style={greenFakeButtonStyle}>WhatsApp</span>

                {form.instagram ? (
                  <span style={lightFakeButtonStyle}>Instagram</span>
                ) : null}

                {form.web ? (
                  <span style={lightFakeButtonStyle}>Sitio web</span>
                ) : null}
              </div>

              <div style={sectionPreviewStyle}>
                <div style={sectionPreviewTitleStyle}>Descripción</div>
                <p style={sectionPreviewTextStyle}>
                  {form.fraseNegocio.trim() ? (
                    <>
                      <span style={{ fontWeight: 700 }}>{form.fraseNegocio.trim()}</span>
                      <br />
                      <br />
                      {form.descripcionNegocio.trim() || "—"}
                    </>
                  ) : (
                    form.descripcionNegocio.trim() || "Aquí aparecerá la descripción de tu emprendimiento."
                  )}
                </p>
              </div>

              <div style={sectionPreviewStyle}>
                <div style={sectionPreviewTitleStyle}>Modalidad de atención</div>
                <p style={sectionPreviewTextStyle}>
                  {modalidadesTexto.length
                    ? modalidadesTexto.join(" · ")
                    : "Aquí aparecerán tus modalidades de atención."}
                </p>
              </div>

              {(form.locales?.length ?? 0) > 0 ? (
                <div style={sectionPreviewStyle}>
                  <div style={sectionPreviewTitleStyle}>Locales físicos</div>
                  <div style={sectionPreviewTextStyle}>
                    {form.locales!.map((loc, i) => {
                      const comuna = comunas.find((c) => c.slug === loc.comuna_slug);
                      const comunaNombre = (comuna?.nombre ?? loc.comuna_slug) || "";
                      return (
                        <p key={i} style={{ marginBottom: 6 }}>
                          📍 {loc.direccion.trim() || "—"} {comunaNombre ? `– ${comunaNombre}` : ""}
                        </p>
                      );
                    })}
                  </div>
                </div>
              ) : form.direccion ? (
                <div style={sectionPreviewStyle}>
                  <div style={sectionPreviewTitleStyle}>Dirección</div>
                  <p style={sectionPreviewTextStyle}>{form.direccion}</p>
                </div>
              ) : null}

              <div style={sectionPreviewStyle}>
                <div style={sectionPreviewTitleStyle}>Cobertura</div>
                <p style={sectionPreviewTextStyle}>
                  {coberturaTexto || "Aquí aparecerá tu cobertura."}
                </p>
              </div>

              {form.galeria.length ? (
                <div style={sectionPreviewStyle}>
                  <div style={sectionPreviewTitleStyle}>Galería</div>

                  <div style={galleryMockGridStyle}>
                    {galeriaUrls.map((url, i) => (
                      <div key={i} style={galleryItemMockStyle}>
                        <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 10 }} />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>

      <div style={footerStyle}>
        <p style={submitMessageStyle}>
          Revisaremos tu emprendimiento antes de publicarlo para asegurar que la información sea clara y útil.
        </p>
        <div style={footerButtonsWrapStyle}>
          <button type="button" onClick={prevStep} style={secondaryButtonStyle}>
            Volver
          </button>
          <button
            type="button"
            onClick={submitForm}
            disabled={saving}
            style={{
              ...primaryButtonStyle,
              opacity: saving ? 0.6 : 1,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Enviando..." : "Enviar para revisión"}
          </button>
        </div>
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

const sectionTitle: React.CSSProperties = {
  margin: "0 0 18px",
  fontSize: 28,
  fontWeight: 900,
  lineHeight: 1.05,
  letterSpacing: "-0.02em",
  color: "#111827",
};

const infoBoxStyle: React.CSSProperties = {
  marginBottom: 18,
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  color: "#1e3a8a",
  borderRadius: 14,
  padding: 14,
  fontSize: 14,
  lineHeight: 1.55,
};

const previewGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 22,
};

const previewColumnStyle: React.CSSProperties = {
  minWidth: 0,
};

const miniTitleStyle: React.CSSProperties = {
  margin: "0 0 12px",
  fontSize: 18,
  fontWeight: 900,
  color: "#111827",
};

const searchCardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 22,
  overflow: "hidden",
  background: "#fff",
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
};

const imageMockStyle: React.CSSProperties = {
  aspectRatio: "4 / 3",
  background: "#f3f4f6",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#6b7280",
  fontWeight: 700,
  fontSize: 13,
  textAlign: "center",
  padding: 12,
  overflow: "hidden",
};

const badgeStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
  color: "#2563eb",
  marginBottom: 8,
};

const cardTitleStyle: React.CSSProperties = {
  margin: "0 0 6px",
  fontSize: 24,
  lineHeight: 1.1,
  fontWeight: 900,
  color: "#111827",
};

const metaStyle: React.CSSProperties = {
  fontSize: 14,
  color: "#6b7280",
  marginBottom: 10,
};

const chipsWrapStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginBottom: 10,
};

const chipStyle: React.CSSProperties = {
  fontSize: 12,
  background: "#f3f4f6",
  color: "#374151",
  borderRadius: 999,
  padding: "6px 10px",
  fontWeight: 700,
};

const descStyle: React.CSSProperties = {
  margin: "0 0 14px",
  color: "#4b5563",
  lineHeight: 1.6,
  fontSize: 15,
};

const fakeButtonRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const darkFakeButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 40,
  padding: "0 14px",
  borderRadius: 12,
  background: "#111827",
  color: "#fff",
  fontWeight: 800,
  fontSize: 13,
};

const greenFakeButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 40,
  padding: "0 14px",
  borderRadius: 12,
  background: "#22c55e",
  color: "#fff",
  fontWeight: 800,
  fontSize: 13,
};

const lightFakeButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 40,
  padding: "0 14px",
  borderRadius: 12,
  background: "#f3f4f6",
  color: "#111827",
  fontWeight: 800,
  fontSize: 13,
};

const detailCardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 22,
  overflow: "hidden",
  background: "#fff",
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
};

const heroImageMockStyle: React.CSSProperties = {
  aspectRatio: "16 / 8",
  background: "#f3f4f6",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#6b7280",
  fontWeight: 700,
  fontSize: 13,
  textAlign: "center",
  padding: 12,
  overflow: "hidden",
};

const detailTitleStyle: React.CSSProperties = {
  margin: "0 0 10px",
  fontSize: 30,
  fontWeight: 900,
  lineHeight: 1.05,
  color: "#111827",
};

const detailMetaWrapStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  marginBottom: 14,
};

const detailMetaItemStyle: React.CSSProperties = {
  fontSize: 14,
  color: "#4b5563",
  fontWeight: 700,
};

const ctaRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginBottom: 18,
};

const sectionPreviewStyle: React.CSSProperties = {
  marginTop: 16,
  paddingTop: 16,
  borderTop: "1px solid #e5e7eb",
};

const sectionPreviewTitleStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 900,
  color: "#111827",
  marginBottom: 8,
};

const sectionPreviewTextStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 14,
  color: "#4b5563",
  lineHeight: 1.65,
};

const galleryMockGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0,1fr))",
  gap: 10,
};

const galleryItemMockStyle: React.CSSProperties = {
  aspectRatio: "1 / 1",
  background: "#f3f4f6",
  borderRadius: 12,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#6b7280",
  fontWeight: 700,
  fontSize: 12,
  textAlign: "center",
  padding: 8,
};

const footerStyle: React.CSSProperties = {
  marginTop: 28,
  paddingTop: 20,
  borderTop: "1px solid #e5e7eb",
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

const footerButtonsWrapStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const submitMessageStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 14,
  color: "#4b5563",
  lineHeight: 1.5,
};

const primaryButtonStyle: React.CSSProperties = {
  minHeight: 46,
  padding: "0 18px",
  borderRadius: 12,
  border: "none",
  background: "#111827",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  minHeight: 46,
  padding: "0 18px",
  borderRadius: 12,
  border: "1px solid #d1d5db",
  background: "#fff",
  color: "#111827",
  fontWeight: 800,
  cursor: "pointer",
};