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
import type { GlobalAlgoliaSearchMeta } from "@/lib/search/searchEmprendedoresGlobalAlgolia";
import ResultadosSearchBar from "./ResultadosSearchBar";
import { getRegionShort } from "@/utils/regionShort";
import { buildActivacionDirectorioCtas } from "@/lib/buildActivacionDirectorioCtas";
import DirectorioEnCrecimientoActivacionBanner from "@/components/search/DirectorioEnCrecimientoActivacionBanner";

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

function ComunaDirectorioHeader({
  tituloComunaDisplay,
  regionNombreCompleto,
  tieneBusquedaActiva,
  terminoBusquedaDisplay,
}: {
  tituloComunaDisplay: string;
  /** Nombre oficial de la región (p. ej. “Región del Maule”), como en /abrir-comuna. */
  regionNombreCompleto?: string | null;
  tieneBusquedaActiva: boolean;
  terminoBusquedaDisplay: string;
}) {
  const termino =
    terminoBusquedaDisplay.trim() || (tieneBusquedaActiva ? "esta búsqueda" : "");

  return (
    <header className="mt-3">
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
        Encuentra servicios y comercios en <span className="text-sky-700">{tituloComunaDisplay}</span>
      </h1>
      {regionNombreCompleto ? (
        <p className="mt-1 text-sm font-medium text-slate-600">{regionNombreCompleto}</p>
      ) : null}
      {tieneBusquedaActiva ? (
        <p className="mt-2 text-sm text-slate-600">
          Mostrando resultados para{" "}
          <span className="font-medium text-slate-900">&ldquo;{termino}&rdquo;</span> en{" "}
          {tituloComunaDisplay}.
        </p>
      ) : (
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Negocios locales y personas que atienden tu comuna.
        </p>
      )}
    </header>
  );
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
                  <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 items-stretch">
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
                  <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 items-stretch">
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
            <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 items-stretch">
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
  globalDb?: {
    items: BuscarApiItem[];
    error: string | null;
    meta?: GlobalAlgoliaSearchMeta | null;
  } | null;
  /**
   * Solo servidor: cuando hubo foco regional y cero resultados, búsqueda nacional para el bloque
   * “Resultados en otras regiones” (no se mezcla con el listado regional).
   */
  globalDbOtrasRegiones?: {
    items: BuscarApiItem[];
    error: string | null;
    meta?: GlobalAlgoliaSearchMeta | null;
  } | null;
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
  /** `?scope=nacional`: búsqueda en todo Chile (sin foco regional por IP). */
  scopeNacional?: boolean;
  /** Valor original de `?region=` en la URL (para armar enlaces que preservan el query). */
  regionQueryOriginal?: string | null;
  /** `?ver_otras_regiones=1`: el usuario pidió ver el bloque nacional separado. */
  verOtrasRegionesActivo?: boolean;
  /**
   * Solo en ruta `/[comuna]`: invitación visual cuando no hay término en URL (borde pulsante + copy).
   */
  invitacionBuscaEnPaginaComuna?: boolean;
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
  globalDbOtrasRegiones = null,
  synonymNotice = null,
  directorioComunaAbierto = true,
  regionFocoSlug = null,
  regionFocoNombre = null,
  regionQueryOriginal = null,
  verOtrasRegionesActivo = false,
  resaltarCampoComunaEnBusquedaGlobal = false,
  scopeNacional = false,
  invitacionBuscaEnPaginaComuna = false,
}: Props) {
  const comuna = (initialComuna ?? "").trim();
  const comunaNombre = (initialComunaNombre ?? "").trim();
  const q = (initialQ ?? "").trim();
  const categoriaSlug = (initialCategoriaSlug ?? "").trim();
  const subcategoriaSlug = (initialSubcategoriaSlug ?? "").trim();
  const subcategoriaId = (initialSubcategoriaId ?? "").trim();

  const tituloComunaDisplay = comunaNombre || comuna.replace(/-/g, " ");
  const regionNombreFoco = (regionFocoNombre ?? "").trim();
  const comunaTituloConRegion = regionNombreFoco
    ? `${tituloComunaDisplay} — ${getRegionShort(regionNombreFoco) || regionNombreFoco}`
    : tituloComunaDisplay;
  const tieneBusquedaActiva =
    Boolean(normalizeText(q)) ||
    Boolean(subcategoriaSlug) ||
    Boolean(subcategoriaId) ||
    Boolean(categoriaSlug);
  const terminoBusquedaDisplay = normalizeText((initialQDisplay ?? "").trim())
    ? (initialQDisplay ?? "").trim()
    : subcategoriaSlug
      ? prettySubcategoriaSlugForDisplay(subcategoriaSlug)
      : categoriaSlug
        ? prettySubcategoriaSlugForDisplay(categoriaSlug)
        : subcategoriaId
          ? "este rubro"
          : "";
  const comunaInvitacionActiva =
    Boolean(invitacionBuscaEnPaginaComuna) && directorioComunaAbierto && !tieneBusquedaActiva;

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
        fixedComunaNombre={
          initialComuna ? comunaTituloConRegion : comunaNombre ? comunaNombre : null
        }
        resaltarCampoComuna={resaltarCampoComunaEnBusquedaGlobal}
        comunaInvitacionActiva={comunaInvitacionActiva}
      />
    </div>
  );

  const headerDirectorioNormal = (
    <ComunaDirectorioHeader
      tituloComunaDisplay={tituloComunaDisplay}
      regionNombreCompleto={initialComuna && regionNombreFoco ? regionNombreFoco : null}
      tieneBusquedaActiva={tieneBusquedaActiva}
      terminoBusquedaDisplay={terminoBusquedaDisplay}
    />
  );

  if (comuna && !directorioComunaAbierto) {
    const ctaA = buildActivacionDirectorioCtas({
      comunaSlug: comuna,
      comunaNombreTitulo: tituloComunaDisplay,
      qDisplayRaw: (initialQDisplay ?? "").trim(),
      subcategoriaSlug: subcategoriaSlug ?? "",
      subcategoriaId: subcategoriaId ?? "",
      categoriaSlug: categoriaSlug ?? "",
    });
    const servicioEtiqueta = ctaA.servicioEtiqueta;
    const regionSlugActivacion = (regionFocoSlug ?? "").trim();
    const regionNombreActivacion = (regionFocoNombre ?? "").trim();

    return (
      <div className="mt-2 space-y-5">
        {bar}
        <DirectorioEnCrecimientoActivacionBanner
          tituloComunaDisplay={tituloComunaDisplay}
          comunaTituloConRegion={comunaTituloConRegion}
          regionNombreActivacion={regionNombreActivacion || null}
          paramsPublicar={ctaA.paramsPublicar}
          paramsRecomendar={ctaA.paramsRecomendar}
          comunaSlug={comuna}
          qParaTodoChile={ctaA.qParaTodoChile}
          qNormTodoChile={ctaA.qNormTodoChile}
          qSnippetActivacion={ctaA.qSnippetActivacion}
          regionSlugActivacion={regionSlugActivacion}
          regionNombreActivacionParaLink={regionNombreActivacion}
        />
        <PublicSearchResults
          comuna={comuna}
          q={q}
          categoriaSlug={categoriaSlug || undefined}
          subcategoriaSlug={subcategoriaSlug || undefined}
          subcategoriaId={subcategoriaId || undefined}
          comunaTituloConRegion={comunaTituloConRegion}
          modoActivacionPreview
          activacionServicioLabel={servicioEtiqueta}
          qDisplayLabel={initialQDisplay ?? ""}
          regionFocoSlug={regionFocoSlug}
          regionFocoNombre={regionFocoNombre}
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
          comunaTituloConRegion={comunaTituloConRegion}
          qDisplayLabel={initialQDisplay ?? ""}
          regionFocoSlug={regionFocoSlug}
          regionFocoNombre={regionFocoNombre}
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
          comunaTituloConRegion={comunaTituloConRegion}
          qDisplayLabel={initialQDisplay ?? ""}
          regionFocoSlug={regionFocoSlug}
          regionFocoNombre={regionFocoNombre}
        />
      </div>
    );
  }

  const db = globalDb ?? { items: [], error: "No se cargaron datos de búsqueda." };
  const otras = globalDbOtrasRegiones;
  const hayFocoRegionalActivo =
    !scopeNacional &&
    (Boolean(String(regionFocoSlug ?? "").trim()) || Boolean(regionNombreFoco));
  const terminoParaCopy = (initialQDisplay ?? "").trim() || q;
  const hrefBusquedaNacional = `/resultados?q=${encodeURIComponent(terminoParaCopy)}&scope=nacional`;
  const slugRegionFoco = String(regionFocoSlug ?? "").trim().replace(/^region-/, "");
  const regionParamParaLinks =
    (regionQueryOriginal ?? "").trim() ||
    (slugRegionFoco ? `region-${slugRegionFoco}` : "");
  const paramsVerOtras = new URLSearchParams();
  paramsVerOtras.set("q", terminoParaCopy);
  if (regionParamParaLinks) paramsVerOtras.set("region", regionParamParaLinks);
  paramsVerOtras.set("ver_otras_regiones", "1");
  const hrefVerOtrasRegiones = `/resultados?${paramsVerOtras.toString()}`;
  const regionalVacio =
    Boolean(q) && hayFocoRegionalActivo && !db.error && db.items.length === 0;
  const mostrarBloqueNacionalSeparado =
    Boolean(verOtrasRegionesActivo && otras && !otras.error && otras.items.length > 0);

  return (
    <div className="mt-2 space-y-4">
      {bar}
      <header>
        <h1 className="text-xl font-semibold text-slate-900">Resultados para &quot;{q}&quot;</h1>
        <p className="text-slate-600 text-sm mt-1">
          {scopeNacional
            ? "Búsqueda en todo Chile (sin acotar por región). Puedes filtrar por comuna para ver opciones cercanas."
            : String(regionFocoSlug ?? "").trim() || String(regionFocoNombre ?? "").trim()
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
      {db.error ? (
        <GlobalDbResults q={q} items={db.items} error={db.error} />
      ) : !hayFocoRegionalActivo || scopeNacional ? (
        <GlobalDbResults q={q} items={db.items} error={db.error} />
      ) : (
        <div className="space-y-8">
          {regionalVacio && !verOtrasRegionesActivo ? (
            <div
              className="rounded-2xl border border-slate-200 bg-white px-4 py-5 sm:px-5"
              style={{ boxShadow: "0 1px 3px rgba(15,23,42,0.06)" }}
            >
              <p className="m-0 text-sm font-medium leading-relaxed text-slate-800">
                No encontramos &ldquo;{terminoParaCopy}&rdquo; en{" "}
                {(regionFocoNombre ?? "").trim() || "tu región"}
              </p>
              <div className="mt-4 flex flex-wrap gap-2.5">
                {regionParamParaLinks ? (
                  <Link
                    href={hrefVerOtrasRegiones}
                    className="inline-flex items-center justify-center rounded-xl border border-sky-300 bg-white px-3.5 py-2.5 text-sm font-extrabold text-sky-950 no-underline shadow-sm hover:bg-sky-50"
                  >
                    Ver {terminoParaCopy} en otras regiones
                  </Link>
                ) : null}
                <Link
                  href={hrefBusquedaNacional}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm font-extrabold text-slate-900 no-underline shadow-sm hover:bg-slate-100"
                >
                  Ver {terminoParaCopy} en todo Chile
                </Link>
              </div>
            </div>
          ) : null}

          {regionalVacio && verOtrasRegionesActivo ? (
            <p className="m-0 text-sm font-medium text-slate-700">
              No encontramos &ldquo;{terminoParaCopy}&rdquo; en{" "}
              {(regionFocoNombre ?? "").trim() || "tu región"}.
            </p>
          ) : null}

          {db.items.length > 0 ? (
            <div className="space-y-2">
              {verOtrasRegionesActivo ? (
                <h2 className="m-0 text-base font-extrabold text-slate-900">
                  En {(regionFocoNombre ?? "").trim() || "tu región"}
                </h2>
              ) : null}
              <GlobalDbResults q={q} items={db.items} error={null} />
            </div>
          ) : null}

          {otras?.error ? (
            <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              Error cargando resultados en otras regiones: {otras.error}
            </p>
          ) : mostrarBloqueNacionalSeparado ? (
            <div className="space-y-3 border-t border-slate-200 pt-8">
              <h2 className="text-base font-extrabold text-slate-900">Resultados en otras regiones</h2>
              <GlobalDbResults q={q} items={otras!.items} error={null} />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
