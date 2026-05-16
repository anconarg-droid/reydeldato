"use client";

import Link from "next/link";
import { MapPin, Scale, MessageCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import HomeRecomienda from "@/components/home/HomeRecomienda";
import HomeComunasAbiertasGrid, {
  type ComunaAbiertaItem,
} from "@/components/home/HomeComunasAbiertasGrid";
import HomeComunaAutocomplete from "@/components/home/HomeComunaAutocomplete";
import HomeComunasPreparacion, {
  type ComunaPreparacionItem,
} from "@/components/home/HomeComunasPreparacion";

type Comuna = { id: number; nombre: string; slug: string; total?: number };

const CAROUSEL_STRIDE = 272; /* 260px card + gap-3 */

function useHomeCarouselDots(itemCount: number) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const scroll = useCallback((dir: number) => {
    trackRef.current?.scrollBy({ left: dir * 280, behavior: "smooth" });
  }, []);
  useEffect(() => {
    const el = trackRef.current;
    if (!el || itemCount <= 0) return;
    const onScroll = () => {
      const max = Math.max(0, el.scrollWidth - el.clientWidth);
      let idx = Math.round(el.scrollLeft / CAROUSEL_STRIDE);
      if (max > 0 && el.scrollLeft >= max - 8) idx = itemCount - 1;
      setActiveIndex(Math.max(0, Math.min(itemCount - 1, idx)));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, [itemCount]);
  return { trackRef, activeIndex, scroll };
}

const COMO_FUNCIONA_STEPS = [
  { n: "01", t: "Buscas en tu comuna", d: "Ves negocios cercanos." },
  { n: "02", t: "Comparas opciones reales", d: "Revisas descripción y contacto." },
  { n: "03", t: "Hablas directo con el negocio", d: "WhatsApp, Instagram o llamada." },
] as const;

const LA_DIFERENCIA_ITEMS = [
  {
    icon: MapPin,
    t: "Mostramos lo que está en tu comuna",
    d: "Primero lo local. Si no alcanza, recién ahí aparece el resto.",
  },
  {
    icon: Scale,
    t: "Nadie compra su lugar",
    d: "La ficha completa mejora cómo se ve. No compra ranking.",
  },
  {
    icon: MessageCircle,
    t: "Contacto directo. Sin formularios",
    d: "Nombre, comuna y WhatsApp directo para decidir rápido.",
  },
] as const;

function HomeMobileComoFunciona() {
  return (
      <div className="md:hidden">
      <h2 className="text-sm font-semibold text-gray-900">Cómo funciona</h2>
      <ol className="mt-1.5 list-none space-y-1 p-0">
        {COMO_FUNCIONA_STEPS.map((step) => (
          <li
            key={step.n}
            className="rounded-lg border border-gray-200/90 bg-white px-2.5 py-1.5"
          >
            <div className="flex gap-2">
              <span className="text-lg font-semibold tabular-nums leading-none text-[#0F6E56]/38">
                {step.n}
              </span>
              <div className="min-w-0">
                <p className="text-[0.8125rem] font-semibold leading-snug text-gray-900">{step.t}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-gray-600">{step.d}</p>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function HomeMobileLaDiferencia() {
  const { trackRef, activeIndex, scroll } = useHomeCarouselDots(LA_DIFERENCIA_ITEMS.length);
  return (
    <div className="md:hidden">
      <div className="flex justify-between items-end mb-2">
        <div>
          <h2 className="text-xl font-medium text-gray-900">La diferencia</h2>
          <p className="text-xs text-gray-500 mt-0.5">Desliza para ver más →</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => scroll(-1)}
            className="w-9 h-9 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-700"
            aria-label="Anterior"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            className="w-9 h-9 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-700"
            aria-label="Siguiente"
          >
            ›
          </button>
        </div>
      </div>
      <div
        ref={trackRef}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2"
      >
        {LA_DIFERENCIA_ITEMS.map((x) => {
          const Icon = x.icon;
          return (
            <div
              key={x.t}
              className="flex-shrink-0 w-[260px] snap-start bg-white border border-gray-200 rounded-lg p-3"
            >
              <div className="w-8 h-8 bg-[#E1F5EE] text-[#0F6E56] rounded-lg flex items-center justify-center">
                <Icon className="w-3.5 h-3.5" strokeWidth={2} aria-hidden />
              </div>
              <h3 className="mt-2 text-sm font-semibold text-gray-900">{x.t}</h3>
              <p className="mt-1 text-xs text-gray-600 leading-snug">{x.d}</p>
            </div>
          );
        })}
      </div>
      <div className="flex gap-1.5 mt-3">
        {LA_DIFERENCIA_ITEMS.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              activeIndex === i ? "w-5 bg-[#0F6E56]" : "w-1.5 bg-gray-200"
            }`}
          />
        ))}
      </div>
      <p className="mt-3 text-center text-[11px] text-gray-500">
        Rey del Dato SpA · RUT 78.403.835-1
      </p>
    </div>
  );
}

function serviciosActivosLabel(count: number): string {
  if (count <= 0) return "Servicios sumándose hoy";
  if (count === 1) return "1 servicio activo hoy";
  return `${count} servicios activos hoy`;
}

function HomeMobileComunasDisponibles({ items }: { items: ComunaAbiertaItem[] }) {
  const router = useRouter();
  const { trackRef, activeIndex, scroll } = useHomeCarouselDots(items.length);
  return (
    <div className="md:hidden">
      <div className="flex justify-between items-end mb-3">
        <div>
          <h2 className="text-xl font-medium text-gray-900">Comunas disponibles</h2>
          <p className="text-xs text-gray-500 mt-0.5">Desliza para ver más →</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => scroll(-1)}
            className="w-9 h-9 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-700"
            aria-label="Anterior"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            className="w-9 h-9 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-700"
            aria-label="Siguiente"
          >
            ›
          </button>
        </div>
      </div>
      <div
        ref={trackRef}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2"
      >
        {items.map((c) => (
          <div
            key={c.slug}
            className="flex-shrink-0 w-[260px] snap-start bg-white border border-gray-200 rounded-xl p-4 flex flex-col"
          >
            <p className="text-[15px] font-bold leading-snug text-gray-900">
              <span aria-hidden className="mr-1">
                🔥
              </span>
              {c.nombre}
            </p>
            <p className="mt-2 text-xs font-medium text-gray-600">{serviciosActivosLabel(c.count)}</p>
            <button
              type="button"
              onClick={() => router.push(`/${encodeURIComponent(c.slug)}`)}
              className="mt-4 w-full rounded-lg bg-[#0F6E56] px-3 py-2.5 text-sm font-semibold text-white"
            >
              Ver servicios →
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 mt-3">
        {items.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              activeIndex === i ? "w-5 bg-[#0F6E56]" : "w-1.5 bg-gray-200"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default function HomeLandingBody() {
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const targetHash = "#home-como-funciona";

    function scrollToHash() {
      if (window.location.hash !== targetHash) return;
      // El elemento puede aparecer después (Suspense/hidratación), reintentar en el próximo frame.
      window.requestAnimationFrame(() => {
        document.getElementById("home-como-funciona")?.scrollIntoView({
          block: "start",
          behavior: "smooth",
        });
      });
    }

    scrollToHash();
    window.addEventListener("hashchange", scrollToHash);
    return () => window.removeEventListener("hashchange", scrollToHash);
  }, []);

  const comunasConResultados = comunas.filter(
    (c) => (Number(c.total || 0) || 0) > 0
  );
  const comunasCards: ComunaAbiertaItem[] = comunasConResultados.map((c) => ({
    slug: c.slug,
    nombre: c.nombre,
    count: Number(c.total || 0),
  }));

  return (
    <div className="pb-0">
      {/* 1 · Cómo funciona (fichas van en HomeHero tras “Tu negocio aparece…”) */}
      <section
        id="home-como-funciona"
        className="border-t border-slate-100 bg-white"
        aria-labelledby="home-como-funciona-heading"
      >
        <div className="mx-auto max-w-5xl px-4 py-2 sm:px-6 md:py-3">
          <HomeMobileComoFunciona />
          <div className="hidden md:block">
            <h2
              id="home-como-funciona-heading"
              className="text-[1.35rem] font-bold tracking-tight text-slate-900 sm:text-xl"
            >
              Cómo funciona
            </h2>
            <ol className="mt-1.5 grid list-none grid-cols-3 gap-2 p-0">
              {COMO_FUNCIONA_STEPS.map((step) => (
                <li
                  key={step.n}
                  className="flex h-full flex-col rounded-lg border border-slate-200/90 bg-white px-2 py-2.5 text-center shadow-sm"
                >
                  <span className="text-2xl font-medium tabular-nums leading-none text-[#0F6E56]/32 sm:text-[1.65rem]">
                    {step.n}
                  </span>
                  <p className="mt-1 text-[0.8125rem] font-semibold leading-snug text-slate-900">
                    {step.t}
                  </p>
                  <p className="mt-1 text-xs leading-snug text-slate-600">{step.d}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* 2 · La diferencia (único bloque — sin duplicar problema/solución) */}
      <section
        id="home-diferencia"
        className="border-t border-slate-100 bg-white"
        aria-labelledby="home-diferencia-heading"
      >
        <div className="mx-auto max-w-5xl px-4 py-3 sm:px-6 sm:py-4 md:py-5">
          <HomeMobileLaDiferencia />
          <div className="hidden md:block">
            <h2
              id="home-diferencia-heading"
              className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
            >
              La diferencia
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-snug text-slate-600">
              Orden local, contacto directo y reglas claras.
            </p>
            <div className="mt-2.5 grid grid-cols-3 gap-2">
              {LA_DIFERENCIA_ITEMS.map((x) => (
                <div
                  key={x.t}
                  className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-sm border-l-[3px] border-l-teal-600"
                >
                  <div className="text-xs font-bold leading-tight text-slate-900">{x.t}</div>
                  <p className="mt-1 text-xs leading-snug text-slate-600">{x.d}</p>
                </div>
              ))}
            </div>
            <p className="mt-2.5 text-center text-[11px] text-slate-500">
              Rey del Dato SpA · RUT 78.403.835-1
            </p>
          </div>
        </div>
      </section>

      {/* 3 · Comunas */}
      <section className="border-t border-slate-100 bg-slate-50/90" aria-labelledby="home-local">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-5 md:py-6">
          <h2
            id="home-local"
            className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
          >
            Comunas
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-snug text-slate-700">
            Algunas comunas ya tienen resultados. Otras están completando su catálogo.
          </p>
          {!loadingComunas && comunasCards.length > 0 ? (
            <p className="mt-2 text-xs font-semibold tabular-nums text-teal-900 sm:text-sm">
              {comunasCards.length}{" "}
              {comunasCards.length === 1
                ? "comuna abierta con resultados visibles"
                : "comunas abiertas con resultados visibles"}
            </p>
          ) : null}

          <div className="mt-3">
            <div className="md:hidden">
              {loadingComunas ? (
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-[128px] w-[250px] flex-shrink-0 animate-pulse rounded-lg bg-slate-100"
                    />
                  ))}
                </div>
              ) : comunasCards.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 sm:p-6">
                  <p className="text-sm leading-relaxed text-slate-700">
                    Aún no hay comunas con resultados listadas acá. Busca la tuya para ver el estado.
                  </p>
                  <div className="mt-3">
                    <HomeComunaAutocomplete placeholder="Busca tu comuna…" />
                  </div>
                </div>
              ) : (
                <>
                  <HomeMobileComunasDisponibles items={comunasCards} />
                  <div className="mt-4 flex flex-col items-start gap-2">
                    <p className="text-xs font-medium text-slate-800 sm:text-sm">¿Tu comuna no aparece?</p>
                    <HomeComunaAutocomplete placeholder="Busca tu comuna…" />
                  </div>
                </>
              )}
            </div>
            <div className="hidden md:block">
              <h3 className="mt-1 text-xs font-semibold text-slate-900 sm:text-sm">Con resultados</h3>
              {loadingComunas ? (
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-2 lg:grid-cols-3 lg:gap-2.5">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-[120px] animate-pulse rounded-lg bg-slate-100" />
                  ))}
                </div>
              ) : comunasCards.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white/80 p-5 sm:p-6">
                  <p className="text-sm leading-relaxed text-slate-700">
                    Aún no hay comunas con resultados listadas acá. Busca la tuya para ver el estado.
                  </p>
                  <div className="mt-3">
                    <HomeComunaAutocomplete placeholder="Busca tu comuna…" />
                  </div>
                </div>
              ) : (
                <div className="mt-3">
                  <HomeComunasAbiertasGrid items={comunasCards} />
                  <div className="mt-3 flex flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                    <p className="text-xs font-medium text-slate-800 sm:text-sm">¿Tu comuna no aparece?</p>
                    <HomeComunaAutocomplete placeholder="Busca tu comuna…" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 4 · Comunas en crecimiento */}
      {!loadingPrep && prep.length > 0 ? (
        <section className="border-t border-slate-100 bg-white">
          <div className="mx-auto max-w-5xl px-4 py-3 sm:px-6 sm:py-4 md:py-5">
            <HomeComunasPreparacion items={prep.slice(0, 6)} flush />
          </div>
        </section>
      ) : null}

      {/* 5 · Recomendar negocio */}
      <section className="border-t border-slate-100 bg-white" aria-labelledby="home-recomendar">
        <div className="mx-auto max-w-5xl px-4 py-3 sm:px-6 sm:py-4 md:py-5">
          <h2
            id="home-recomendar"
            className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl"
          >
            ¿Conoces un negocio local que debería estar aquí?
          </h2>
          <p className="mt-1.5 max-w-md text-sm leading-snug text-slate-600">
            Recomiéndalo y ayúdanos a completar el catálogo de tu comuna.
          </p>
          <div className="mx-auto mt-3 w-full max-w-md">
            <HomeRecomienda embedded embeddedCompact initialComunaSlug={contextComunaSlug} />
          </div>
        </div>
      </section>

      {/* 6 · CTA final (ancho completo) */}
      <section
        className="mt-0 w-full border-t border-teal-900/20 bg-[#0f766e] text-white"
        aria-labelledby="home-cta-final"
      >
        <div className="mx-auto max-w-5xl px-4 pt-3 pb-5 text-center sm:px-6 sm:pt-4 sm:pb-6">
          <p className="text-[10px] font-extrabold tracking-[0.18em] text-white/90 sm:text-xs">
            PARA EMPRENDEDORES
          </p>
          <h2 id="home-cta-final" className="mt-0.5 text-2xl font-black tracking-tight sm:text-3xl">
            Empieza gratis.
          </h2>
          <p className="mx-auto mt-1 max-w-xl text-sm font-semibold leading-snug text-white/95 sm:text-base">
            Tu próximo cliente puede estar cerca.
          </p>

          <div className="mt-2.5 flex flex-col items-center gap-0.5">
            <Link
              href="/publicar"
              className="inline-flex h-11 min-h-11 w-full max-w-sm items-center justify-center rounded-xl bg-white px-6 text-sm font-extrabold text-[#0f766e] shadow-md shadow-teal-900/25 transition hover:bg-teal-50 sm:text-base"
            >
              Publicar mi negocio
            </Link>
            <p className="text-[11px] font-semibold text-white/85 sm:text-xs">Publicar es gratis. La ficha completa es opcional.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
