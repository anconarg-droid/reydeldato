"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getRegionShort } from "@/utils/regionShort";
import { slugify } from "@/lib/slugify";
import type { Comuna, FormData, Region } from "./PublicarClient";

type SetField = <K extends keyof FormData>(key: K, value: FormData[K]) => void;

type ToggleArrayValue = (
  key: "modalidades" | "comunasCobertura" | "regionesCobertura" | "subcategorias",
  value: string,
  max?: number
) => void;

function normalizeSearchText(value: string) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function resolveComunaBySlug(
  comunas: Comuna[],
  slug: string
): Comuna | undefined {
  return (
    comunas.find((c) => c.slug === slug) ||
    comunas.find((c) => slugify(c.slug) === slugify(slug))
  );
}

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
  const comunaBaseBlurRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [localComunaActiveIndex, setLocalComunaActiveIndex] = useState<number | null>(null);
  const [localComunaQuery, setLocalComunaQuery] = useState("");
  const [localComunaOpen, setLocalComunaOpen] = useState(false);
  const localComunaBlurRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [regionAgregarSelectKey, setRegionAgregarSelectKey] = useState(0);

  const effectiveComunaSlug = form.comunaBase;

  const comunaBaseObj = useMemo(() => {
    return comunas.find((c) => c.slug === effectiveComunaSlug) || null;
  }, [comunas, effectiveComunaSlug]);

  const comunaBaseSugerencias = useMemo(() => {
    const q = normalizeSearchText(comunaBaseQuery);

    const source = comunasBaseDisponibles.map((c) => ({
      ...c,
      nombreNorm: normalizeSearchText(c.nombre),
      regionNorm: normalizeSearchText(c.region_nombre || ""),
      slugNorm: normalizeSearchText(String(c.slug || "")).replace(/-/g, " "),
      label: `${c.nombre} — ${
        getRegionShort(c.region_nombre) || "Sin región"
      }`,
    }));

    if (!q) {
      return [];
    }

    return source
      .filter(
        (c) =>
          c.nombreNorm.includes(q) ||
          c.regionNorm.includes(q) ||
          c.slugNorm.includes(q)
      )
      .slice(0, 25);
  }, [comunasBaseDisponibles, comunaBaseQuery]);

  const localComunaSugerencias = useMemo(() => {
    const q = normalizeSearchText(localComunaQuery);

    const source = comunasBaseDisponibles.map((c) => ({
      ...c,
      nombreNorm: normalizeSearchText(c.nombre),
      regionNorm: normalizeSearchText(c.region_nombre || ""),
      slugNorm: normalizeSearchText(String(c.slug || "")).replace(/-/g, " "),
      label: `${c.nombre} — ${
        getRegionShort(c.region_nombre) || "Sin región"
      }`,
    }));

    if (!q) {
      return [];
    }

    return source
      .filter(
        (c) =>
          c.nombreNorm.includes(q) ||
          c.regionNorm.includes(q) ||
          c.slugNorm.includes(q)
      )
      .slice(0, 25);
  }, [comunasBaseDisponibles, localComunaQuery]);

  const comunaBaseNoHabilitada =
    effectiveComunaSlug && !COMUNAS_BASE_ACTIVAS.includes(effectiveComunaSlug);

  const registradoInteresRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (
      !comunaBaseNoHabilitada ||
      !effectiveComunaSlug ||
      registradoInteresRef.current.has(effectiveComunaSlug)
    ) {
      return;
    }

    registradoInteresRef.current.add(effectiveComunaSlug);

    fetch("/api/publicar/comuna-interes-expansion", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ comuna_slug: effectiveComunaSlug }),
    }).catch(() => {});
  }, [comunaBaseNoHabilitada, effectiveComunaSlug]);

  const comunasCoberturaDisponibles = useMemo(() => {
    if (!comunaBaseObj?.region_id) return [];

    return comunas
      .filter(
        (c) =>
          c.region_id === comunaBaseObj.region_id && c.id !== comunaBaseObj.id
      )
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [comunas, comunaBaseObj]);

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

  const muestraComunas =
    form.coberturaTipo === "varias_comunas";
  const muestraRegiones = form.coberturaTipo === "varias_regiones";
  const tieneLocalEnModalidades =
    form.modalidades.includes("local_fisico") || form.modalidades.includes("local");
  const MAX_LOCALES = 3;

  const puedeContinuar = true;

  const comunasCoberturaSeleccionadas = useMemo(() => {
    const seen = new Set<string>();
    const out: Comuna[] = [];
    for (const slug of form.comunasCobertura) {
      const c = resolveComunaBySlug(comunas, slug);
      if (c && !seen.has(c.id)) {
        seen.add(c.id);
        out.push(c);
      }
    }
    return out;
  }, [comunas, form.comunasCobertura]);

  const comunasCoberturaAutocomplete = useMemo(() => {
    const q = normalizeSearchText(localComunaQuery);
    if (!q || !comunaBaseObj?.region_id) return [];
    const selectedIds = new Set(
      form.comunasCobertura
        .map((s) => resolveComunaBySlug(comunas, s)?.id)
        .filter(Boolean) as string[]
    );
    return comunas
      .filter(
        (c) =>
          c.region_id === comunaBaseObj.region_id &&
          c.id !== comunaBaseObj.id &&
          !selectedIds.has(c.id)
      )
      .map((c) => ({
        ...c,
        nombreNorm: normalizeSearchText(c.nombre),
        regionNorm: normalizeSearchText(c.region_nombre || ""),
        slugNorm: normalizeSearchText(String(c.slug || "")).replace(/-/g, " "),
        label: `${c.nombre} — ${getRegionShort(c.region_nombre) || "Sin region"}`,
      }))
      .filter(
        (c) =>
          c.nombreNorm.includes(q) ||
          c.regionNorm.includes(q) ||
          c.slugNorm.includes(q)
      )
      .slice(0, 25);
  }, [comunas, comunaBaseObj, form.comunasCobertura, localComunaQuery]);

  function applyCoberturaTipo(value: string) {
    setField("coberturaTipo", value);
    setLocalComunaQuery("");
    setLocalComunaOpen(false);

    if (value === "solo_mi_comuna" || value === "nacional") {
      setField("comunasCobertura", []);
      setField("regionesCobertura", []);
      return;
    }

    if (value === "varias_comunas") {
      setField("regionesCobertura", []);
      setField("comunasCobertura", form.comunaBase ? [form.comunaBase] : []);
      return;
    }

    if (value === "varias_regiones") {
      setField("comunasCobertura", []);
      const region = comunaBaseObj?.region_id
        ? regiones.find((r) => r.id === comunaBaseObj.region_id)
        : null;
      setField("regionesCobertura", region ? [region.slug] : []);
      return;
    }

    setField("comunasCobertura", []);
    setField("regionesCobertura", []);
  }

  function addComunaCobertura(slug: string) {
    if (!slug || !comunaBaseObj) return;
    const target = resolveComunaBySlug(comunas, slug);
    if (!target || target.id === comunaBaseObj.id) return;
    const already = form.comunasCobertura.some(
      (s) => resolveComunaBySlug(comunas, s)?.id === target.id
    );
    if (already) return;
    if (form.comunasCobertura.length >= 8) return;
    setField("comunasCobertura", [...form.comunasCobertura, target.slug]);
  }

  function removeComunaCobertura(slug: string) {
    if (!comunaBaseObj) return;
    const target = resolveComunaBySlug(comunas, slug);
    if (!target || target.id === comunaBaseObj.id) return;
    setField(
      "comunasCobertura",
      form.comunasCobertura.filter(
        (s) => resolveComunaBySlug(comunas, s)?.id !== target.id
      )
    );
  }

  const regionesCoberturaSeleccionadasObjs = useMemo(() => {
    const bySlug = new Map(regiones.map((r) => [r.slug, r]));
    return form.regionesCobertura
      .map((slug) => bySlug.get(slug))
      .filter((x): x is Region => Boolean(x));
  }, [regiones, form.regionesCobertura]);

  const regionesCoberturaAgregables = useMemo(() => {
    const selected = new Set(form.regionesCobertura);
    return regionesCoberturaDisponibles.filter((r) => !selected.has(r.slug));
  }, [regionesCoberturaDisponibles, form.regionesCobertura]);

  function agregarRegionCobertura(slug: string) {
    const s = slug.trim();
    if (!s || form.regionesCobertura.includes(s)) return;
    setField("regionesCobertura", [...form.regionesCobertura, s]);
    setRegionAgregarSelectKey((k) => k + 1);
  }

  function eliminarRegionCobertura(slug: string) {
    if (form.regionesCobertura.length <= 1) return;
    setField(
      "regionesCobertura",
      form.regionesCobertura.filter((x) => x !== slug)
    );
  }

  function addLocal() {
    if (form.locales.length >= MAX_LOCALES) return;
    const isFirst = form.locales.length === 0;
    const comunaInicial = form.comunaBase || "";
    setField("locales", [
      ...form.locales,
      {
        nombre_local: "",
        direccion: "",
        comuna_slug: comunaInicial,
        es_principal: isFirst,
      },
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
    if (next.length && next.every((l) => !l.es_principal)) {
      next[0].es_principal = true;
    }
    setField("locales", next);
  }

  return (
    <div style={cardStyle}>
      <h2 style={sectionTitle}>Ubicación y cobertura</h2>

      <div style={infoBoxStyle}>
        Indica desde qué comuna operas y hasta dónde llega tu negocio. Esto nos
        permite mostrar tu emprendimiento a las personas correctas.
      </div>

      <div style={sectionBoxStyle}>
        <div style={sectionMiniTitleStyle}>1. Comuna de origen</div>
        <div style={sectionHelpStyle}>
          Escribe la comuna donde se encuentra tu taller, local o donde preparas
          tus productos.
        </div>

        <div style={{ position: "relative" }}>
          <label style={labelStyle}>Comuna de origen *</label>
          <div
            style={{
              fontSize: 12,
              color: "#6b7280",
              marginTop: -2,
              marginBottom: 8,
              fontWeight: 600,
            }}
          >
            ¿Dónde estás ubicado?
          </div>
          <input
            type="text"
            autoComplete="off"
            placeholder="Ej: Maipú"
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
              comunaBaseBlurRef.current = setTimeout(() => {
                setComunaBaseOpen(false);
              }, 200);
            }}
            style={{
              ...inputStyle,
              border: errors.comunaBase
                ? "2px solid #ef4444"
                : "1px solid #d1d5db",
            }}
          />

          <div style={sectionHelpStyle}>
            Buscá en la lista y elegí tu comuna.
          </div>

          {comunaBaseOpen &&
            (comunaBaseSugerencias.length > 0 ||
              normalizeSearchText(comunaBaseQuery)) && (
              <div style={autocompleteDropdownStyle}>
                {comunaBaseSugerencias.length === 0 ? (
                  normalizeSearchText(comunaBaseQuery) ? (
                    <div style={autocompleteEmptyStyle}>
                      Sin resultados. Prueba otro texto o elige una comuna
                      válida.
                    </div>
                  ) : null
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

          {comunaBaseNoHabilitada ? (
            <div style={comunaNoHabilitadaStyle}>
              Esta comuna aún no está abierta públicamente, pero registraremos tu
              interés para ayudar a priorizar su apertura.
            </div>
          ) : null}
        </div>
      </div>

      <div style={sectionBoxStyle}>
        <div style={sectionMiniTitleStyle}>2. Tu zona de atención</div>
        <div style={sectionHelpStyle}>
          Elige el alcance de tu negocio: solo comuna, varias comunas cercanas,
          una o varias regiones, o cobertura nacional.
        </div>

        <div>
          <label style={labelStyle}>Tu zona de atención *</label>
          <div
            style={{
              fontSize: 12,
              color: "#6b7280",
              marginTop: -2,
              marginBottom: 8,
              fontWeight: 600,
            }}
          >
            ¿Hasta dónde llegas?
          </div>
          <select
            value={form.coberturaTipo}
            onChange={(e) => {
              const value = e.target.value;
              applyCoberturaTipo(value);
            }}
            style={selectStyle}
          >
            <option value="">Selecciona una opción</option>
            <option value="solo_mi_comuna">Solo mi comuna</option>
            <option value="varias_comunas">Varias comunas cercanas</option>
            <option value="varias_regiones">Una o varias regiones</option>
            <option value="nacional">Nacional</option>
          </select>

          <div style={sectionHelpStyle}>
            En “Varias comunas cercanas” elegí manualmente en qué comunas querés
            aparecer. En “Una o varias regiones” podés marcar varias regiones a la
            vez.
          </div>

          {errors.coberturaTipo ? (
            <p style={errorStyle}>{errors.coberturaTipo}</p>
          ) : null}
        </div>
      </div>

      {muestraComunas ? (
        <div style={sectionBoxStyle}>
          <div style={sectionMiniTitleStyle}>3. Comunas donde quieres aparecer</div>
          <div style={sectionHelpStyle}>
            Elige manualmente en qué comunas quieres aparecer. Podés quitar o
            agregar con los chips.
          </div>

          {!comunaBaseObj ? (
            <div style={emptyBoxStyle}>
              Primero selecciona una comuna base arriba para elegir comunas de cobertura.
            </div>
          ) : (
            <>
              <div style={chipWrap}>
                {comunasCoberturaSeleccionadas.length === 0 ? (
                  <div style={emptyChipNoteStyle}>Aun no agregas comunas de cobertura.</div>
                ) : (
                  comunasCoberturaSeleccionadas.map((comuna) => {
                    const isBase = comuna.id === comunaBaseObj.id;
                    return (
                      <span key={comuna.id} style={selectedChipStyle}>
                        {isBase ? `${comuna.nombre} (base)` : comuna.nombre}
                        {isBase ? null : (
                          <button
                            type="button"
                            onClick={() => removeComunaCobertura(comuna.slug)}
                            aria-label={`Quitar ${comuna.nombre}`}
                            style={chipRemoveStyle}
                          >
                            ×
                          </button>
                        )}
                      </span>
                    );
                  })
                )}
              </div>

              <div style={{ position: "relative", marginTop: 12 }}>
                <label style={labelStyle}>Agregar otra comuna</label>
                <input
                  type="text"
                  autoComplete="off"
                  value={localComunaQuery}
                  onChange={(e) => {
                    setLocalComunaQuery(e.target.value);
                    setLocalComunaOpen(true);
                  }}
                  onFocus={() => {
                    if (localComunaBlurRef.current) {
                      clearTimeout(localComunaBlurRef.current);
                      localComunaBlurRef.current = null;
                    }
                    setLocalComunaOpen(true);
                  }}
                  onBlur={() => {
                    localComunaBlurRef.current = setTimeout(() => {
                      setLocalComunaOpen(false);
                    }, 200);
                  }}
                  placeholder="Agregar otra comuna"
                  style={inputStyle}
                />

                {localComunaOpen &&
                  (comunasCoberturaAutocomplete.length > 0 ||
                    normalizeSearchText(localComunaQuery)) && (
                    <div style={autocompleteDropdownStyle}>
                      {comunasCoberturaAutocomplete.length === 0 ? (
                        <div style={autocompleteEmptyStyle}>
                          Sin resultados. Prueba otro texto o elige una comuna valida.
                        </div>
                      ) : (
                        comunasCoberturaAutocomplete.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            style={autocompleteItemStyle}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              addComunaCobertura(c.slug);
                              setLocalComunaQuery("");
                              setLocalComunaOpen(false);
                            }}
                          >
                            {c.label}
                          </button>
                        ))
                      )}
                    </div>
                  )}
              </div>
            </>
          )}

          {errors.comunasCobertura ? (
            <p style={errorStyle}>{errors.comunasCobertura}</p>
          ) : null}
        </div>
      ) : null}

      {muestraRegiones ? (
        <div style={sectionBoxStyle}>
          <div style={sectionMiniTitleStyle}>
            {muestraComunas ? "4" : "3"}. Regiones donde atiendes
          </div>
          <div style={sectionHelpStyle}>
            La región de tu comuna base aparece seleccionada. Puedes agregar otras
            regiones.
          </div>

          {!comunaBaseObj ? (
            <div style={emptyBoxStyle}>
              Primero selecciona una comuna base arriba para definir regiones.
            </div>
          ) : (
            <>
              <div style={chipWrap}>
                {regionesCoberturaSeleccionadasObjs.length === 0 ? (
                  <div style={emptyChipNoteStyle}>
                    Agrega al menos una región con el selector de abajo.
                  </div>
                ) : (
                  regionesCoberturaSeleccionadasObjs.map((region) => {
                    const esBase = region.slug === regionBaseSlug;
                    const soloUna = form.regionesCobertura.length <= 1;
                    return (
                      <div
                        key={region.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "6px 10px",
                          borderRadius: 20,
                          border: esBase ? "none" : "2px solid #93c5fd",
                          background: esBase ? "#2563eb" : "#dbeafe",
                          color: esBase ? "#fff" : "#1e40af",
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        <span>
                          {region.nombre}
                          {esBase ? " (región base)" : ""}
                        </span>
                        <button
                          type="button"
                          disabled={soloUna}
                          onClick={() => eliminarRegionCobertura(region.slug)}
                          aria-label={`Quitar ${region.nombre}`}
                          title={
                            soloUna
                              ? "Debe quedar al menos una región"
                              : undefined
                          }
                          style={{
                            marginLeft: 4,
                            border: "none",
                            background: esBase
                              ? "rgba(255,255,255,0.2)"
                              : "#bfdbfe",
                            borderRadius: 999,
                            width: 22,
                            height: 22,
                            lineHeight: 1,
                            cursor: soloUna ? "not-allowed" : "pointer",
                            fontWeight: 700,
                            color: esBase ? "#fff" : "#1e3a8a",
                            opacity: soloUna ? 0.35 : 1,
                          }}
                        >
                          ×
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              <label style={{ ...labelStyle, marginTop: 12 }}>
                Agregar regiones
              </label>
              <select
                key={regionAgregarSelectKey}
                value=""
                aria-label="Elige una región para agregar"
                onChange={(e) => {
                  const slug = e.target.value;
                  if (slug) agregarRegionCobertura(slug);
                }}
                style={{ ...selectStyle, marginTop: 6 }}
              >
                <option value="">Elige una región para agregar...</option>
                {regionesCoberturaAgregables.map((r) => (
                  <option key={r.id} value={r.slug}>
                    {r.nombre}
                  </option>
                ))}
              </select>
            </>
          )}

          {errors.regionesCobertura ? (
            <p style={errorStyle}>{errors.regionesCobertura}</p>
          ) : null}
        </div>
      ) : null}

      <div style={sectionBoxStyle}>
        <div style={sectionMiniTitleStyle}>
          {muestraComunas && muestraRegiones
            ? "5"
            : muestraComunas || muestraRegiones
              ? "4"
              : "3"}
          . ¿Cómo atiendes a tus clientes?
        </div>

        <div style={sectionHelpStyle}>
          Puedes elegir una o varias opciones.
        </div>

        <div style={modeListStyle}>
          {[
            {
              value: "local_fisico",
              label: "Local físico",
              help: "Los clientes van a tu local, tienda u oficina.",
            },
            {
              value: "delivery",
              label: "Delivery",
              help: "Llevas o envías productos al domicilio del cliente.",
            },
            {
              value: "domicilio",
              label: "A domicilio",
              help: "Vas al domicilio del cliente a prestar un servicio (sin local fijo o además del local).",
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
                  if (item.value === "local_fisico") {
                    if (active) {
                      const before = [...form.modalidades];
                      const after = form.modalidades.filter((m) => m !== "local_fisico" && m !== "local");
                      setField(
                        "modalidades",
                        after
                      );
                      setField("tieneLocalFisico", false);
                      setField("locales", []);
                      // Log temporal para confirmar que el estado se limpia al desactivar.
                      // (Opcional: activar con NEXT_PUBLIC_PUBLICAR_LOCAL_DEBUG=1 para no spamear.)
                      if (process.env.NEXT_PUBLIC_PUBLICAR_LOCAL_DEBUG === "1") {
                        // eslint-disable-next-line no-console
                        console.log("[publicar-local-debug][ui-toggle]", {
                          action: "desactivar_local_fisico",
                          modalidades_before: before,
                          modalidades_after: after,
                        });
                      }
                    } else {
                      const before = [...form.modalidades];
                      const after = [
                        ...form.modalidades.filter((m) => m !== "local"),
                        "local_fisico",
                      ];
                      setField("modalidades", after);
                      setField("tieneLocalFisico", true);
                      if (process.env.NEXT_PUBLIC_PUBLICAR_LOCAL_DEBUG === "1") {
                        // eslint-disable-next-line no-console
                        console.log("[publicar-local-debug][ui-toggle]", {
                          action: "activar_local_fisico",
                          modalidades_before: before,
                          modalidades_after: after,
                        });
                      }

                      if (form.locales.length === 0) {
                        const comunaInicial = form.comunaBase || "";
                        setField("locales", [
                          {
                            nombre_local: "",
                            direccion: "",
                            comuna_slug: comunaInicial,
                            es_principal: true,
                          },
                        ]);
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

        {errors.modalidades ? <p style={errorStyle}>{errors.modalidades}</p> : null}
      </div>

      {tieneLocalEnModalidades ? (
        <div style={sectionBoxStyle}>
          <div style={sectionMiniTitleStyle}>
            {muestraComunas && muestraRegiones
              ? "6"
              : muestraComunas || muestraRegiones
                ? "5"
                : "4"}
            . Locales físicos
          </div>

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
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <span style={{ fontWeight: 800, fontSize: 14 }}>
                  Local {index + 1}
                  {index > 0 ? " (opcional)" : ""}
                </span>

                {form.locales.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLocal(index)}
                    style={{ ...secondaryButtonStyle, padding: "6px 12px", fontSize: 13 }}
                  >
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
                            return c
                              ? `${c.nombre} — ${getRegionShort(c.region_nombre)}`.trim()
                              : "";
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

                  {localComunaOpen &&
                    localComunaActiveIndex === index &&
                    (localComunaSugerencias.length > 0 ||
                      normalizeSearchText(localComunaQuery)) && (
                      <div style={autocompleteDropdownStyle}>
                        {localComunaSugerencias.length === 0 ? (
                          normalizeSearchText(localComunaQuery) ? (
                            <div style={autocompleteEmptyStyle}>
                              Sin resultados. Prueba otro texto o elige una
                              comuna válida.
                            </div>
                          ) : null
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

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="local_principal"
                    checked={loc.es_principal}
                    onChange={() => updateLocal(index, { es_principal: true })}
                  />
                  <span style={{ fontWeight: 700, fontSize: 14 }}>
                    Es el local principal
                  </span>
                </label>
              </div>
            </div>
          ))}

          {form.locales.length < MAX_LOCALES && (
            <button
              type="button"
              onClick={addLocal}
              style={{ ...secondaryButtonStyle, marginTop: 8 }}
            >
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

        <button
          type="button"
          onClick={nextStep}
          disabled={!puedeContinuar}
          style={{
            ...primaryButtonStyle,
            opacity: puedeContinuar ? 1 : 0.55,
            cursor: puedeContinuar ? "pointer" : "not-allowed",
          }}
        >
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

const selectedChipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  minHeight: 38,
  padding: "0 12px",
  borderRadius: 999,
  border: "1px solid #93c5fd",
  background: "#dbeafe",
  color: "#1d4ed8",
  fontWeight: 800,
  fontSize: 14,
};

const chipRemoveStyle: React.CSSProperties = {
  width: 20,
  height: 20,
  borderRadius: 999,
  border: "none",
  background: "#bfdbfe",
  color: "#1e3a8a",
  fontWeight: 900,
  lineHeight: 1,
  cursor: "pointer",
};

const emptyChipNoteStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#6b7280",
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