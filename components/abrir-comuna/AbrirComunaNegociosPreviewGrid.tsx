"use client";

import { useState } from "react";
import { urlTieneFotoListado } from "@/lib/search/sortItemsConFotoPrimero";

export type AbrirComunaNegocioPreviewItem = {
  slug: string;
  nombre: string;
  fotoPrincipalUrl: string;
};

/**
 * Nombre para UI: primera letra de cada palabra en mayúscula (resto en minúsculas), locale es-CL.
 */
export function formatNombreNegocioVisible(raw: string): string {
  const t = String(raw ?? "").trim();
  if (!t) return "Negocio";
  return t
    .split(/\s+/)
    .map((word) => {
      if (!word) return word;
      const first = word.charAt(0).toLocaleUpperCase("es-CL");
      const rest = word.slice(1).toLocaleLowerCase("es-CL");
      return first + rest;
    })
    .join(" ");
}

/**
 * Galería para /abrir-comuna: foto 16:9 + nombre. Sin enlaces ni acciones.
 * — Mobile: 1 columna; md+: máximo 2 columnas (sin 3+).
 */
export default function AbrirComunaNegociosPreviewGrid({
  items,
}: {
  items: AbrirComunaNegocioPreviewItem[];
}) {
  if (items.length === 0) return null;

  return (
    <ul
      className="pointer-events-none m-0 grid list-none grid-cols-1 gap-x-5 gap-y-7 p-0 md:grid-cols-2 md:gap-x-6 md:gap-y-9"
      role="list"
      aria-label="Emprendimientos en vista previa"
    >
      {items.map((item) => (
        <li key={item.slug} className="min-w-0">
          <PreviewCell item={item} />
        </li>
      ))}
    </ul>
  );
}

function PreviewCell({ item }: { item: AbrirComunaNegocioPreviewItem }) {
  const [imgBroken, setImgBroken] = useState(false);
  const url = String(item.fotoPrincipalUrl ?? "").trim();
  const mostrarFoto = urlTieneFotoListado(url) && !imgBroken;
  const nombreMostrado = formatNombreNegocioVisible(String(item.nombre ?? ""));

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white">
      {/* Imagen cuadrada (1:1) para estandarizar cards */}
      <div className="aspect-square w-full shrink-0 overflow-hidden bg-slate-100">
        {mostrarFoto ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              onError={() => setImgBroken(true)}
            />
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center px-3 text-center text-xs font-semibold text-slate-400">
            Sin foto
          </div>
        )}
      </div>
      <p className="m-0 px-3 py-3 text-center text-base font-bold leading-snug tracking-tight text-slate-950 line-clamp-2 sm:py-3.5 sm:text-lg sm:font-extrabold">
        {nombreMostrado}
      </p>
      <p className="m-0 px-3 pb-3 text-center text-[11px] font-medium leading-snug text-slate-500 sm:pb-3.5">
        Disponible cuando se active la comuna
      </p>
    </div>
  );
}
