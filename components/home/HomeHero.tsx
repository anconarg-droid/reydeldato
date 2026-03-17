"use client";

import HomeSearchClient from "@/app/HomeSearchClient";
import { CHIPS_HERO } from "@/lib/homeConstants";
import { useSearchParams } from "next/navigation";

export default function HomeHero() {
  const searchParams = useSearchParams();
  const initialComunaSlug = searchParams.get("comuna") ?? null;

  return (
    <section className="max-w-4xl mx-auto px-4 pt-10 pb-12 sm:pt-14 sm:pb-16 text-center">
      <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
        Encuentra emprendimientos locales en tu comuna
      </h1>
      <p className="mt-4 text-slate-600 text-base sm:text-lg">
        Escribe qué necesitas y elige tu comuna para descubrir negocios cercanos.
      </p>

      <div className="mt-8 sm:mt-10 flex justify-center">
        <HomeSearchClient
          sugerencias={[...CHIPS_HERO]}
          initialComunaSlug={initialComunaSlug}
        />
      </div>
    </section>
  );
}
