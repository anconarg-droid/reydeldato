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
};

export default function CategoriaEmprendedoresGrid({
  items,
  comunaSlug,
  comunaNombre,
  comunaNombreEnCard = null,
  emptyMessage = "No hay resultados con estos filtros.",
  destacarMejoresOpciones = false,
  usarCardSimple = false,
}: Props) {
  const slugT = comunaSlug.trim();
  const nombreT = comunaNombre.trim();
  const largoT = String(comunaNombreEnCard ?? "").trim();
  const meta: BuscarComunaContextMeta | null =
    slugT && nombreT
      ? {
          comunaSlug: slugT,
          comunaNombre: nombreT,
          ...(largoT && largoT !== nombreT ? { comunaNombreEnCard: largoT } : {}),
        }
      : null;

  const ordenados = useMemo(
    () => sortItemsConFotoPrimeroStable(items, (i) => i.fotoPrincipalUrl),
    [items],
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
          {...buscarApiItemToEmprendedorCardProps(item, meta, "comuna")}
          destacarMejoresOpciones={destacarMejoresOpciones}
          usarCardSimple={usarCardSimple}
        />
      ))}
    </EmprendedorSearchCardsGrid>
  );
}
