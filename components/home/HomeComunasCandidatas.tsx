"use client";

import { COMUNAS_CANDIDATAS_MOCK } from "@/lib/homeConstants";
import Link from "next/link";

export default function HomeComunasCandidatas() {
  return (
    <section className="max-w-6xl mx-auto px-4 py-10">
      <h2 className="text-xl font-bold text-slate-900 mb-2">
        ¿Quieres que Rey del Dato llegue a tu comuna?
      </h2>
      <p className="text-slate-600 text-sm mb-6 max-w-2xl">
        Estamos abriendo nuevas comunas. Ayúdanos recomendando emprendimientos locales y te
        avisamos cuando se abra tu zona.
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {COMUNAS_CANDIDATAS_MOCK.map((c) => (
          <div
            key={c.slug}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="font-semibold text-slate-900">{c.nombre}</div>
            <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-sky-500 rounded-full transition-all"
                style={{ width: `${c.progreso}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">{c.progreso}% en progreso</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                Quiero que llegue
              </span>
              <Link
                href="/comunas-por-abrir"
                className="inline-flex items-center px-3 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-medium hover:bg-sky-100"
              >
                Recomendar emprendimientos
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
