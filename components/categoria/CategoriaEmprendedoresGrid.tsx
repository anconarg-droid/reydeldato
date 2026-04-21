"use client";

import EmprendedorSearchCard from "@/components/search/EmprendedorSearchCard";
import EmprendedorSearchCardsGrid from "@/components/search/EmprendedorSearchCardsGrid";
import ListadoSinFotosSeparador from "@/components/search/ListadoSinFotosSeparador";
import {
  buscarApiItemToEmprendedorCardProps,
  type BuscarApiItem,
} from "@/lib/mapBuscarItemToEmprendedorCard";
import { urlTieneFotoListado } from "@/lib/search/sortItemsConFotoPrimero";

type Props = {
  items: BuscarApiItem[];
  comunaSlug: string;
  comunaNombre: string;
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
  emptyMessage = "No hay resultados con estos filtros.",
  destacarMejoresOpciones = false,
  usarCardSimple = false,
}: Props) {
  const meta =
    comunaSlug.trim() && comunaNombre.trim()
      ? { comunaSlug: comunaSlug.trim(), comunaNombre: comunaNombre.trim() }
      : null;

  const conFoto = items.filter((i) => urlTieneFotoListado(i.fotoPrincipalUrl));
  const sinFoto = items.filter((i) => !urlTieneFotoListado(i.fotoPrincipalUrl));
  const mostrarSeparadorSinFotos = conFoto.length > 0 && sinFoto.length > 0;

  return (
    <EmprendedorSearchCardsGrid emptyMessage={emptyMessage} itemCount={items.length}>
      {conFoto.map((item) => (
        <EmprendedorSearchCard
          key={item.slug || item.id}
          {...buscarApiItemToEmprendedorCardProps(item, meta, "comuna")}
          destacarMejoresOpciones={destacarMejoresOpciones}
          usarCardSimple={usarCardSimple}
        />
      ))}
      {mostrarSeparadorSinFotos ? <ListadoSinFotosSeparador /> : null}
      {sinFoto.map((item) => (
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
