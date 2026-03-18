"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getRegionShort } from "@/utils/regionShort";
import type { Comuna, FormData, Region } from "./PublicarClient";

type SetField = <K extends keyof FormData>(key: K, value: FormData[K]) => void;

type ToggleArrayValue = (
  key: "modalidades" | "comunasCobertura" | "regionesCobertura" | "subcategorias",
  value: string,
  max?: number
) => void;

const COMUNAS_BASE_ACTIVAS = [
  "calera-de-tango",
  "padre-hurtado",
  "talagante",
  "penaflor",
  "buin",
  "san-bernardo",
  "maipu",
];

export default function PasoUbicacionCobertura({
  form,
  errors,
  comunas,
  regiones,
  setField,
  toggleArrayValue,
  nextStep,
  prevStep,
}: {
  form: FormData;
  errors: Record<string, string>;
  comunas: Comuna[];
  regiones: Region[];
  setField: SetField;
  toggleArrayValue: ToggleArrayValue;
  nextStep: () => void;
  prevStep: () => void;
}) {
  const comunasBaseDisponibles = useMemo(() => {
    return [...comunas].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [comunas]);

  const [comunaBaseQuery, setComunaBaseQuery] = useState("");
  const [comunaBaseOpen, setComunaBaseOpen] = useState(false);
  const comunaBaseInputRef = useRef<HTMLInputElement>(null);
  const comunaBaseBlurRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [localComunaActiveIndex, setLocalComunaActiveIndex] = useState<number | null>(null);
  const [localComunaQuery, setLocalComunaQuery] = useState("");
  const [localComunaOpen, setLocalComunaOpen] = useState(false);
  const localComunaBlurRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Comuna base: siempre la que el usuario elige (concepto separado de locales).
  const effectiveComunaSlug = form.comunaBase;

  const comunaBaseObj = useMemo(() => {
    return comunas.find((c) => c.slug === effectiveComunaSlug) || null;
  }, [comunas, effectiveComunaSlug]);

  const comunaBaseSugerencias = useMemo(() => {
    const q = comunaBaseQuery.trim().toLowerCase();
    if (!q) return [];
    return comunasBaseDisponibles
      .filter(
        (c) =>
          c.nombre.toLowerCase().includes(q) ||
          (c.region_nombre && c.region_nombre.toLowerCase().includes(q))
      )
      .slice(0, 25)
      .map((c) => ({ ...c, label: `${c.nombre} — ${getRegionShort(c.region_nombre) || "Sin región"}` }));
  }, [comunasBaseDisponibles, comunaBaseQuery]);

  const localComunaSugerencias = useMemo(() => {
    const q = localComunaQuery.trim().toLowerCase();
    if (!q) return [];
    return comunasBaseDisponibles
      .filter(
        (c) =>
          c.nombre.toLowerCase().includes(q) ||
          (c.region_nombre && c.region_nombre.toLowerCase().includes(q))
      )
      .slice(0, 25)
      .map((c) => ({ ...c, label: `${c.nombre} — ${getRegionShort(c.region_nombre) || "Sin región"}` }));
  }, [comunasBaseDisponibles, localComunaQuery]);

  const comunaBaseNoHabilitada = effectiveComunaSlug && !COMUNAS_BASE_ACTIVAS.includes(effectiveComunaSlug);
  const registradoInteresRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!comunaBaseNoHabilitada || !effectiveComunaSlug || registradoInteresRef.current.has(effectiveComunaSlug)) return;
    registradoInteresRef.current.add(effectiveComunaSlug);
    fetch("/api/publicar/comuna-interes-expansion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comuna_slug: effectiveComunaSlug }),
    }).catch(() => {});
  }, [comunaBaseNoHabilitada, effectiveComunaSlug]);

  const comunasCoberturaDisponibles = useMemo(() => {
    if (!comunaBaseObj?.region_id) return [];

    return comunas
      .filter(
        (c) =>
          c.region_id === comunaBaseObj.region_id &&
          c.slug !== form.comunaBase
      )
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [comunas, comunaBaseObj, form.comunaBase]);

  const regionBaseSlug = useMemo(() => {
    if (!comunaBaseObj?.region_id) return null;
    return regiones.find((r) => r.id === comunaBaseObj.region_id)?.slug ?? null;
  }, [regiones, comunaBaseObj?.region_id]);

  const regionesCoberturaDisponibles = useMemo(() => {
    const ordenadas = [...regiones].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    if (!regionBaseSlug) return ordenadas;
    const base = ordenadas.find((r) => r.slug === regionBaseSlug);
    if (!base) return ordenadas;
    const resto = ordenadas.filter((r) => r.slug !== regionBaseSlug);
    return [base, ...resto];
  }, [regiones, regionBaseSlug]);

  const muestraComunas = form.coberturaTipo === "varias_comunas";
  const muestraRegiones = form.coberturaTipo === "regional";
  const MAX_LOCALES = 3;

  const tieneLocalEnModalidades = form.modalidades.includes("local");
  const bloqueCoberturaNumero = 3;
  const bloqueModalidadNumero = muestraComunas && muestraRegiones ? 5 : muestraComunas || muestraRegiones ? 4 : 3;
  const bloqueLocalesNumero = bloqueModalidadNumero + 1;

  function addLocal() {
    if (form.locales.length >= MAX_LOCALES) return;
    const isFirst = form.locales.length === 0;
    const comunaInicial = form.comunaBase || "";
    setField("locales", [
      ...form.locales,
      { nombre_local: "", direccion: "", comuna_slug: comunaInicial, es_principal: isFirst },
    ]);
  }

  function updateLocal(index: number, patch: Partial<FormData["locales"][0]>) {
    const next = form.locales.map((loc, i) =>
      i === index ? { ...loc, ...patch } : loc
    );
    if (patch.es_principal) {
      setField(
        "locales",
        next.map((loc, i) => ({ ...loc, es_principal: i === index }))
      );
    } else {
      setField("locales", next);
    }
  }

  function removeLocal(index: number) {
    const next = form.locales.filter((_, i) => i !== index);
    if (next.length && next.every((l) => !l.es_principal)) next[0].es_principal = true;
    setField("locales", next);
  }

  return (
    <div style={cardStyle}>
      <h2 style={sectionTitle}>Ubicación y cobertura</h2>

      <div style={infoBoxStyle}>
        Indica desde qué comuna operas y hasta dónde llega tu servicio. Esto nos permite mostrar tu emprendimiento a las personas correctas.
      </div>

      {/* 1. Comuna base — siempre obligatorio, concepto separado de locales */}
      <div style={sectionBoxStyle}>
        <div style={sectionMiniTitleStyle}>1. Comuna base</div>
        <div style={sectionHelpStyle}>
          Representa desde dónde opera normalmente el emprendimiento.
        </div>
        <div style={{ position: "relative" }}>
          <label style={labelStyle}>Comuna base *</label>
          <input
            ref={comunaBaseInputRef}
            type="text"
            autoComplete="off"
            placeholder="Escribe tu comuna (ej: Maipú)"
            value={
              comunaBaseQuery !== ""
                ? comunaBaseQuery
                : comunaBaseObj
                  ? `${comunaBaseObj.nombre} — ${getRegionShort(comunaBaseObj.region_nombre)}`.trim()
                  : ""
            }
            onChange={(e) => {
              const v = e.target.value;
              setComunaBaseQuery(v);
              if (v === "") {
                setField("comunaBase", "");
                setField("coberturaTipo", "");
                setField("comunasCobertura", []);
                setField("regionesCobertura", []);
              } else if (comunaBaseObj) {
                setField("comunaBase", "");
                setField("coberturaTipo", "");
                setField("comunasCobertura", []);
                setField("regionesCobertura", []);
              }
              setComunaBaseOpen(true);
            }}
            onFocus={() => {
              if (comunaBaseBlurRef.current) {
                clearTimeout(comunaBaseBlurRef.current);
                comunaBaseBlurRef.current = null;
              }
              setComunaBaseOpen(true);
            }}
            onBlur={() => {
              comunaBaseBlurRef.current = setTimeout(() => setComunaBaseOpen(false), 200);
            }}
            style={inputStyle}
          />
          {comunaBaseOpen && (comunaBaseQuery.trim() || !comunaBaseObj) && (
            <div style={autocompleteDropdownStyle}>
              {comunaBaseSugerencias.length === 0 ? (
                <div style={autocompleteEmptyStyle}>
                  {comunaBaseQuery.trim() ? "Sin resultados. Sigue escribiendo." : "Escribe para buscar comuna."}
                </div>
              ) : (
                comunaBaseSugerencias.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    style={autocompleteItemStyle}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setField("comunaBase", c.slug);
                      setComunaBaseQuery("");
                      setComunaBaseOpen(false);
                      setField("comunasCobertura", []);
                      setField("regionesCobertura", []);
                      setField("coberturaTipo", "");
                    }}
                  >
                    {c.label}
                  </button>
                ))
              )}
            </div>
          )}
          {errors.comunaBase ? <p style={errorStyle}>{errors.comunaBase}</p> : null}
        </div>
      </div>

      {/* 2. Cobertura del servicio */}
      <div style={sectionBoxStyle}>
        <div style={sectionMiniTitleStyle}>2. Cobertura</div>
        <div style={sectionHelpStyle}>
          Hasta dónde llega tu servicio.
        </div>
        <div>
          <label style={labelStyle}>Cobertura *</label>
          <select
            value={form.coberturaTipo}
            onChange={(e) => {
              const value = e.target.value;
              setField("coberturaTipo", value);
              setField("comunasCobertura", []);
              if (value === "regional") {
                const region = comunaBaseObj?.region_id ? regiones.find((r) => r.id === comunaBaseObj.region_id) : null;
                setField("regionesCobertura", region ? [region.slug] : []);
              } else {
                setField("regionesCobertura", []);
              }
            }}
            style={selectStyle}
          >
            <option value="">Selecciona cobertura</option>
            <option value="solo_mi_comuna">Solo mi comuna</option>
            <option value="varias_comunas">Varias comunas</option>
            <option value="regional">Una o más regiones</option>
            <option value="nacional">Todo Chile</option>
          </select>
          <div style={sectionHelpStyle}>
            Si eliges varias comunas, podrás seleccionar cuáles. Si eliges una o más regiones, se preselecciona la región de tu comuna base y puedes agregar otras.
          </div>
          {errors.coberturaTipo ? <p style={errorStyle}>{errors.coberturaTipo}</p> : null}
        </div>
      </div>

      {/* 3. Comunas donde también atiendes (si eligió Varias comunas) */}
      {muestraComunas ? (
        <div style={sectionBoxStyle}>
          <div style={sectionMiniTitleStyle}>
            {bloqueCoberturaNumero}. Comunas donde también atiendes
          </div>
          <div style={sectionHelpStyle}>
            Selecciona las comunas donde también atiendes, además de tu comuna base.
          </div>

          {!comunaBaseObj ? (
            <div style={emptyBoxStyle}>
              Primero selecciona una comuna base arriba para elegir comunas de cobertura.
            </div>
          ) : comunasCoberturaDisponibles.length === 0 ? (
            <div style={emptyBoxStyle}>
              No encontramos comunas adicionales disponibles en esta región.
            </div>
          ) : (
            <div style={chipWrap}>
              {comunasCoberturaDisponibles.map((comuna) => {
                const active = form.comunasCobertura.includes(comuna.slug);

                return (
                  <button
                    key={comuna.id}
                    type="button"
                    onClick={() =>
                      toggleArrayValue("comunasCobertura", comuna.slug)
                    }
                    style={chipButton(active)}
                  >
                    {comuna.nombre}
                  </button>
                );
              })}
            </div>
          )}

          {errors.comunasCobertura ? (
            <p style={errorStyle}>{errors.comunasCobertura}</p>
          ) : null}
        </div>
      ) : null}

      {/* Regiones donde también atiendes (una o más regiones) */}
      {muestraRegiones ? (
        <div style={sectionBoxStyle}>
          <div style={sectionMiniTitleStyle}>
            {muestraComunas ? 4 : bloqueCoberturaNumero}. Regiones donde también atiendes
          </div>
          <div style={sectionHelpStyle}>
            Puedes elegir una o más regiones. No tienen que coincidir con la región de tu comuna base.
          </div>

          <div style={chipWrap}>
            {regionesCoberturaDisponibles.map((region) => {
              const active = form.regionesCobertura.includes(region.slug);
              const esRegionBase = region.slug === regionBaseSlug;

              return (
                <button
                  key={region.id}
                  type="button"
                  onClick={() =>
                    toggleArrayValue("regionesCobertura", region.slug)
                  }
                  style={{
                    ...chipButton(active),
                    ...(esRegionBase ? chipRegionBaseStyle : {}),
                  }}
                >
                  {region.nombre}
                  {esRegionBase ? <span style={chipRegionBaseBadgeStyle}> — Tu región</span> : null}
                </button>
              );
            })}
          </div>

          {errors.regionesCobertura ? (
            <p style={errorStyle}>{errors.regionesCobertura}</p>
          ) : null}
        </div>
      ) : null}

      {/* ¿Cómo atiendes a tus clientes? */}
      <div style={sectionBoxStyle}>
        <div style={sectionMiniTitleStyle}>
          {bloqueModalidadNumero}. ¿Cómo atiendes a tus clientes?
        </div>
        <div style={sectionHelpStyle}>
          Puedes elegir una, dos o las tres opciones (modalidad de atención).
        </div>

        <div style={modeListStyle}>
          {[
            {
              value: "local",
              label: "Local físico",
              help: "Los clientes van a tu local, tienda u oficina.",
            },
            {
              value: "presencial",
              label: "Atención a domicilio",
              help: "Vas al domicilio del cliente o trabajas fuera de un local fijo.",
            },
            {
              value: "online",
              label: "Online",
              help: "Atiendes por internet, redes sociales o videollamada.",
            },
          ].map((item) => {
            const active = form.modalidades.includes(item.value);

            return (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  if (item.value === "local") {
                    if (active) {
                      setField("modalidades", form.modalidades.filter((m) => m !== "local"));
                      setField("tieneLocalFisico", false);
                      setField("locales", []);
                    } else {
                      setField("modalidades", [...form.modalidades, "local"]);
                      setField("tieneLocalFisico", true);
                      if (form.locales.length === 0) {
                        const comunaInicial = form.comunaBase || "";
                        setField("locales", [{ nombre_local: "", direccion: "", comuna_slug: comunaInicial, es_principal: true }]);
                      }
                    }
                  } else {
                    toggleArrayValue("modalidades", item.value);
                  }
                }}
                style={{
                  ...modeButtonStyle,
                  ...(active ? modeButtonActiveStyle : {}),
                }}
              >
                <div style={{ fontWeight: 900, fontSize: 15 }}>{item.label}</div>
                <div style={{ fontSize: 13, lineHeight: 1.45, opacity: 0.9 }}>
                  {item.help}
                </div>
              </button>
            );
          })}
        </div>

        {errors.modalidades ? (
          <p style={errorStyle}>{errors.modalidades}</p>
        ) : null}
      </div>

      {/* Locales físicos — solo si eligió "Local físico" en Cómo atiendes */}
      {tieneLocalEnModalidades ? (
        <div style={sectionBoxStyle}>
          <div style={sectionMiniTitleStyle}>{bloqueLocalesNumero}. Locales físicos</div>
          <div style={sectionHelpStyle}>
            Puedes agregar hasta 3 locales. Cada uno requiere dirección y comuna.
          </div>
          {form.locales.map((loc, index) => (
            <div
              key={index}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 14,
                padding: 16,
                marginBottom: 12,
                background: "#f9fafb",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontWeight: 800, fontSize: 14 }}>
                  Local {index + 1}
                  {index > 0 ? " (opcional)" : ""}
                </span>
                {form.locales.length > 1 && (
                  <button type="button" onClick={() => removeLocal(index)} style={{ ...secondaryButtonStyle, padding: "6px 12px", fontSize: 13 }}>
                    Quitar
                  </button>
                )}
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                <div>
                  <label style={labelStyle}>Dirección *</label>
                  <input
                    value={loc.direccion}
                    onChange={(e) => updateLocal(index, { direccion: e.target.value })}
                    placeholder="Ej: Av. Principal 123"
                    style={inputStyle}
                  />
                </div>
                <div style={{ position: "relative" }}>
                  <label style={labelStyle}>Comuna *</label>
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder="Escribe tu comuna (ej: Maipú)"
                    value={
                      localComunaActiveIndex === index && localComunaQuery !== ""
                        ? localComunaQuery
                        : (() => {
                            const c = comunas.find((x) => x.slug === loc.comuna_slug);
                            return c ? `${c.nombre} — ${getRegionShort(c.region_nombre)}`.trim() : "";
                          })()
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      setLocalComunaQuery(v);
                      setLocalComunaActiveIndex(index);
                      if (v === "") updateLocal(index, { comuna_slug: "" });
                      else if (loc.comuna_slug) updateLocal(index, { comuna_slug: "" });
                      setLocalComunaOpen(true);
                    }}
                    onFocus={() => {
                      if (localComunaBlurRef.current) {
                        clearTimeout(localComunaBlurRef.current);
                        localComunaBlurRef.current = null;
                      }
                      setLocalComunaActiveIndex(index);
                      setLocalComunaOpen(true);
                    }}
                    onBlur={() => {
                      localComunaBlurRef.current = setTimeout(() => {
                        setLocalComunaOpen(false);
                        setLocalComunaActiveIndex(null);
                      }, 200);
                    }}
                    style={inputStyle}
                  />
                  {localComunaOpen && localComunaActiveIndex === index && (localComunaQuery.trim() || !loc.comuna_slug) && (
                    <div style={autocompleteDropdownStyle}>
                      {localComunaSugerencias.length === 0 ? (
                        <div style={autocompleteEmptyStyle}>
                          {localComunaQuery.trim() ? "Sin resultados. Sigue escribiendo." : "Escribe para buscar comuna."}
                        </div>
                      ) : (
                        localComunaSugerencias.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            style={autocompleteItemStyle}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              updateLocal(index, { comuna_slug: c.slug });
                              setLocalComunaQuery("");
                              setLocalComunaOpen(false);
                              setLocalComunaActiveIndex(null);
                            }}
                          >
                            {c.label}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="local_principal"
                    checked={loc.es_principal}
                    onChange={() => updateLocal(index, { es_principal: true })}
                  />
                  <span style={{ fontWeight: 700, fontSize: 14 }}>Es el local principal</span>
                </label>
              </div>
            </div>
          ))}
          {form.locales.length < MAX_LOCALES && (
            <button type="button" onClick={addLocal} style={{ ...secondaryButtonStyle, marginTop: 8 }}>
              Agregar otro local
            </button>
          )}
          {form.locales.length >= MAX_LOCALES && (
            <p style={sectionHelpStyle}>Máximo 3 locales por emprendimiento.</p>
          )}
          {errors.locales ? <p style={errorStyle}>{errors.locales}</p> : null}
        </div>
      ) : null}

      <div style={footerStyle}>
        <button type="button" onClick={prevStep} style={secondaryButtonStyle}>
          Volver
        </button>

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

const sectionBoxStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  padding: 18,
  background: "#fff",
  marginTop: 16,
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
  marginBottom: 14,
};

const grid2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0,1fr))",
  gap: 18,
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

const autocompleteDropdownStyle: React.CSSProperties = {
  position: "absolute",
  top: "100%",
  left: 0,
  right: 0,
  marginTop: 4,
  maxHeight: 280,
  overflowY: "auto",
  background: "#fff",
  border: "1px solid #d1d5db",
  borderRadius: 12,
  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  zIndex: 50,
};

const autocompleteEmptyStyle: React.CSSProperties = {
  padding: "12px 14px",
  fontSize: 14,
  color: "#6b7280",
};

const autocompleteItemStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "12px 14px",
  fontSize: 14,
  border: "none",
  background: "none",
  cursor: "pointer",
  color: "#111827",
  borderBottom: "1px solid #f3f4f6",
};

const helperBlueStyle: React.CSSProperties = {
  marginTop: 8,
  fontSize: 13,
  fontWeight: 700,
  color: "#2563eb",
};

const modeListStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 12,
};

const modeButtonStyle: React.CSSProperties = {
  width: "100%",
  textAlign: "left",
  borderRadius: 16,
  border: "1px solid #d1d5db",
  background: "#fff",
  padding: "14px 16px",
  cursor: "pointer",
  color: "#111827",
};

const modeButtonActiveStyle: React.CSSProperties = {
  border: "1px solid #93c5fd",
  background: "#dbeafe",
  color: "#1d4ed8",
};

const chipWrap: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
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

const chipRegionBaseStyle: React.CSSProperties = {
  borderWidth: 2,
  borderColor: "#2563eb",
  boxShadow: "0 0 0 1px #2563eb",
};

const chipRegionBaseBadgeStyle: React.CSSProperties = {
  fontWeight: 700,
  fontSize: 12,
  opacity: 0.95,
};

const comunaNoHabilitadaStyle: React.CSSProperties = {
  marginTop: 10,
  padding: "10px 12px",
  borderRadius: 12,
  background: "#fef3c7",
  border: "1px solid #f59e0b",
  color: "#92400e",
  fontSize: 13,
  fontWeight: 700,
  lineHeight: 1.45,
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