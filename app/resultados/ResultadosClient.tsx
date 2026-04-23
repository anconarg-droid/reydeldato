"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { normalizeText } from "@/lib/search/normalizeText";
import EmprendedorSearchCard from "@/components/search/EmprendedorSearchCard";
import PublicSearchResults from "@/components/search/PublicSearchResults";
import SoloCompletosFiltroControl from "@/components/search/SoloCompletosFiltroControl";
import { filtrarItemsPorMejoresOpciones } from "@/lib/buscarApiItemPasaFiltroVerMejoresOpciones";
import {
  buscarApiItemToEmprendedorCardProps,
  type BuscarApiItem,
} from "@/lib/mapBuscarItemToEmprendedorCard";
import ResultadosSearchBar from "./ResultadosSearchBar";

/** Texto legible para el input cuando solo viene `subcategoria=` en la URL (sin `q=`). */
function prettySubcategoriaSlugForDisplay(slug: string): string {
  const v = String(slug ?? "").trim();
  if (!v) return "";
  return v
    .replace(/[-_]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function detectarSubcategoria(query: string): string | null {
  const q = normalizeText(query);
  const map: Record<string, string> = {
    pasteleria: "pasteleria",
    panaderia: "panaderia",
    gasfiter: "gasfiteria",
    gasfiteria: "gasfiteria",
    mecanico: "mecanico",
  };
  return map[q] || null;
}

function tituloBloqueExactos(subcategoriaSlug: string): string {
  const t: Record<string, string> = {
    pasteleria: "Pastelerías en tu zona",
    panaderia: "Panaderías en tu zona",
    gasfiteria: "Gasfiterías en tu zona",
    mecanico: "Mecánicos en tu zona",
  };
  return t[subcategoriaSlug] || `${prettySubcategoriaSlugForDisplay(subcategoriaSlug)} en tu zona`;
}

function GlobalDbResults({
  q,
  items,
  error,
}: {
  q: string;
  items: BuscarApiItem[];
  error: string | null;
}) {
  const [soloCompletos, setSoloCompletos] = useState(false);
  const itemsFiltrados = useMemo(
    () => filtrarItemsPorMejoresOpciones(items, soloCompletos),
    [items, soloCompletos],
  );

  const ningunoConFiltro =
    soloCompletos && items.length > 0 && itemsFiltrados.length === 0;

  if (error) {
    return (
      <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
        Error cargando datos: {error}
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-slate-600 text-sm">
        No encontramos resultados para &quot;{q}&quot;. Prueba otras palabras o busca eligiendo una
        comuna en el{" "}
        <Link href="/" className="underline font-medium text-slate-900">
          inicio
        </Link>
        .
      </p>
    );
  }

  const detectedSubcategoria = detectarSubcategoria(q);
  const esExacto = (i: BuscarApiItem) =>
    Boolean(detectedSubcategoria) &&
    Array.isArray(i.subcategoriasSlugs) &&
    i.subcategoriasSlugs.includes(detectedSubcategoria as string);

  const exactos = detectedSubcategoria ? itemsFiltrados.filter(esExacto) : [];
  const relacionados = detectedSubcategoria ? itemsFiltrados.filter((i) => !esExacto(i)) : [];

  // Regla producto: si hay intención exacta por subcategoría, en "relacionados" mostrar primero
  // los de la misma categoría (fallback) y luego el resto (sin eliminarlos).
  const categoriaExacta =
    detectedSubcategoria && exactos.length > 0 ? (exactos[0]?.categoriaNombre || "").trim() : "";
  const relacionadosMismaCategoria = categoriaExacta
    ? relacionados.filter((i) => String(i.categoriaNombre ?? "").trim() === categoriaExacta)
    : [];
  const relacionadosResto = categoriaExacta
    ? relacionados.filter((i) => String(i.categoriaNombre ?? "").trim() !== categoriaExacta)
    : relacionados;

  return (
    <div className="space-y-3">
      <div className="w-full">
        <SoloCompletosFiltroControl checked={soloCompletos} onCheckedChange={setSoloCompletos} />
      </div>
      {soloCompletos && ningunoConFiltro ? (
        <div className="rounded-lg border border-sky-200/80 bg-sky-50/90 px-3 py-2 text-sm text-slate-800">
          <p className="m-0 text-slate-700">Desactiva el filtro para ver todas las opciones.</p>
        </div>
      ) : null}
      {ningunoConFiltro ? (
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 20,
            background: "#fff",
            padding: 18,
            color: "#6b7280",
            fontSize: 15,
          }}
        >
          Sin resultados con perfil activo. Desactiva el filtro.
        </div>
      ) : (
        <div className="space-y-3">
          {detectedSubcategoria ? (
            <>
              {exactos.length > 0 ? (
                <div className="space-y-3">
                  <h2 className="text-base font-extrabold text-slate-900">
                    {tituloBloqueExactos(detectedSubcategoria)}
                  </h2>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(min(100%, 280px), 1fr))",
                      gap: 16,
                      alignItems: "stretch",
                    }}
                  >
                    {exactos.map((item) => (
                      <EmprendedorSearchCard
                        key={item.slug || item.id}
                        {...buscarApiItemToEmprendedorCardProps(item, null, "search")}
                        destacarMejoresOpciones={soloCompletos}
                      />
                    ))}
                  </div>
                </div>
              ) : null}

              {relacionados.length > 0 ? (
                <div className="space-y-3">
                  <h2 className="text-base font-extrabold text-slate-900">
                    También podrían servirte
                  </h2>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(min(100%, 280px), 1fr))",
                      gap: 16,
                      alignItems: "stretch",
                    }}
                  >
                    {[...relacionadosMismaCategoria, ...relacionadosResto].map((item) => (
                      <EmprendedorSearchCard
                        key={item.slug || item.id}
                        {...buscarApiItemToEmprendedorCardProps(item, null, "search")}
                        destacarMejoresOpciones={soloCompletos}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fill, minmax(min(100%, 280px), 1fr))",
                gap: 16,
                alignItems: "stretch",
              }}
            >
              {itemsFiltrados.map((item) => (
                <EmprendedorSearchCard
                  key={item.slug || item.id}
                  {...buscarApiItemToEmprendedorCardProps(item, null, "search")}
                  destacarMejoresOpciones={soloCompletos}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type Props = {
  /** Texto del campo de búsqueda tal como viene en la URL (`q` sin normalizar en servidor). */
  initialQDisplay: string;
  initialComuna: string | null;
  /** Nombre real (con tildes) de la comuna buscada, para el H1. */
  initialComunaNombre?: string | null;
  initialQ: string | null;
  /** Slug de categoría principal (`?categoria=`), sin mezclar con `q`. */
  initialCategoriaSlug?: string | null;
  initialSubcategoriaSlug?: string | null;
  initialSubcategoriaId?: string | null;
  /** Solo búsqueda global (sin comuna): resultados desde Supabase en el servidor. */
  globalDb?: { items: BuscarApiItem[]; error: string | null } | null;
  /** Si la query se expandió vía `busqueda_sinonimos`, texto original vs canónico. */
  synonymNotice?: { qOriginal: string; qResolved: string } | null;
  /**
   * `false` solo cuando `/[comuna]` tiene búsqueda en URL pero el directorio local no está abierto:
   * pantalla de activación + vista previa (populares), sin mezclar con resultados regionales.
   */
  directorioComunaAbierto?: boolean;
  /** Región asociada a la comuna (o `?region=` en `/resultados`): enlaces y filtro global territorial. */
  regionFocoSlug?: string | null;
  regionFocoNombre?: string | null;
  /** Solo búsqueda global sin comuna: resaltar input de comuna en la barra. */
  resaltarCampoComunaEnBusquedaGlobal?: boolean;
};

export default function ResultadosClient({
  initialQDisplay,
  initialComuna,
  initialComunaNombre,
  initialQ,
  initialCategoriaSlug = null,
  initialSubcategoriaSlug,
  initialSubcategoriaId,
  globalDb,
  synonymNotice = null,
  directorioComunaAbierto = true,
  regionFocoSlug = null,
  regionFocoNombre = null,
  resaltarCampoComunaEnBusquedaGlobal = false,
}: Props) {
  const comuna = (initialComuna ?? "").trim();
  const comunaNombre = (initialComunaNombre ?? "").trim();
  const q = (initialQ ?? "").trim();
  const categoriaSlug = (initialCategoriaSlug ?? "").trim();
  const subcategoriaSlug = (initialSubcategoriaSlug ?? "").trim();
  const subcategoriaId = (initialSubcategoriaId ?? "").trim();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#resultados") return;
    const el = document.getElementById("resultados");
    if (el) {
      window.requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, []);

  const qDisplayForBar =
    (initialQDisplay ?? "").trim() ||
    (subcategoriaSlug ? prettySubcategoriaSlugForDisplay(subcategoriaSlug) : "") ||
    (categoriaSlug ? prettySubcategoriaSlugForDisplay(categoriaSlug) : "");

  const bar = (
    <div className="mt-6 mb-6">
      <ResultadosSearchBar
        initialQDisplay={qDisplayForBar}
        initialComunaSlug={initialComuna}
        fixedComunaNombre={comunaNombre || null}
        resaltarCampoComuna={resaltarCampoComunaEnBusquedaGlobal}
      />
    </div>
  );

  const tituloComunaDisplay = comunaNombre || comuna.replace(/-/g, " ");

  const headerDirectorioNormal = (
    <header className="mt-3">
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
        Encuentra servicios en <span className="text-sky-700">{tituloComunaDisplay}</span>
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Emprendimientos locales y servicios que atienden tu comuna.
      </p>
    </header>
  );

  const tieneCriterioBusqueda =
    Boolean(q) ||
    Boolean(subcategoriaSlug) ||
    Boolean(subcategoriaId) ||
    Boolean(categoriaSlug);

  if (comuna && !directorioComunaAbierto) {
    const qParaTodoChile = (initialQDisplay ?? "").trim();
    const qNormTodoChile = qParaTodoChile ? normalizeText(qParaTodoChile) : "";
    const servicioHintParaCta =
      qParaTodoChile ||
      (subcategoriaSlug ? prettySubcategoriaSlugForDisplay(subcategoriaSlug) : "") ||
      (categoriaSlug ? prettySubcategoriaSlugForDisplay(categoriaSlug) : "") ||
      "";

    let servicioEtiqueta =
      (initialQDisplay ?? "").trim() ||
      (subcategoriaSlug ? prettySubcategoriaSlugForDisplay(subcategoriaSlug) : "") ||
      (categoriaSlug ? prettySubcategoriaSlugForDisplay(categoriaSlug) : "");
    if (!servicioEtiqueta && subcategoriaId) servicioEtiqueta = "este rubro";
    if (!servicioEtiqueta) servicioEtiqueta = "servicios";

    const paramsPublicar = new URLSearchParams();
    paramsPublicar.set("comuna", comuna);
    if (servicioHintParaCta) paramsPublicar.set("servicio", servicioHintParaCta);

    const paramsRecomendar = new URLSearchParams();
    paramsRecomendar.set("comuna", comuna);
    if (tituloComunaDisplay) paramsRecomendar.set("comuna_nombre", tituloComunaDisplay);
    if (servicioHintParaCta) paramsRecomendar.set("servicio", servicioHintParaCta);

    const qSnippetActivacion =
      qParaTodoChile.length > 48 ? `${qParaTodoChile.slice(0, 48)}…` : qParaTodoChile;
    const regionSlugActivacion = (regionFocoSlug ?? "").trim();
    const regionNombreActivacion = (regionFocoNombre ?? "").trim();

    return (
      <div className="mt-2 space-y-5">
        {bar}
        <div
          role="region"
          aria-labelledby="resultados-comuna-cerrada-titulo"
          className="rounded-2xl border border-amber-200/90 bg-amber-50/90 px-4 py-5 sm:px-6"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-900/80">
            Comuna no activa por el momento
          </p>
          <h1
            id="resultados-comuna-cerrada-titulo"
            className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900"
          >
            {tituloComunaDisplay} aún se está activando
          </h1>
          <p className="mt-2 text-sm text-slate-700 leading-relaxed">
            {subcategoriaSlug
              ? "Esta comuna sigue en activación; por ahora solo mostramos coincidencias directas para el rubro que elegiste (sin rellenar con otras categorías ni resultados generales)."
              : categoriaSlug
                ? "Esta comuna sigue en activación; por ahora solo mostramos coincidencias directas para la categoría que elegiste (sin rellenar con otras categorías ni resultados generales)."
                : tieneCriterioBusqueda
                  ? "El directorio local completo aún no está disponible. Debajo solo verás emprendimientos que coincidan con lo que buscaste en esta comuna (sin rellenar con otras categorías ni resultados generales)."
                  : "El directorio local completo aún no está disponible. Debajo puedes explorar emprendimientos que ya se han sumado y también buscar un servicio específico."}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={`/publicar?${paramsPublicar.toString()}`}
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Publicar mi emprendimiento
            </Link>
            <Link
              href={`/recomendar?${paramsRecomendar.toString()}`}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            >
              Recomendar emprendedor
            </Link>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 border-t border-amber-200/80 pt-4">
            <Link
              href={`/abrir-comuna/${encodeURIComponent(comuna)}`}
              className="text-sm font-semibold text-sky-800 underline underline-offset-2 hover:text-sky-950"
            >
              Cómo abrir el directorio en {tituloComunaDisplay}
            </Link>
            {qNormTodoChile && regionSlugActivacion ? (
              <Link
                href={`/resultados?q=${encodeURIComponent(qParaTodoChile)}&region=${encodeURIComponent(
                  regionSlugActivacion
                )}`}
                className="text-sm font-semibold text-slate-700 underline underline-offset-2 hover:text-slate-900"
              >
                {regionNombreActivacion
                  ? `Ver «${qSnippetActivacion}» en ${regionNombreActivacion}`
                  : `Ver «${qSnippetActivacion}» en tu región`}
              </Link>
            ) : null}
          </div>
        </div>
        <PublicSearchResults
          comuna={comuna}
          q={q}
          categoriaSlug={categoriaSlug || undefined}
          subcategoriaSlug={subcategoriaSlug || undefined}
          subcategoriaId={subcategoriaId || undefined}
          modoActivacionPreview
          activacionServicioLabel={servicioEtiqueta}
          activacionCtaPublicarHref={`/publicar?${paramsPublicar.toString()}`}
          activacionCtaRecomendarHref={`/recomendar?${paramsRecomendar.toString()}`}
        />
      </div>
    );
  }

  if (!comuna && !q) {
    return (
      <div className="mt-2">
        {bar}
        <h1 className="text-xl font-semibold text-slate-900">Búsqueda</h1>
        <p className="mt-2 text-slate-600 text-sm">
          Escribe qué buscas arriba o usa el buscador en el inicio.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block text-sm font-medium text-slate-900 underline underline-offset-4"
        >
          Volver al inicio
        </Link>
      </div>
    );
  }

  if (comuna && (q || subcategoriaSlug || subcategoriaId || categoriaSlug)) {
    return (
      <div className="mt-2 space-y-4">
        {headerDirectorioNormal}
        {bar}
        <PublicSearchResults
          comuna={comuna}
          q={q}
          categoriaSlug={categoriaSlug || undefined}
          subcategoriaSlug={subcategoriaSlug || undefined}
          subcategoriaId={subcategoriaId || undefined}
        />
      </div>
    );
  }

  if (comuna && !q) {
    return (
      <div className="mt-2 space-y-4">
        {headerDirectorioNormal}
        {bar}
        <PublicSearchResults
          comuna={comuna}
          q=""
          categoriaSlug={categoriaSlug || undefined}
          subcategoriaSlug={subcategoriaSlug || undefined}
          subcategoriaId={subcategoriaId || undefined}
        />
      </div>
    );
  }

  const db = globalDb ?? { items: [], error: "No se cargaron datos de búsqueda." };

  return (
    <div className="mt-2 space-y-4">
      {bar}
      <header>
        <h1 className="text-xl font-semibold text-slate-900">Resultados para &quot;{q}&quot;</h1>
        <p className="text-slate-600 text-sm mt-1">
          {String(regionFocoSlug ?? "").trim() || String(regionFocoNombre ?? "").trim()
            ? `Mostrando resultados en ${(regionFocoNombre ?? "").trim() || "tu región"} · Filtra por comuna para ver lo más cercano a ti`
            : "Resultados en todo Chile. Puedes filtrar por comuna para ver opciones cercanas."}
        </p>
      </header>
      {synonymNotice ? (
        <div
          role="status"
          className="rounded-xl border border-sky-200 bg-sky-50/90 px-4 py-3 text-sm text-slate-800"
        >
          <p className="m-0 font-semibold text-slate-900">
            Mostrando resultados para: {synonymNotice.qResolved}
          </p>
          <p className="mt-1 m-0 text-slate-600">
            Basado en tu búsqueda: {synonymNotice.qOriginal}
          </p>
        </div>
      ) : null}
      <GlobalDbResults q={q} items={db.items} error={db.error} />
    </div>
  );
}
