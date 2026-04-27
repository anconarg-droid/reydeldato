"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import HomeRecomienda from "@/components/home/HomeRecomienda";
import HomeComunasAbiertasGrid, {
  type ComunaAbiertaItem,
} from "@/components/home/HomeComunasAbiertasGrid";
import HomeComunaAutocomplete from "@/components/home/HomeComunaAutocomplete";
import HomeComunasPreparacion, {
  type ComunaPreparacionItem,
} from "@/components/home/HomeComunasPreparacion";
import HomeUltimosPublicadosClient from "@/components/home/HomeUltimosPublicadosClient";
import type { EmprendedorSearchCardProps } from "@/components/search/EmprendedorSearchCard";

type Comuna = { id: number; nombre: string; slug: string; total?: number };

const COMUNAS_PREVIEW = 6;

type Props = {
  ultimosPublicadosCards: EmprendedorSearchCardProps[];
};

const cardBase =
  "rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm transition-shadow hover:shadow-md";

export default function HomeLandingBody({ ultimosPublicadosCards }: Props) {
  const searchParams = useSearchParams();
  const contextComunaSlug = (searchParams.get("comuna") || "").trim().toLowerCase();

  const [comunas, setComunas] = useState<Comuna[]>([]);
  const [loadingComunas, setLoadingComunas] = useState(true);
  const [prep, setPrep] = useState<ComunaPreparacionItem[]>([]);
  const [loadingPrep, setLoadingPrep] = useState(true);

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
    const qs = contextComunaSlug
      ? `?comuna=${encodeURIComponent(contextComunaSlug)}`
      : "";
    fetch(`/api/comunas/estado${qs}`)
      .then((res) => res.json())
      .then((data: { ok?: boolean; items?: any[] }) => {
        if (cancelled) return;
        const items = Array.isArray(data?.items) ? data.items : [];
        const prepItems: ComunaPreparacionItem[] = items
          .filter(
            (x) =>
              Number(x?.porcentaje_apertura ?? 0) < 100 &&
              x?.comuna_publica_abierta !== true
          )
          .map((x) => {
            const tr = Number(x?.total_requerido ?? NaN);
            const tc = Number(x?.total_cumplido ?? NaN);
            return {
              slug: String(x.comuna_slug || "").trim(),
              nombre: String(x.comuna_nombre || "").trim(),
              porcentaje: Number(x.porcentaje_apertura || 0),
              total_requerido:
                Number.isFinite(tr) && tr > 0 ? Math.floor(tr) : null,
              total_cumplido:
                Number.isFinite(tc) && tc >= 0 ? Math.floor(tc) : null,
              faltantesTop: Array.isArray(x.faltantes)
                ? x.faltantes.slice(0, 3).map((f: any) => ({
                    subcategoria: String(f?.subcategoria || "").trim(),
                    faltan: Number(f?.faltan || 0),
                  }))
                : [],
            };
          })
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
  }, [contextComunaSlug]);

  const comunasCards: ComunaAbiertaItem[] = comunas
    .filter((c) => (Number(c.total || 0) || 0) > 0)
    .slice(0, COMUNAS_PREVIEW)
    .map((c) => ({
      slug: c.slug,
      nombre: c.nombre,
      count: Number(c.total || 0),
    }));

  const totalNegociosActivos = comunas.reduce((s, c) => s + (Number(c.total) || 0), 0);

  return (
    <div className="pb-0">
      {/* 1 · Cómo funciona */}
      <section
        className="border-t border-slate-100 bg-white"
        aria-labelledby="home-como-funciona"
      >
        <div className="mx-auto max-w-5xl px-4 pb-12 pt-16 sm:px-6 sm:pb-14 sm:pt-20">
          <h2
            id="home-como-funciona"
            className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
          >
            Cómo funciona
          </h2>
          <ol className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
            {[
              { n: "01", t: "Buscas en tu comuna", d: "Resultados locales primero." },
              { n: "02", t: "Eliges el servicio", d: "Información clara para decidir." },
              { n: "03", t: "Contactas por WhatsApp", d: "Directo, sin intermediarios." },
            ].map((step) => (
              <li key={step.n} className={cardBase}>
                <div className="text-[clamp(1.75rem,4vw,2.35rem)] font-black tabular-nums leading-none tracking-[-0.04em] text-teal-700">
                  {step.n}
                </div>
                <div className="mt-3 text-base font-bold text-slate-900">{step.t}</div>
                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-700">{step.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 2 · Cards reales (evidencia) */}
      <section
        className="border-t border-slate-100 bg-slate-50/90"
        aria-labelledby="home-ultimos-publicados-heading"
      >
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-16">
          <HomeUltimosPublicadosClient
            cards={ultimosPublicadosCards}
            totalNegociosActivos={totalNegociosActivos}
          />
        </div>
      </section>

      {/* 3 · La diferencia (único bloque — sin duplicar problema/solución) */}
      <section
        className="border-t border-slate-100 bg-white"
        aria-labelledby="home-diferencia-por-que home-diferencia"
      >
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-24">
          <p
            id="home-diferencia-por-que"
            className="text-sm font-semibold tracking-tight text-teal-700"
          >
            ¿Por qué es distinto?
          </p>
          <h2
            id="home-diferencia"
            className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
          >
            La diferencia
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
            Dejas de buscar en grupos. Encuentras todo en un solo lugar.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
            {[
              {
                t: "Sin grupos ni “manda dato”",
                d: "No más WhatsApp, Facebook ni pedir datos. Todo está ordenado y disponible.",
              },
              {
                t: "Resultados locales primero",
                d: "Lo más cercano a ti aparece antes. No compites con todo Chile.",
              },
              {
                t: "Contacto directo por WhatsApp",
                d: "Hablas directo con el negocio. Sin intermediarios ni comisiones ocultas.",
              },
              {
                t: "Fichas reales y completas",
                d: "Fotos, ubicación y servicios claros para decidir rápido.",
              },
            ].map((x) => (
              <div
                key={x.t}
                className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm border-l-[3px] border-l-teal-600 transition-shadow hover:shadow-md"
              >
                <div className="text-sm font-bold text-slate-900">{x.t}</div>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{x.d}</p>
              </div>
            ))}
          </div>
          <p className="mt-10 text-center text-xs text-slate-500">
            Rey del Dato SpA · RUT 78.403.835-1
          </p>
        </div>
      </section>

      {/* 4 · Comunas */}
      <section className="border-t border-slate-100 bg-slate-50/90" aria-labelledby="home-local">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-24">
          <h2
            id="home-local"
            className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
          >
            Comunas
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-700 sm:text-base">
            Sumamos fichas cada semana. Si la tuya está en preparación, igual puedes explorar.
          </p>

          <div className="mt-10">
            <h3 className="text-sm font-semibold text-slate-900">Con resultados</h3>
            {loadingComunas ? (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-[180px] animate-pulse rounded-2xl bg-slate-100" />
                ))}
              </div>
            ) : comunasCards.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white/80 p-5 sm:p-6">
                <p className="text-sm leading-relaxed text-slate-700">
                  Aún no hay comunas con resultados listadas acá. Busca la tuya para ver el estado.
                </p>
                <div className="mt-4">
                  <HomeComunaAutocomplete placeholder="Busca tu comuna…" />
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <HomeComunasAbiertasGrid items={comunasCards} />
                <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                  <p className="text-sm font-medium text-slate-800">¿Tu comuna no aparece?</p>
                  <HomeComunaAutocomplete placeholder="Busca tu comuna…" />
                </div>
              </div>
            )}
          </div>

          {!loadingPrep && prep.length > 0 ? (
            <div className="mt-14">
              <HomeComunasPreparacion items={prep.slice(0, 6)} />
            </div>
          ) : null}
        </div>
      </section>

      {/* 5 · CTA emprendedor + recomendar (ancho completo, alto contraste) */}
      <section
        className="mt-0 w-full border-t border-emerald-900/20 bg-[#059669] text-white"
        aria-labelledby="home-emprendedores"
      >
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
          <h2
            id="home-emprendedores"
            className="text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Para emprendedores
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-emerald-50 sm:text-lg">
            Si haces bien el trabajo, mereces aparecer cuando te buscan en tu comuna. Publicar es gratis en esta etapa.
          </p>
          <p className="mt-6 text-center text-sm font-semibold tracking-tight text-white sm:text-left sm:text-base">
            Empieza hoy. Es gratis.
          </p>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              href="/publicar"
              className="inline-flex h-12 min-h-12 w-full items-center justify-center rounded-xl bg-white px-8 text-base font-extrabold text-[#047857] shadow-lg transition hover:bg-emerald-50 sm:w-auto"
            >
              Publica tu emprendimiento
            </Link>
            <Link
              href="/informacion-util"
              className="text-center text-sm font-semibold text-white/95 underline underline-offset-4 hover:text-white sm:text-left"
            >
              Ver información útil
            </Link>
          </div>

          <HomeRecomienda embedded embeddedOnEmerald />

          <div className="mt-10 flex flex-wrap justify-center gap-6 text-sm font-semibold text-white/95 sm:justify-start">
            <Link href="/buscar" className="underline underline-offset-4 hover:text-white">
              Ir a buscar
            </Link>
            <Link href="/publicar" className="underline underline-offset-4 hover:text-white">
              Publicar
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
