import { Suspense } from "react";
import HomeHero from "@/components/home/HomeHero";
import HomeLandingBody from "@/components/home/HomeLandingBody";
import { HOME_ULTIMOS_PUBLICADOS_MOCK } from "@/lib/homeUltimosPublicadosMock";
import { loadUltimosEmprendimientosPublicadosHome } from "@/lib/loadUltimosEmprendimientosPublicadosHome";

export default async function HomePage() {
  const fromDb = await loadUltimosEmprendimientosPublicadosHome();
  const ultimosPublicadosCards =
    fromDb.length > 0 ? fromDb : HOME_ULTIMOS_PUBLICADOS_MOCK;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <div className="w-full border-b border-fuchsia-300 bg-fuchsia-50">
        <div className="max-w-5xl mx-auto px-4 py-2 text-center text-xs font-extrabold tracking-widest text-fuchsia-800">
          TEST HOME REAL
        </div>
      </div>
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
