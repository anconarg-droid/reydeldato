"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Comuna, FormData, Region } from "./PublicarClient";
import { supabase } from "@/lib/supabase";
import { slugify } from "@/lib/slugify";
import { getEmailTypoSuggestion } from "@/lib/validateEmail";
import { normalizeAndValidateChileWhatsappStrict } from "@/utils/phone";
import {
  DESCRIPCION_CORTA_MAX,
  DESCRIPCION_CORTA_MIN,
  normalizeDescripcionCorta,
} from "@/lib/descripcionProductoForm";

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

function regionSlugForComunaSlug(
  comunasList: Comuna[],
  regionesList: Region[],
  comunaSlug: string
): string | null {
  const c = resolveComunaBySlug(comunasList, comunaSlug);
  if (!c?.region_id) return null;
  const r = regionesList.find((x) => String(x.id) === String(c.region_id));
  return r?.slug ?? null;
}

export default function PasoInformacionBasica({
  form,
  errors,
  setField,
  submitForm,
  comunas,
  regiones,
  showIntro = true,
  /** Publicar simple: la larga se completa en «Mejorar ficha». */
  omitDescripcionLarga = false,
  showLegalAcceptance = false,
}: {
  form: FormData;
  errors: Record<string, string>;
  setField: SetField;
  submitForm: () => void;
  comunas: Comuna[];
  regiones: Region[];
  /** Si false, oculta título y aviso duplicados (layout con hero externo). */
  showIntro?: boolean;
  omitDescripcionLarga?: boolean;
  showLegalAcceptance?: boolean;
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

  function applyCoberturaTipo(value: string) {
    setField("coberturaTipo", value);

    if (value === "") {
      setField(
        "comunasCobertura",
        form.comunaBase ? [form.comunaBase] : [],
      );
      setField("regionesCobertura", []);
      return;
    }

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
      const reg = regionSlugForComunaSlug(comunas, regiones, form.comunaBase);
      setField("regionesCobertura", reg ? [reg] : []);
      return;
    }

    if (value === "nacional") {
      setField("comunasCobertura", []);
      setField("regionesCobertura", []);
      return;
    }
  }

  function applyComunaBase(slug: string) {
    const prev = form.comunaBase;
    const selected = comunas.find((c) => c.slug === slug) || null;
    setComunaBaseQuery(
      selected?.display_name || selected?.nombre || slug
    );

    if (prev && prev !== slug) {
      setField("comunaBase", slug);
      setField("coberturaTipo", "");
      setField("comunasCobertura", []);
      setField("regionesCobertura", []);
      return;
    }

    setField("comunaBase", slug);

    if (form.coberturaTipo === "solo_mi_comuna") {
      setField("comunasCobertura", slug ? [slug] : []);
      setField("regionesCobertura", []);
    } else if (form.coberturaTipo === "varias_comunas") {
      setField("comunasCobertura", slug ? [slug] : []);
      setField("regionesCobertura", []);
    } else if (form.coberturaTipo === "varias_regiones") {
      setField("comunasCobertura", []);
      const reg = regionSlugForComunaSlug(comunas, regiones, slug);
      setField("regionesCobertura", reg ? [reg] : []);
    } else if (form.coberturaTipo === "nacional") {
      setField("comunasCobertura", []);
      setField("regionesCobertura", []);
    }
  }

  function clearComunaBase() {
    setField("comunaBase", "");
    setField("coberturaTipo", "");
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

  const regionBaseSlug = useMemo(
    () => regionSlugForComunaSlug(comunas, regiones, form.comunaBase),
    [comunas, regiones, form.comunaBase]
  );

  const regionesOrdenadas = useMemo(
    () => [...regiones].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    [regiones]
  );

  const regionesCoberturaDisponiblesOrden = useMemo(() => {
    if (!regionBaseSlug) return regionesOrdenadas;
    const base = regionesOrdenadas.find((r) => r.slug === regionBaseSlug);
    if (!base) return regionesOrdenadas;
    return [base, ...regionesOrdenadas.filter((r) => r.slug !== regionBaseSlug)];
  }, [regionesOrdenadas, regionBaseSlug]);

  const regionesCoberturaSeleccionadasObjs = useMemo(() => {
    const bySlug = new Map(regiones.map((r) => [r.slug, r]));
    return form.regionesCobertura
      .map((slug) => bySlug.get(slug))
      .filter((x): x is Region => Boolean(x));
  }, [regiones, form.regionesCobertura]);

  const regionesCoberturaAgregables = useMemo(() => {
    const selected = new Set(form.regionesCobertura);
    return regionesCoberturaDisponiblesOrden.filter((r) => !selected.has(r.slug));
  }, [regionesCoberturaDisponiblesOrden, form.regionesCobertura]);

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

  const nombreComunaBaseSeleccionada =
    comunaBaseObj?.display_name || comunaBaseObj?.nombre || "";
  const mostrarSugerenciasComunaBase =
    comunaBaseQuery.trim().length > 0 &&
    comunaBaseQuery.trim() !== nombreComunaBaseSeleccionada.trim();
  const descripcionCortaLen = normalizeDescripcionCorta(
    form.descripcionNegocio,
  ).length;
  const descripcionFaltante = Math.max(
    0,
    DESCRIPCION_CORTA_MIN - descripcionCortaLen,
  );
  const descripcionSobra = Math.max(
    0,
    descripcionCortaLen - DESCRIPCION_CORTA_MAX,
  );

  const emailTypoSuggestion = useMemo(() => {
    return getEmailTypoSuggestion(form.email);
  }, [form.email]);

  const whatsappLiveCheck = useMemo(() => {
    if (!form.whatsapp.trim()) return { ok: true, normalized: "" };
    return normalizeAndValidateChileWhatsappStrict(form.whatsapp);
  }, [form.whatsapp]);

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
            Necesitamos nombre, WhatsApp, un resumen para búsquedas, comuna y cobertura.
            Después podrás sumar fotos y más datos.
          </div>
        </>
      ) : null}

      <div
        style={{
          marginBottom: 18,
          paddingBottom: 14,
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <div
          style={{
            fontSize: 17,
            fontWeight: 900,
            lineHeight: 1.3,
            letterSpacing: "-0.025em",
            color: "#0f172a",
            marginBottom: 10,
          }}
        >
          Publica tu emprendimiento y empieza a recibir clientes
        </div>
        <p
          style={{
            margin: 0,
            fontSize: 14,
            lineHeight: 1.55,
            color: "#64748b",
            fontWeight: 600,
          }}
        >
          Completa estos datos y aparecerás cuando alguien busque lo que haces en tu comuna.
        </p>
      </div>

      <div style={gridStyle}>
        <div>
          <label style={labelStyle}>Nombre del emprendimiento *</label>
          <input
            value={form.nombre}
            onChange={(e) => setField("nombre", e.target.value)}
            placeholder="Ej: Taller mecánico El Rayo"
            style={inputStyle}
          />
          {errors.nombre ? <p style={errorStyle}>{errors.nombre}</p> : null}
        </div>

        <div>
          <label style={labelStyle}>Email de contacto *</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setField("email", e.target.value)}
            placeholder="nombre@dominio.com"
            style={inputStyle}
          />
          <div style={helperStyle}>
            Usaremos este correo para avisarte cuando recibas consultas y gestionar tu cuenta.
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
            Aquí te escribirán las personas interesadas en tu servicio.
          </div>
          {!whatsappLiveCheck.ok ? (
            <p style={errorStyle}>
              Ingresa un WhatsApp válido de Chile (ej: 9XXXXXXXX o +569XXXXXXXX)
            </p>
          ) : null}
          {errors.whatsapp ? <p style={errorStyle}>{errors.whatsapp}</p> : null}
        </div>
      </div>

      <div style={dividerStyle} />

      <div style={gridStyle}>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>¿A qué te dedicas? *</label>
          <textarea
            value={form.descripcionNegocio}
            onChange={(e) => setField("descripcionNegocio", e.target.value)}
            placeholder="Ej: Gasfiter en Maipú: destapes, filtraciones, calefont"
            style={{
              ...textareaStyle,
              border:
                descripcionSobra > 0 ||
                descripcionFaltante > 0 ||
                errors.descripcionNegocio
                  ? "2px solid #ef4444"
                  : textareaStyle.border,
            }}
            aria-describedby={[
              "descripcion-resumen-ayuda",
              "descripcion-resumen-contador",
              descripcionSobra === 0 ? "descripcion-resumen-feedback" : "",
              descripcionSobra > 0 ? "descripcion-resumen-exceso" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-invalid={
              descripcionSobra > 0 ||
              descripcionFaltante > 0 ||
              Boolean(errors.descripcionNegocio)
            }
          />
          <div
            id="descripcion-resumen-ayuda"
            style={{
              ...helperStyle,
              marginTop: 10,
              marginBottom: 6,
              lineHeight: 1.55,
              color: "#6b7280",
            }}
          >
            Ej: Gasfiter en Maipú: destapes, filtraciones, calefont.
            <br />
            Luego podrás agregar más detalles en tu perfil.
          </div>
          <p
            id="descripcion-resumen-contador"
            style={{
              margin: "0 0 4px 0",
              fontSize: 12,
              lineHeight: 1.4,
              fontWeight: 600,
              color:
                descripcionSobra > 0 || descripcionFaltante > 0
                  ? "#b91c1c"
                  : "#15803d",
            }}
            aria-live="polite"
          >
            {descripcionCortaLen} / {DESCRIPCION_CORTA_MAX}
          </p>
          {descripcionSobra > 0 ? (
            <p
              id="descripcion-resumen-exceso"
              style={errorStyle}
              role="alert"
            >
              Te pasaste por {descripcionSobra} caracteres. Acórtalo a una sola
              frase.
            </p>
          ) : (
            <p
              id="descripcion-resumen-feedback"
              style={{
                margin: "0 0 4px 0",
                fontSize: 12,
                lineHeight: 1.45,
                fontWeight: 600,
                color:
                  descripcionFaltante > 0 ? "#b91c1c" : "#15803d",
              }}
              role="status"
              aria-live="polite"
            >
              {descripcionFaltante > 0
                ? `Te faltan ${descripcionFaltante} caracteres para completar este campo`
                : "Perfecto, así te encontrarán mejor"}
            </p>
          )}
          {errors.descripcionNegocio &&
          descripcionFaltante === 0 &&
          descripcionSobra === 0 ? (
            <p style={errorStyle} role="alert">
              {errors.descripcionNegocio}
            </p>
          ) : null}
        </div>

        {!omitDescripcionLarga ? (
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>
              Descripción larga (opcional)
            </label>
            <textarea
              value={form.descripcionLarga}
              onChange={(e) => setField("descripcionLarga", e.target.value)}
              placeholder="Ej: Horarios, presupuesto sin cargo, scanner, neumáticos y repuestos."
              style={textareaStyle}
            />
            <div style={helperStyle}>
              Solo aparece en tu ficha completa, debajo de la galería de fotos. Si
              no escribís nada, ese espacio queda vacío.
            </div>
            {errors.descripcionLarga ? (
              <p style={errorStyle}>{errors.descripcionLarga}</p>
            ) : null}
          </div>
        ) : null}

        <div style={{ gridColumn: "1 / -1", marginTop: 28, paddingTop: 8 }}>
          <label style={labelStyle}>
            Palabras clave de búsqueda (opcional)
          </label>
          <div style={{ ...helperStyle, marginBottom: 8 }}>
            Escribe servicios o productos específicos separados por comas.
          </div>
          <input
            type="text"
            autoComplete="off"
            name="keywords_usuario"
            inputMode="text"
            value={String(form.keywordsUsuario ?? "")}
            onChange={(e) => {
              setField("keywordsUsuario", e.target.value);
            }}
            placeholder="Ej: frenos, cambio de aceite, alineación, neumáticos, scanner"
            style={inputStyle}
          />
        </div>
      </div>

      <div style={dividerStyle} />

      <div style={sectionTitleStyle}>Dónde aparecerás</div>

      <div style={gridStyle}>
        <div style={{ gridColumn: "1 / -1", position: "relative" }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <label style={labelStyle}>Comuna de origen *</label>
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
          <div
            style={{
              fontSize: 12,
              color: "#6b7280",
              marginTop: -2,
              marginBottom: 8,
              fontWeight: 600,
            }}
          >
            ¿En qué comuna estás?
          </div>
          <input
            type="text"
            autoComplete="off"
            placeholder="Ej: Calera de Tango"
            value={comunaBaseQuery}
            onChange={(e) => {
              const v = e.target.value;
              setComunaBaseQuery(v);
              if (v.trim() === "") {
                clearComunaBase();
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
            Elige la comuna donde está tu base principal.
          </div>
          {errors.comunaBase ? <p style={errorStyle}>{errors.comunaBase}</p> : null}
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>¿Dónde puedes atender? *</label>
          <div
            style={{
              fontSize: 12,
              color: "#6b7280",
              marginTop: -2,
              marginBottom: 8,
              fontWeight: 600,
            }}
          >
            ¿Hasta dónde atiendes?
          </div>
          <div style={{ ...helperStyle, marginBottom: 10 }}>
            Selecciona si atiendes solo tu comuna, varias comunas cercanas, una o
            varias regiones, o a nivel nacional.
          </div>
          <select
            value={form.coberturaTipo}
            onChange={(e) => applyCoberturaTipo(e.target.value)}
            style={inputStyle}
          >
            <option value="">Selecciona una opción</option>
            <option value="solo_mi_comuna">Solo mi comuna</option>
            <option value="varias_comunas">Varias comunas cercanas</option>
            <option value="varias_regiones">Una o varias regiones</option>
            <option value="nacional">Nacional</option>
          </select>
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
                <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 10 }}>
                  Necesitas al menos 2 comunas en total. La base ya aparece arriba;
                  agrega otra con las sugerencias o la búsqueda.
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
                      style={{
                        fontSize: 14,
                        fontWeight: 800,
                        color: "#0f172a",
                        marginBottom: 6,
                      }}
                    >
                      Selecciona las comunas donde también atiendes
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "#6b7280",
                        marginBottom: 10,
                        lineHeight: 1.45,
                      }}
                    >
                      Haz clic para agregar o quitar una comuna de tu cobertura
                      (la comuna base no se puede quitar desde aquí).
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
                        const bloqueadoAgregar =
                          reachedMax && !yaSeleccionada;
                        return (
                          <button
                            key={comuna.slug}
                            type="button"
                            disabled={bloqueadoAgregar}
                            onClick={() => {
                              if (bloqueadoAgregar) return;
                              toggleComunaCobertura(comuna.slug);
                            }}
                            style={{
                              padding: "7px 14px",
                              borderRadius: 999,
                              border: yaSeleccionada
                                ? "2px solid #2563eb"
                                : "1px solid #d1d5db",
                              fontSize: 13,
                              fontWeight: yaSeleccionada ? 700 : 600,
                              cursor: bloqueadoAgregar
                                ? "not-allowed"
                                : "pointer",
                              background: yaSeleccionada ? "#dbeafe" : "#fff",
                              color: yaSeleccionada ? "#1e40af" : "#111827",
                              opacity: bloqueadoAgregar ? 0.55 : 1,
                            }}
                          >
                            {yaSeleccionada ? "✓ " : null}
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
                    ¿No ves tu comuna? Búscala y agrégala aquí
                  </div>

                  <input
                    value={comunasQuery}
                    onChange={(e) => setComunasQuery(e.target.value)}
                    placeholder="Ej: La Florida, Puente Alto, Santiago"
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
                        const yaEnCobertura = form.comunasCobertura.some(
                          (s) =>
                            resolveComunaBySlug(comunas, s)?.id === c.id
                        );
                        const bloqueadoAgregar =
                          reachedMax && !yaEnCobertura;
                        return (
                          <button
                            key={c.slug}
                            type="button"
                            disabled={bloqueadoAgregar}
                            onClick={() => {
                              if (bloqueadoAgregar) return;
                              toggleComunaCobertura(c.slug);
                              setComunasQuery("");
                            }}
                            style={{
                              display: "block",
                              width: "100%",
                              padding: "10px 12px",
                              cursor: bloqueadoAgregar
                                ? "not-allowed"
                                : "pointer",
                              border: "none",
                              borderBottom: "1px solid #f3f4f6",
                              fontSize: 14,
                              textAlign: "left",
                              background: yaEnCobertura ? "#eff6ff" : "#fff",
                              color: bloqueadoAgregar ? "#9ca3af" : "#111827",
                              fontWeight: yaEnCobertura ? 600 : 400,
                            }}
                          >
                            {yaEnCobertura ? "✓ " : null}
                            {c.nombre}
                            {yaEnCobertura ? " · en tu cobertura" : null}
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

                {errors.comunasCobertura ? (
                  <p
                    style={{
                      color: "#b91c1c",
                      fontSize: 13,
                      fontWeight: 600,
                      marginTop: 12,
                      lineHeight: 1.45,
                    }}
                  >
                    {errors.comunasCobertura}
                  </p>
                ) : null}
              </div>
            )}
          </div>
        ) : null}

        {form.coberturaTipo === "varias_regiones" ? (
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Regiones donde atiendes</label>
            <div style={{ ...helperStyle, marginTop: 4, marginBottom: 12 }}>
              La región de tu comuna base aparece seleccionada. Puedes agregar otras
              regiones.
            </div>

            {!form.comunaBase ? (
              <div style={helperStyle}>Primero selecciona tu comuna de origen.</div>
            ) : (
              <>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                  Regiones seleccionadas
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {regionesCoberturaSeleccionadasObjs.length === 0 ? (
                    <div style={helperStyle}>
                      No hay regiones seleccionadas. Volvé a elegir tu comuna base o
                      agregá una región abajo.
                    </div>
                  ) : (
                    regionesCoberturaSeleccionadasObjs.map((r) => {
                      const esBase = r.slug === regionBaseSlug;
                      const soloUna = form.regionesCobertura.length <= 1;
                      return (
                        <div
                          key={r.slug}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "6px 10px",
                            borderRadius: 20,
                            border: esBase
                              ? "none"
                              : "2px solid #93c5fd",
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
                          <button
                            type="button"
                            disabled={soloUna}
                            onClick={() => eliminarRegionCobertura(r.slug)}
                            aria-label={`Quitar ${r.nombre}`}
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
                              opacity: soloUna ? 0.45 : 1,
                            }}
                          >
                            ×
                          </button>
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

      <div style={footerStyle}>
        {showLegalAcceptance ? (
          <div className="w-full">
            <label
              htmlFor="acepta-terminos-privacidad"
              className="flex items-start gap-3 text-sm text-slate-700 leading-snug"
            >
              <input
                id="acepta-terminos-privacidad"
                type="checkbox"
                required
                checked={form.aceptaTerminosPrivacidad}
                onChange={(e) => setField("aceptaTerminosPrivacidad", e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
              />
              <span>
                Acepto los{" "}
                <Link href="/terminos" className="font-semibold text-slate-900 underline underline-offset-2">
                  Términos y Condiciones
                </Link>{" "}
                y la{" "}
                <Link href="/privacidad" className="font-semibold text-slate-900 underline underline-offset-2">
                  Política de Privacidad
                </Link>
                .
              </span>
            </label>
            {errors.aceptaTerminosPrivacidad ? (
              <p style={{ ...errorStyle, marginTop: 10 }}>{errors.aceptaTerminosPrivacidad}</p>
            ) : null}
          </div>
        ) : null}

        <div style={helperStyle}>
          Publicar toma menos de 2 minutos. Luego podrás completar tu ficha con más detalles.
        </div>

        <button type="button" onClick={submitForm} style={primaryButtonStyle}>
          Publicar y empezar a recibir contactos
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
  margin: "0 0 18px",
  lineHeight: 1.05,
  letterSpacing: "-0.02em",
  color: "#0f172a",
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
  fontSize: 17,
  fontWeight: 900,
  lineHeight: 1.3,
  letterSpacing: "-0.025em",
  color: "#0f172a",
  marginBottom: 18,
  marginTop: 0,
  padding: "0 0 10px 0",
  borderBottom: "1px solid #e5e7eb",
};

const dividerStyle: React.CSSProperties = {
  borderTop: "1px solid #e5e7eb",
  margin: "24px 0",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0,1fr))",
  gap: 18,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontWeight: 900,
  fontSize: 14,
  marginBottom: 8,
  color: "#0f172a",
  letterSpacing: "-0.01em",
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

const footerStyle: React.CSSProperties = {
  marginTop: 28,
  paddingTop: 20,
  borderTop: "1px solid #e5e7eb",
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "center",
};

const primaryButtonStyle: React.CSSProperties = {
  background: "#0d9488",
  color: "#fff",
  border: "none",
  padding: "12px 20px",
  borderRadius: 12,
  fontWeight: 800,
  cursor: "pointer",
};