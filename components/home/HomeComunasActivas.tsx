"use client";

import { prettyComunaSlug, COMUNAS_ACTIVAS_FALLBACK } from "@/lib/homeConstants";
import Link from "next/link";
import { useEffect, useState } from "react";

type Item = { slug: string; nombre: string; count: number };

export default function HomeComunasActivas() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/home/comunas-activas")
      .then((res) => res.json())
      .then((data: { ok?: boolean; items?: Item[] }) => {
        if (data?.ok && Array.isArray(data.items) && data.items.length > 0) {
          setItems(data.items);
        } else {
          setItems(
            COMUNAS_ACTIVAS_FALLBACK.map((c) => ({ slug: c.slug, nombre: c.nombre, count: 0 }))
          );
        }
      })
      .catch(() => {
        setItems(
          COMUNAS_ACTIVAS_FALLBACK.map((c) => ({ slug: c.slug, nombre: c.nombre, count: 0 }))
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const list = items.length ? items : COMUNAS_ACTIVAS_FALLBACK.map((c) => ({ ...c, count: 0 }));

  return (
    <section className="w-full">
      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-24 rounded-xl bg-slate-100 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {list.map((c) => (
            <Link
              key={c.slug}
              href={`/${encodeURIComponent(c.slug)}`}
              className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm hover:border-sky-300 hover:shadow-md transition flex flex-col"
            >
              <span className="font-semibold text-slate-900 text-sm sm:text-base">
                {c.nombre || prettyComunaSlug(c.slug)}
              </span>
              <span className="text-xs sm:text-sm text-slate-500 mt-1">
                {"count" in c && c.count > 0 ? `${c.count} emprendimientos` : "Explorar"}
              </span>
              <span className="mt-3 text-sky-700 text-xs sm:text-sm font-semibold">
                Explorar comuna →
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
