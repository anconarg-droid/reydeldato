"use client";

import { SECTORES_HOME } from "@/lib/homeConstants";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function HomeExplorarRubros() {
  const searchParams = useSearchParams();
  const comuna = searchParams.get("comuna") ?? "";

  return (
    <section className="max-w-6xl mx-auto px-4 py-10">
      <h2 className="text-xl font-bold text-slate-900 mb-4">Explorar por rubros</h2>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
        {SECTORES_HOME.map((s) => {
          const params = new URLSearchParams();
          params.set("sector", s.slug);
          if (comuna) params.set("comuna", comuna);
          return (
            <Link
              key={s.slug}
              href={`/buscar?${params.toString()}`}
              className="flex-shrink-0 w-40 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-sky-200 hover:shadow-md transition text-center"
            >
              <span className="font-semibold text-slate-900 text-sm block line-clamp-2">
                {s.label}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
