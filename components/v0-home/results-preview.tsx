import { MapPin, MessageCircle } from "lucide-react"

const RESULTS = [
  {
    id: 1,
    name: "Gasfitería Ramos",
    comuna: "Providencia",
    category: "Hogar y construcción",
    description: "Reparación de cañerías, filtraciones y artefactos sanitarios. Urgencias 24/7.",
    phone: "+56912345678",
  },
  {
    id: 2,
    name: "Empanadas La Vega",
    comuna: "Santiago Centro",
    category: "Alimentación",
    description: "Empanadas de pino, queso y mariscos. Despacho a domicilio en Santiago centro.",
    phone: "+56923456789",
  },
  {
    id: 3,
    name: "Mecánica Don Jorge",
    comuna: "Maipú",
    category: "Automotriz",
    description: "Revisión técnica, cambio de aceite, frenos y suspensión. Todos los autos.",
    phone: "+56934567890",
  },
  {
    id: 4,
    name: "Salón Belleza Style",
    comuna: "Ñuñoa",
    category: "Belleza",
    description: "Cortes, tinturas, tratamientos capilares y uñas. Reserva online disponible.",
    phone: "+56945678901",
  },
  {
    id: 5,
    name: "Veterinaria Patitas",
    comuna: "Las Condes",
    category: "Mascotas",
    description: "Consultas, vacunas, peluquería y cirugías. Atención para perros y gatos.",
    phone: "+56956789012",
  },
  {
    id: 6,
    name: "Electricista Morales",
    comuna: "La Florida",
    category: "Reparaciones",
    description: "Instalaciones eléctricas domiciliarias, tableros y certificaciones SEC.",
    phone: "+56967890123",
  },
]

export function ResultsPreview() {
  return (
    <section className="bg-muted py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground font-sans">
            Negocios publicados
          </h2>
          <a href="#" className="text-sm text-primary font-medium hover:underline font-sans">
            Ver todos
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {RESULTS.map((result) => (
            <article
              key={result.id}
              className="bg-card rounded-xl border border-border p-5 flex flex-col gap-3 hover:shadow-md transition-shadow"
            >
              <div>
                <h3 className="font-semibold text-foreground text-base font-sans leading-tight">
                  {result.name}
                </h3>
                <span className="text-xs text-muted-foreground font-sans">{result.category}</span>
              </div>

              <div className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="text-xs font-sans">{result.comuna}</span>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed font-sans flex-1">
                {result.description}
              </p>

              <a
                href={`https://wa.me/${result.phone.replace(/\D/g, "")}?text=Hola, vi tu negocio en Rey del Dato`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-[#25D366] text-white text-sm font-semibold py-2.5 rounded-lg hover:opacity-90 transition-opacity font-sans"
              >
                <MessageCircle className="w-4 h-4" />
                Contactar por WhatsApp
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
