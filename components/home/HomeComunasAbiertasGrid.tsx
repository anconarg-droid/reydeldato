"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type ComunaAbiertaItem = {
  slug: string;
  nombre: string;
  count: number;
};

/** Comunas visibles antes de expandir (evita listados kilométricos). */
const COMUNAS_VISIBLES_INICIAL = 12;

function serviciosActivosHoy(count: number): string {
  if (count <= 0) return "Servicios sumándose hoy";
  if (count === 1) return "1 servicio activo hoy";
  return `${count} servicios activos hoy`;
}

function ComunaDisponibleCard({
  nombre,
  slug,
  count,
  onGo,
}: {
  nombre: string;
  slug: string;
  count: number;
  onGo: (slug: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onGo(slug)}
      aria-label={`Ver servicios en ${nombre}`}
      className="group flex h-full min-h-0 flex-col rounded-lg border border-slate-200 bg-white p-2.5 text-left shadow-sm transition-[border-color,box-shadow,transform] duration-150 hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 sm:p-3"
    >
      <span className="mb-1.5 inline-flex w-fit max-w-full items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-900 sm:text-[11px]">
        Con resultados
      </span>
      <p className="text-left text-sm font-bold leading-snug text-slate-900 sm:text-[15px]">
        <span aria-hidden className="mr-1">
          🔥
        </span>
        <span className="break-words">{nombre}</span>
        <span className="font-semibold text-slate-600"> ya disponible</span>
      </p>
      <p className="mt-1 flex-1 text-[11px] font-medium leading-snug text-slate-600 sm:text-xs">
        {serviciosActivosHoy(count)}
      </p>
      <span className="mt-1.5 inline-flex w-fit shrink-0 items-center rounded-md bg-[#0d7a5f] px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm transition-colors duration-150 group-hover:bg-[#0b6a52] sm:px-3 sm:py-1.5 sm:text-xs">
        Ver servicios →
      </span>
    </button>
  );
}

export default function HomeComunasAbiertasGrid({
  items,
}: {
  items: ComunaAbiertaItem[];
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  const visible = useMemo(() => {
    if (expanded || items.length <= COMUNAS_VISIBLES_INICIAL) return items;
    return items.slice(0, COMUNAS_VISIBLES_INICIAL);
  }, [expanded, items]);

  const ocultas = Math.max(0, items.length - COMUNAS_VISIBLES_INICIAL);
  const mostrarVerMas = !expanded && ocultas > 0;

  const go = useCallback(
    (slug: string) => {
      router.push(`/${encodeURIComponent(slug)}`);
    },
    [router]
  );

  if (items.length === 0) return null;

  return (
    <div className="w-full min-w-0">
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 sm:gap-2 lg:grid-cols-3 lg:gap-2.5">
        {visible.map((c) => (
          <ComunaDisponibleCard
            key={c.slug}
            nombre={c.nombre}
            slug={c.slug}
            count={c.count}
            onGo={go}
          />
        ))}
      </div>
      {mostrarVerMas ? (
        <div className="mt-2.5 flex justify-center sm:mt-3">
          <button
            type="button"
            className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 sm:px-4 sm:py-2 sm:text-sm"
            onClick={() => setExpanded(true)}
            aria-expanded={false}
          >
            Ver más
            <span className="ml-1.5 tabular-nums text-slate-500">(+{ocultas})</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
