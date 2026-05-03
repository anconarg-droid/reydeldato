"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import TrackImpressions from "@/components/TrackImpressions";
import CategoriaEmprendedoresGrid from "@/components/categoria/CategoriaEmprendedoresGrid";
import SoloCompletosFiltroControl from "@/components/search/SoloCompletosFiltroControl";
import TerritorialAccordionBlock from "@/components/search/TerritorialAccordionBlock";
import type { BuscarApiItem } from "@/lib/mapBuscarItemToEmprendedorCard";
import {
  buscarApiItemPasaFiltroVerMejoresOpciones,
  filtrarItemsPorMejoresOpciones,
} from "@/lib/buscarApiItemPasaFiltroVerMejoresOpciones";
import { isPerfilCompletoParaBusqueda } from "@/lib/isPerfilCompletoParaBusqueda";
import { busquedaComunaOuterSectionStyle } from "@/lib/busquedaComunaLayoutStyles";

type TrackConfig = {
  comuna_slug: string;
  q: string;
};

type Props = {
  enTuComuna: BuscarApiItem[];
  atiendenTuComuna: BuscarApiItem[];
  comunaSlug: string;
  comunaNombre: string;
  nombreComunaDisplay: string;
  /** Mensaje vacío de la grilla cuando no aplica el caso “solo completos en bloque vacío”. */
  gridEmptyMessage?: string;
  trackImpressions?: TrackConfig | null;
  /** Estado vacío total sin resultados de API. */
  emptyTotal?: ReactNode;
  /** Oculta el filtro “solo perfiles activos” (p. ej. vista previa en comuna sin directorio). */
  ocultarFiltroSoloCompletos?: boolean;
  /**
   * Comuna sin directorio: cards solo con foto + nombre (sin contacto ni ficha).
   * Debe ir alineado con {@link ocultarFiltroSoloCompletos} en preview de activación.
   */
  usarCardSimple?: boolean;
  /**
   * Etiqueta de servicio (p. ej. “gasfiter”): si hay pocos resultados totales, muestra una línea opcional arriba de los bloques.
   */
  pocosResultadosServicioLabel?: string | null;
};

export default function ComunaTerritorialBloquesConFiltro({
  enTuComuna: enRaw,
  atiendenTuComuna: atiendenRaw,
  comunaSlug,
  comunaNombre,
  nombreComunaDisplay,
  gridEmptyMessage = "No hay resultados con estos filtros.",
  trackImpressions,
  emptyTotal,
  ocultarFiltroSoloCompletos = false,
  usarCardSimple = false,
  pocosResultadosServicioLabel = null,
}: Props) {
  const [soloCompletos, setSoloCompletos] = useState(false);

  const aplicarSoloCompletos = ocultarFiltroSoloCompletos ? false : soloCompletos;

  const fEn = useMemo(
    () => filtrarItemsPorMejoresOpciones(enRaw, aplicarSoloCompletos),
    [enRaw, aplicarSoloCompletos],
  );
  const fAt = useMemo(
    () => filtrarItemsPorMejoresOpciones(atiendenRaw, aplicarSoloCompletos),
    [atiendenRaw, aplicarSoloCompletos],
  );

  const totalRaw = enRaw.length + atiendenRaw.length;
  const totalFiltrado = fEn.length + fAt.length;
  const ningunoFiltradoPeroHayRaw =
    aplicarSoloCompletos && totalFiltrado === 0 && totalRaw > 0;

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const all = [...enRaw, ...atiendenRaw];
    for (const it of all) {
      const slug = String(it.slug || "").toLowerCase();
      const name = String(it.nombre || "").toLowerCase();
      if (!slug.includes("don-benito") && !name.includes("don benito")) continue;
      const visible =
        !aplicarSoloCompletos || buscarApiItemPasaFiltroVerMejoresOpciones(it);
      // eslint-disable-next-line no-console
      console.log("[resultados-ui debug Don Benito]", {
        slug: it.slug,
        aplicarSoloCompletosFiltroMejores: aplicarSoloCompletos,
        flagsApi: {
          esFichaCompleta: it.esFichaCompleta,
          estadoFicha: it.estadoFicha,
          fichaActivaPorNegocio: it.fichaActivaPorNegocio,
        },
        isPerfilCompletoParaBusqueda: isPerfilCompletoParaBusqueda(it),
        visibleConFiltroActual: visible,
      });
    }
  }, [enRaw, atiendenRaw, aplicarSoloCompletos]);

  const slugsOrdenVisual = useMemo(
    () => [...fEn, ...fAt].map((i) => String(i.slug || i.id || "")).filter(Boolean),
    [fEn, fAt]
  );

  const persistPrefix = `resultados:${comunaSlug}`;
  const idSafe = comunaSlug.replace(/[^a-zA-Z0-9_-]/g, "-");
  const sinBasePeroConCobertura = enRaw.length === 0 && atiendenRaw.length > 0;

  if (totalRaw === 0) {
    return <>{emptyTotal}</>;
  }

  return (
    <section style={busquedaComunaOuterSectionStyle}>
      {trackImpressions ? (
        <TrackImpressions
          slugs={
            slugsOrdenVisual.length
              ? slugsOrdenVisual
              : [...enRaw, ...atiendenRaw].map((i) => String(i.slug || i.id || "")).filter(Boolean)
          }
          comuna_slug={trackImpressions.comuna_slug}
          q={trackImpressions.q}
        />
      ) : null}

      {!ocultarFiltroSoloCompletos ? (
        <div className="w-full">
          <SoloCompletosFiltroControl checked={soloCompletos} onCheckedChange={setSoloCompletos} />
        </div>
      ) : null}

      {!ocultarFiltroSoloCompletos && soloCompletos && ningunoFiltradoPeroHayRaw ? (
        <div className="mb-4 space-y-1.5 rounded-lg border border-sky-200/80 bg-sky-50/90 px-3 py-2.5 text-sm text-slate-800">
          <p className="m-0 text-slate-700">
            En esta zona casi nadie tiene aún el perfil tan completo. Desactiva el filtro para ver
            todas las opciones o anima a completar el perfil.
          </p>
        </div>
      ) : null}

      {pocosResultadosServicioLabel &&
      totalFiltrado > 0 &&
      totalFiltrado <= 4 ? (
        <p className="mb-3 text-sm text-slate-600">
          Aún hay pocos {pocosResultadosServicioLabel} en esta comuna
        </p>
      ) : null}

      {(enRaw.length > 0 || sinBasePeroConCobertura) ? (
        <TerritorialAccordionBlock
          variant="local"
          persistPrefix={persistPrefix}
          which="base"
          instanceId={`resultados-${idSafe}-base`}
          title={
            <>
              En {nombreComunaDisplay} ({aplicarSoloCompletos ? fEn.length : enRaw.length})
            </>
          }
          subtitle="Con base en esta comuna"
        >
          {sinBasePeroConCobertura ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 sm:px-5">
              <p className="m-0 text-sm font-extrabold text-slate-900">
                Aún no hay negocios con base en esta comuna para esta búsqueda.
              </p>
              <p className="m-0 mt-1 text-sm text-slate-600 leading-relaxed">
                Sí encontramos negocios que atienden esta comuna desde otras comunas.
              </p>
            </div>
          ) : (
            <CategoriaEmprendedoresGrid
              items={fEn}
              comunaSlug={comunaSlug}
              comunaNombre={comunaNombre}
              usarCardSimple={usarCardSimple}
              emptyMessage={
                aplicarSoloCompletos && enRaw.length > 0 && fEn.length === 0
                  ? "Sin resultados con perfil activo. Desactiva el filtro."
                  : gridEmptyMessage
              }
            />
          )}
        </TerritorialAccordionBlock>
      ) : null}

      {atiendenRaw.length > 0 ? (
        <TerritorialAccordionBlock
          variant="cobertura"
          persistPrefix={persistPrefix}
          which="atienden"
          instanceId={`resultados-${idSafe}-atienden`}
          className={
            enRaw.length > 0 || sinBasePeroConCobertura ? "mt-6 sm:mt-7" : ""
          }
          title={
            <>
              Atienden {nombreComunaDisplay} desde otras comunas (
              {aplicarSoloCompletos ? fAt.length : atiendenRaw.length})
            </>
          }
          subtitle="Negocios con base en otra comuna que atienden esta zona"
        >
          <CategoriaEmprendedoresGrid
            items={fAt}
            comunaSlug={comunaSlug}
            comunaNombre={comunaNombre}
            usarCardSimple={usarCardSimple}
            destacarMejoresOpciones={aplicarSoloCompletos}
            emptyMessage={
              aplicarSoloCompletos && atiendenRaw.length > 0 && fAt.length === 0
                ? "Sin resultados con perfil activo. Desactiva el filtro."
                : gridEmptyMessage
            }
          />
        </TerritorialAccordionBlock>
      ) : null}
    </section>
  );
}
