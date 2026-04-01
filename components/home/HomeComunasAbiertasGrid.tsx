"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

export type ComunaAbiertaItem = {
  slug: string;
  nombre: string;
  count: number;
};

function serviciosActivosHoy(count: number): string {
  if (count <= 0) return "Servicios sumándose hoy";
  if (count === 1) return "1 servicio activo hoy";
  return `${count} servicios activos hoy`;
}

function ComunaDisponibleCard({
  nombre,
  slug,
  count,
  featured,
  onGo,
}: {
  nombre: string;
  slug: string;
  count: number;
  featured?: boolean;
  onGo: (slug: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onGo(slug)}
      aria-label={`Ver servicios en ${nombre}`}
      className={
        featured
          ? "group flex w-full flex-col rounded-2xl border-2 border-slate-300 bg-white p-6 text-left shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 sm:p-8"
          : "group flex w-full flex-col rounded-2xl border-2 border-slate-200 bg-white p-5 text-left shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 sm:p-6"
      }
    >
      <p
        className={
          featured
            ? "text-left text-lg font-bold leading-snug text-slate-900 sm:text-xl"
            : "text-left text-base font-bold leading-snug text-slate-900 sm:text-lg"
        }
      >
        <span aria-hidden className="mr-1.5">
          🔥
        </span>
        {nombre} ya disponible
      </p>
      <p className="mt-2 text-sm font-medium text-slate-600 sm:text-base">
        {serviciosActivosHoy(count)}
      </p>
      <span className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 group-hover:bg-zinc-900 active:scale-95 sm:w-auto sm:self-start">
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

  const go = useCallback(
    (slug: string) => {
      router.push(`/${encodeURIComponent(slug)}`);
    },
    [router]
  );

  if (items.length === 0) return null;

  if (items.length === 1) {
    const c = items[0];
    return (
      <ComunaDisponibleCard
        nombre={c.nombre}
        slug={c.slug}
        count={c.count}
        featured
        onGo={go}
      />
    );
  }

  if (items.length === 2) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
        {items.map((c) => (
          <ComunaDisponibleCard
            key={c.slug}
            nombre={c.nombre}
            slug={c.slug}
            count={c.count}
            onGo={go}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((c) => (
        <ComunaDisponibleCard
          key={c.slug}
          nombre={c.nombre}
          slug={c.slug}
          count={c.count}
          onGo={go}
        />
      ))}
    </div>
  );
}
