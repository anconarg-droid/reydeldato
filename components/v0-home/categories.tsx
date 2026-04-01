import {
  Hammer,
  Wrench,
  Car,
  UtensilsCrossed,
  Scissors,
  PawPrint,
  ShoppingBag,
  Briefcase,
} from "lucide-react"

const CATEGORIES = [
  { label: "Hogar y construcción", icon: Hammer },
  { label: "Reparaciones", icon: Wrench },
  { label: "Automotriz", icon: Car },
  { label: "Alimentación", icon: UtensilsCrossed },
  { label: "Belleza", icon: Scissors },
  { label: "Mascotas", icon: PawPrint },
  { label: "Comercio", icon: ShoppingBag },
  { label: "Servicios", icon: Briefcase },
]

export function Categories() {
  return (
    <section className="max-w-6xl mx-auto px-4 py-12">
      <h2 className="text-xl font-bold text-foreground mb-6 font-sans">
        Explorar por categoría
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {CATEGORIES.map(({ label, icon: Icon }) => (
          <button
            key={label}
            className="flex flex-col items-center gap-2 p-4 bg-card rounded-xl border border-border hover:border-primary hover:shadow-sm transition-all group text-center"
          >
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-colors">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs font-medium text-foreground leading-tight font-sans">{label}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
