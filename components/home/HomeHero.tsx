"use client";

import HomeSearchClient from "@/app/HomeSearchClient";
import { CHIPS_HERO } from "@/lib/homeConstants";
import { useSearchParams } from "next/navigation";

export default function HomeHero() {
  const searchParams = useSearchParams();
  const initialComunaSlug = searchParams.get("comuna") ?? null;

  return (
    <section className="max-w-7xl mx-auto px-4 pt-12 pb-10 text-center sm:pt-16 sm:pb-12 md:pt-20 md:pb-14 bg-gradient-to-b from-slate-50 to-white">
      <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
        Encuentra servicios en tu comuna en segundos
      </h1>
      <p className="mt-5 max-w-2xl mx-auto text-slate-600 text-base sm:text-lg sm:mt-6">
        Contacta directo por WhatsApp, sin intermediarios
      </p>
      <p className="mt-3 text-sm text-slate-500 sm:mt-4">
        Resultados reales en tu comuna
      </p>

      <div className="mt-10 sm:mt-12 md:mt-14 mx-auto w-full max-w-5xl rounded-2xl bg-slate-50 p-4 sm:p-6 md:p-8">
        <HomeSearchClient
          sugerencias={[...CHIPS_HERO]}
          initialComunaSlug={initialComunaSlug}
        />
      </div>
    </section>
  );
}
