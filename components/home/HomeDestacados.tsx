"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Item = {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string;
  foto: string;
  comuna: string;
  categoria?: string;
};

export default function HomeDestacados() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/home/destacados")
      .then((res) => res.json())
      .then((data: { ok?: boolean; items?: Item[] }) => {
        if (data?.ok && Array.isArray(data.items)) setItems(data.items);
        else setItems([]);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="max-w-6xl mx-auto px-4 py-10">
      <h2 className="text-xl font-bold text-slate-900 mb-4">
        Emprendimientos destacados cerca de ti
      </h2>
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl bg-slate-100 animate-pulse aspect-[3/4]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {items.slice(0, 8).map((item) => (
            <Link
              key={item.id || item.slug}
              href={`/emprendedor/${encodeURIComponent(item.slug)}`}
              className="card-hover-effect rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:border-sky-200 transition flex flex-col"
            >
              <div className="aspect-video bg-slate-100 relative overflow-hidden">
                {item.foto ? (
                  <img
                    src={item.foto}
                    alt=""
                    className="w-full h-full object-cover card-img-zoom"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl text-slate-300">
                    🏪
                  </div>
                )}
              </div>
              <div className="p-4 flex-1 flex flex-col min-h-0">
                <h3 className="font-semibold text-slate-900 line-clamp-2">{item.nombre}</h3>
                {item.comuna && (
                  <p className="text-xs text-slate-500 mt-1">📍 {item.comuna}</p>
                )}
                {item.categoria && (
                  <p className="text-xs text-slate-500">{item.categoria}</p>
                )}
                <p className="text-sm text-slate-600 line-clamp-2 mt-2 flex-1">
                  {item.descripcion || "Sin descripción"}
                </p>
                <span className="mt-3 inline-flex items-center text-sm font-semibold text-sky-600">
                  Ver detalles →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
      {!loading && items.length === 0 && (
        <p className="text-slate-500 text-sm">Pronto verás emprendimientos destacados aquí.</p>
      )}
    </section>
  );
}
