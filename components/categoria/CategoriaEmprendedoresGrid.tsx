"use client";

import { useMemo } from "react";
import EmprendedorSearchCard from "@/components/search/EmprendedorSearchCard";
import EmprendedorSearchCardsGrid from "@/components/search/EmprendedorSearchCardsGrid";
import {
  buscarApiItemToEmprendedorCardProps,
  type BuscarApiItem,
  type BuscarComunaContextMeta,
} from "@/lib/mapBuscarItemToEmprendedorCard";
import { sortItemsConFotoPrimeroStable } from "@/lib/search/sortItemsConFotoPrimero";

type Props = {
  items: BuscarApiItem[];
  comunaSlug: string;
  comunaNombre: string;
  /** Si difiere de `comunaNombre`, se muestra en la card (“En … — región”). */
  comunaNombreEnCard?: string | null;
  emptyMessage?: string;
  /** Filtro “Ver mejores opciones” activo: resalta cards en listado territorial. */
  destacarMejoresOpciones?: boolean;
  /** Comuna sin directorio activo: solo foto + nombre en cada card. */
  usarCardSimple?: boolean;
  /** Región de la comuna de listado (p. ej. RM / Maule) para línea de ubicación en cards. */
  comunaContextoRegionAbrev?: string | null;
  /** Listado global dentro de página de comuna: sin meta de comuna (📍 base + región en card). */
  omitirContextoComuna?: boolean;
  /** Conserva el orden del servidor (p. ej. rotación/ranking de búsqueda global). */
  preservarOrdenItems?: boolean;
  /** Nota bajo la línea de ubicación (p. ej. aviso de disponibilidad territorial). */
  listadoNotaDebajoUbicacion?: string | null;
};

export default function CategoriaEmprendedoresGrid({
  items,
  comunaSlug,
  comunaNombre,
  comunaNombreEnCard = null,
  emptyMessage = "No hay resultados con estos filtros.",
  destacarMejoresOpciones = false,
  usarCardSimple = false,
  comunaContextoRegionAbrev = null,
  omitirContextoComuna = false,
  preservarOrdenItems = false,
  listadoNotaDebajoUbicacion = null,
}: Props) {
  const slugT = comunaSlug.trim();
  const nombreT = comunaNombre.trim();
  const largoT = String(comunaNombreEnCard ?? "").trim();
  const regCtx = String(comunaContextoRegionAbrev ?? "").trim();
  const meta: BuscarComunaContextMeta | null =
    omitirContextoComuna || !slugT || !nombreT
      ? null
      : {
          comunaSlug: slugT,
          comunaNombre: nombreT,
          ...(largoT && largoT !== nombreT ? { comunaNombreEnCard: largoT } : {}),
          ...(regCtx ? { comunaRegionAbrev: regCtx } : {}),
        };

  const ordenados = useMemo(
    () =>
      preservarOrdenItems
        ? [...items]
        : sortItemsConFotoPrimeroStable(items, (i) => i.fotoPrincipalUrl),
    [items, preservarOrdenItems],
  );

  return (
    <EmprendedorSearchCardsGrid
      emptyMessage={emptyMessage}
      itemCount={items.length}
      gridClassName="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 items-stretch"
    >
      {ordenados.map((item) => (
        <EmprendedorSearchCard
          key={item.slug || item.id}
          {...buscarApiItemToEmprendedorCardProps(
            item,
            meta,
            omitirContextoComuna ? "search" : "comuna",
          )}
          destacarMejoresOpciones={destacarMejoresOpciones}
          usarCardSimple={usarCardSimple}
          listadoNotaDebajoUbicacion={listadoNotaDebajoUbicacion ?? undefined}
        />
      ))}
    </EmprendedorSearchCardsGrid>
  );
}
