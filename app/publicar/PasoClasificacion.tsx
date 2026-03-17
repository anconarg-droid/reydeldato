"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Categoria, FormData, Subcategoria } from "./PublicarClient";

type ToggleArrayValue = (
  key: "modalidades" | "comunasCobertura" | "regionesCobertura" | "subcategorias",
  value: string,
  max?: number
) => void;

type SetField = <K extends keyof FormData>(key: K, value: FormData[K]) => void;

type ClasificacionAISugerida = {
  tipoActividad: "venta" | "servicio" | "arriendo";
  sectorSlug: string;
  tags: string[];
  confianza: number;
};

const IS_DEV = process.env.NODE_ENV !== "production";

export default function PasoClasificacion({
  form,
  errors,
  categorias,
  subcategorias,
  setField,
  toggleArrayValue,
  prevStep,
  submitForm,
}: {
  form: FormData;
  errors: Record<string, string>;
  categorias: Categoria[];
  subcategorias: Subcategoria[];
  setField: SetField;
  toggleArrayValue: ToggleArrayValue;
  prevStep: () => void;
  submitForm: () => void;
}) {
  const categoriaActiva =
    categorias.find((c) => c.slug === form.categoriaSlug) || null;

  const [aiDescripcion, setAiDescripcion] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiSugerencia, setAiSugerencia] = useState<ClasificacionAISugerida | null>(null);
  const [manualTag, setManualTag] = useState("");
  const [nuevoTagTexto, setNuevoTagTexto] = useState("");
  const [nuevoTagMensaje, setNuevoTagMensaje] = useState("");
  const [nuevoTagLoading, setNuevoTagLoading] = useState(false);
  const [debugOpenAI, setDebugOpenAI] = useState<{
    descripcion: string;
    raw_content: string;
    parsed: unknown;
  } | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  // Sincronizar sugerencia de clasificación al estado del formulario para que /api/publicar la reciba
  const lastClasificacionRef = useRef<string>("");
  useEffect(() => {
    if (!aiSugerencia) {
      if (lastClasificacionRef.current !== "") {
        lastClasificacionRef.current = "";
        setField("clasificacion", null);
      }
      return;
    }
    const payload = JSON.stringify({
      t: aiSugerencia.tipoActividad,
      s: aiSugerencia.sectorSlug,
      tags: [...aiSugerencia.tags].sort(),
      c: aiSugerencia.confianza,
    });
    if (lastClasificacionRef.current === payload) return;
    lastClasificacionRef.current = payload;
    setField("clasificacion", {
      tipo_actividad: aiSugerencia.tipoActividad,
      sector_slug: aiSugerencia.sectorSlug,
      tags_slugs: [...aiSugerencia.tags],
      keywords_clasificacion: [],
      clasificacion_confianza: aiSugerencia.confianza,
      clasificacion_fuente: "openai_v1",
    });
  }, [aiSugerencia, setField]);

  const subcategoriasDisponibles = useMemo(() => {
    if (!categoriaActiva) return [];

    return [...subcategorias]
      .filter((s) => s.categoria_id === categoriaActiva.id)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [categoriaActiva, subcategorias]);

  const totalSeleccionadas = form.subcategorias.length;

  const sectoresOpciones = [
    { slug: "alimentacion", nombre: "Alimentación" },
    { slug: "hogar_construccion", nombre: "Hogar y construcción" },
    { slug: "automotriz", nombre: "Automotriz" },
    { slug: "salud_bienestar", nombre: "Salud y bienestar" },
    { slug: "belleza_estetica", nombre: "Belleza y estética" },
    { slug: "mascotas", nombre: "Mascotas" },
    { slug: "eventos", nombre: "Eventos" },
    { slug: "educacion_clases", nombre: "Educación y clases" },
    { slug: "tecnologia", nombre: "Tecnología" },
    { slug: "comercio_tiendas", nombre: "Comercio y tiendas" },
    { slug: "transporte_fletes", nombre: "Transporte y fletes" },
    { slug: "jardin_agricultura", nombre: "Jardín y agricultura" },
    { slug: "profesionales_asesorias", nombre: "Profesionales y asesorías" },
    { slug: "turismo_alojamiento", nombre: "Turismo y alojamiento" },
    { slug: "otros", nombre: "Otros" },
  ];

  const tagsCatalogoBasico = [
    "gasfiter",
    "electricista",
    "maestro_carpintero",
    "pintor",
    "cerrajero",
    "panaderia",
    "pasteleria",
    "comida_a_domicilio",
    "taller_mecanico",
    "lavado_auto",
    "veterinaria",
    "peluqueria_canina",
    "peluqueria",
    "manicure",
    "clases_matematicas",
    "clases_idiomas",
    "fletes",
    "mudanzas",
    "abogado",
    "contador",
    "alojamiento_cabana",
    "hostal",
  ];

  async function solicitarClasificacion() {
    setAiError("");
    if (!aiDescripcion.trim()) {
      setAiError("Primero escribe una frase describiendo tu negocio.");
      return;
    }
    if (aiDescripcion.trim().length < 10) {
      setAiError("La descripción debe tener al menos 10 caracteres.");
      return;
    }

    try {
      setAiLoading(true);
      const res = await fetch("/api/clasificacion/sugerir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descripcion: aiDescripcion.trim() }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok || !data?.sugerencia) {
        const message =
          data?.message ||
          data?.error ||
          "No se pudo obtener una sugerencia de clasificación.";
        setAiError(message);
        setAiSugerencia(null);
        return;
      }

      const sug = data.sugerencia as {
        tipo_actividad: "venta" | "servicio" | "arriendo";
        sector_slug: string;
        tags_slugs: string[];
        confianza: number;
      };

      const tagsUnicos = Array.from(new Set((sug.tags_slugs || []).map((t) => String(t))));

      setAiSugerencia({
        tipoActividad: sug.tipo_actividad,
        sectorSlug: sug.sector_slug,
        tags: tagsUnicos,
        confianza: typeof sug.confianza === "number" ? sug.confianza : 0,
      });

      if (IS_DEV && data.debug) {
        setDebugOpenAI({
          descripcion: String(data.debug.descripcion || ""),
          raw_content: String(data.debug.raw_content || ""),
          parsed: data.debug.parsed,
        });
      } else {
        setDebugOpenAI(null);
      }
    } catch (err) {
      setAiError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al pedir la clasificación inteligente."
      );
      setAiSugerencia(null);
    } finally {
      setAiLoading(false);
    }
  }

  function toggleTagChip(tag: string) {
    if (!aiSugerencia) return;
    setAiSugerencia((prev) => {
      if (!prev) return prev;
      const exists = prev.tags.includes(tag);
      const nextTags = exists
        ? prev.tags.filter((t) => t !== tag)
        : prev.tags.length >= 6
        ? prev.tags
        : [...prev.tags, tag];
      return { ...prev, tags: nextTags };
    });
  }

  function agregarTagManual() {
    if (!aiSugerencia) return;
    const raw = manualTag.trim().toLowerCase();
    if (!raw) return;
    setAiSugerencia((prev) => {
      if (!prev) return prev;
      if (prev.tags.includes(raw)) return prev;
      if (prev.tags.length >= 6) return prev;
      return { ...prev, tags: [...prev.tags, raw] };
    });
    setManualTag("");
  }

  const todosTagsExistentes = useMemo(() => {
    const base = new Set<string>(tagsCatalogoBasico);
    if (aiSugerencia) {
      aiSugerencia.tags.forEach((t) => base.add(t));
    }
    return base;
  }, [tagsCatalogoBasico, aiSugerencia]);

  const nuevoTagNormalizado = nuevoTagTexto.trim().toLowerCase();
  const nuevoTagEsExistente =
    !nuevoTagNormalizado || todosTagsExistentes.has(nuevoTagNormalizado);

  async function proponerNuevoTag() {
    setNuevoTagMensaje("");
    if (!aiSugerencia) {
      setNuevoTagMensaje(
        "Primero genera una sugerencia de clasificación inteligente para proponer una etiqueta."
      );
      return;
    }
    if (!nuevoTagNormalizado) {
      setNuevoTagMensaje("Escribe el nombre de la etiqueta que quieres proponer.");
      return;
    }
    if (nuevoTagEsExistente) {
      setNuevoTagMensaje("Esa etiqueta ya existe en el catálogo o en la sugerencia.");
      return;
    }

    try {
      setNuevoTagLoading(true);
      const res = await fetch("/api/tags/sugeridos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propuesto_nombre: nuevoTagTexto.trim(),
          propuesto_slug: nuevoTagNormalizado,
          sector_slug: aiSugerencia.sectorSlug || "otros",
          tipo_actividad: aiSugerencia.tipoActividad,
          descripcion_contexto: aiDescripcion.trim(),
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        const msg =
          data?.message ||
          data?.error ||
          "No se pudo enviar tu sugerencia de etiqueta. Intenta nuevamente.";
        setNuevoTagMensaje(msg);
        return;
      }

      setNuevoTagMensaje("Tu sugerencia fue enviada para revisión.");
      setNuevoTagTexto("");
    } catch (err) {
      setNuevoTagMensaje(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al enviar tu sugerencia."
      );
    } finally {
      setNuevoTagLoading(false);
    }
  }

  return (
    <div style={cardStyle}>
      <h2 style={sectionTitle}>Clasificación principal</h2>

      <div style={infoBoxStyle}>
        La clasificación principal de tu ficha usa <strong>tipo de actividad</strong>,
        <strong> sector</strong> y <strong>etiquetas (tags)</strong>. Esta información
        se usa para que las personas te encuentren mejor en la búsqueda.
      </div>

      {/* Clasificación inteligente */}
      <div style={{ marginBottom: 24 }}>
        <h3
          style={{
            margin: "0 0 8px",
            fontSize: 18,
            fontWeight: 900,
            color: "#111827",
          }}
        >
          Clasificación inteligente (recomendada)
        </h3>
        <p
          style={{
            margin: "0 0 10px",
            fontSize: 13,
            color: "#6b7280",
            lineHeight: 1.5,
          }}
        >
          Describe tu negocio en una frase y te sugeriremos tipo de actividad, sector y
          etiquetas. Podrás editar la sugerencia antes de enviar y también ajustar los
          valores manualmente si lo necesitas.
        </p>

        <textarea
          value={aiDescripcion}
          onChange={(e) => setAiDescripcion(e.target.value)}
          placeholder="Ej: Hago reparaciones de gasfitería y destapes de cañerías a domicilio en Maipú."
          rows={3}
          style={{
            width: "100%",
            borderRadius: 12,
            border: "1px solid #d1d5db",
            padding: 12,
            fontSize: 14,
            resize: "vertical",
          }}
        />

        <div
          style={{
            marginTop: 10,
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={solicitarClasificacion}
            disabled={aiLoading}
            style={{
              minHeight: 40,
              padding: "0 16px",
              borderRadius: 999,
              border: "none",
              background: "#111827",
              color: "#fff",
              fontWeight: 800,
              fontSize: 14,
              cursor: aiLoading ? "default" : "pointer",
              opacity: aiLoading ? 0.7 : 1,
            }}
          >
            {aiLoading ? "Buscando sugerencia..." : "Sugerir clasificación"}
          </button>

          {aiSugerencia && (
            <span
              style={{
                fontSize: 12,
                color: "#6b7280",
              }}
            >
              Confianza del modelo: {Math.round(aiSugerencia.confianza * 100)}%
            </span>
          )}
        </div>

        {aiError && (
          <p
            style={{
              marginTop: 8,
              fontSize: 13,
              color: "#b91c1c",
              fontWeight: 700,
            }}
          >
            {aiError}
          </p>
        )}

        {aiSugerencia && (
          <div
            style={{
              marginTop: 16,
              padding: 14,
              borderRadius: 14,
              border: "1px solid #e5e7eb",
              background: "#f9fafb",
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 900,
                marginBottom: 8,
                color: "#111827",
              }}
            >
              Sugerencia editable
            </div>

            {/* Tipo de actividad */}
            <div style={{ marginBottom: 12 }}>
              <div style={labelStyle}>Tipo de actividad</div>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  marginTop: 4,
                }}
              >
                {["venta", "servicio", "arriendo"].map((tipo) => (
                  <label
                    key={tipo}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="tipo_actividad_ai"
                      value={tipo}
                      checked={aiSugerencia.tipoActividad === tipo}
                      onChange={() =>
                        setAiSugerencia((prev) =>
                          prev ? { ...prev, tipoActividad: tipo as any } : prev
                        )
                      }
                    />
                    <span style={{ textTransform: "capitalize" }}>{tipo}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Sector sugerido */}
            <div style={{ marginBottom: 12 }}>
              <div style={labelStyle}>Sector sugerido</div>
              <select
                value={aiSugerencia.sectorSlug}
                onChange={(e) =>
                  setAiSugerencia((prev) =>
                    prev ? { ...prev, sectorSlug: e.target.value } : prev
                  )
                }
                style={selectStyle}
              >
                {sectoresOpciones.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags sugeridos */}
            <div>
              <div style={labelStyle}>Etiquetas sugeridas (tags)</div>
              {aiSugerencia.tags.length === 0 ? (
                <div style={emptyBoxStyle}>
                  No hay etiquetas sugeridas. Puedes agregarlas manualmente abajo.
                </div>
              ) : (
                <div style={chipWrap}>
                  {aiSugerencia.tags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTagChip(tag)}
                      style={chipButton(true)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}

              {/* Agregar tag existente desde catálogo básico */}
              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <select
                  value={manualTag}
                  onChange={(e) => setManualTag(e.target.value)}
                  style={{
                    ...selectStyle,
                    maxWidth: 260,
                    height: 40,
                    fontSize: 13,
                  }}
                >
                  <option value="">Agregar tag desde catálogo...</option>
                  {tagsCatalogoBasico.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={agregarTagManual}
                  style={{
                    minHeight: 40,
                    padding: "0 14px",
                    borderRadius: 999,
                    border: "1px solid #d1d5db",
                    background: "#fff",
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Agregar etiqueta
                </button>
              </div>

              <div style={helperStyle}>
                Puedes quitar una etiqueta haciendo clic sobre ella. Máximo 6 etiquetas.
              </div>

              {/* Agregar etiqueta nueva */}
              <div
                style={{
                  marginTop: 14,
                  borderTop: "1px solid #e5e7eb",
                  paddingTop: 12,
                }}
              >
                <div style={labelStyle}>Agregar etiqueta nueva</div>
                <input
                  type="text"
                  value={nuevoTagTexto}
                  onChange={(e) => {
                    setNuevoTagTexto(e.target.value);
                    setNuevoTagMensaje("");
                  }}
                  placeholder="Ej: gasfiter de urgencias"
                  style={{
                    width: "100%",
                    height: 40,
                    borderRadius: 10,
                    border: "1px solid #d1d5db",
                    padding: "0 12px",
                    fontSize: 14,
                  }}
                />
                <div
                  style={{
                    marginTop: 8,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    onClick={proponerNuevoTag}
                    disabled={
                      nuevoTagLoading ||
                      !nuevoTagNormalizado ||
                      !aiSugerencia ||
                      nuevoTagEsExistente
                    }
                    style={{
                      minHeight: 36,
                      padding: "0 14px",
                      borderRadius: 999,
                      border: "1px solid #d1d5db",
                      background: nuevoTagEsExistente ? "#f9fafb" : "#fff",
                      fontSize: 13,
                      fontWeight: 800,
                      cursor:
                        nuevoTagLoading ||
                        !nuevoTagNormalizado ||
                        !aiSugerencia ||
                        nuevoTagEsExistente
                          ? "default"
                          : "pointer",
                      opacity:
                        nuevoTagLoading ||
                        !nuevoTagNormalizado ||
                        !aiSugerencia ||
                        nuevoTagEsExistente
                          ? 0.6
                          : 1,
                    }}
                  >
                    {nuevoTagLoading
                      ? "Enviando..."
                      : nuevoTagEsExistente
                      ? "Esta etiqueta ya existe"
                      : "Proponer etiqueta nueva"}
                  </button>
                  <span style={{ fontSize: 12, color: "#6b7280" }}>
                    Tu propuesta no se publicará de inmediato, será revisada primero.
                  </span>
                </div>
                {nuevoTagMensaje && (
                  <p
                    style={{
                      marginTop: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      color:
                        nuevoTagMensaje === "Tu sugerencia fue enviada para revisión."
                          ? "#166534"
                          : "#b91c1c",
                    }}
                  >
                    {nuevoTagMensaje}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Bloque técnico de debug solo en desarrollo */}
        {IS_DEV && debugOpenAI && (
          <details
            style={{
              marginTop: 16,
              borderRadius: 12,
              border: "1px dashed #d1d5db",
              padding: 12,
              background: "#f9fafb",
            }}
            open={showDebug}
            onToggle={(e) => setShowDebug((e.target as HTMLDetailsElement).open)}
          >
            <summary
              style={{
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 800,
                color: "#4b5563",
              }}
            >
              Detalles técnicos de clasificación (solo desarrollo)
            </summary>
            <div style={{ marginTop: 8, fontSize: 12, color: "#4b5563" }}>
              <div style={{ marginBottom: 6 }}>
                <strong>Descripción enviada:</strong>{" "}
                <code style={{ fontSize: 12 }}>{debugOpenAI.descripcion}</code>
              </div>
              <div style={{ marginBottom: 6 }}>
                <strong>Respuesta cruda de OpenAI:</strong>
                <pre
                  style={{
                    marginTop: 4,
                    maxHeight: 160,
                    overflow: "auto",
                    background: "#111827",
                    color: "#e5e7eb",
                    padding: 8,
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                >
{debugOpenAI.raw_content}
                </pre>
              </div>
              <div>
                <strong>JSON parseado / sugerencia:</strong>
                <pre
                  style={{
                    marginTop: 4,
                    maxHeight: 160,
                    overflow: "auto",
                    background: "#020617",
                    color: "#e5e7eb",
                    padding: 8,
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                >
{JSON.stringify(debugOpenAI.parsed, null, 2)}
                </pre>
              </div>
            </div>
          </details>
        )}
      </div>

      <div
        style={{
          marginTop: 24,
          marginBottom: 12,
          padding: 14,
          borderRadius: 14,
          border: "1px dashed #e5e7eb",
          background: "#f9fafb",
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: "#111827",
            marginBottom: 4,
          }}
        >
          Clasificación heredada (opcional)
        </div>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: "#6b7280",
            lineHeight: 1.5,
          }}
        >
          Si ya conoces la <strong>categoría</strong> y las <strong>subcategorías</strong>{" "}
          que usábamos antes, puedes completarlas aquí. Esto es opcional: la búsqueda
          funciona principalmente con tipo de actividad, sector y etiquetas.
        </p>
      </div>

      <div style={{ marginBottom: 22 }}>
        <label style={labelStyle}>Categoría principal (opcional)</label>
        <select
          value={form.categoriaSlug}
          onChange={(e) => {
            setField("categoriaSlug", e.target.value);
            setField("subcategorias", []);
          }}
          style={selectStyle}
        >
          <option value="">Selecciona una categoría</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.nombre}
            </option>
          ))}
        </select>

        <div style={helperStyle}>
          Esta será la categoría principal con la que se organizará tu ficha.
        </div>

        {errors.categoriaSlug ? (
          <p style={errorStyle}>{errors.categoriaSlug}</p>
        ) : null}
      </div>

      <div>
        <label style={labelStyle}>Subcategorías (opcional)</label>

        {!categoriaActiva ? (
          <div style={emptyBoxStyle}>
            Primero selecciona una categoría principal.
          </div>
        ) : subcategoriasDisponibles.length === 0 ? (
          <div style={emptyBoxStyle}>
            No hay subcategorías disponibles para esta categoría.
          </div>
        ) : (
          <>
            <div style={chipWrap}>
              {subcategoriasDisponibles.map((sub) => {
                const active = form.subcategorias.includes(sub.slug);

                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => toggleArrayValue("subcategorias", sub.slug, 6)}
                    style={chipButton(active)}
                  >
                    {sub.nombre}
                  </button>
                );
              })}
            </div>

            <div style={counterStyle}>
              {totalSeleccionadas} de 6 subcategorías seleccionadas
            </div>
          </>
        )}

        <div style={helperStyle}>
          Puedes seleccionar hasta 6 subcategorías dentro de tu categoría
          principal.
        </div>

        {errors.subcategorias ? (
          <p style={errorStyle}>{errors.subcategorias}</p>
        ) : null}
      </div>

      <div style={sectionBoxStyle}>
        <div style={sectionMiniTitleStyle}>Antes de enviar</div>
        <div style={sectionHelpStyle}>
          Revisa la clasificación principal (tipo de actividad, sector y etiquetas). La
          clasificación heredada por categoría/subcategoría es opcional y solo se usa como
          apoyo mientras migramos al nuevo sistema.
        </div>
      </div>

      <div style={footerStyle}>
        <button type="button" onClick={prevStep} style={secondaryButtonStyle}>
          Volver
        </button>

        <button type="button" onClick={submitForm} style={primaryButtonStyle}>
          Enviar para revisión
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

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 900,
  marginBottom: 6,
  color: "#111827",
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  height: 48,
  borderRadius: 12,
  border: "1px solid #d1d5db",
  padding: "0 14px",
  fontSize: 15,
  color: "#111827",
  background: "#fff",
};

const chipWrap: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
  marginTop: 12,
};

function chipButton(active: boolean): React.CSSProperties {
  return {
    minHeight: 38,
    padding: "0 14px",
    borderRadius: 999,
    border: active ? "1px solid #93c5fd" : "1px solid #d1d5db",
    background: active ? "#dbeafe" : "#fff",
    color: active ? "#1d4ed8" : "#111827",
    fontWeight: 800,
    fontSize: 14,
    cursor: "pointer",
  };
}

const helperStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#6b7280",
  marginTop: 8,
  lineHeight: 1.5,
};

const counterStyle: React.CSSProperties = {
  marginTop: 10,
  fontSize: 12,
  fontWeight: 800,
  color: "#374151",
};

const emptyBoxStyle: React.CSSProperties = {
  border: "1px dashed #d1d5db",
  borderRadius: 14,
  padding: 14,
  color: "#6b7280",
  fontSize: 14,
  background: "#f9fafb",
};

const errorStyle: React.CSSProperties = {
  margin: "8px 0 0",
  fontSize: 13,
  color: "#b91c1c",
  fontWeight: 700,
};

const sectionBoxStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  padding: 18,
  background: "#fff",
  marginTop: 22,
};

const sectionMiniTitleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 900,
  color: "#111827",
  marginBottom: 6,
};

const sectionHelpStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#6b7280",
  lineHeight: 1.5,
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