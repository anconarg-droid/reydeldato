import Link from "next/link";
import HomeHeader from "@/components/home/HomeHeader";
import HomeHero from "@/components/home/HomeHero";
import HomeRecomienda from "@/components/home/HomeRecomienda";
import HomeComunasActivas from "@/components/home/HomeComunasActivas";
import HomeCategoriasGrid from "@/components/home/HomeCategoriasGrid";
import { COMUNAS_ACTIVAS_FALLBACK } from "@/lib/homeConstants";

const PRINCIPAL_CATEGORIES = [
  {
    slug: "hogar_construccion",
    nombre: "Hogar y construcción",
    imagen: "/images/categorias/hogar-construccion.jpg",
    subcategorias: ["gasfiter", "electricista", "maestro-constructor"],
  },
  {
    slug: "vehiculos_automotriz",
    nombre: "Vehículos y automotriz",
    imagen: "/images/categorias/vehiculos-automotriz.jpg",
    subcategorias: ["mecanico", "lavado-de-autos", "neumaticos"],
  },
  {
    slug: "alimentacion",
    nombre: "Comida y abastecimiento",
    imagen: "/images/categorias/comida-abastecimiento.jpg",
    subcategorias: ["panaderia", "pasteleria", "delivery-comida"],
  },
  {
    slug: "salud_bienestar",
    nombre: "Salud y bienestar",
    imagen: "/images/categorias/salud-bienestar.jpg",
    subcategorias: ["kinesiologia", "psicologia", "terapias"],
  },
  {
    slug: "belleza_estetica",
    nombre: "Belleza",
    imagen: "/images/categorias/belleza.jpg",
    subcategorias: ["peluqueria", "manicure", "maquillaje"],
  },
  {
    slug: "eventos",
    nombre: "Eventos y celebraciones",
    imagen: "/images/categorias/eventos.jpg",
    subcategorias: ["banqueteria", "animacion", "arriendo-salones"],
  },
  {
    slug: "mascotas",
    nombre: "Mascotas",
    imagen: "/images/categorias/mascotas.jpg",
    subcategorias: ["veterinaria", "paseo-de-perros", "banos"],
  },
  {
    slug: "educacion_clases",
    nombre: "Educación y clases",
    imagen: "/images/categorias/educacion-clases.jpg",
    subcategorias: ["clases-particulares", "talleres", "refuerzo-escolar"],
  },
] as const;

/**
 * Home principal de Rey del Dato.
 * - Buscador principal (qué buscas + comuna)
 * - CTA Publicar emprendimiento
 * - Bloque Recomendar emprendedor
 * - Bloque pequeño Comunas más cerca de abrir (enlace a /cobertura)
 *
 * La página de apertura/cobertura de comuna está en /cobertura y /cobertura?comuna=slug
 */
export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <HomeHeader />

      <main className="max-w-6xl mx-auto px-4 py-10 sm:py-12 space-y-12 sm:space-y-14">
        {/* 1. Hero de búsqueda principal */}
        <section className="space-y-6">
          <HomeHero />

          {/* CTA Publicar emprendimiento, visible pero secundario al buscador */}
          <div className="flex justify-center">
            <Link
              href="/publicar"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-sky-600 text-white px-6 sm:px-8 py-3 text-sm sm:text-base font-semibold hover:bg-sky-700 transition-colors shadow-sm"
            >
              <span aria-hidden>🏪</span>
              Publica tu emprendimiento
            </Link>
          </div>
        </section>

        {/* 2. Explorar por comuna (comunas activas) */}
        <section aria-labelledby="home-explorar-comunas">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-6">
            <div className="flex items-baseline justify-between mb-4">
              <div>
                <h2
                  id="home-explorar-comunas"
                  className="text-xl sm:text-2xl font-bold text-slate-900"
                >
                  Explora por comuna
                </h2>
                <p className="mt-1 text-sm sm:text-base text-slate-600 max-w-2xl">
                  Rey del Dato ya está activo en estas comunas. Entra para ver los
                  emprendimientos publicados.
                </p>
              </div>
              <Link
                href="/cobertura"
                className="hidden sm:inline-flex text-sm font-medium text-sky-700 hover:text-sky-800"
              >
                Ver mapa de cobertura →
              </Link>
            </div>
            <HomeComunasActivas />
          </div>
        </section>

        {/* 3. Explorar por categorías principales */}
        <section aria-labelledby="home-explorar-categorias" className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-6">
            <div className="flex items-baseline justify-between mb-4">
              <div>
                <h2
                  id="home-explorar-categorias"
                  className="text-xl sm:text-2xl font-bold text-slate-900"
                >
                  Explora por categorías principales
                </h2>
                <p className="mt-1 text-sm sm:text-base text-slate-600 max-w-2xl">
                  Elige un rubro y explora ejemplos de servicios y subcategorías más buscados.
                </p>
              </div>
            </div>
            <HomeCategoriasGrid categorias={PRINCIPAL_CATEGORIES as any} />
          </div>
        </section>

        {/* 4. Formulario para recomendar emprendimientos */}
        <section aria-labelledby="home-recomienda">
          <div className="mb-4">
            <h2
              id="home-recomienda"
              className="text-xl sm:text-2xl font-bold text-slate-900"
            >
              Recomienda un emprendimiento de tu comuna
            </h2>
            <p className="mt-1 text-sm sm:text-base text-slate-600 max-w-2xl">
              Si conoces un emprendimiento que debería estar en Rey del Dato, cuéntanos y lo
              ayudamos a aparecer.
            </p>
          </div>
          <HomeRecomienda />
        </section>

        {/* 5. Comunas más cerca de abrir (bloque secundario) */}
        <section className="border-t border-slate-200 pt-8 sm:pt-10 max-w-3xl">
          <h2 className="text-base sm:text-lg font-semibold text-slate-900 mb-2">
            Comunas más cerca de abrir
          </h2>
          <p className="text-sm text-slate-600 mb-4">
            Mira dónde estamos por lanzar y ayuda a activar tu zona recomendando emprendimientos.
          </p>
          <div className="flex flex-wrap gap-2">
            {COMUNAS_ACTIVAS_FALLBACK.slice(0, 6).map((c) => (
              <Link
                key={c.slug}
                href={`/cobertura?comuna=${encodeURIComponent(c.slug)}`}
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs sm:text-sm font-medium text-slate-800 hover:bg-slate-50 hover:border-slate-300 transition-colors"
              >
                {c.nombre}
              </Link>
            ))}
            <Link
              href="/cobertura"
              className="inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-4 py-1.5 text-xs sm:text-sm font-semibold text-slate-800 hover:bg-slate-200 transition-colors"
            >
              Ver cobertura completa →
            </Link>
          </div>
        </section>
      </main>

      <footer className="mt-16 border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <p className="text-center text-sm text-slate-500">
            Rey del Dato — Impulsando el comercio local en Chile
          </p>
        </div>
      </footer>
    </div>
  );
}
