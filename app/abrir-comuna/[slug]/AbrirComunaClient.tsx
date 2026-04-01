"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
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
  actual?: number | null;
  requerido?: number | null;
};

type AbrirComunaData = {
  comuna_slug: string;
  comuna_nombre: string;
  region_nombre?: string | null;

  porcentaje_apertura?: number;
  avance_porcentaje?: number;

  se_puede_abrir?: boolean | null;
  estado_apertura?: string | null;
  estado_apertura_simple?: string | null;
  mensaje_apertura?: string | null;

  total_requerido?: number | null;
  total_cumplido?: number | null;
  total_faltante?: number | null;

  rubros_faltantes?: RubroItem[] | null;
  rubros_detalle?: RubroItem[] | null;

  // compat vieja
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

function getShareHref(comunaNombre: string, comunaSlug: string) {
  // Keep href deterministic across SSR/CSR to avoid hydration mismatches.
  const url = `/abrir-comuna/${comunaSlug}`;
  const text = encodeURIComponent(
    `Ayúdame a abrir Rey del Dato en ${comunaNombre}. Mira qué rubros faltan y comparte esta página: ${url}`
  );
  return `https://wa.me/?text=${text}`;
}

export default function AbrirComunaClient({
  data,
}: {
  data: AbrirComunaData | null;
}) {
  const safeData = data ?? {
    comuna_slug: "",
    comuna_nombre: "",
    porcentaje_apertura: 0,
    estado_apertura: "sin_movimiento",
    estado_apertura_simple: "sin_movimiento",
    se_puede_abrir: false,
    rubros_faltantes: [],
    rubros_detalle: [],
    total_requerido: 0,
    total_cumplido: 0,
    total_faltante: 0,
  };

  const estadoParaBadge =
    safeData.estado_apertura_simple ||
    safeData.estado_apertura ||
    "sin_movimiento";

  const estadoVisual = useMemo(
    () => getEstadoVisual(estadoParaBadge || "sin_movimiento"),
    [estadoParaBadge]
  );

  const porcentaje =
    Number(safeData.porcentaje_apertura ?? safeData.avance_porcentaje ?? 0) || 0;
  const porcentajeClamped = Math.max(0, Math.min(100, porcentaje));

  const totalRequerido = Number(safeData.total_requerido ?? 0) || 0;
  const totalCumplido = Number(safeData.total_cumplido ?? 0) || 0;
  const totalFaltante = Number(safeData.total_faltante ?? 0) || 0;

  const normalizeRubro = useCallback((r: RubroItem) => {
    if (typeof r.rubro === "string" && r.rubro.trim()) {
      const subcategoria_slug = r.rubro;
      const subcategoria_nombre = r.nombre ?? r.rubro;
      const faltan = Number(r.faltan ?? 0) || 0;
      const peso = Number(r.peso ?? 0) || 0;
      const actual = Number(r.actual ?? 0) || 0;
      const requerido = Number(r.requerido ?? peso ?? 0) || 0;

      return {
        subcategoria_slug,
        subcategoria_nombre,
        faltan,
        peso,
        actual,
        requerido,
        nivel: r.nivel,
        prioridad: r.prioridad,
      };
    }

    const subcategoria_slug =
      r.subcategoria_slug ?? (r as never as { slug?: string | null }).slug ?? null;
    const subcategoria_nombre = r.subcategoria_nombre ?? r.nombre ?? null;
    const faltan = Number(r.faltan_minimo ?? r.faltan ?? 0) || 0;
    const peso = Number(r.peso ?? r.objetivo ?? r.minimo ?? 0) || 0;
    const actual = Number(r.actual ?? 0) || 0;
    const requerido = Number(r.requerido ?? peso ?? 0) || 0;

    return {
      subcategoria_slug,
      subcategoria_nombre,
      faltan,
      peso,
      actual,
      requerido,
      nivel: r.nivel,
      prioridad: r.prioridad,
    };
  }, []);

  const rubrosFaltantes = useMemo(() => {
    const list = (safeData.rubros_faltantes ?? []) as RubroItem[];
    return list
      .map(normalizeRubro)
      .filter((x) => x.faltan > 0)
      .sort((a, b) => {
        if (b.faltan !== a.faltan) return b.faltan - a.faltan;
        if (b.peso !== a.peso) return b.peso - a.peso;
        return String(a.subcategoria_nombre || "").localeCompare(
          String(b.subcategoria_nombre || ""),
          "es"
        );
      });
  }, [safeData.rubros_faltantes, normalizeRubro]);

  const rubrosCubiertos = useMemo(() => {
    const list = (safeData.rubros_detalle ?? []) as RubroItem[];
    if (!Array.isArray(list) || list.length === 0) return [];
    return list
      .map(normalizeRubro)
      .filter((x) => x.faltan <= 0)
      .sort((a, b) => b.peso - a.peso);
  }, [safeData.rubros_detalle, normalizeRubro]);

  const rubroPrincipal = rubrosFaltantes[0] ?? null;
  const rubroPrincipalNombre = rubroPrincipal?.subcategoria_nombre || "este rubro";
  const rubroPrincipalSlug = rubroPrincipal?.subcategoria_slug || "";

  const heroMessage = useMemo(() => {
    if (safeData.mensaje_apertura) return safeData.mensaje_apertura;

    if (safeData.se_puede_abrir === true || estadoParaBadge === "lista_para_abrir") {
      return `Ya se cumplieron los mínimos para abrir Rey del Dato en ${safeData.comuna_nombre}.`;
    }

    if (totalFaltante === 1 && rubroPrincipalNombre) {
      return `Falta solo 1 emprendimiento para abrir ${safeData.comuna_nombre}. Si haces ${rubroPrincipalNombre}, puedes ser el primero en aparecer y activar esta comuna hoy.`;
    }

    if (totalFaltante > 1) {
      return `Faltan ${totalFaltante} emprendimientos para abrir ${safeData.comuna_nombre}. Si ofreces uno de estos servicios, puedes aparecer desde el día uno.`;
    }

    if (estadoParaBadge === "sin_movimiento") {
      return `Aún no abrimos Rey del Dato en ${safeData.comuna_nombre}. Necesitamos emprendimientos en los rubros faltantes para empezar.`;
    }

    if (estadoParaBadge === "en_proceso" || estadoParaBadge === "con_movimiento") {
      return `Rey del Dato se está preparando para abrir en ${safeData.comuna_nombre}. Completa los rubros faltantes para lograr la apertura.`;
    }

    return `Revisa el avance de apertura en ${safeData.comuna_nombre} y ayúdanos con los rubros faltantes.`;
  }, [
    safeData.comuna_nombre,
    safeData.mensaje_apertura,
    safeData.se_puede_abrir,
    estadoParaBadge,
    totalFaltante,
    rubroPrincipalNombre,
  ]);

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

  const publicarHrefBase = `/publicar?comuna=${encodeURIComponent(
    safeData.comuna_slug
  )}`;
  const getPublicarHrefByRubro = (rubroSlug?: string | null) => {
    const cleanSlug = String(rubroSlug ?? "").trim();
    if (!cleanSlug) return publicarHrefBase;
    return `${publicarHrefBase}&subcategoria=${encodeURIComponent(cleanSlug)}`;
  };
  const ctaPrincipalHref = rubroPrincipal
    ? getPublicarHrefByRubro(rubroPrincipal.subcategoria_slug)
    : publicarHrefBase;
  /** Un solo CTA principal fuerte (producto: publicar en rubro más faltante). */
  const ctaPrincipalLabel = rubroPrincipal
    ? `Publicar en ${safeData.comuna_nombre} como ${rubroPrincipal.subcategoria_nombre}`
    : `Publicar en ${safeData.comuna_nombre}`;

  const heroTitle =
    safeData.se_puede_abrir === true || estadoParaBadge === "lista_para_abrir"
      ? `${safeData.comuna_nombre} está lista para abrir`
      : totalFaltante > 0 && totalFaltante <= 10
        ? `Faltan pocos para abrir ${safeData.comuna_nombre}`
        : `${safeData.comuna_nombre} se abre contigo`;

  const heroLead = useMemo(() => {
    if (safeData.mensaje_apertura) return safeData.mensaje_apertura;
    if (safeData.se_puede_abrir === true || estadoParaBadge === "lista_para_abrir") {
      return `Ya se cumplieron los mínimos para activar el directorio en ${safeData.comuna_nombre}.`;
    }
    const partes: string[] = [];
    partes.push(`Llevamos un ${porcentajeClamped}% de avance.`);
    if (totalFaltante > 0) {
      partes.push(`Solo faltan ${totalFaltante} para abrir ${safeData.comuna_nombre}.`);
    }
    if (rubroPrincipal && rubroPrincipal.faltan > 0) {
      partes.push(
        `El rubro que más ayuda ahora: ${rubroPrincipal.subcategoria_nombre} (faltan ${rubroPrincipal.faltan}).`
      );
    }
    return partes.join(" ");
  }, [
    estadoParaBadge,
    porcentajeClamped,
    rubroPrincipal,
    safeData.comuna_nombre,
    safeData.mensaje_apertura,
    safeData.se_puede_abrir,
    totalFaltante,
  ]);

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
          comuna_slug: safeData.comuna_slug,
          comuna_nombre: safeData.comuna_nombre,
          contacto,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json?.ok) {
        setErrorAviso(json?.error || "No se pudo enviar.");
        return;
      }

      setDoneAviso(true);
    } catch {
      setErrorAviso("No se pudo enviar.");
    } finally {
      setSendingAviso(false);
    }
  }, [contacto, safeData.comuna_nombre, safeData.comuna_slug]);

  if (!data) {
    return (
      <div style={{ padding: 40, fontFamily: "sans-serif" }}>
        <h2>Comuna no encontrada</h2>
        <p>No hay información disponible para esta comuna.</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm">
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

          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 leading-tight">
            {heroTitle}
          </h1>

          <div className="mt-4">
            <p className="text-slate-700 leading-relaxed text-base sm:text-lg font-medium">
              {heroLead}
            </p>
            {!safeData.mensaje_apertura && totalFaltante > 0 ? (
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{heroMessage}</p>
            ) : null}

            <div className="mt-5 flex flex-col gap-2">
              <Link
                href={ctaPrincipalHref}
                className="inline-flex items-center justify-center rounded-xl px-5 min-h-[52px] bg-slate-900 text-white font-extrabold hover:bg-slate-800 transition text-base text-center"
              >
                {ctaPrincipalLabel}
              </Link>
              {rubroPrincipal ? (
                <p className="text-xs sm:text-sm text-slate-600">
                  Serás de los primeros en aparecer en {safeData.comuna_nombre} si publicas en este
                  rubro.
                </p>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <button
                type="button"
                onClick={scrollToRecommendationForm}
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 h-9 text-slate-700 font-semibold hover:bg-slate-50"
              >
                Recomendar a alguien
              </button>
              <a
                href={getShareHref(safeData.comuna_nombre, safeData.comuna_slug)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-800 px-3 h-9 font-semibold hover:bg-slate-50"
              >
                Compartir por WhatsApp
              </a>
            </div>
            <p className="mt-2 text-xs sm:text-sm text-slate-500">
              Cada recomendación acerca la apertura; comparte solo si te hace sentido.
            </p>
          </div>
        </section>

        <section className="mt-5 sm:mt-6">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-700">
              {porcentajeClamped}% de avance para abrir la comuna
            </p>
            <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-slate-900"
                style={{ width: `${porcentajeClamped}%` }}
              />
            </div>
          </div>
        </section>

        <section className="mt-6 sm:mt-8">
          <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
            Ya hay <strong>{totalCumplido}</strong> emprendimiento
            {totalCumplido === 1 ? "" : "s"} {totalCumplido === 1 ? "listo" : "listos"} para abrir{" "}
            <strong>{safeData.comuna_nombre}</strong>
            {totalFaltante > 0 ? (
              <>
                . Faltan <strong>{totalFaltante}</strong> más.
              </>
            ) : (
              "."
            )}
          </p>
        </section>

        <section className="mt-6 sm:mt-7">
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
            ¿Que significa abrir esta comuna?
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed">
            Significa que reunimos suficientes emprendimientos de rubros clave.
            Cuando se complete, la comuna se activa automaticamente y los negocios
            empiezan a recibir contactos.
          </p>
        </section>

        {rubrosFaltantes.length > 1 ? (
          <section className="mt-6 sm:mt-8">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
              Otros rubros que faltan
            </h2>

            <div className="mt-3 grid gap-3">
              {rubrosFaltantes.map((r) => {
                const nombre = r.subcategoria_nombre || "Rubro";
                const slug = r.subcategoria_slug ?? "";
                return (
                  <div
                    key={`${slug}-${nombre}`}
                    className={`rounded-2xl p-4 shadow-sm ${
                      slug === rubroPrincipalSlug
                        ? "border border-slate-900 bg-slate-50"
                        : "border border-slate-200 bg-white"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-extrabold text-slate-900 truncate text-lg">{nombre}</div>
                      <div className="mt-1 text-sm text-slate-600">
                        Faltan{" "}
                        <span className="font-extrabold tabular-nums text-slate-900">{r.faltan}</span>{" "}
                        para abrir este rubro en {safeData.comuna_nombre}.
                      </div>
                      <p className="mt-2 text-xs text-slate-500 leading-snug">
                        Serás de los primeros en aparecer en esta comuna.
                      </p>
                    </div>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Link
                        href={getPublicarHrefByRubro(slug)}
                        className="inline-flex items-center justify-center rounded-xl px-4 h-11 bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition"
                      >
                        Publicar como {nombre}
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleRecomendar(slug, nombre)}
                        className="inline-flex items-center justify-center rounded-xl px-4 h-11 border border-slate-300 bg-white text-slate-900 font-semibold text-sm hover:bg-slate-50 transition"
                      >
                        Recomendar {nombre}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="mt-6 sm:mt-7">
          <p className="text-sm text-slate-500">
            Si aun no publicas, completa tu ficha y ayuda a activar {safeData.comuna_nombre}.
          </p>
        </section>

        <section id={recommendationFormId} className="mt-6 sm:mt-7">
          <ComunaEnPreparacion
            comunaSlug={safeData.comuna_slug}
            comunaNombre={safeData.comuna_nombre}
            progreso={[]}
            mostrarProgreso={false}
            prefillRubro={prefillRubroSlug}
            prefillRubroLabel={prefillRubroLabel}
            mostrarPublicarLink={false}
          />
        </section>

        <section className="mt-6 sm:mt-7">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm">
            <h2 className="text-xl font-extrabold text-slate-900">
              Quiero entrar cuando {safeData.comuna_nombre} abra
            </h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              ¿Tienes un dato o quieres ayudar a abrir {safeData.comuna_nombre}?
              Dejanos un WhatsApp o un email para coordinar recomendaciones.
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

        <section className="mt-6 sm:mt-7">
          <details>
            <summary className="cursor-pointer font-extrabold text-slate-900">
              Rubros ya cubiertos ({rubrosCubiertos.length})
            </summary>

            <div className="mt-3 grid gap-2">
              {rubrosCubiertos.length === 0 ? (
                <div className="text-sm text-slate-600">
                  No hay rubros cubiertos para mostrar.
                </div>
              ) : (
                rubrosCubiertos.map((r) => {
                  const nombre = r.subcategoria_nombre || "Rubro";
                  return (
                    <div
                      key={`${r.subcategoria_slug}-${nombre}`}
                      className="rounded-xl border border-slate-200 bg-white p-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="font-extrabold text-slate-900 truncate">
                          {nombre}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Cubierto: {r.actual} / {r.requerido}
                        </div>
                      </div>

                      <div className="font-extrabold text-emerald-700 whitespace-nowrap">
                        ✅ Cubierto
                      </div>
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