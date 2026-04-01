import { Suspense } from "react";
import HomeHeader from "@/components/home/HomeHeader";
import HomeHero from "@/components/home/HomeHero";
import HomeLandingBody from "@/components/home/HomeLandingBody";
import HomeFooter from "@/components/home/HomeFooter";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      <HomeHeader />
      <Suspense
        fallback={
          <div className="max-w-7xl mx-auto px-4 py-20 text-center text-slate-500 text-sm">
            Cargando buscador…
          </div>
        }
      >
        <HomeHero />
      </Suspense>
      <HomeLandingBody />
      <div className="flex-1 min-h-8" aria-hidden />
      <HomeFooter />
    </div>
  );
}
