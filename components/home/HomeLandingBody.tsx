"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import HomePublicarLazy from "@/components/home/HomePublicarLazy";
import HomeRecomienda from "@/components/home/HomeRecomienda";
import HomeComunasAbiertasGrid, {
  type ComunaAbiertaItem,
} from "@/components/home/HomeComunasAbiertasGrid";
import HomeComunaAutocomplete from "@/components/home/HomeComunaAutocomplete";
import HomeComunasPreparacion, {
  type ComunaPreparacionItem,
} from "@/components/home/HomeComunasPreparacion";

type Comuna = { id: number; nombre: string; slug: string; total?: number };

/** Nombres cortos para equilibrio visual en la grilla */
const CATEGORIAS_DESTACADAS = [
  { slug: "hogar-construccion", nombre: "Hogar", emoji: "🏠", ejemplos: ["Gasfiter", "Electricista"] },
  { slug: "automotriz", nombre: "Automotriz", emoji: "🚗", ejemplos: ["Mecánico", "Vulcanización"] },
  { slug: "mascotas", nombre: "Mascotas", emoji: "🐾", ejemplos: ["Veterinaria", "Peluquería canina"] },
  { slug: "alimentacion", nombre: "Alimentación", emoji: "🍞", ejemplos: ["Panadería", "Empanadas"] },
  { slug: "salud-bienestar", nombre: "Salud", emoji: "💚", ejemplos: ["Kinesiología", "Masajes"] },
  { slug: "eventos", nombre: "Eventos", emoji: "🎉", ejemplos: ["Banquetería", "Decoración"] },
  { slug: "belleza-estetica", nombre: "Belleza", emoji: "💇", ejemplos: ["Peluquería", "Uñas"] },
  { slug: "educacion-clases", nombre: "Servicios", emoji: "📚", ejemplos: ["Clases", "Tutorías"] },
] as const;

const COMUNAS_PREVIEW = 6;

export default function HomeLandingBody() {
  const [comunas, setComunas] = useState<Comuna[]>([]);
  const [loadingComunas, setLoadingComunas] = useState(true);
  const [prep, setPrep] = useState<ComunaPreparacionItem[]>([]);
  const [loadingPrep, setLoadingPrep] = useState(true);
  const [publicarOpen, setPublicarOpen] = useState(false);
  const [publicarMounted, setPublicarMounted] = useState(false);
  const publicarPanelRef = useRef<HTMLDivElement | null>(null);

  function openPublicar() {
    setPublicarMounted(true);
    setPublicarOpen(true);
    requestAnimationFrame(() => {
      publicarPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  useEffect(() => {
    let cancelled = false;
    setLoadingComunas(true);
    fetch("/api/home/comunas-activas")
      .then((res) => res.json())
      .then(
        (data: {
          ok?: boolean;
          items?: Array<{ slug: string; nombre: string; count: number }>;
        }) => {
          if (cancelled) return;
          if (data?.ok && Array.isArray(data.items)) {
            setComunas(
              data.items
                .map((x, idx) => ({
                  id: 100 + idx,
                  nombre: String(x.nombre || ""),
                  slug: String(x.slug || ""),
                  total:
                    typeof (x as any).count === "number"
                      ? (x as any).count
                      : Number((x as any).count || 0),
                }))
                .filter((x) => x.slug && x.nombre)
            );
          } else {
            setComunas([]);
          }
        }
      )
      .catch(() => {
        if (!cancelled) setComunas([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingComunas(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingPrep(true);
    fetch("/api/comunas/estado")
      .then((res) => res.json())
      .then((data: { ok?: boolean; items?: any[] }) => {
        if (cancelled) return;
        const items = Array.isArray(data?.items) ? data.items : [];
        const prepItems: ComunaPreparacionItem[] = items
          // No listar comunas ya públicas (forzar_abierta o mínimos cumplidos): evita doble bloque con “con resultados”.
          .filter(
            (x) =>
              Number(x?.porcentaje_apertura ?? 0) < 100 &&
              x?.comuna_publica_abierta !== true
          )
          .map((x) => ({
            slug: String(x.comuna_slug || "").trim(),
            nombre: String(x.comuna_nombre || "").trim(),
            porcentaje: Number(x.porcentaje_apertura || 0),
            faltantesTop: Array.isArray(x.faltantes)
              ? x.faltantes.slice(0, 3).map((f: any) => ({
                  subcategoria: String(f?.subcategoria || "").trim(),
                  faltan: Number(f?.faltan || 0),
                }))
              : [],
          }))
          .filter((x) => x.slug && Number.isFinite(x.porcentaje));
        setPrep(prepItems);
      })
      .catch(() => {
        if (!cancelled) setPrep([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingPrep(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const comunasCards: ComunaAbiertaItem[] = comunas
    .filter((c) => (Number(c.total || 0) || 0) > 0)
    .slice(0, COMUNAS_PREVIEW)
    .map((c) => ({
      slug: c.slug,
      nombre: c.nombre,
      count: Number(c.total || 0),
    }));

  return (
    <div className="max-w-7xl mx-auto px-4 pb-16 sm:pb-20">
      <section
        className="mt-6 sm:mt-10 border-t border-slate-100 pt-10 sm:pt-14"
        aria-labelledby="comunas-abiertas-heading"
      >
        <h2
          id="comunas-abiertas-heading"
          className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl"
        >
          Ya disponible
        </h2>

        {loadingComunas ? (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[180px] rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : comunasCards.length === 0 ? (
          <div className="mt-6">
            <p className="text-sm text-slate-600">Aún no hay comunas abiertas con resultados.</p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-slate-800">
                Busca tu comuna para ver si ya tiene resultados
              </p>
              <HomeComunaAutocomplete
                placeholder="Busca tu comuna…"
                containerClassName="relative w-full sm:w-56"
                inputClassName="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
          </div>
        ) : (
          <div className="mt-6">
            <HomeComunasAbiertasGrid items={comunasCards} />
            <div className="mt-8 flex flex-col gap-3 border-t border-slate-100 pt-8 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-slate-700">
                ¿Tu comuna no aparece? Búscala aquí
              </p>
              <HomeComunaAutocomplete
                placeholder="Busca tu comuna…"
                containerClassName="relative w-full sm:w-56"
                inputClassName="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
          </div>
        )}
      </section>

      {loadingPrep ? (
        <div className="mt-14 sm:mt-16 border-t border-slate-100 pt-10 sm:pt-12">
          <p className="text-sm text-slate-500">Cargando comunas en preparación…</p>
        </div>
      ) : (
        <HomeComunasPreparacion items={prep.slice(0, 6)} />
      )}

      <section
        className="mt-14 sm:mt-16 border-t border-slate-100 pt-10 sm:pt-12"
        aria-labelledby="categorias-heading"
      >
        <h2
          id="categorias-heading"
          className="text-base font-medium text-slate-500 sm:text-lg"
        >
          Explora por tipo de servicio
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          {CATEGORIAS_DESTACADAS.map((cat) => (
            <div
              key={cat.slug}
              className="rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 sm:p-3 flex flex-col transition hover:border-slate-200 hover:bg-white"
            >
              <Link
                href={`/buscar?categoria=${encodeURIComponent(cat.slug)}`}
                className="block min-w-0 text-slate-500 transition hover:text-slate-800"
              >
                <div className="text-base opacity-75" aria-hidden>
                  {cat.emoji}
                </div>
                <div className="mt-0.5 font-medium text-sm text-slate-600 leading-tight">
                  {cat.nombre}
                </div>
                <span className="mt-1.5 inline-flex text-xs font-normal text-slate-500">
                  Ver categoría →
                </span>
              </Link>
              <div className="mt-2 flex flex-wrap gap-1 border-t border-slate-100/80 pt-2">
                {cat.ejemplos.slice(0, 2).map((e) => (
                  <Link
                    key={e}
                    href={`/resultados?q=${encodeURIComponent(e)}`}
                    className="rounded-full bg-slate-100/80 px-2 py-0.5 text-[11px] font-normal text-slate-500 transition hover:bg-slate-200/80 hover:text-slate-700"
                  >
                    {e}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        className="mt-16 sm:mt-20 border-t border-slate-200 pt-14 sm:pt-16 pb-6 space-y-14 sm:space-y-16 text-center sm:text-left"
        aria-label="Publicar o recomendar"
      >
        <div ref={publicarPanelRef}>
          <h2 className="text-lg font-semibold text-slate-900 sm:text-xl max-w-xl leading-snug">
            Consigue clientes hoy. Publica gratis.
          </h2>
          <button
            type="button"
            onClick={() => (publicarOpen ? setPublicarOpen(false) : openPublicar())}
            className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white transition-colors duration-200 hover:bg-slate-800 w-full sm:w-auto"
          >
            {publicarOpen ? "Ocultar formulario de publicación" : "Publicar gratis"}
          </button>
          {!publicarOpen ? (
            <p className="mt-2 text-sm text-slate-500">Toma menos de 2 minutos</p>
          ) : null}
          {publicarMounted ? (
            <div className={publicarOpen ? "block" : "hidden"} aria-hidden={!publicarOpen}>
              <HomePublicarLazy />
            </div>
          ) : null}
        </div>

        <div>
          <HomeRecomienda embedded />
        </div>
      </section>
    </div>
  );
}
