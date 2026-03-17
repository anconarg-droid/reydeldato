"use client"

import { useEffect, useState } from "react"

export default function CategoriesGrid() {

  const [categorias, setCategorias] = useState<any[]>([])

  useEffect(() => {
    async function cargar() {
      try {
        const res = await fetch("/api/categorias")
        const data = await res.json()

        if (data?.items) {
          setCategorias(data.items)
        }
      } catch (e) {
        console.error(e)
      }
    }

    cargar()
  }, [])

  if (!categorias.length) {
    return <div>Cargando categorías...</div>
  }

  return (
    <div style={{
      display:"grid",
      gridTemplateColumns:"repeat(3,1fr)",
      gap:"12px"
    }}>
      {categorias.map(cat => (

        <a
          key={cat.slug}
          href={`/buscar?categoria=${cat.slug}`}
          style={{
            border:"1px solid #ddd",
            padding:"14px",
            borderRadius:"10px"
          }}
        >
          {cat.nombre}
        </a>

      ))}
    </div>
  )
}