"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import ComunaEnPreparacion from "@/components/ComunaEnPreparacion";

type RubroItem = {
  rubro?: string | null;
  nombre?: string | null;
  subcategoria_slug?: string | null;
  subcategoria_nombre?: string | null;
  faltan?: number | null;
  faltan_minimo?: number | null;
  peso?: number | null;
  objetivo?: number | null;
  minimo?: number | null;
  nivel?: number | null;
  prioridad?: string | null;
};

type AbrirComunaData = {
  comuna_slug: string;
  comuna_nombre: string;
  region_nombre?: string | null;
  porcentaje_apertura?: number;
  se_puede_abrir?: boolean | null;
  estado_apertura?: string | null;
  estado_apertura_simple?: string | null;
  mensaje_apertura?: string | null;
  rubros_faltantes?: RubroItem[] | null;
  rubros_detalle?: RubroItem[] | null;
  // compat con data anterior (si existe en tu vista)
  avance_porcentaje?: number;
  total_emprendedores?: number;
  categorias_totales?: number;
  categorias_cubiertas?: number;
  categorias_faltantes?: number;
};

function getEstadoVisual(estado?: string) {
  if (estado === "activa") {
    return {
      emoji: "🟢",
      label: "Activa",
      color: "#166534",
      bg: "#ecfdf5",
      border: "#86efac",
    };
  }

  if (estado === "lista_para_abrir") {
    return {
      emoji: "🟠",
      label: "Lista para abrir",
      color: "#9a3412",
      bg: "#fff7ed",
      border: "#fdba74",
    };
  }

  if (estado === "en_proceso" || estado === "con_movimiento") {
    return {
      emoji: "🟡",
      label: "En proceso",
      color: "#854d0e",
      bg: "#fefce8",
      border: "#fde047",
    };
  }

  return {
    emoji: "🔒",
    label: "Sin movimiento",
    color: "#4b5563",
    bg: "#f9fafb",
    border: "#d1d5db",
  };
}

export default function AbrirComunaClient({
  data,
}: {
  data: AbrirComunaData | null;
}) {

  if (!data) {
    return (
      <div style={{padding:40,fontFamily:"sans-serif"}}>
        <h2>Comuna no encontrada</h2>
        <p>No hay información disponible para esta comuna.</p>
      </div>
    );
  }

  const estadoParaBadge =
    data.estado_apertura_simple || data.estado_apertura || "sin_movimiento";

  const estadoVisual = useMemo(
    () => getEstadoVisual(estadoParaBadge || "sin_movimiento"),
    [estadoParaBadge]
  );

  const porcentaje = Number(data.porcentaje_apertura ?? data.avance_porcentaje ?? 0) || 0;
  const porcentajeClamped = Math.max(0, Math.min(100, porcentaje));

  const heroMessage = useMemo(() => {
    if (data.mensaje_apertura) return data.mensaje_apertura;
    if (data.se_puede_abrir === true) {
      return `Ya estás muy cerca de abrir Rey del Dato en ${data.comuna_nombre}. Publica o recomienda un negocio para completar los rubros que faltan.`;
    }
    if (data.estado_apertura_simple === "sin_cobertura") {
      return `Aún no abrimos Rey del Dato en ${data.comuna_nombre}. Necesitamos emprendimientos en los rubros faltantes para empezar.`;
    }
    if (data.estado_apertura_simple === "en_apertura") {
      return `Rey del Dato se está preparando para abrir en ${data.comuna_nombre}. Completa los rubros faltantes para lograr la apertura.`;
    }
    return `Revisa el avance de apertura en ${data.comuna_nombre} y ayúdanos con los rubros faltantes.`;
  }, [data.comuna_nombre, data.estado_apertura_simple, data.mensaje_apertura, data.se_puede_abrir]);

  const normalizeRubro = useCallback((r: RubroItem) => {
    // Shape nueva que pediste para `rubros_faltantes`:
    // { rubro: string, faltan: number, peso: number }
    if (typeof r.rubro === "string" && r.rubro.trim()) {
      const subcategoria_slug = r.rubro;
      const subcategoria_nombre = r.nombre ?? r.rubro;
      const faltan = Number(r.faltan ?? 0) || 0;
      const peso = Number(r.peso ?? 0) || 0;
      return {
        subcategoria_slug,
        subcategoria_nombre,
        faltan,
        peso,
        nivel: r.nivel,
        prioridad: r.prioridad,
      };
    }

    const subcategoria_slug =
      r.subcategoria_slug ?? (r as any).subcategoriaSlug ?? (r as any).slug ?? null;
    const subcategoria_nombre =
      r.subcategoria_nombre ?? r.nombre ?? (r as any).subcategoriaNombre ?? null;
    const faltan =
      Number(r.faltan_minimo ?? r.faltan ?? (r as any).faltanMinimo ?? 0) || 0;
    const pesoRaw =
      r.peso ??
      r.objetivo ??
      r.minimo ??
      (typeof r.nivel === "number" ? (r.nivel === 1 ? 100000 : 1000) : null) ??
      0;
    const peso = Number(pesoRaw) || 0;
    return { subcategoria_slug, subcategoria_nombre, faltan, peso, nivel: r.nivel, prioridad: r.prioridad };
  }, []);

  const rubrosFaltantes = useMemo(() => {
    const list = (data.rubros_faltantes ?? []) as RubroItem[];
    return list
      .map(normalizeRubro)
      .filter((x) => x.faltan > 0)
      .sort((a, b) => b.peso - a.peso);
  }, [data.rubros_faltantes, normalizeRubro]);

  const rubrosCubiertos = useMemo(() => {
    const list = (data.rubros_detalle ?? []) as RubroItem[];
    if (!Array.isArray(list) || list.length === 0) return [];
    return list
      .map(normalizeRubro)
      .filter((x) => x.faltan <= 0)
      .sort((a, b) => b.peso - a.peso);
  }, [data.rubros_detalle, normalizeRubro]);

  const [prefillRubroSlug, setPrefillRubroSlug] = useState<string | null>(null);
  const [prefillRubroLabel, setPrefillRubroLabel] = useState<string | null>(null);
  const recommendationFormId = "abrir-comuna-form-recomendar";

  const scrollToRecommendationForm = useCallback(() => {
    const el = document.getElementById(recommendationFormId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleRecomendar = useCallback(
    (rubroSlug: string, rubroLabel?: string) => {
      setPrefillRubroSlug(rubroSlug);
      setPrefillRubroLabel(rubroLabel ?? null);
      scrollToRecommendationForm();
    },
    [scrollToRecommendationForm]
  );

  // Formulario "avísame cuando abra"
  const [contacto, setContacto] = useState("");
  const [sendingAviso, setSendingAviso] = useState(false);
  const [doneAviso, setDoneAviso] = useState(false);
  const [errorAviso, setErrorAviso] = useState("");

  const submitAviso = useCallback(async () => {
    try {
      setSendingAviso(true);
      setErrorAviso("");
      setDoneAviso(false);
      const res = await fetch("/api/abrir-comuna/vecino", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comuna_slug: data.comuna_slug,
          comuna_nombre: data.comuna_nombre,
          contacto,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        setErrorAviso(json?.error || "No se pudo enviar.");
        return;
      }
      setDoneAviso(true);
    } catch (e) {
      setErrorAviso("No se pudo enviar.");
    } finally {
      setSendingAviso(false);
    }
  }, [contacto, data.comuna_nombre, data.comuna_slug]);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* 1) Hero superior */}
        <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
          <div
            className="inline-flex items-center gap-2 border rounded-full px-3 py-1 mb-4"
            style={{
              borderColor: estadoVisual.border,
              background: estadoVisual.bg,
              color: estadoVisual.color,
            }}
          >
            <span>{estadoVisual.emoji}</span>
            <span className="text-xs sm:text-sm font-extrabold">{estadoVisual.label}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-slate-900">
            Abramos {data.comuna_nombre}
          </h1>

          <div className="mt-4">
            <div className="flex items-end gap-2">
              <div className="text-4xl sm:text-5xl font-black text-slate-900 tabular-nums">
                {porcentajeClamped}%
              </div>
              <div className="pb-1 text-sm sm:text-base font-semibold text-slate-600">
                de progreso de apertura
              </div>
            </div>

            <div className="mt-3 h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-slate-900"
                style={{ width: `${porcentajeClamped}%` }}
              />
            </div>

            <p className="mt-3 text-slate-600 leading-relaxed">{heroMessage}</p>
          </div>
        </section>

        {/* 2) Qué significa abrir una comuna */}
        <section className="mt-5 sm:mt-7">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
            ¿Qué significa abrir una comuna?
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed">
            Abrir Rey del Dato en tu comuna significa que ya reunimos suficientes emprendimientos
            de los rubros clave. Mientras no está activa, te mostramos exactamente qué rubros faltan
            para que la comuna pueda abrir. Tu acción cuenta: publicar o recomendar mueve la apertura.
          </p>
        </section>

        {/* 3) Rubros faltantes */}
        <section className="mt-6 sm:mt-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
            Rubros faltantes (ordenados por prioridad)
          </h2>

          <div className="mt-3 grid gap-3">
            {rubrosFaltantes.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-600">
                  No hay rubros faltantes en este momento. Revisa los rubros cubiertos abajo.
                </p>
              </div>
            ) : (
              rubrosFaltantes.map((r) => {
                const nombre = r.subcategoria_nombre || "Rubro";
                const slug = r.subcategoria_slug;
                return (
                  <div
                    key={`${slug}-${nombre}`}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-extrabold text-slate-900 truncate">{nombre}</div>
                        <div className="mt-1 text-sm text-slate-600">
                          Faltan <span className="font-extrabold tabular-nums text-slate-900">{r.faltan}</span>
                        </div>
                      </div>

                      {typeof r.nivel === "number" && (r.nivel === 1 || r.nivel === 2) ? (
                        <div className="text-xs font-extrabold px-2 py-1 rounded-full bg-slate-100 text-slate-700 whitespace-nowrap">
                          Nivel {r.nivel}
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Link
                        href={
                          slug
                            ? `/publicar?comuna=${encodeURIComponent(data.comuna_slug)}&subcategoria=${encodeURIComponent(slug)}`
                            : `/publicar?comuna=${encodeURIComponent(data.comuna_slug)}`
                        }
                        className="inline-flex items-center justify-center rounded-xl px-4 h-11 bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition"
                      >
                        Publicar como {nombre}
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleRecomendar(r.subcategoria_slug ?? "", nombre)}
                        className="inline-flex items-center justify-center rounded-xl px-4 h-11 border border-slate-300 bg-white text-slate-900 font-semibold text-sm hover:bg-slate-50 transition"
                      >
                        Recomendar {nombre}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* 4) CTA doble */}
        <section className="mt-6 sm:mt-7">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href={`/publicar?comuna=${encodeURIComponent(data.comuna_slug)}`}
              className="inline-flex items-center justify-center rounded-2xl px-5 h-12 bg-slate-900 text-white font-extrabold hover:bg-slate-800 transition"
            >
              Publicar mi emprendimiento
            </Link>
            <button
              type="button"
              onClick={scrollToRecommendationForm}
              className="inline-flex items-center justify-center rounded-2xl px-5 h-12 border border-slate-300 bg-white text-slate-900 font-extrabold hover:bg-slate-50 transition"
            >
              Recomendar emprendedor
            </button>
          </div>
        </section>

        {/* 5) Formulario de recomendación simple */}
        <section id={recommendationFormId} className="mt-6 sm:mt-7">
          <ComunaEnPreparacion
            comunaSlug={data.comuna_slug}
            comunaNombre={data.comuna_nombre}
            progreso={[]}
            mostrarProgreso={false}
            prefillRubro={prefillRubroSlug}
            prefillRubroLabel={prefillRubroLabel}
            mostrarPublicarLink={false}
          />
        </section>

        {/* 6) Formulario avísame cuando abra esta comuna */}
        <section className="mt-6 sm:mt-7">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
            <h2 className="text-xl font-extrabold text-slate-900">
              Avísame cuando abra esta comuna
            </h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Déjanos un WhatsApp o un email y te avisaremos cuando Rey del Dato esté activo en {data.comuna_nombre}.
            </p>

            {doneAviso ? (
              <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold">
                ¡Listo! Te avisaremos cuando abra.
              </div>
            ) : (
              <div className="mt-4 grid gap-3">
                <input
                  value={contacto}
                  onChange={(e) => setContacto(e.target.value)}
                  placeholder="WhatsApp o email"
                  className="h-11 px-3 rounded-xl border border-slate-300"
                />

                {errorAviso ? (
                  <div className="text-sm text-red-600 font-semibold">{errorAviso}</div>
                ) : null}

                <button
                  type="button"
                  disabled={sendingAviso}
                  onClick={submitAviso}
                  className="h-11 rounded-xl bg-slate-900 text-white font-extrabold hover:bg-slate-800 disabled:opacity-60 transition"
                >
                  {sendingAviso ? "Enviando..." : "Enviar"}
                </button>
              </div>
            )}
          </div>
        </section>

        {/* 7) Rubros ya cubiertos (colapsable) */}
        <section className="mt-6 sm:mt-7">
          <details>
            <summary className="cursor-pointer font-extrabold text-slate-900">
              Rubros ya cubiertos ({rubrosCubiertos.length})
            </summary>
            <div className="mt-3 grid gap-2">
              {rubrosCubiertos.length === 0 ? (
                <div className="text-sm text-slate-600">No hay rubros cubiertos para mostrar.</div>
              ) : (
                rubrosCubiertos.map((r) => {
                  const nombre = r.subcategoria_nombre || "Rubro";
                  return (
                    <div
                      key={`${r.subcategoria_slug}-${nombre}`}
                      className="rounded-xl border border-slate-200 bg-white p-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="font-extrabold text-slate-900 truncate">{nombre}</div>
                      </div>
                      <div className="font-extrabold text-emerald-700 whitespace-nowrap">✅ Cubierto</div>
                    </div>
                  );
                })
              )}
            </div>
          </details>
        </section>
      </div>
    </main>
  );
}