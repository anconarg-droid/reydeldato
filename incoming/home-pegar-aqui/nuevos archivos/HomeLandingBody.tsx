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

type CategoriaHomeItem = {
  slug: string;
  nombre: string;
  emoji: string;
  ejemplosSub: Array<{ slug: string; label: string }>;
};

const COMUNAS_PREVIEW = 6;

type Props = {
  ultimosPublicadosCards: EmprendedorSearchCardProps[];
};

/** Categorías visibles: estado `categoriasHome` vía GET `/api/home/categorias-con-publicados` (no lista estática). */

export default function HomeLandingBody({ ultimosPublicadosCards }: Props) {
  const searchParams = useSearchParams();
  const contextComunaSlug = (searchParams.get("comuna") || "").trim().toLowerCase();

  const [comunas, setComunas] = useState<Comuna[]>([]);
  const [loadingComunas, setLoadingComunas] = useState(true);
  const [prep, setPrep] = useState<ComunaPreparacionItem[]>([]);
  const [loadingPrep, setLoadingPrep] = useState(true);
  const [categoriasHome, setCategoriasHome] = useState<CategoriaHomeItem[]>([]);
  const [loadingCategorias, setLoadingCategorias] = useState(true);

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
    setLoadingCategorias(true);
    fetch("/api/home/categorias-con-publicados")
      .then((res) => res.json())
      .then(
        (data: {
          ok?: boolean;
          items?: CategoriaHomeItem[];
        }) => {
          if (cancelled) return;
          if (data?.ok && Array.isArray(data.items)) {
            setCategoriasHome(
              data.items.filter(
                (x) => x && typeof x.slug === "string" && String(x.nombre || "").trim()
              )
            );
          } else {
            setCategoriasHome([]);
          }
        }
      )
      .catch(() => {
        if (!cancelled) setCategoriasHome([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingCategorias(false);
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
          // No listar comunas ya públicas (forzar_abierta o mínimos cumplidos): evita doble bloque con “con resultados”.
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

  return (
    <div className="pb-20 sm:pb-24">
      {/* 2) El problema */}
      <section className="border-t border-slate-100/80 bg-white" aria-labelledby="home-problema">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <p className="text-xs text-slate-500 mb-2">Esto pasa todos los días</p>
        <h2 id="home-problema" className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
          El problema
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-500 sm:text-base">
          Lo normal es perder tiempo.
        </p>
        <div className="mt-6 max-w-3xl space-y-5 text-slate-700 leading-relaxed text-sm sm:text-base">
          <p className="text-base sm:text-lg font-semibold text-slate-900">
            Cuando necesitas un servicio, pierdes tiempo
          </p>
          <div className="space-y-1 text-slate-700 whitespace-pre-line">
            {`Preguntas en WhatsApp
Postas en Facebook
Buscas en Google`}
          </div>
          <p className="font-medium text-slate-800">Y pasa lo mismo:</p>
          <ul className="list-disc space-y-2 pl-5 text-slate-700">
            <li>Datos antiguos</li>
            <li>Números equivocados</li>
            <li>Recomendaciones que no aplican a tu comuna</li>
          </ul>
        </div>

        <figure className="mt-12 sm:mt-14 mx-auto max-w-3xl rounded-2xl border border-teal-200/80 bg-teal-50 px-6 py-5 sm:px-8 sm:py-6">
          <blockquote className="text-center text-teal-900 text-base sm:text-lg leading-snug font-semibold tracking-tight">
            Hay mucha información, pero poca sirve.
          </blockquote>
        </figure>
        </div>
      </section>

      {/* 3) La solución */}
      <section className="border-t border-slate-100/80 bg-slate-50" aria-labelledby="home-solucion">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <h2 id="home-solucion" className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
          La solución
        </h2>
        <div className="mt-6 max-w-3xl space-y-4 text-slate-700 leading-relaxed">
          <p className="text-sm sm:text-base">
            Rey del Dato es una vitrina local: buscas por comuna, ves fichas claras y contactas directo por WhatsApp,
            sin intermediarios.
          </p>
          <p className="text-sm sm:text-base">
            Queremos ordenar servicios reales por comuna: lo local primero, con reglas transparentes para que la
            visibilidad sea justa — no un juego de “quien paga más”.
          </p>
          <p className="text-sm sm:text-base font-semibold text-teal-800 pt-1">
            Menos ruido. Más resultados reales. Así debería funcionar.
          </p>
        </div>
        </div>
      </section>

      {/* 4) Confianza / seriedad */}
      <section className="border-t border-slate-100/80 bg-white" aria-labelledby="home-plataforma-real">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="rounded-2xl border border-teal-200/80 bg-teal-50/60 py-12 px-6 sm:px-10 sm:py-14 shadow-sm">
          <div className="mx-auto w-full max-w-3xl text-center">
            <h2 id="home-plataforma-real" className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
              Una plataforma real
            </h2>
            <div className="mt-6 space-y-4 text-slate-700 text-sm sm:text-base leading-relaxed sm:leading-loose">
              <p className="leading-relaxed sm:leading-loose">
                Rey del Dato SpA es una empresa formal en Chile. Construimos un directorio útil, moderado y pensado para
                conectar vecinos con servicios reales.
              </p>
              <ul className="mt-4 list-disc space-y-3.5 pl-5 text-sm sm:text-base text-slate-700 text-left w-fit mx-auto leading-relaxed sm:leading-loose">
                <li>RUT: 78.403.835-1</li>
                <li>Publicaciones moderadas</li>
                <li>Contacto directo y sin intermediarios</li>
              </ul>
            </div>
          </div>
        </div>
        </div>
      </section>

      {/* 5) Cómo funciona */}
      <section className="border-t border-slate-100/80 bg-slate-50" aria-labelledby="home-como-funciona">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <h2 id="home-como-funciona" className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
          Cómo funciona
        </h2>
        <ol className="mt-8 grid grid-cols-1 gap-y-8 gap-x-6 sm:grid-cols-2 sm:gap-y-10 sm:gap-x-6">
          {[
            {
              n: "01",
              t: "Buscas en tu comuna",
              d: "Escribes lo que necesitas y partimos por resultados locales, no por “lo más popular en Chile”.",
            },
            {
              n: "02",
              t: "Revisas fichas claras",
              d: "Menos ruido: información útil para decidir rápido (y sin mil pasos intermedios).",
            },
            {
              n: "03",
              t: "Contactas por WhatsApp",
              d: "Hablas directo con el emprendedor. Sin comisiones escondidas por “puente”.",
            },
            {
              n: "04",
              t: "Si publicas, te encuentran cuando te necesitan",
              d: "Tu servicio queda disponible para vecinos que ya están buscando con intención.",
            },
          ].map((step) => (
            <li key={step.n} className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm transition-shadow duration-200 hover:shadow-md border-l-4 border-l-teal-500">
              <div className="text-xs font-semibold tracking-wide text-teal-700">{step.n}</div>
              <div className="mt-2 text-base font-semibold text-slate-900">{step.t}</div>
              <p className="mt-2 text-sm text-slate-700 leading-relaxed">{step.d}</p>
            </li>
          ))}
        </ol>
        </div>
      </section>

      {/* 6) La diferencia */}
      <section className="border-t border-slate-100/80 bg-white" aria-labelledby="home-diferencia">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <h2 id="home-diferencia" className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
          No gana el que paga más
        </h2>
        <p className="mt-6 max-w-3xl text-sm sm:text-base text-slate-700 leading-relaxed">
          En Rey del Dato creemos que los resultados deben depender de la búsqueda y la comuna, no del presupuesto.
        </p>

        <div className="mt-10 sm:mt-12 grid gap-4 sm:grid-cols-2">
          {[
            {
              t: "No cobramos por contacto",
              d: "Tu conversación es tuya: no te cobramos por clic, lead o mensaje.",
            },
            {
              t: "No retenemos pagos",
              d: "No somos pasarela: no guardamos ni intermediamos pagos entre vecino y emprendedor.",
            },
            {
              t: "Los resultados no se compran",
              d: "No es pay-to-rank: la intención de búsqueda y la comuna mandan, no el bolsillo.",
            },
            {
              t: "Las fichas rotan automáticamente",
              d: "No siempre aparece el mismo primero.\nTodos tienen oportunidad de ser vistos.",
            },
          ].map((x) => (
            <div key={x.t} className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm transition-shadow duration-200 hover:shadow-md border-l-4 border-l-teal-500">
              <div className="text-sm font-semibold text-teal-800">{x.t}</div>
              <p className="mt-2 text-sm text-slate-700 leading-relaxed whitespace-pre-line">{x.d}</p>
            </div>
          ))}
        </div>
        <p className="mt-12 sm:mt-14 text-center text-sm font-semibold text-teal-800">
          Esto no es publicidad. Es un directorio justo.
        </p>
        </div>
      </section>

      {/* 7) Últimos emprendimientos publicados */}
      <section className="border-t border-slate-100/80 bg-slate-50" aria-labelledby="home-ultimos-publicados-heading">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <HomeUltimosPublicadosClient cards={ultimosPublicadosCards} />
        </div>
      </section>

      {/* Exploración por categorías (bloque existente) */}
      <section className="border-t border-slate-100/80 bg-white" aria-labelledby="home-ejemplos">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="home-ejemplos" className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
              Explora cómo se ve un servicio real
            </h2>
            <p className="mt-3 max-w-2xl text-sm sm:text-base text-slate-500 leading-relaxed">
              Estas son fichas reales dentro del directorio. Así es como los usuarios te van a encontrar.
            </p>
          </div>
          <Link href="/comunas" className="text-sm font-semibold text-teal-800 underline underline-offset-4 hover:text-teal-900">
            Ver comunas
          </Link>
        </div>

        {!loadingCategorias && categoriasHome.length === 0 ? (
          <p className="mt-10 sm:mt-12 text-sm text-slate-600">
            Todavía estamos sumando categorías con fichas públicas. Si publicas, ayudas a que tu comuna tenga más
            ejemplos reales.
          </p>
        ) : (
          <div className="mt-10 sm:mt-12">
            {loadingCategorias ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-[120px] rounded-xl border border-slate-100 bg-slate-100/80 animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                {categoriasHome.map((cat) => (
                  <div
                    key={cat.slug}
                    className="rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 sm:p-3 flex flex-col shadow-sm transition-all duration-200 hover:border-teal-200 hover:bg-white hover:shadow-md"
                  >
                    <Link
                      href={`/buscar?categoria=${encodeURIComponent(cat.slug)}`}
                      className="block min-w-0 text-slate-600 transition hover:text-teal-800"
                    >
                      <div className="text-base opacity-75" aria-hidden>
                        {cat.emoji}
                      </div>
                      <div className="mt-0.5 font-medium text-sm text-slate-700 leading-tight">{cat.nombre}</div>
                      <span className="mt-1.5 inline-flex text-xs font-normal text-slate-500">
                        Ver categoría →
                      </span>
                    </Link>
                    <div className="mt-2 flex flex-wrap gap-1 border-t border-slate-100/80 pt-2">
                      {cat.ejemplosSub.map((sub) => (
                        <Link
                          key={sub.slug}
                          href={`/buscar?categoria=${encodeURIComponent(cat.slug)}&subcategoria=${encodeURIComponent(sub.slug)}`}
                          className="rounded-full bg-slate-100/80 px-2 py-0.5 text-[11px] font-normal text-slate-600 transition hover:bg-slate-200/80 hover:text-slate-800"
                        >
                          {sub.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        </div>
      </section>

      {/* 8) Enfoque local */}
      <section className="border-t border-slate-100/80 bg-slate-50" aria-labelledby="home-local">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <h2 id="home-local" className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
          Enfoque local
        </h2>
        <p className="mt-4 max-w-3xl text-sm sm:text-base text-slate-700 leading-relaxed">
          Estamos construyendo comuna por comuna: primero resultados reales, luego más categorías y más fichas. Si tu
          comuna está en preparación, igual puedes explorar y ayudar a completar el mapa.
        </p>

        <div className="mt-10">
          <h3 className="text-sm font-semibold text-slate-900">Comunas con resultados</h3>
          {loadingComunas ? (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-[180px] rounded-2xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : comunasCards.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-5 sm:p-6">
              <p className="text-sm text-slate-700 leading-relaxed">
                Aún no tenemos comunas abiertas con resultados visibles acá. Mientras tanto, busca tu comuna y revisa el
                estado de activación.
              </p>
              <div className="mt-4">
                <HomeComunaAutocomplete placeholder="Busca tu comuna…" />
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <HomeComunasAbiertasGrid items={comunasCards} />
              <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                <p className="text-sm font-medium text-slate-800">¿Tu comuna no aparece? Búscala aquí</p>
                <HomeComunaAutocomplete placeholder="Busca tu comuna…" />
              </div>
            </div>
          )}
        </div>

        {!loadingPrep && prep.length > 0 ? (
          <div className="mt-12">
            <HomeComunasPreparacion items={prep.slice(0, 6)} />
          </div>
        ) : null}
        </div>
      </section>

      {/* 9) Para emprendedores (CTA) */}
      <section className="border-t border-slate-100/80 bg-white" aria-labelledby="home-emprendedores">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <h2 id="home-emprendedores" className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
          Para emprendedores
        </h2>
        <p className="mt-4 max-w-3xl text-sm sm:text-base text-slate-700 leading-relaxed">
          Si haces un trabajo bien hecho, mereces aparecer cuando alguien lo busca en tu comuna. Publicar es gratis en
          esta etapa: necesitamos fichas claras para que el directorio sea útil desde el día uno.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href="/publicar"
            className="rd-btn-primary h-11 min-h-11 w-full px-6 sm:w-auto !py-0"
          >
            Publica tu emprendimiento
          </Link>
          <Link href="/informacion-util" className="text-sm font-semibold text-slate-700 hover:text-slate-900">
            Ver información útil →
          </Link>
        </div>
        </div>
      </section>

      {/* 10) Recomendar emprendimiento / cierre */}
      <section className="border-t border-slate-100/80 bg-slate-50" aria-labelledby="home-cierre">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <h2 id="home-cierre" className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
          La idea es simple
        </h2>
        <div className="mt-4 max-w-3xl space-y-3 text-sm sm:text-base text-slate-700 leading-relaxed">
          <p>Que cuando necesites algo, no tengas que preguntar, perder tiempo o equivocarte.</p>
          <p className="font-medium text-slate-900">Lo buscas. Lo encuentras. Lo contactas.</p>
          <p>Así debería funcionar.</p>
        </div>

        <div className="mt-10">
          <HomeRecomienda embedded />
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link href="/buscar" className="text-sm font-semibold text-slate-900 underline underline-offset-4">
            Ir a buscar
          </Link>
          <Link href="/publicar" className="text-sm font-semibold text-slate-900 underline underline-offset-4">
            Publicar
          </Link>
        </div>
        </div>
      </section>
    </div>
  );
}
