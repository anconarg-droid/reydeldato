import { MapPin } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-card border-t border-border py-10">
      <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-1.5 font-bold text-base text-primary mb-1 font-sans">
            <MapPin className="w-4 h-4" />
            Rey del Dato
          </div>
          <p className="text-xs text-muted-foreground font-sans max-w-xs">
            El directorio de servicios locales más completo de Chile. Conectamos personas con negocios reales.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground font-sans">
          <a href="#" className="hover:text-foreground transition-colors">Publicar negocio</a>
          <a href="#" className="hover:text-foreground transition-colors">Categorías</a>
          <a href="#" className="hover:text-foreground transition-colors">Cómo funciona</a>
          <a href="#" className="hover:text-foreground transition-colors">Contacto</a>
        </nav>
      </div>
      <div className="max-w-6xl mx-auto px-4 mt-8 pt-6 border-t border-border text-xs text-muted-foreground font-sans">
        © {new Date().getFullYear()} Rey del Dato. Todos los derechos reservados.
      </div>
    </footer>
  )
}
