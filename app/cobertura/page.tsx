import { PageContainer, EmptyStateBlock } from "@/components/ui"
import { Header } from "@/components/coverage/header"
import { CoverageBreadcrumb } from "@/components/coverage/coverage-breadcrumb"
import { ComunaHeroV0 } from "@/components/coverage/ComunaHeroV0"
import { MissingCategories } from "@/components/coverage/MissingCategories"
import { NearbyCommunes } from "@/components/coverage/NearbyCommunes"
import { CountryStats } from "@/components/coverage/CountryStats"
import { InviteBusinessSection } from "@/components/coverage/invite-business-section"
import { RegionSelector } from "@/components/coverage/region-selector"
import { ComunaSelector } from "@/components/coverage/comuna-selector"
import { TerritorialExpansion } from "@/components/coverage/territorial-expansion"
import { ClosestToOpenRanking } from "@/components/coverage/closest-to-open-ranking"
import { CitySection } from "@/components/coverage/city-section"
import { getCoverageData } from "@/lib/coverage-data"
import { getCommuneActivity, incrementCommuneActivity } from "@/lib/commune-activity"
import { Suspense } from "react"

type PageProps = {
  searchParams?: Promise<{ region?: string; comuna?: string }> | { region?: string; comuna?: string };
};

export default async function CoveragePage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  const regionSlug = typeof sp.region === "string" ? sp.region.trim() : null;
  const comunaSlug = typeof sp.comuna === "string" ? sp.comuna.trim() : null;
  const data = await getCoverageData(comunaSlug || null, regionSlug || null);

  const {
    selectedCity,
    categories,
    rankedCities,
    activeCities,
    openingCities,
    noCoverageCities,
    countryActive,
    countryTotal,
    regionName,
    currentRegionSlug,
    regionActive,
    regionTotal,
    regionEnApertura,
    regionSinCobertura,
    regionPorcentajeCobertura,
    expansionRegions,
    regionComunas,
    ofertaDisponible,
  } = data;

  let peopleHelping = 0;
  if (selectedCity?.slug) {
    const activity = await getCommuneActivity(selectedCity.slug);
    await incrementCommuneActivity(selectedCity.slug, "views");
    const realHelpers = (activity?.contributors ?? 0) + (activity?.invites ?? 0) + (activity?.shares ?? 0);
    peopleHelping = Math.max(3, realHelpers + 3);
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <Header />

      <PageContainer>
        <div className="flex flex-col gap-10 md:gap-12">
          <CoverageBreadcrumb
            regionSlug={currentRegionSlug ? String(currentRegionSlug) : null}
            regionName={regionName ? String(regionName) : null}
            comunaSlug={selectedCity?.slug ? String(selectedCity.slug) : null}
            comunaName={selectedCity?.name ? String(selectedCity.name) : null}
          />

          {selectedCity ? (
            <>
              {/* Selectores: región y comuna */}
              <div className="flex flex-wrap items-center gap-4">
                <Suspense fallback={<span className="text-sm text-[#6B7280]">Cargando…</span>}>
                  <RegionSelector regions={expansionRegions} currentRegionSlug={currentRegionSlug} />
                </Suspense>
                {currentRegionSlug && regionComunas.length > 0 && (
                  <Suspense fallback={null}>
                    <ComunaSelector
                      comunas={regionComunas}
                      currentComunaSlug={selectedCity.slug}
                      regionSlug={currentRegionSlug}
                    />
                  </Suspense>
                )}
              </div>

              {/* Diseño v0: Hero + Rubros + Comunas más cerca + Estado Chile */}
              <ComunaHeroV0
                cityName={selectedCity.name}
                region={selectedCity.region}
                comunaSlug={selectedCity.slug}
                registrados={selectedCity.businessCount}
                meta={selectedCity.businessGoal}
                peopleHelping={peopleHelping}
                isActive={selectedCity.isActive}
              />

              <MissingCategories
                cityName={selectedCity.name}
                citySlug={selectedCity.slug}
                categories={categories.map((c) => ({ name: c.name, registered: c.registered, goal: c.goal }))}
              />

              <NearbyCommunes
                comunas={[...openingCities]
                  .sort((a, b) => {
                    const progressA = a.businessGoal > 0 ? a.businessCount / a.businessGoal : 0;
                    const progressB = b.businessGoal > 0 ? b.businessCount / b.businessGoal : 0;
                    return progressB - progressA;
                  })
                  .slice(0, 6)
                  .map((c) => ({
                    name: c.name,
                    slug: c.slug,
                    registrados: c.businessCount,
                    meta: c.businessGoal,
                    regionSlug: currentRegionSlug || "",
                  }))}
              />

              <CountryStats comunasActivas={countryActive} totalComunas={countryTotal} />

              {typeof ofertaDisponible === "number" && ofertaDisponible > 0 && (
                <section className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-6">
                  <h2 className="text-lg font-semibold text-[#111827] mb-1">Oferta disponible en {selectedCity.name}</h2>
                  <p className="text-sm text-[#6B7280] mb-4">
                    {ofertaDisponible === 1
                      ? "1 negocio puede atender esta comuna (base en la comuna, cobertura o alcance regional/nacional)."
                      : `${ofertaDisponible} negocios pueden atender esta comuna (base en la comuna, cobertura o alcance regional/nacional).`}
                  </p>
                  <a
                    href={`/buscar?comuna=${encodeURIComponent(selectedCity.slug)}`}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#111827] px-4 py-2 text-sm font-medium text-white hover:bg-[#1E293B] transition-colors"
                  >
                    Ver emprendimientos
                  </a>
                </section>
              )}

              <section id="ayuda-abrir">
                <InviteBusinessSection cityName={selectedCity.name} citySlug={selectedCity.slug} />
              </section>
            </>
          ) : (
            <>
              <EmptyStateBlock
                title="Cobertura de Rey del Dato"
                description="Selecciona una comuna en el ranking para ver su avance y cómo ayudar a abrirla."
              />
              <div className="flex flex-wrap items-center gap-4">
                <Suspense fallback={<span className="text-sm text-[#6B7280]">Cargando…</span>}>
                  <RegionSelector regions={expansionRegions} currentRegionSlug={currentRegionSlug} />
                </Suspense>
                {currentRegionSlug && regionComunas.length > 0 && (
                  <Suspense fallback={null}>
                    <ComunaSelector
                      comunas={regionComunas}
                      currentComunaSlug={null}
                      regionSlug={currentRegionSlug}
                    />
                  </Suspense>
                )}
              </div>
              <TerritorialExpansion
                countryActive={countryActive}
                countryTotal={countryTotal}
                regionName={regionName}
                regionActive={regionActive}
                regionTotal={regionTotal}
                regions={expansionRegions}
              />
              {activeCities.length > 0 && (
                <CitySection
                  title={`Comunas activas${regionName ? ` en ${regionName}` : ""}`}
                  subtitle="Comunas que ya alcanzaron la meta de emprendimientos."
                  cities={activeCities}
                />
              )}
              <ClosestToOpenRanking cities={rankedCities} regionSlug={currentRegionSlug || null} />
              {openingCities.length > 0 && (
                <CitySection
                  title={`Comunas más cerca de abrir${regionName ? ` en ${regionName}` : ""}`}
                  subtitle="Elige una para ver su avance y cómo ayudar."
                  cities={openingCities}
                />
              )}
              {noCoverageCities.length > 0 && (
                <CitySection title="Otras comunas donde queremos llegar" cities={noCoverageCities} />
              )}
            </>
          )}
        </div>
      </PageContainer>

      <footer className="mt-16 border-t border-[#E5E7EB] bg-[#FFFFFF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-[#6B7280]">© 2026 Rey del Dato. Conectando comunidades locales.</p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-sm text-[#6B7280] hover:text-[#111827] transition-colors">Términos</a>
              <a href="#" className="text-sm text-[#6B7280] hover:text-[#111827] transition-colors">Privacidad</a>
              <a href="#" className="text-sm text-[#6B7280] hover:text-[#111827] transition-colors">Contacto</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
