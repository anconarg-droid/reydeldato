"use client"

import { useState } from "react"
import { Search, ChevronDown } from "lucide-react"

const COMUNAS = [
  "Tu comuna",
  "Santiago Centro",
  "Providencia",
  "Las Condes",
  "Ñuñoa",
  "Maipú",
  "La Florida",
  "Puente Alto",
  "San Miguel",
  "Vitacura",
  "Lo Barnechea",
  "Peñalolén",
  "Macul",
  "Renca",
  "Quilicura",
]

export function Hero() {
  const [query, setQuery] = useState("")
  const [comuna, setComuna] = useState("Tu comuna")
  const [showDropdown, setShowDropdown] = useState(false)

  return (
    <section
      className="py-16 md:py-24 px-4"
      style={{ backgroundColor: "var(--hero-bg)" }}
    >
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight text-balance font-sans mb-3">
          Encuentra servicios en tu comuna en segundos
        </h1>
        <p className="text-white/70 text-base md:text-lg mb-8 font-sans">
          Contacta directo por WhatsApp, sin intermediarios
        </p>

        {/* Search bar */}
        <div className="bg-card rounded-xl shadow-lg flex flex-col sm:flex-row overflow-visible">
          {/* Text input */}
          <div className="flex items-center gap-2 px-4 py-3 flex-1 border-b sm:border-b-0 sm:border-r border-border">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ej: gasfiter en Maipú, clases de matemáticas, fletes"
              className="flex-1 text-sm bg-transparent text-foreground placeholder:text-muted-foreground outline-none font-sans"
            />
          </div>

          {/* Location selector */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 px-4 py-3 text-sm text-foreground whitespace-nowrap w-full sm:w-44 font-sans border-b sm:border-b-0 sm:border-r border-border hover:bg-secondary transition-colors"
            >
              <span className="flex-1 text-left truncate">{comuna}</span>
              <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
            {showDropdown && (
              <ul className="absolute top-full left-0 right-0 z-50 bg-card border border-border rounded-b-xl shadow-lg max-h-56 overflow-y-auto mt-1 rounded-t-none">
                {COMUNAS.map((c) => (
                  <li key={c}>
                    <button
                      onClick={() => { setComuna(c); setShowDropdown(false) }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-secondary text-foreground font-sans"
                    >
                      {c}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Search button */}
          <button className="bg-primary text-primary-foreground font-semibold text-sm px-6 py-3 rounded-b-xl sm:rounded-b-none sm:rounded-r-xl hover:opacity-90 transition-opacity font-sans">
            Buscar
          </button>
        </div>

        <p className="text-white/50 text-xs mt-4 font-sans">
          Más de 8.000 servicios verificados en toda la Región Metropolitana
        </p>
      </div>
    </section>
  )
}
