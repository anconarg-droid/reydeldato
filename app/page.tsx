import { Suspense } from "react";
import HomeHero from "@/components/home/HomeHero";
import HomeLandingBody from "@/components/home/HomeLandingBody";
import { loadUltimosEmprendimientosPublicadosHome } from "@/lib/loadUltimosEmprendimientosPublicadosHome";

export default async function HomePage() {
  const fromDb = await loadUltimosEmprendimientosPublicadosHome();
  const ultimosPublicadosCards = fromDb;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Suspense
        fallback={
          <div className="max-w-5xl mx-auto px-4 py-20 text-center text-slate-500 text-sm">
            Cargando buscador…
          </div>
        }
      >
        <HomeHero />
      </Suspense>
      <Suspense
        fallback={
          <div className="max-w-5xl mx-auto px-4 py-12 text-center text-slate-500 text-sm">
            Cargando…
          </div>
        }
      >
        <HomeLandingBody ultimosPublicadosCards={ultimosPublicadosCards} />
      </Suspense>
    </div>
  );
}
