"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Comuna = {
  slug: string;
  nombre: string;
  total?: number;
};

export default function ComunasPage() {
  const [comunas, setComunas] = useState<Comuna[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

 useEffect(() => {
  async function loadComunas() {
    try {
      console.log("Cargando comunas...");

      const res = await fetch("/api/comunas/activas");
      const json = await res.json();

      console.log("Respuesta API:", json);

      if (json?.ok && Array.isArray(json.items)) {
        setComunas(json.items);
      } else {
        console.warn("No llegaron comunas");
        setComunas([]);
      }
    } catch (error) {
      console.error("Error cargando comunas:", error);
      setComunas([]);
    } finally {
      setLoading(false);
    }
  }

  loadComunas();
}, []);

  const filtered = comunas.filter((c) =>
    c.nombre.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-10">

        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-3xl font-black">
            Todas las comunas activas
          </h1>
          <p className="text-slate-600 mt-2">
            Explora los emprendimientos disponibles en cada comuna.
          </p>
        </div>

        {/* BUSCADOR */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Buscar comuna..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-12 px-4 rounded-xl border border-slate-300 focus:border-sky-500 outline-none"
          />
        </div>

        {/* LOADING */}
        {loading ? (
          <p className="text-slate-500">Cargando comunas...</p>
        ) : filtered.length === 0 ? (
          <p className="text-slate-500">
            No encontramos comunas con ese nombre.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map((comuna) => (
              <Link
                key={comuna.slug}
                href={`/${comuna.slug}`}
                className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:border-slate-300 transition"
              >
                <div className="font-bold text-base">
                  {comuna.nombre}
                </div>

                {typeof comuna.total === "number" && (
                  <div className="text-sm text-slate-500 mt-1">
                    {comuna.total} emprendimientos
                  </div>
                )}

                <div className="text-sm text-sky-700 mt-2 font-medium">
                  Explorar →
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}