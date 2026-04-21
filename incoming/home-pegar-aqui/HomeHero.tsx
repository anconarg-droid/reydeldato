"use client";

import type { ReactNode } from "react";
import HomeSearchClient from "@/app/HomeSearchClient";
import { CHIPS_HERO } from "@/lib/homeConstants";
import { useSearchParams } from "next/navigation";

type Props = {
  /** Contenido tras el buscador y “Lo más buscado” (p. ej. carrusel de fichas). */
  children?: ReactNode;
};

export default function HomeHero({ children }: Props) {
  const searchParams = useSearchParams();
  const initialComunaSlug = searchParams.get("comuna") ?? null;

  return (
    <section className="max-w-5xl mx-auto px-4 pt-12 pb-6 text-center sm:pt-16 sm:pb-8 md:pt-20 md:pb-10 bg-gradient-to-b from-white via-emerald-50/40 to-slate-50">
      <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
        Encuentra servicios reales en tu comuna
      </h1>
      <p className="mt-6 max-w-2xl mx-auto text-slate-500 text-base sm:text-lg sm:mt-8">
        Sin datos falsos. Sin perder tiempo. Sin pagar por visibilidad.
      </p>

      <div className="mt-12 sm:mt-14 md:mt-16 mx-auto w-full max-w-5xl rounded-2xl bg-white border border-emerald-100 shadow-sm p-4 sm:p-6 md:p-8">
        <HomeSearchClient
          sugerencias={[...CHIPS_HERO]}
          initialComunaSlug={initialComunaSlug}
        />
      </div>

      <p className="mt-6 sm:mt-8 max-w-2xl mx-auto text-center text-sm text-slate-500 leading-relaxed">
        Resultados reales en tu comuna · contacto directo · sin intermediarios
      </p>
      <p className="mt-1.5 max-w-2xl mx-auto text-center text-[10px] leading-snug text-slate-500 opacity-55 sm:text-[11px] sm:opacity-50">
        Busca, compara y contacta en menos de 1 minuto
      </p>

      {children ? <div className="mt-8 w-full text-left sm:mt-10">{children}</div> : null}
    </section>
  );
}
