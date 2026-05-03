"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import EmprendedorSearchCard, {
  type EmprendedorSearchCardProps,
} from "@/components/search/EmprendedorSearchCard";
import EmprendedorSearchCardsGrid from "@/components/search/EmprendedorSearchCardsGrid";
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

/** Títulos de acordeón alineados al lenguaje territorial del producto (solo copy; mismos grupos que antes). */
function tituloYaHayNegociosEnComuna(n: number): string {
  return `De tu comuna (${n.toLocaleString("es-CL")})`;
}

function tituloYaHayNegociosQueAtienden(comunaNombre: string, n: number): string {
  return `Atienden ${comunaNombre} desde otras comunas (${n.toLocaleString("es-CL")})`;
}

function formatPorcentajeHumano(p: number): string {
  const x = Math.max(0, Math.min(100, Number(p) || 0));
  const rounded = Math.round(x * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function gridColumnsClassName(itemCount: number): string {
  const n = Math.max(0, Math.floor(Number(itemCount) || 0));
  return n === 1
    ? "grid-cols-1 justify-items-center [&>*]:w-full [&>*]:max-w-sm"
    : n === 2
      ? "grid-cols-1 md:grid-cols-2"
      : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
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

  /** Misma condición que antes; solo cambia el copy mostrado. */
  const lineaTiposNecesarios = useMemo(() => {
    if (tieneMeta && nAvance != null && meta != null) {
      return `${nAvance.toLocaleString("es-CL")} de ${meta.toLocaleString("es-CL")} tipos necesarios`;
    }
    return null;
  }, [tieneMeta, nAvance, meta]);

  /** Igual que antes: solo si no aplica la meta de tipos (`!tieneMeta` en la rama original). */
  const lineaResumenPublicadosSinMeta = useMemo(() => {
    if (tieneMeta && nAvance != null && meta != null) return null;
    if (!tieneMeta && cardsMostradas.length > 0) {
      const nLinea = publicadosTotal > 0 ? publicadosTotal : 0;
      if (nLinea > 0) {
        return `${nLinea} emprendimiento${nLinea === 1 ? "" : "s"} publicado${nLinea === 1 ? "" : "s"} en la comuna.`;
      }
    }
    return null;
  }, [tieneMeta, nAvance, meta, cardsMostradas.length, publicadosTotal]);

  const lineaPorcentajeServiciosMinimos = useMemo(() => {
    if (!tienePorcentaje) return null;
    return `${formatPorcentajeHumano(Number(pctRaw))}% de servicios cubiertos`;
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
              <span className="inline-flex items-center rounded-full border border-teal-200/90 bg-teal-50/90 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-teal-900">
                Catálogo en crecimiento
              </span>

              <h1 className="mt-6 text-2xl sm:text-[1.7rem] font-black text-slate-900 leading-tight tracking-tight">
                {safeData.comuna_nombre} aún está creciendo en Rey del Dato
              </h1>
              {regionNombre ? (
                <p className="mt-2 text-sm font-medium text-slate-600 leading-snug">{regionNombre}</p>
              ) : null}

              <p className="mt-5 text-[0.9375rem] sm:text-base text-slate-700 leading-relaxed">
                Todavía no tenemos suficientes emprendimientos para mostrar resultados completos y ordenados
                por servicio. Mientras tanto, puedes ver los negocios que ya se han sumado.
              </p>

              <div className="mt-8 flex flex-col gap-3">
                <Link
                  href={hrefPublicarGlobal}
                  className="inline-flex w-full items-center justify-center rounded-xl px-5 min-h-[52px] bg-slate-900 text-white font-extrabold text-base text-center shadow-md transition-all duration-200 hover:bg-slate-800 hover:shadow-xl hover:ring-2 hover:ring-slate-900/25 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md active:ring-0"
                >
                  Publicar mi emprendimiento
                </Link>
                <a
                  href="#recomendar-emprendimiento"
                  className="inline-flex w-full items-center justify-center rounded-xl border-2 border-slate-200 bg-white px-5 min-h-[52px] text-center text-base font-extrabold text-slate-900 shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                >
                  Recomendar un emprendimiento
                </a>
              </div>

              <div className="mt-6 rounded-xl border border-slate-200/60 bg-slate-50/50 px-3.5 py-3 sm:px-4 sm:py-3.5">
                <h2 className="m-0 text-sm font-semibold text-slate-700">Avance de la comuna</h2>
                <div className="mt-2 space-y-1">
                  {lineaPorcentajeServiciosMinimos ? (
                    <p className="m-0 text-sm font-medium text-slate-800">{lineaPorcentajeServiciosMinimos}</p>
                  ) : (
                    <p className="m-0 text-xs text-gray-500 leading-snug">
                      Vamos sumando servicios hasta completar los mínimos de esta comuna.
                    </p>
                  )}
                  {lineaTiposNecesarios ? (
                    <p className="m-0 text-sm font-medium text-slate-800">{lineaTiposNecesarios}</p>
                  ) : lineaResumenPublicadosSinMeta ? (
                    <p className="m-0 text-xs text-gray-600 leading-snug">{lineaResumenPublicadosSinMeta}</p>
                  ) : null}
                </div>

                {tienePorcentaje ? (
                  <div
                    className="mt-3 h-3.5 w-full overflow-hidden rounded-full bg-slate-200/90"
                    role="progressbar"
                    aria-valuenow={Math.round(pctVisual)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Porcentaje de servicios cubiertos en la comuna"
                  >
                    <div
                      className="h-full rounded-full bg-[#0f766e] transition-[width] duration-500 ease-out"
                      style={{ width: `${pctVisual}%` }}
                    />
                  </div>
                ) : null}

                <p className="m-0 mt-2.5 text-xs text-gray-500 leading-snug">
                  El avance muestra cuántos servicios clave ya están cubiertos en esta comuna.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 bg-white px-4 py-8 sm:px-6 sm:py-10 md:px-8">
            <div className="mx-auto max-w-5xl">
            {cardsMostradas.length > 0 ? (
              <div className="mt-0 w-full rounded-2xl border border-slate-200/90 bg-slate-50/60 p-4 sm:p-5 md:p-6">
                <div
                  className="space-y-1 border-b border-slate-200/80 pb-4 mb-4"
                  role="region"
                  aria-labelledby="activacion-emprendedores-listado-titulo"
                >
                  <h2
                    id="activacion-emprendedores-listado-titulo"
                    className="text-lg sm:text-xl font-bold text-slate-900 leading-snug tracking-tight"
                  >
                    Emprendimientos disponibles en {safeData.comuna_nombre}
                  </h2>
                </div>
                <p className="mb-4 text-sm text-gray-600 leading-relaxed">
                  Primero verás emprendimientos con base en esta comuna. Luego, los que atienden desde otras comunas.
                </p>
                <div className="space-y-5 w-full min-w-0">
                  {cardsConBaseEnComuna.length > 0 ? (
                    <TerritorialAccordionBlock
                      variant="local"
                      persistPrefix={territorialPersistPrefix}
                      which="base"
                      instanceId="abrir-comuna-bloque-base"
                      title={tituloYaHayNegociosEnComuna(cardsConBaseEnComuna.length)}
                      subtitle="Emprendimientos con base en esta comuna"
                      defaultCollapsed={false}
                    >
                      <EmprendedorSearchCardsGrid
                        emptyMessage=""
                        itemCount={cardsConBaseEnComuna.length}
                        gridClassName={`grid w-full gap-4 ${gridColumnsClassName(cardsConBaseEnComuna.length)}`}
                      >
                        {cardsConBaseEnComuna.map((cardProps) => (
                          <div key={cardProps.slug} className="min-w-0">
                            <EmprendedorSearchCard {...cardProps} usarCardSimple={false} />
                          </div>
                        ))}
                      </EmprendedorSearchCardsGrid>
                    </TerritorialAccordionBlock>
                  ) : null}
                  {cardsAtiendenDesdeFuera.length > 0 ? (
                    <TerritorialAccordionBlock
                      variant="cobertura"
                      persistPrefix={territorialPersistPrefix}
                      which="atienden"
                      instanceId="abrir-comuna-bloque-atienden"
                      title={tituloYaHayNegociosQueAtienden(safeData.comuna_nombre, cardsAtiendenDesdeFuera.length)}
                      subtitle="Negocios con base en otra comuna que atienden esta zona"
                      defaultCollapsed
                    >
                      <EmprendedorSearchCardsGrid
                        emptyMessage=""
                        itemCount={cardsAtiendenDesdeFuera.length}
                        gridClassName={`grid w-full gap-4 ${gridColumnsClassName(cardsAtiendenDesdeFuera.length)}`}
                      >
                        {cardsAtiendenDesdeFuera.map((cardProps) => (
                          <div key={cardProps.slug} className="min-w-0">
                            <EmprendedorSearchCard {...cardProps} usarCardSimple={false} />
                          </div>
                        ))}
                      </EmprendedorSearchCardsGrid>
                    </TerritorialAccordionBlock>
                  ) : null}
                </div>
                <p className="mt-4 text-xs text-slate-600 sm:text-sm leading-snug font-medium">
                  Puedes sumarte tú también: mientras completamos el mapa de servicios, tu ficha ya ayuda a que{" "}
                  {safeData.comuna_nombre} se vea con más oferta en Rey del Dato.
                </p>
              </div>
            ) : (
              <p className="mt-0 text-center text-sm text-slate-600 leading-relaxed px-1">
                Aún no hay fichas para mostrar aquí. Si conoces un emprendimiento en {comunaConRegion}, recomiéndalo más
                abajo o publica el tuyo con el botón de arriba.
              </p>
            )}

            <section
              id="recomendar-emprendimiento"
              className="mx-auto mt-8 max-w-lg rounded-2xl border border-slate-300/90 bg-slate-50 p-5 sm:p-6 shadow-md shadow-slate-900/5 ring-1 ring-slate-200/80 scroll-mt-24"
              aria-labelledby="abrir-comuna-recom-inline-titulo"
            >
              <h2
                id="abrir-comuna-recom-inline-titulo"
                className="text-lg font-extrabold text-slate-900 sm:text-xl"
              >
                Recomendar un emprendimiento
              </h2>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Déjanos un WhatsApp de contacto y nosotros invitamos por ese canal (el número no se muestra en esta
                página). Así sumamos más oferta en {comunaConRegion} mientras completamos el catálogo.
              </p>

              {comunaInteresTotal > 0 ? (
                <p className="mt-3 text-sm font-semibold text-slate-800 leading-snug">
                  Llevamos{" "}
                  <span className="tabular-nums">
                    {comunaInteresTotal.toLocaleString("es-CL")}
                  </span>{" "}
                  {comunaInteresTotal === 1 ? "recomendación registrada" : "recomendaciones registradas"} para sumar
                  emprendimientos en esta comuna (solo total agregado, sin datos personales).
                </p>
              ) : (
                <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  El total de recomendaciones se mostrará aquí de forma agregada.
                </p>
              )}

              {recomDone ? (
                <div className="mt-5 space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 leading-snug">
                    ¡Gracias! Quedó registrado y suma para que haya más emprendimientos visibles en {safeData.comuna_nombre}.
                  </div>
                  <button
                    type="button"
                    onClick={resetRecomForm}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-900 transition hover:bg-slate-50"
                  >
                    Hacer otra recomendación
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
          </div>
        </section>
      </div>
    </div>
  );
}
