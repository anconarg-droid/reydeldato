"use client";

import Link from "next/link";
import { HOME_MAS_BUSCADO_ITEMS } from "@/lib/homeMasBuscado";

type Props = {
  /** Slug de comuna si el usuario eligió una en el buscador (o viene en `?comuna=`). */
  comunaSlug: string | null;
  className?: string;
};

function hrefForTerm(comunaSlug: string | null, q: string): string {
  const enc = encodeURIComponent(q);
  if (comunaSlug && comunaSlug.trim()) {
    return `/${encodeURIComponent(comunaSlug.trim())}?q=${enc}`;
  }
  return `/resultados?q=${enc}`;
}

export default function HomeMasBuscado({ comunaSlug, className = "" }: Props) {
  return (
    <div className={className}>
      <h2
        id="home-mas-buscado-heading"
        className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 sm:text-center"
      >
        Lo más buscado en tu comuna
      </h2>
      <ul
        className="mt-3 grid grid-cols-3 gap-2"
        aria-labelledby="home-mas-buscado-heading"
      >
        {HOME_MAS_BUSCADO_ITEMS.map((item) => (
          <li key={item.q}>
            <Link
              href={hrefForTerm(comunaSlug, item.q)}
              className="flex min-h-[40px] items-center justify-center rounded-lg border border-slate-200 bg-white px-2 py-2 text-center text-xs font-semibold leading-snug text-slate-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md active:scale-95"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
