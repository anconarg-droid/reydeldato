"use client";

import { useMemo, useState } from "react";
import CategoriaEmprendedoresGrid from "@/components/categoria/CategoriaEmprendedoresGrid";
import SoloCompletosFiltroControl from "@/components/search/SoloCompletosFiltroControl";
import { filtrarItemsPorMejoresOpciones } from "@/lib/buscarApiItemPasaFiltroVerMejoresOpciones";
import type { BuscarApiItem } from "@/lib/mapBuscarItemToEmprendedorCard";

type Props = {
  items: BuscarApiItem[];
  comunaSlug: string;
  comunaNombre: string;
  className?: string;
  emptyMessage?: string;
};

export default function CategoriaEmprendedoresGridConFiltro({
  items,
  comunaSlug,
  comunaNombre,
  className,
  emptyMessage = "No hay resultados con estos filtros.",
}: Props) {
  const [soloCompletos, setSoloCompletos] = useState(false);
  const filtered = useMemo(
    () => filtrarItemsPorMejoresOpciones(items, soloCompletos),
    [items, soloCompletos],
  );
  const ningunoConFiltro =
    soloCompletos && items.length > 0 && filtered.length === 0;

  if (items.length === 0) {
    return (
      <CategoriaEmprendedoresGrid
        items={[]}
        comunaSlug={comunaSlug}
        comunaNombre={comunaNombre}
        emptyMessage={emptyMessage}
      />
    );
  }

  return (
    <div className={className}>
      <div className="w-full">
        <SoloCompletosFiltroControl checked={soloCompletos} onCheckedChange={setSoloCompletos} />
      </div>
      {soloCompletos && ningunoConFiltro ? (
        <div className="mb-3 rounded-lg border border-sky-200/80 bg-sky-50/90 px-3 py-2 text-sm text-slate-800">
          <p className="m-0 text-slate-700">Desactiva el filtro para ver todas las opciones.</p>
        </div>
      ) : null}
      <CategoriaEmprendedoresGrid
        items={filtered}
        comunaSlug={comunaSlug}
        comunaNombre={comunaNombre}
        destacarMejoresOpciones={soloCompletos}
        emptyMessage={
          ningunoConFiltro
            ? "Sin resultados con perfil activo. Desactiva el filtro."
            : emptyMessage
        }
      />
    </div>
  );
}
