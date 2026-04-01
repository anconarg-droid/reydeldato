import { MapPin } from "lucide-react"

export function Navbar() {
  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <a href="/" className="flex items-center gap-1.5 font-bold text-lg text-primary">
          <MapPin className="w-5 h-5" />
          <span className="font-sans">Rey del Dato</span>
        </a>
        <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground font-sans">
          <a href="#" className="hover:text-foreground transition-colors">Categorías</a>
          <a href="#" className="hover:text-foreground transition-colors">Cómo funciona</a>
          <a href="#" className="hover:text-foreground transition-colors">Publicar negocio</a>
        </nav>
        <a
          href="#"
          className="bg-primary text-primary-foreground text-sm font-medium px-4 py-1.5 rounded-md hover:opacity-90 transition-opacity font-sans"
        >
          Publicar gratis
        </a>
      </div>
    </header>
  )
}
