"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import AbrirComunaNegociosPreviewGrid from "@/components/abrir-comuna/AbrirComunaNegociosPreviewGrid";
import type { EmprendedorSearchCardProps } from "@/components/search/EmprendedorSearchCard";
import TerritorialAccordionBlock from "@/components/search/TerritorialAccordionBlock";
import { busquedaComunaResultsShellClassName } from "@/lib/busquedaComunaLayoutStyles";

type AbrirComunaData = {
  comuna_slug: string;
  comuna_nombre: string;
  /** Misma condición que el redirect a `/{slug}` (directorio abierto). Suele ser `false` en esta vista. */
  directorio_publico_operativo?: boolean;
  /** Nombre oficial de la región (Chile); desambigua entre comunas homónimas. */
  region_nombre?: string | null;
  porcentaje_apertura?: number | null;
  /** Distintos emprendedores que atienden la comuna (misma regla territorial que el listado / RPC de activación). */
  emprendedores_publicados_total: number;
  emprendedores_publicados_cards: EmprendedorSearchCardProps[];
  /** Meta: tipos de servicios requeridos (vista pública). */
  total_requerido_apertura?: number | null;
  /** Cuántos tipos de servicios ya cumplen el mínimo (misma vista). */
  total_cumplido_apertura?: number | null;
  /** Filas en `comuna_interes` para esta comuna (apoyo agregado; sin datos personales en UI). */
  comuna_interes_total?: number;
};

function toNegociosPreviewItems(cards: EmprendedorSearchCardProps[]) {
  return cards.map((c) => ({
    slug: c.slug,
    nombre: c.nombre,
    fotoPrincipalUrl: c.fotoPrincipalUrl,
  }));
}

function tituloBloqueBaseEnComuna(comunaNombre: string, n: number): string {
  return `En ${comunaNombre} (${n.toLocaleString("es-CL")})`;
}

function tituloBloqueAtiendenComuna(comunaNombre: string, n: number): string {
  return `Atienden ${comunaNombre} (${n.toLocaleString("es-CL")})`;
}

/** Títulos de bloque en acordeón: `(cantidad, comuna)`. */
function tituloYaHayNegociosEnComuna(n: number, comunaNombre: string): string {
  return tituloBloqueBaseEnComuna(comunaNombre, n);
}

function tituloYaHayNegociosQueAtienden(n: number, comunaNombre: string): string {
  return tituloBloqueAtiendenComuna(comunaNombre, n);
}

function formatPorcentajeHumano(p: number): string {
  const x = Math.max(0, Math.min(100, Number(p) || 0));
  const rounded = Math.round(x * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export default function AbrirComunaClient({
  data,
}: {
  data: AbrirComunaData | null;
}) {
  const router = useRouter();
  const safeData = data ?? {
    comuna_slug: "",
    comuna_nombre: "",
    directorio_publico_operativo: false,
    region_nombre: null,
    porcentaje_apertura: null,
    emprendedores_publicados_total: 0,
    emprendedores_publicados_cards: [],
    total_requerido_apertura: null,
    total_cumplido_apertura: null,
    comuna_interes_total: 0,
  };

  const pctRaw = safeData.porcentaje_apertura;
  const tienePorcentaje = pctRaw != null && Number.isFinite(Number(pctRaw));
  const pctVisual = tienePorcentaje ? Math.max(0, Math.min(100, Number(pctRaw))) : 0;

  const meta = safeData.total_requerido_apertura;
  const tieneMeta = meta != null && meta > 0;
  const nAvance =
    safeData.total_cumplido_apertura != null && Number.isFinite(safeData.total_cumplido_apertura)
      ? Math.max(0, Math.floor(safeData.total_cumplido_apertura))
      : tieneMeta
        ? 0
        : null;

  const publicadosTotal = Math.max(0, Math.floor(Number(safeData.emprendedores_publicados_total) || 0));
  const publicadosCards = safeData.emprendedores_publicados_cards ?? [];
  const comunaInteresTotal = Math.max(
    0,
    Math.floor(Number(safeData.comuna_interes_total ?? 0) || 0)
  );

  const cardsMostradas = useMemo(() => publicadosCards, [publicadosCards]);

  /** Misma prioridad que en el loader: primero base en comuna, luego quienes atienden desde fuera. */
  const { cardsConBaseEnComuna, cardsAtiendenDesdeFuera } = useMemo(() => {
    const conBase = cardsMostradas.filter((c) => c.bloqueTerritorial === "de_tu_comuna");
    const atienden = cardsMostradas.filter((c) => c.bloqueTerritorial !== "de_tu_comuna");
    return { cardsConBaseEnComuna: conBase, cardsAtiendenDesdeFuera: atienden };
  }, [cardsMostradas]);

  const lineaMeta = useMemo(() => {
    if (tieneMeta && nAvance != null && meta != null) {
      return `Ya hay ${nAvance} de ${meta} tipos de servicios necesarios completos.`;
    }
    if (!tieneMeta && cardsMostradas.length > 0) {
      const nLinea = publicadosTotal > 0 ? publicadosTotal : 0;
      if (nLinea > 0) {
        return `Ya hay ${nLinea} negocio${nLinea === 1 ? "" : "s"} con ficha publicada sumando oferta en la comuna.`;
      }
    }
    return null;
  }, [tieneMeta, nAvance, meta, publicadosTotal, cardsMostradas.length]);

  const lineaPorcentajeTexto = useMemo(() => {
    if (!tienePorcentaje) return null;
    return `Ya vamos en ${formatPorcentajeHumano(Number(pctRaw))}% del avance de tipos de servicios.`;
  }, [pctRaw, tienePorcentaje]);

  const hrefPublicarGlobal = `/publicar?comuna=${encodeURIComponent(safeData.comuna_slug)}`;
  const territorialPersistPrefix = `abrir-comuna:${safeData.comuna_slug}`;

  const regionNombre = String(safeData.region_nombre ?? "").trim();
  const comunaConRegion =
    regionNombre.length > 0
      ? `${safeData.comuna_nombre}, ${regionNombre}`
      : safeData.comuna_nombre;

  const [recomNombre, setRecomNombre] = useState("");
  const [recomWhatsapp, setRecomWhatsapp] = useState("");
  const [recomSending, setRecomSending] = useState(false);
  const [recomDone, setRecomDone] = useState(false);
  const [recomError, setRecomError] = useState("");

  const resetRecomForm = useCallback(() => {
    setRecomDone(false);
    setRecomError("");
  }, []);

  const submitRecomendacion = useCallback(async () => {
    try {
      setRecomSending(true);
      setRecomError("");
      setRecomDone(false);

      const res = await fetch("/api/comuna-interes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comuna_slug: safeData.comuna_slug,
          nombre: recomNombre.trim(),
          telefono: recomWhatsapp.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json?.ok) {
        setRecomError(json?.error || "No se pudo enviar.");
        return;
      }

      setRecomDone(true);
      setRecomNombre("");
      setRecomWhatsapp("");
      router.refresh();
    } catch {
      setRecomError("No se pudo enviar.");
    } finally {
      setRecomSending(false);
    }
  }, [recomNombre, recomWhatsapp, router, safeData.comuna_slug]);

  if (!data) {
    return (
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-8 shadow-sm">
          <h2 className="text-lg font-black text-slate-900">Comuna no encontrada</h2>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            No hay información disponible para esta comuna.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className={`${busquedaComunaResultsShellClassName} pb-10 sm:pb-16 pt-2 sm:pt-4 sm:px-6`}>
        <section className="rounded-3xl border border-slate-200/80 bg-white shadow-[0_20px_50px_-24px_rgba(15,23,42,0.25)] overflow-hidden">
          <div className="px-4 pt-8 pb-6 sm:px-6 sm:pt-9 sm:pb-7 bg-gradient-to-b from-white to-slate-50/90 md:px-8">
            <div className="mx-auto max-w-lg">
              <span className="inline-flex items-center rounded-full border border-amber-200/90 bg-amber-50 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-amber-900">
                En activación
              </span>

              <h1 className="mt-6 text-2xl sm:text-[1.7rem] font-black text-slate-900 leading-tight tracking-tight">
                {safeData.comuna_nombre} se está activando
              </h1>
              {regionNombre ? (
                <p className="mt-2 text-sm font-medium text-slate-600 leading-snug">{regionNombre}</p>
              ) : null}

              <div className="mt-8 rounded-2xl border border-slate-200/90 bg-slate-50/80 p-5 sm:p-6">
                {lineaPorcentajeTexto ? (
                  <p className="text-base font-semibold text-slate-900">{lineaPorcentajeTexto}</p>
                ) : (
                  <p className="text-base font-medium text-slate-600">
                    Estamos sumando oferta local para completar los tipos de servicios y activar el directorio en tu comuna.
                  </p>
                )}

                {tienePorcentaje ? (
                  <div
                    className="mt-4 h-4 w-full overflow-hidden rounded-full bg-slate-200/90"
                    role="progressbar"
                    aria-valuenow={Math.round(pctVisual)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Avance de tipos de servicios para abrir la comuna"
                  >
                    <div
                      className="h-full rounded-full bg-slate-900 transition-[width] duration-500 ease-out"
                      style={{ width: `${pctVisual}%` }}
                    />
                  </div>
                ) : null}

                {lineaMeta ? (
                  <p className="mt-5 text-sm sm:text-[0.9375rem] text-slate-800 font-medium leading-relaxed">
                    {lineaMeta}
                  </p>
                ) : null}

                <p className="mt-4 text-xs sm:text-sm text-slate-600 leading-snug">
                  El porcentaje y la meta miden cuántos tipos de servicios ya cumplen el mínimo requerido; no solo cuántas fichas hay publicadas.
                </p>
              </div>

              <div className="mt-10 space-y-6 text-[0.9375rem] sm:text-base text-slate-700 leading-relaxed">
                <p className="font-semibold text-slate-900">
                  Puedes publicar lo que haces, sin importar el rubro.
                </p>
                <p className="text-slate-600">
                  Pueden sumarse servicios como gasfitería, clases, peluquería, ventas, reparaciones y
                  muchos más.
                </p>
                <p className="text-slate-700">
                  Cuando la comuna se active, los vecinos podrán encontrarte más fácil en las búsquedas.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 bg-white px-4 py-8 sm:px-6 sm:py-10 md:px-8">
            <div className="mx-auto max-w-lg">
              <Link
                href={hrefPublicarGlobal}
                className="inline-flex w-full items-center justify-center rounded-xl px-5 min-h-[52px] bg-slate-900 text-white font-extrabold text-base text-center shadow-md transition-all duration-200 hover:bg-slate-800 hover:shadow-xl hover:ring-2 hover:ring-slate-900/25 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md active:ring-0"
              >
                Publicar mi emprendimiento
              </Link>
            </div>

            <div
              className="mx-auto max-w-lg mt-6 rounded-xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 leading-relaxed"
              role="status"
            >
              <p className="m-0">
                La búsqueda por servicio estará disponible cuando la comuna esté activa.
              </p>
            </div>

            {cardsMostradas.length > 0 ? (
              <div className="mt-8 w-full rounded-2xl border border-slate-200/90 bg-slate-50/60 p-4 sm:p-5 md:p-6">
                <div
                  className="space-y-1 border-b border-slate-200/80 pb-4 mb-4"
                  role="region"
                  aria-labelledby="activacion-emprendedores-listado-titulo"
                >
                  <h2
                    id="activacion-emprendedores-listado-titulo"
                    className="text-lg sm:text-xl font-bold text-slate-900 leading-snug tracking-tight"
                  >
                    Negocios que ya se han sumado
                  </h2>
                </div>
                <div className="space-y-5 w-full min-w-0">
                  {cardsConBaseEnComuna.length > 0 ? (
                    <TerritorialAccordionBlock
                      variant="local"
                      persistPrefix={territorialPersistPrefix}
                      which="base"
                      instanceId="abrir-comuna-bloque-base"
                      title={tituloYaHayNegociosEnComuna(
                        cardsConBaseEnComuna.length,
                        safeData.comuna_nombre
                      )}
                      subtitle="Con base en esta comuna"
                      defaultCollapsed={false}
                    >
                      <AbrirComunaNegociosPreviewGrid
                        items={toNegociosPreviewItems(cardsConBaseEnComuna)}
                      />
                    </TerritorialAccordionBlock>
                  ) : null}
                  {cardsAtiendenDesdeFuera.length > 0 ? (
                    <TerritorialAccordionBlock
                      variant="cobertura"
                      persistPrefix={territorialPersistPrefix}
                      which="atienden"
                      instanceId="abrir-comuna-bloque-atienden"
                      title={tituloYaHayNegociosQueAtienden(
                        cardsAtiendenDesdeFuera.length,
                        safeData.comuna_nombre
                      )}
                      subtitle="Desde otras comunas"
                      defaultCollapsed
                    >
                      <AbrirComunaNegociosPreviewGrid
                        items={toNegociosPreviewItems(cardsAtiendenDesdeFuera)}
                      />
                    </TerritorialAccordionBlock>
                  ) : null}
                </div>
                <p className="mt-5 text-center text-sm font-medium text-slate-700 leading-snug px-1">
                  Pronto podrás ver todos los resultados y contactar directamente cuando la comuna esté activa.
                </p>
                <p className="mt-4 text-xs text-slate-700 sm:text-sm leading-snug font-medium">
                  Sé de los primeros en aparecer en el directorio de {comunaConRegion}.
                </p>
              </div>
            ) : (
              <p className="mx-auto mt-8 max-w-lg text-center text-xs text-slate-700 sm:text-sm leading-snug font-medium px-1">
                Sé de los primeros en aparecer en el directorio de {comunaConRegion}.
              </p>
            )}

            <section
              className="mx-auto mt-8 max-w-lg rounded-2xl border border-slate-300/80 bg-white p-5 sm:p-6 shadow-md"
              aria-labelledby="abrir-comuna-recom-inline-titulo"
            >
              <h2
                id="abrir-comuna-recom-inline-titulo"
                className="text-lg font-extrabold text-slate-900 sm:text-xl"
              >
                Recomendar a alguien
              </h2>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Solo el WhatsApp: en un paso ayudás a que más vecinos sumen en {comunaConRegion}. El número no se
                muestra en esta página; lo usamos de forma agregada para priorizar la activación.
              </p>

              {comunaInteresTotal > 0 ? (
                <p className="mt-3 text-sm font-semibold text-slate-800 leading-snug">
                  Llevamos{" "}
                  <span className="tabular-nums">
                    {comunaInteresTotal.toLocaleString("es-CL")}
                  </span>{" "}
                  {comunaInteresTotal === 1 ? "apoyo registrado" : "apoyos registrados"} para abrir el directorio
                  aquí (solo número agregado, sin datos personales).
                </p>
              ) : (
                <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  El total se mostrará aquí de forma agregada.
                </p>
              )}

              {recomDone ? (
                <div className="mt-5 space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 leading-snug">
                    ¡Gracias! Tu apoyo quedó registrado y suma al interés por activar {safeData.comuna_nombre}.
                  </div>
                  <button
                    type="button"
                    onClick={resetRecomForm}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-900 transition hover:bg-slate-50"
                  >
                    Recomendar a otra persona
                  </button>
                </div>
              ) : (
                <div className="mt-5 grid gap-3">
                  <div>
                    <label htmlFor="recom-nombre" className="block text-xs font-bold text-slate-700 mb-1">
                      Nombre <span className="font-normal text-slate-500">(opcional)</span>
                    </label>
                    <input
                      id="recom-nombre"
                      value={recomNombre}
                      onChange={(e) => setRecomNombre(e.target.value)}
                      placeholder="Ej: Juan"
                      autoComplete="name"
                      className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/30"
                    />
                  </div>
                  <div>
                    <label htmlFor="recom-wa" className="block text-xs font-bold text-slate-700 mb-1">
                      WhatsApp <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="recom-wa"
                      type="tel"
                      inputMode="tel"
                      value={recomWhatsapp}
                      onChange={(e) => setRecomWhatsapp(e.target.value)}
                      placeholder="Ej: +56 9 1234 5678"
                      autoComplete="tel"
                      className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/30"
                    />
                  </div>
                  {recomError ? (
                    <div className="text-sm text-red-600 font-semibold">{recomError}</div>
                  ) : null}
                  <button
                    type="button"
                    disabled={recomSending}
                    onClick={submitRecomendacion}
                    className="h-11 w-full rounded-xl bg-slate-900 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:opacity-60"
                  >
                    {recomSending ? "Enviando..." : "Enviar recomendación"}
                  </button>
                </div>
              )}
            </section>
          </div>
        </section>
      </div>
    </div>
  );
}
