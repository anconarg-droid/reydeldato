"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { FormData } from "./PublicarClient";
import type { Comuna } from "./PublicarClient";
import type { Region } from "./PublicarClient";
import { supabase } from "@/lib/supabase";
import { slugify } from "@/lib/slugify";
import { getEmailTypoSuggestion } from "@/lib/validateEmail";
import { normalizeAndValidateChileWhatsappStrict } from "@/utils/phone";

type SetField = <K extends keyof FormData>(key: K, value: FormData[K]) => void;

function resolveComunaBySlug(
  comunas: Comuna[],
  slug: string
): Comuna | undefined {
  return (
    comunas.find((c) => c.slug === slug) ||
    comunas.find((c) => slugify(c.slug) === slugify(slug))
  );
}

function sameRegionId(candidate: Comuna, base: Comuna | null): boolean {
  if (!base) return false;
  const baseRid = base.region_id != null ? String(base.region_id).trim() : "";
  const candRid = candidate.region_id != null ? String(candidate.region_id).trim() : "";
  if (!baseRid || !candRid) return false;
  return baseRid === candRid;
}

function regionSlugFromComunaBase(
  comunaBase: Comuna | null,
  regiones: Region[]
): string | null {
  const rid = comunaBase?.region_id != null ? String(comunaBase.region_id).trim() : "";
  if (!rid) return null;
  const r = regiones.find((x) => String(x.id) === rid);
  return r?.slug ? String(r.slug).trim() : null;
}

export default function PasoInformacionBasica({
  form,
  errors,
  setField,
  submitForm,
  comunas,
  regiones,
  showIntro = true,
}: {
  form: FormData;
  errors: Record<string, string>;
  setField: SetField;
  submitForm: () => void;
  comunas: Comuna[];
  regiones: Region[];
  /** Si false, oculta título y aviso duplicados (layout con hero externo). */
  showIntro?: boolean;
}) {
  const MAX_COMUNAS_VARIAS = 8;

  const comunasOrdenadas = useMemo(
    () => [...comunas].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    [comunas]
  );

  const comunaBaseObj = useMemo(
    () => resolveComunaBySlug(comunas, form.comunaBase) || null,
    [comunas, form.comunaBase]
  );

  const comunasMismaRegion = useMemo(() => {
    if (!comunaBaseObj) return [];
    const baseRid =
      comunaBaseObj.region_id != null ? String(comunaBaseObj.region_id).trim() : "";
    if (!baseRid) return [];
    return comunasOrdenadas.filter((c) => {
      if (c.slug === comunaBaseObj.slug) return false;
      const rid = c.region_id != null ? String(c.region_id).trim() : "";
      return rid !== "" && rid === baseRid;
    });
  }, [comunasOrdenadas, comunaBaseObj]);

  const [comunasQuery, setComunasQuery] = useState("");
  const [comunaBaseQuery, setComunaBaseQuery] = useState("");
  /** Remount del `<select>` de regiones para que vuelva al placeholder tras cada agregado. */
  const [regionAgregarSelectKey, setRegionAgregarSelectKey] = useState(0);

  const comunasBaseFiltradas = useMemo(() => {
    const q = comunaBaseQuery.trim().toLowerCase();
    if (!q) return [];

    return comunasOrdenadas
      .filter((c) => {
        if (form.comunaBase && c.slug === form.comunaBase) return false;
        const text =
          `${c.nombre} ${c.region_nombre || ""} ${c.display_name || ""}`.toLowerCase();
        return text.includes(q);
      })
      .slice(0, 12);
  }, [comunasOrdenadas, comunaBaseQuery, form.comunaBase]);

  const comunasFiltradas = useMemo(() => {
    const q = comunasQuery.trim().toLowerCase();
    if (!q) return comunasMismaRegion;
    return comunasMismaRegion.filter((c) =>
      c.nombre.toLowerCase().includes(q)
    );
  }, [comunasMismaRegion, comunasQuery]);

  const [touchedDescripcionCorta, setTouchedDescripcionCorta] = useState(false);

  function applyCoberturaTipo(value: string) {
    setField("coberturaTipo", value);
    console.log("comunaBase:", form.comunaBase);
    console.log("coberturaTipo:", value);

    if (value === "solo_mi_comuna") {
      setField("comunasCobertura", form.comunaBase ? [form.comunaBase] : []);
      setField("regionesCobertura", []);
      return;
    }

    if (value === "varias_comunas") {
      setField("comunasCobertura", form.comunaBase ? [form.comunaBase] : []);
      setField("regionesCobertura", []);
      return;
    }

    if (value === "varias_regiones") {
      setField("comunasCobertura", []);
      const baseRegionSlug = regionSlugFromComunaBase(comunaBaseObj, regiones);
      setField("regionesCobertura", baseRegionSlug ? [baseRegionSlug] : []);
      return;
    }

    if (value === "nacional") {
      setField("comunasCobertura", []);
      setField("regionesCobertura", []);
      return;
    }
  }

  function applyComunaBase(slug: string) {
    setField("comunaBase", slug);
    console.log("comunaBase:", slug);
    console.log("coberturaTipo:", form.coberturaTipo);
    const selected = comunas.find((c) => c.slug === slug) || null;
    setComunaBaseQuery(
      selected?.display_name || selected?.nombre || slug
    );

    if (form.coberturaTipo === "solo_mi_comuna") {
      setField("comunasCobertura", slug ? [slug] : []);
      setField("regionesCobertura", []);
    } else if (form.coberturaTipo === "varias_comunas") {
      setField("comunasCobertura", slug ? [slug] : []);
      setField("regionesCobertura", []);
    } else if (form.coberturaTipo === "varias_regiones") {
      setField("comunasCobertura", []);
      const base = comunas.find((c) => c.slug === slug) || null;
      const baseRegionSlug = regionSlugFromComunaBase(base, regiones);
      setField("regionesCobertura", baseRegionSlug ? [baseRegionSlug] : []);
    } else if (form.coberturaTipo === "nacional") {
      setField("comunasCobertura", []);
      setField("regionesCobertura", []);
    }
  }

  const regionBaseSlug = useMemo(() => {
    return regionSlugFromComunaBase(comunaBaseObj, regiones);
  }, [comunaBaseObj, regiones]);

  const regionesOrdenadas = useMemo(() => {
    return [...regiones].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [regiones]);

  const regionesCoberturaDisponiblesOrden = useMemo(() => {
    if (!regionBaseSlug) return regionesOrdenadas;
    const base = regionesOrdenadas.find((r) => r.slug === regionBaseSlug);
    if (!base) return regionesOrdenadas;
    return [base, ...regionesOrdenadas.filter((r) => r.slug !== regionBaseSlug)];
  }, [regionesOrdenadas, regionBaseSlug]);

  const regionesCoberturaSeleccionadasObjs = useMemo(() => {
    const bySlug = new Map(regiones.map((r) => [r.slug, r]));
    return (Array.isArray(form.regionesCobertura) ? form.regionesCobertura : [])
      .map((slug) => bySlug.get(String(slug)))
      .filter((x): x is Region => Boolean(x));
  }, [regiones, form.regionesCobertura]);

  const regionesCoberturaAgregables = useMemo(() => {
    const selected = new Set(form.regionesCobertura);
    return regionesCoberturaDisponiblesOrden.filter((r) => !selected.has(r.slug));
  }, [regionesCoberturaDisponiblesOrden, form.regionesCobertura]);

  function agregarRegionCobertura(slug: string) {
    const s = String(slug || "").trim();
    if (!s || form.regionesCobertura.includes(s)) return;
    setField("regionesCobertura", [...form.regionesCobertura, s]);
    setRegionAgregarSelectKey((k) => k + 1);
  }

  function eliminarRegionCobertura(slug: string) {
    const s = String(slug || "").trim();
    if (!s) return;
    const isBase = regionBaseSlug && s === regionBaseSlug;
    const next = form.regionesCobertura.filter((x) => x !== s);
    if (isBase) return;
    if (next.length === 0 && regionBaseSlug) {
      setField("regionesCobertura", [regionBaseSlug]);
      return;
    }
    if (next.length === 0) return;
    setField("regionesCobertura", next);
  }

  function clearComunaBase() {
    setField("comunaBase", "");
    setField("comunasCobertura", []);
    setField("regionesCobertura", []);
    setComunaBaseQuery("");
    setComunasQuery("");
  }

  /** Hidrata el input cuando ya hay comuna guardada (p. ej. borrador). */
  useEffect(() => {
    if (!form.comunaBase) {
      setComunaBaseQuery("");
      return;
    }
    const selected =
      comunas.find((c) => c.slug === form.comunaBase) || null;
    const nextValue = selected?.display_name || selected?.nombre || "";
    if (nextValue && comunaBaseQuery !== nextValue) {
      setComunaBaseQuery(nextValue);
    }
    // Solo reaccionar a slug / lista; si incluimos comunaBaseQuery aquí se pisa la búsqueda al tipear.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intencional
  }, [form.comunaBase, comunas]);

  function toggleComunaCobertura(slug: string) {
    if (!slug || !form.comunaBase) return;

    const baseComuna = resolveComunaBySlug(comunas, form.comunaBase);
    const targetComuna = resolveComunaBySlug(comunas, slug);
    if (!baseComuna || !targetComuna) return;
    if (targetComuna.id === baseComuna.id) return;

    const hasTarget = form.comunasCobertura.some(
      (s) => resolveComunaBySlug(comunas, s)?.id === targetComuna.id
    );

    let raw: string[];
    if (hasTarget) {
      raw = form.comunasCobertura.filter(
        (s) => resolveComunaBySlug(comunas, s)?.id !== targetComuna.id
      );
    } else {
      if (form.comunasCobertura.length >= MAX_COMUNAS_VARIAS) return;
      raw = [...form.comunasCobertura, targetComuna.slug];
    }

    const deduped: string[] = [];
    const seenIds = new Set<string>();
    for (const s of raw) {
      const c = resolveComunaBySlug(comunas, s);
      if (c) {
        if (seenIds.has(c.id)) continue;
        seenIds.add(c.id);
        deduped.push(c.slug);
      } else if (s.trim()) {
        const key = `raw:${slugify(s)}`;
        if (seenIds.has(key)) continue;
        seenIds.add(key);
        deduped.push(s.trim());
      }
    }

    const extras = deduped.filter(
      (s) => resolveComunaBySlug(comunas, s)?.id !== baseComuna.id
    );
    const next = [baseComuna.slug, ...extras].slice(0, MAX_COMUNAS_VARIAS);

    setField("comunasCobertura", next);
    setField("regionesCobertura", []);
  }

  const nombreComunaBaseSeleccionada =
    comunaBaseObj?.display_name || comunaBaseObj?.nombre || "";
  const mostrarSugerenciasComunaBase =
    comunaBaseQuery.trim().length > 0 &&
    comunaBaseQuery.trim() !== nombreComunaBaseSeleccionada.trim();
  const descripcionLength = form.descripcionNegocio.trim().length;
  const descripcionMinimaOk = descripcionLength >= 40;
  const descripcionFaltante = Math.max(0, 40 - descripcionLength);
  const showDescripcionFaltaEnRojo = touchedDescripcionCorta && !descripcionMinimaOk;

  const emailTypoSuggestion = useMemo(() => {
    return getEmailTypoSuggestion(form.email);
  }, [form.email]);

  const whatsappLiveCheck = useMemo(() => {
    if (!form.whatsapp.trim()) return { ok: true, normalized: "" };
    return normalizeAndValidateChileWhatsappStrict(form.whatsapp);
  }, [form.whatsapp]);

  const isValidCoberturaVariasComunas =
    form.coberturaTipo !== "varias_comunas" ||
    form.comunasCobertura.length >= 2;

  const [comunasCercanasSugeridasSlugs, setComunasCercanasSugeridasSlugs] =
    useState<string[]>([]);

  async function obtenerComunasCercanasSugeridas(
    slugBase: string
  ): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from("comunas_cercanas_sugeridas")
        .select("comuna_slug_sugerida")
        .eq("comuna_slug_base", slugify(slugBase))
        .order("orden", { ascending: true })
        .limit(5);

      console.log("slugBase que se envía:", slugBase);
      console.log("resultado DB:", data);

      if (error) {
        console.warn(
          "[PasoInformacionBasica] error obteniendo comunas cercanas:",
          error
        );
        return [];
      }

      if (!Array.isArray(data)) return [];
      return data
        .map((row) => (row as Record<string, unknown>).comuna_slug_sugerida)
        .map((v) => (v == null ? "" : String(v).trim()))
        .filter(Boolean);
    } catch (e) {
      console.warn(
        "[PasoInformacionBasica] excepción obteniendo comunas cercanas:",
        e
      );
      return [];
    }
  }

  // Cargar “cercanas sugeridas” desde DB cuando cambia la comuna base.
  useEffect(() => {
    if (form.coberturaTipo !== "varias_comunas") return;
    const base = form.comunaBase;
    if (!base) {
      setComunasCercanasSugeridasSlugs([]);
      return;
    }

    let cancelled = false;
    void (async () => {
      const slugs = await obtenerComunasCercanasSugeridas(base);
      if (cancelled) return;
      setComunasCercanasSugeridasSlugs(slugs);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- queremos exacto para base/tipo
  }, [form.coberturaTipo, form.comunaBase]);

  const comunasCercanasSugeridas = useMemo(() => {
    const base = comunaBaseObj;
    const baseRid = base?.region_id != null ? String(base.region_id).trim() : "";
    return comunasCercanasSugeridasSlugs
      .map((raw) => {
        const k = slugify(raw);
        return comunas.find((c) => slugify(c.slug) === k);
      })
      .filter((c): c is Comuna => !!c)
      .filter((c) => {
        if (!base || !baseRid) return false;
        const rid = c.region_id != null ? String(c.region_id).trim() : "";
        return rid !== "" && rid === baseRid;
      });
  }, [comunasCercanasSugeridasSlugs, comunas, comunaBaseObj]);

  // “Cercanas”: sugeridas desde DB; fallback a misma región (nunca vacío).
  const comunasCercanasBase = useMemo(() => {
    if (comunasCercanasSugeridas.length > 0) return comunasCercanasSugeridas;
    return comunasMismaRegion.slice(0, 5);
  }, [comunasCercanasSugeridas, comunasMismaRegion]);

  const comunasSugeridasCercanasUi = useMemo(() => {
    const base = resolveComunaBySlug(comunas, form.comunaBase);
    return comunasCercanasBase.filter((c) => !base || c.id !== base.id);
  }, [comunasCercanasBase, comunas, form.comunaBase]);

  // Resultados para “Agregar otra comuna”: cuando el usuario escribe,
  // se muestran primero las cercanas sugeridas, luego el resto.
  const comunasResultadosAgregar = useMemo(() => {
    const q = comunasQuery.trim().toLowerCase();
    if (!q) return [];
    const base = comunaBaseObj;
    if (!base) return [];
    const baseRid = base.region_id != null ? String(base.region_id).trim() : "";
    if (!baseRid) return [];

    const selectedIds = new Set(
      form.comunasCobertura
        .map((s) => resolveComunaBySlug(comunas, s)?.id)
        .filter(Boolean) as string[]
    );
    const cercanasSet = new Set(comunasCercanasBase.map((c) => c.slug));

    const match = comunasOrdenadas
      .filter((c) => c.slug !== base.slug)
      .filter((c) => {
        const rid = c.region_id != null ? String(c.region_id).trim() : "";
        return rid !== "" && rid === baseRid;
      })
      .filter((c) => c.nombre.toLowerCase().includes(q))
      .filter((c) => !selectedIds.has(c.id));

    const cercanas = match.filter((c) => cercanasSet.has(c.slug));
    const resto = match.filter((c) => !cercanasSet.has(c.slug));
    return [...cercanas, ...resto].slice(0, 8);
  }, [
    comunasQuery,
    comunasMismaRegion,
    comunasCercanasBase,
    form.comunasCobertura,
    comunas,
  ]);

  return (
    <div style={cardStyle}>
      {showIntro ? (
        <>
          <h2 style={titleStyle}>Crea tu ficha básica</h2>

          <div style={noticeStyle}>
            Publica tu emprendimiento con nombre, WhatsApp, una descripción corta,
            comuna base y cobertura. Luego podrás agregar fotos, redes sociales y
            más detalles para mejorar tu ficha.
          </div>
        </>
      ) : null}

      <div style={sectionTitleStyle}>Lo esencial</div>

      <div className={esencialGridClass}>
        <div className="min-w-0 flex flex-col">
          <label style={labelStyle}>Nombre del emprendimiento *</label>
          <input
            value={form.nombre}
            onChange={(e) => setField("nombre", e.target.value)}
            placeholder="Ej: Panadería La Esquina"
            className="w-full"
            style={inputStyle}
          />
          {errors.nombre ? <p style={errorStyle}>{errors.nombre}</p> : null}
        </div>

        <div className="min-w-0 flex flex-col">
          <label style={labelStyle}>Email de contacto *</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setField("email", e.target.value)}
            placeholder="nombre@dominio.com"
            className="w-full"
            style={inputStyle}
          />
          <div style={helperStyle}>
            Lo usaremos para avisarte sobre tu postulación, tu panel y futuros
            cobros. No se mostrará públicamente.
          </div>
          {emailTypoSuggestion ? (
            <div
              style={{
                marginTop: 8,
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid #fed7aa",
                background: "#fff7ed",
                color: "#9a3412",
                fontSize: 12,
                fontWeight: 800,
                lineHeight: 1.45,
              }}
              role="note"
            >
              Parece que el dominio tiene un error. ¿Quisiste decir{" "}
              <span style={{ fontWeight: 900 }}>
                {emailTypoSuggestion.suggestedEmail}
              </span>
              ?
            </div>
          ) : null}
          {errors.email ? <p style={errorStyle}>{errors.email}</p> : null}
        </div>

        <div className="col-span-full flex min-w-0 flex-col">
          <label style={labelStyle}>WhatsApp principal *</label>
          <input
            type="tel"
            value={form.whatsapp}
            onChange={(e) => setField("whatsapp", e.target.value)}
            placeholder="+56912345678 o 912345678"
            className="w-full"
            style={inputStyle}
          />
          <div style={helperStyle}>
            Será el principal medio de contacto con tus clientes.
          </div>
          {!whatsappLiveCheck.ok ? (
            <p style={errorStyle}>
              Ingresa un WhatsApp válido de Chile (ej: 9XXXXXXXX o +569XXXXXXXX)
            </p>
          ) : null}
          {errors.whatsapp ? <p style={errorStyle}>{errors.whatsapp}</p> : null}
        </div>

        <div className="col-span-full flex min-w-0 flex-col">
          <label style={labelStyle}>Descripción de tu emprendimiento *</label>
          <textarea
            value={form.descripcionNegocio}
            onChange={(e) => {
              const next = e.target.value;
              setField("descripcionNegocio", next);
              if (!touchedDescripcionCorta && next.trim().length > 0) {
                setTouchedDescripcionCorta(true);
              }
            }}
            placeholder="Ej: Vendemos pan amasado, empanadas y kuchen por encargo en Calera de Tango."
            className="w-full"
            style={textareaStyle}
          />
          <div style={helperStyle}>
            Este texto aparece en los resultados cuando alguien te busca. Sé breve y claro. Después podrás agregar una descripción completa con más detalles.
          </div>
          <div
            style={{
              ...helperStyle,
              color: showDescripcionFaltaEnRojo ? "#b91c1c" : "#64748b",
              fontWeight: showDescripcionFaltaEnRojo ? 700 : 600,
            }}
          >
            {descripcionMinimaOk
              ? `${descripcionLength}/40 caracteres mínimos`
              : touchedDescripcionCorta
                ? `Te faltan ${descripcionFaltante} caracteres`
                : "Mínimo 40 caracteres"}
          </div>
          {errors.descripcionNegocio ? (
            <p style={errorStyle}>{errors.descripcionNegocio}</p>
          ) : null}
        </div>

      </div>

      <div style={dividerStyle} />

      <div style={sectionTitleStyle}>Dónde aparecerás</div>

      <div className={ubicacionGridClass}>
        <div style={{ gridColumn: "1 / -1", position: "relative" }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <label style={labelStyle}>Comuna base *</label>
            {form.comunaBase ? (
              <button
                type="button"
                onClick={clearComunaBase}
                style={{
                  border: "none",
                  background: "transparent",
                  padding: 0,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 900,
                  color: "#1d4ed8",
                  textDecoration: "underline",
                  textUnderlineOffset: 2,
                }}
              >
                Cambiar comuna
              </button>
            ) : null}
          </div>
          <input
            type="text"
            autoComplete="off"
            placeholder="Escribe tu comuna"
            value={comunaBaseQuery}
            onChange={(e) => {
              const v = e.target.value;
              setComunaBaseQuery(v);
              if (v.trim() === "") {
                clearComunaBase();
                console.log("comunaBase:", "");
                console.log("coberturaTipo:", form.coberturaTipo);
              }
            }}
            style={{
              ...inputStyle,
              border: errors.comunaBase
                ? "2px solid #ef4444"
                : "1px solid #d1d5db",
            }}
          />
          {mostrarSugerenciasComunaBase ? (
            <div
              role="listbox"
              style={{
                position: "absolute",
                zIndex: 20,
                left: 0,
                right: 0,
                top: "100%",
                marginTop: 4,
                maxHeight: 220,
                overflowY: "auto",
                background: "#fff",
                border: "1px solid #d1d5db",
                borderRadius: 12,
                boxShadow: "0 8px 20px rgba(15,23,42,0.06)",
              }}
            >
              {comunasBaseFiltradas.length > 0 ? (
                comunasBaseFiltradas.map((c) => (
                  <button
                    key={c.slug}
                    type="button"
                    role="option"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyComunaBase(c.slug);
                    }}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 14px",
                      fontSize: 14,
                      border: "none",
                      borderBottom: "1px solid #f3f4f6",
                      background:
                        form.comunaBase === c.slug ? "#eff6ff" : "#fff",
                      cursor: "pointer",
                      color: "#111827",
                    }}
                  >
                    {c.display_name ||
                      `${c.nombre}${c.region_nombre ? `, ${c.region_nombre}` : ""}`}
                  </button>
                ))
              ) : (
                <div
                  style={{
                    padding: "12px 14px",
                    fontSize: 14,
                    color: "#6b7280",
                  }}
                >
                  No encontramos comunas con esa búsqueda.
                </div>
              )}
            </div>
          ) : null}
          <div style={{ ...helperStyle, marginBottom: 14 }}>
            Busca y selecciona tu comuna principal.
          </div>
          {errors.comunaBase ? <p style={errorStyle}>{errors.comunaBase}</p> : null}
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>Cobertura *</label>
          <select
            value={form.coberturaTipo}
            onChange={(e) => applyCoberturaTipo(e.target.value)}
            style={inputStyle}
          >
            <option value="">Selecciona cobertura</option>
            <option value="solo_mi_comuna">Solo mi comuna</option>
            <option value="varias_comunas">Varias comunas cercanas</option>
            <option value="varias_regiones">Una o más regiones</option>
            <option value="nacional">Todo Chile</option>
          </select>
          <div style={helperStyle}>
            Esto define en qué comunas podrán encontrarte.
          </div>
          {errors.coberturaTipo ? (
            <p style={errorStyle}>{errors.coberturaTipo}</p>
          ) : null}
        </div>

        {form.coberturaTipo === "varias_comunas" ? (
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Tu cobertura *</label>

            {!form.comunaBase ? (
              <div style={helperStyle}>Primero selecciona tu comuna base.</div>
            ) : (
              <div style={{ marginTop: 12 }}>
                <div
                  style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}
                >
                  Selecciona las comunas donde atiendes. Puedes eliminar o agregar
                  comunas según tu cobertura real.
                  <br />
                  Mínimo 2 comunas en total (incluyendo la base).
                </div>

                <div style={{ marginTop: 12 }}>
                  <div
                    style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}
                  >
                    Comunas seleccionadas
                  </div>

                  <div
                    style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
                  >
                    {form.comunasCobertura.map((slug) => {
                      const comuna = resolveComunaBySlug(comunas, slug);
                      const baseComuna = resolveComunaBySlug(
                        comunas,
                        form.comunaBase
                      );
                      const isBase =
                        Boolean(comuna && baseComuna && comuna.id === baseComuna.id);

                      return (
                        <div
                          key={comuna?.id ?? slug}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "6px 10px",
                            borderRadius: 20,
                            background: isBase ? "#2563eb" : "#e5e7eb",
                            color: isBase ? "#fff" : "#111827",
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                        >
                          <span>
                            {comuna?.nombre || slug}
                            {isBase ? " (base)" : ""}
                          </span>

                          {isBase ? null : (
                            <button
                              type="button"
                              onClick={() => toggleComunaCobertura(slug)}
                              aria-label={`Quitar ${comuna?.nombre || slug}`}
                              style={{
                                marginLeft: 4,
                                border: "none",
                                background: "transparent",
                                cursor: "pointer",
                                fontWeight: 700,
                                color: "#111827",
                              }}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {comunasSugeridasCercanasUi.length > 0 ? (
                  <div style={{ marginTop: 16 }}>
                    <div
                      style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}
                    >
                      Te sugerimos comunas cercanas:
                    </div>
                    <div
                      style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
                    >
                      {comunasSugeridasCercanasUi.map((comuna) => {
                        const yaSeleccionada = form.comunasCobertura.some(
                          (s) =>
                            resolveComunaBySlug(comunas, s)?.id === comuna.id
                        );
                        const reachedMax =
                          form.comunasCobertura.length >= MAX_COMUNAS_VARIAS;
                        return (
                          <button
                            key={comuna.slug}
                            type="button"
                            disabled={yaSeleccionada || reachedMax}
                            onClick={() => {
                              if (yaSeleccionada || reachedMax) return;
                              toggleComunaCobertura(comuna.slug);
                            }}
                            style={{
                              padding: "6px 12px",
                              borderRadius: 999,
                              border: "1px solid #d1d5db",
                              fontSize: 13,
                              cursor:
                                yaSeleccionada || reachedMax
                                  ? "not-allowed"
                                  : "pointer",
                              background: yaSeleccionada ? "#f3f4f6" : "#fff",
                              color: yaSeleccionada ? "#9ca3af" : "#111827",
                            }}
                          >
                            {comuna.nombre}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                <div style={{ marginTop: 16 }}>
                  <div
                    style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}
                  >
                    Agregar otra comuna
                  </div>

                  <input
                    value={comunasQuery}
                    onChange={(e) => setComunasQuery(e.target.value)}
                    placeholder="Buscar comuna para agregar..."
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid #d1d5db",
                      fontSize: 14,
                    }}
                  />

                  {comunasQuery.trim().length > 0 ? (
                    <div
                      style={{
                        marginTop: 8,
                        border: "1px solid #e5e7eb",
                        borderRadius: 8,
                        maxHeight: 160,
                        overflowY: "auto",
                        background: "#fff",
                      }}
                    >
                      {comunasResultadosAgregar.map((c) => {
                        const reachedMax =
                          form.comunasCobertura.length >= MAX_COMUNAS_VARIAS;
                        return (
                          <button
                            key={c.slug}
                            type="button"
                            disabled={reachedMax}
                            onClick={() => {
                              if (reachedMax) return;
                              toggleComunaCobertura(c.slug);
                              setComunasQuery("");
                            }}
                            style={{
                              display: "block",
                              width: "100%",
                              padding: "10px 12px",
                              cursor: reachedMax ? "not-allowed" : "pointer",
                              border: "none",
                              borderBottom: "1px solid #f3f4f6",
                              fontSize: 14,
                              textAlign: "left",
                              background: "#fff",
                              color: reachedMax ? "#9ca3af" : "#111827",
                            }}
                          >
                            {c.nombre}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>

                <div style={{ ...helperStyle, marginTop: 10 }}>
                  {form.comunasCobertura.length}/{MAX_COMUNAS_VARIAS}{" "}
                  comunas seleccionadas
                </div>

                {form.comunasCobertura.length >= MAX_COMUNAS_VARIAS ? (
                  <div style={helperStyle}>
                    Ya llegaste al máximo de comunas para este paso.
                  </div>
                ) : null}

                {!isValidCoberturaVariasComunas ? (
                  <p style={{ ...errorStyle, marginTop: 10 }}>
                    Debes seleccionar al menos 2 comunas (incluyendo la base).
                  </p>
                ) : null}

                {errors.comunasCobertura ? (
                  <p style={errorStyle}>{errors.comunasCobertura}</p>
                ) : null}
              </div>
            )}
          </div>
        ) : null}

        {form.coberturaTipo === "varias_regiones" ? (
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Regiones donde atiendes *</label>
            <div style={{ ...helperStyle, marginTop: 4, marginBottom: 12 }}>
              La región de tu comuna base aparece seleccionada. Puedes agregar otras regiones.
            </div>

            {!form.comunaBase ? (
              <div style={helperStyle}>Primero selecciona tu comuna base.</div>
            ) : (
              <>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                  Regiones seleccionadas
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {regionesCoberturaSeleccionadasObjs.length === 0 ? (
                    <div style={helperStyle}>
                      No hay regiones seleccionadas. Vuelve a elegir tu comuna base o agrega una región abajo.
                    </div>
                  ) : (
                    regionesCoberturaSeleccionadasObjs.map((r) => {
                      const esBase = r.slug === regionBaseSlug;
                      return (
                        <div
                          key={r.slug}
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
                            {r.nombre}
                            {esBase ? " (región base)" : ""}
                          </span>
                          {esBase ? null : (
                            <button
                              type="button"
                              onClick={() => eliminarRegionCobertura(r.slug)}
                              aria-label={`Quitar ${r.nombre}`}
                              style={{
                                marginLeft: 4,
                                border: "none",
                                background: "#bfdbfe",
                                borderRadius: 999,
                                width: 22,
                                height: 22,
                                lineHeight: 1,
                                cursor: "pointer",
                                fontWeight: 700,
                                color: "#1e3a8a",
                              }}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                <div style={{ marginTop: 14 }}>
                  <label style={{ ...labelStyle, fontSize: 13 }}>
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
                    style={{ ...inputStyle, marginTop: 2 }}
                  >
                    <option value="">Elige una región para agregar...</option>
                    {regionesCoberturaAgregables.map((r) => (
                      <option key={r.slug} value={r.slug}>
                        {r.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {errors.regionesCobertura ? (
              <p style={{ ...errorStyle, marginTop: 12 }}>
                {errors.regionesCobertura}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className={footerOuterClass}>
        <div className={footerTermsClass}>
          <label
            htmlFor="acepta-terminos-privacidad"
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              fontSize: 13,
              color: "#374151",
              lineHeight: 1.45,
              fontWeight: 600,
            }}
          >
            <input
              id="acepta-terminos-privacidad"
              type="checkbox"
              checked={form.aceptaTerminosPrivacidad}
              onChange={(e) =>
                setField("aceptaTerminosPrivacidad", e.target.checked)
              }
              style={{ marginTop: 2, accentColor: "#0d9488" }}
            />
            <span>
              Acepto los{" "}
              <Link
                href="/terminos"
                style={{
                  color: "#0d9488",
                  fontWeight: 800,
                  textDecoration: "underline",
                  textUnderlineOffset: 2,
                }}
              >
                Términos y Condiciones
              </Link>{" "}
              y la{" "}
              <Link
                href="/privacidad"
                style={{
                  color: "#0d9488",
                  fontWeight: 800,
                  textDecoration: "underline",
                  textUnderlineOffset: 2,
                }}
              >
                Política de Privacidad
              </Link>
              .
            </span>
          </label>
          {errors.aceptaTerminosPrivacidad ? (
            <p style={{ ...errorStyle, marginTop: 8 }}>
              {errors.aceptaTerminosPrivacidad}
            </p>
          ) : null}

          <div
            style={{
              marginTop: 22,
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              fontSize: 13,
              color: "#0f766e",
              lineHeight: 1.5,
              fontWeight: 600,
              background: "#f0fdfa",
              border: "1px solid #99f6e4",
              borderRadius: 10,
              padding: "10px 12px",
            }}
            role="note"
          >
            <span
              aria-hidden
              style={{
                flexShrink: 0,
                display: "inline-flex",
                marginTop: 1,
                color: "#0f766e",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="currentColor"
                  strokeWidth="1.75"
                />
                <path
                  d="M12 16v-4.5M12 8.25h.01"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <span>
              Después podrás agregar fotos, redes sociales y más detalles para mejorar tu ficha.
            </span>
          </div>
        </div>

        <div className={primaryButtonWrapClass}>
          <button
            type="button"
            onClick={submitForm}
            className={primaryButtonClass}
            style={primaryButtonStyle}
          >
            Publicar y empezar a recibir contactos
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

const titleStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 900,
  margin: "0 0 18px",
  lineHeight: 1.05,
  letterSpacing: "-0.02em",
  color: "#111827",
};

const noticeStyle: React.CSSProperties = {
  fontSize: 14,
  lineHeight: 1.6,
  color: "#374151",
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  borderRadius: 14,
  padding: "14px 16px",
  marginBottom: 20,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "#0f766e",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  marginBottom: 14,
  paddingBottom: 10,
  borderBottom: "1px solid #99f6e4",
};

const dividerStyle: React.CSSProperties = {
  borderTop: "1px solid #e5e7eb",
  margin: "24px 0",
};

/** Grilla "Lo esencial": 1 col en mobile, 2 desde md. WhatsApp y descripción ocupan todo el ancho. */
const esencialGridClass =
  "grid w-full grid-cols-1 gap-5 md:grid-cols-2 md:gap-6";

/** Misma idea para ubicación/cobertura (hijos suelen usar gridColumn full). */
const ubicacionGridClass =
  "grid w-full grid-cols-1 gap-5 md:grid-cols-2 md:gap-[18px]";

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

const textareaStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 120,
  borderRadius: 12,
  border: "1px solid #d1d5db",
  padding: "12px 14px",
  fontSize: 15,
  color: "#111827",
  background: "#fff",
  resize: "vertical",
};

const helperStyle: React.CSSProperties = {
  fontSize: 12,
  marginTop: 6,
  color: "#6b7280",
  lineHeight: 1.5,
};

const errorStyle: React.CSSProperties = {
  color: "#b91c1c",
  fontSize: 12,
  marginTop: 6,
  fontWeight: 700,
};

const footerOuterClass =
  "mt-7 flex w-full flex-col gap-4 border-t border-[#e5e7eb] pt-5 md:flex-row md:items-start md:gap-6";

const footerTermsClass = "min-w-0 w-full md:min-w-0 md:flex-1 md:max-w-xl";

const primaryButtonWrapClass =
  "flex w-full shrink-0 md:flex-1 md:items-center md:justify-center";

const primaryButtonClass =
  "inline-flex w-full min-h-[48px] items-center justify-center md:w-auto md:min-w-[14rem]";

const primaryButtonStyle: React.CSSProperties = {
  background: "#0d9488",
  color: "#fff",
  border: "none",
  padding: "12px 20px",
  borderRadius: 12,
  fontWeight: 800,
  cursor: "pointer",
};