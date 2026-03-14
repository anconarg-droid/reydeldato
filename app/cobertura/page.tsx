import { Header } from "@/components/coverage/header"
import { CityHero } from "@/components/coverage/city-hero"
import { TerritorialExpansion } from "@/components/coverage/territorial-expansion"
import { RegionSummary } from "@/components/coverage/region-summary"
import { CategoriesNeeded } from "@/components/coverage/categories-needed"
import { CitySection } from "@/components/coverage/city-section"
import { CityRanking } from "@/components/coverage/city-ranking"

const selectedCity = {
  name: "Talagante",
  region: "Región Metropolitana",
  businessCount: 7,
  businessGoal: 50,
  missingCategories: ["panaderías", "gasfíteres", "mecánicos", "fletes"],
}

const categories = [
  { name: "Panadería", registered: 1, goal: 4 },
  { name: "Gasfíter", registered: 0, goal: 4 },
  { name: "Mecánico automotriz", registered: 0, goal: 4 },
  { name: "Veterinaria", registered: 0, goal: 1 },
  { name: "Peluquería", registered: 2, goal: 3 },
  { name: "Restaurant", registered: 3, goal: 5 },
  { name: "Ferretería", registered: 1, goal: 3 },
  { name: "Electricista", registered: 0, goal: 3 },
]

const openingCities = [
  { name: "Maipú", status: "opening" as const, businessCount: 41, businessGoal: 50 },
  { name: "Puente Alto", status: "opening" as const, businessCount: 38, businessGoal: 50 },
  { name: "Peñaflor", status: "opening" as const, businessCount: 32, businessGoal: 50 },
  { name: "San Bernardo", status: "opening" as const, businessCount: 28, businessGoal: 50 },
  { name: "Buin", status: "opening" as const, businessCount: 19, businessGoal: 50 },
]

const noCoverageCities = [
  { name: "Padre Hurtado", status: "no-coverage" as const, businessCount: 0, businessGoal: 50 },
  { name: "Calera de Tango", status: "no-coverage" as const, businessCount: 0, businessGoal: 50 },
  { name: "El Monte", status: "no-coverage" as const, businessCount: 0, businessGoal: 50 },
  { name: "Isla de Maipo", status: "no-coverage" as const, businessCount: 0, businessGoal: 50 },
  { name: "Quilicura", status: "no-coverage" as const, businessCount: 0, businessGoal: 50 },
  { name: "Melipilla", status: "no-coverage" as const, businessCount: 0, businessGoal: 50 },
]

const rankedCities = [
  { name: "Maipú", percentage: 82 },
  { name: "Puente Alto", percentage: 76 },
  { name: "Peñaflor", percentage: 64 },
  { name: "San Bernardo", percentage: 56 },
  { name: "Buin", percentage: 38 },
]

const expansionRegions = [
  { name: "Región Metropolitana", active: 6, total: 52 },
  { name: "Región de Valparaíso", active: 1, total: 38 },
  { name: "Región del Biobío", active: 0, total: 33 },
  { name: "Región de O'Higgins", active: 0, total: 33 },
  { name: "Región del Maule", active: 0, total: 30 },
  { name: "Región de Coquimbo", active: 0, total: 15 },
  { name: "Región de La Araucanía", active: 0, total: 32 },
  { name: "Región de Los Lagos", active: 0, total: 30 },
]

export default function CoveragePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8 md:py-12">
        <div className="space-y-12 md:space-y-16">
          {/* Hero Section */}
          <CityHero
            cityName={selectedCity.name}
            region={selectedCity.region}
            businessCount={selectedCity.businessCount}
            businessGoal={selectedCity.businessGoal}
            missingCategories={selectedCity.missingCategories}
          />

          {/* Expansión territorial */}
          <TerritorialExpansion
            countryActive={12}
            countryTotal={346}
            regionName="Región Metropolitana"
            regionActive={6}
            regionTotal={52}
            regions={expansionRegions}
          />

          {/* Region Summary + City Ranking */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <RegionSummary
                regionName="Región Metropolitana"
                activeCities={6}
                totalCities={52}
              />
              <CityRanking cities={rankedCities} />
            </div>
            <div className="lg:col-span-2">
              <CategoriesNeeded
                cityName={selectedCity.name}
                categories={categories}
              />
            </div>
          </div>

          {/* Cities Closest to Opening */}
          <CitySection
            label="Comunas mas cerca de abrir"
            title="Comunas más cerca de abrir en la Región Metropolitana"
            subtitle="Estas comunas ya tienen avance. Elige una para ver qué rubros faltan y cómo ayudar."
            cities={openingCities}
          />

          {/* Other Cities */}
          <CitySection
            title="Otras comunas donde queremos llegar"
            cities={noCoverageCities}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © 2026 Rey del Dato. Conectando comunidades locales.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Términos
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Privacidad
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Contacto
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
