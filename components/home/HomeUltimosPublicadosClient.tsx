"use client";

import EmprendedorSearchCard, {
  type EmprendedorSearchCardProps,
} from "@/components/search/EmprendedorSearchCard";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { postClientAnalyticsEvent } from "@/lib/postClientAnalyticsEvent";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  cards: EmprendedorSearchCardProps[];
  /** Suma de negocios en comunas activas (API home); opcional. */
  totalNegociosActivos?: number | null;
};

const AUTO_ADVANCE_MS = 3000;
const RESUME_AFTER_INTERACTION_MS = 6500;

export default function HomeUltimosPublicadosClient({
  cards,
  totalNegociosActivos = null,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [interactPaused, setInteractPaused] = useState(false);
  const [pageHidden, setPageHidden] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentIndexRef = useRef(0);
  const interactTimerRef = useRef<number | null>(null);
  const hoverPausedRef = useRef(false);
  const interactPausedRef = useRef(false);
  const pageHiddenRef = useRef(false);

  const [respectReducedMotion, setRespectReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setRespectReducedMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    hoverPausedRef.current = isHovered;
  }, [isHovered]);

  useEffect(() => {
    interactPausedRef.current = interactPaused;
  }, [interactPaused]);

  useEffect(() => {
    const apply = () => {
      const hidden = typeof document !== "undefined" && document.visibilityState !== "visible";
      setPageHidden(hidden);
    };
    apply();
    document.addEventListener("visibilitychange", apply);
    return () => document.removeEventListener("visibilitychange", apply);
  }, []);

  useEffect(() => {
    pageHiddenRef.current = pageHidden;
  }, [pageHidden]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  const clearInteractTimer = useCallback(() => {
    if (interactTimerRef.current) {
      window.clearTimeout(interactTimerRef.current);
      interactTimerRef.current = null;
    }
  }, []);

  const bumpInteractionPause = useCallback(() => {
    setInteractPaused(true);
    clearInteractTimer();
    interactTimerRef.current = window.setTimeout(() => {
      setInteractPaused(false);
      interactTimerRef.current = null;
    }, RESUME_AFTER_INTERACTION_MS);
  }, [clearInteractTimer]);

  /** Scroll horizontal para alinear el borde izquierdo de la tarjeta con la vista (evita errores por % del ancho y gap). */
  const scrollLeftToAlignCardStart = useCallback((scrollEl: HTMLElement, cardEl: HTMLElement): number => {
    return (
      scrollEl.scrollLeft +
      (cardEl.getBoundingClientRect().left - scrollEl.getBoundingClientRect().left)
    );
  }, []);

  const scrollToIndex = useCallback(
    async (idx: number) => {
      const el = scrollerRef.current;
      if (!el) return;
      const nodes = [...el.querySelectorAll<HTMLElement>("[data-carousel-card]")];
      const count = Math.max(1, nodes.length);
      const clamped = ((idx % count) + count) % count;
      const chosen = nodes[clamped];
      if (!chosen) return;
      const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
      const rawTarget = scrollLeftToAlignCardStart(el, chosen);
      const target = Math.max(0, Math.min(maxScroll, rawTarget));
      el.scrollTo({
        left: target,
        behavior: respectReducedMotion ? "auto" : "smooth",
      });
      setCurrentIndex(clamped);
    },
    [respectReducedMotion, scrollLeftToAlignCardStart],
  );

  const slideCount = Math.min(10, cards.length);

  const goPrev = useCallback(() => {
    if (slideCount <= 1) return;
    bumpInteractionPause();
    const next = (currentIndex - 1 + slideCount) % slideCount;
    void scrollToIndex(next);
  }, [bumpInteractionPause, currentIndex, scrollToIndex, slideCount]);

  const goNext = useCallback(() => {
    if (slideCount <= 1) return;
    bumpInteractionPause();
    const next = (currentIndex + 1) % slideCount;
    void scrollToIndex(next);
  }, [bumpInteractionPause, currentIndex, scrollToIndex, slideCount]);

  useEffect(() => {
    if (respectReducedMotion) return;
    if (pageHidden) return;
    if (interactPaused) return;
    if (isHovered) return;
    if (slideCount <= 1) return;

    const interval = window.setInterval(() => {
      const next = (currentIndexRef.current + 1) % slideCount;
      void scrollToIndex(next);
    }, AUTO_ADVANCE_MS);

    return () => window.clearInterval(interval);
  }, [
    slideCount,
    isHovered,
    interactPaused,
    pageHidden,
    respectReducedMotion,
    scrollToIndex,
  ]);

  const minNegocios = 31;
  const negociosLabel = Math.max(
    minNegocios,
    totalNegociosActivos != null && totalNegociosActivos > 0 ? totalNegociosActivos : 0
  );
  const previewCards = cards.slice(0, 10);
  const multiSlide = previewCards.length > 1;

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let raf = 0;
    const syncFromScrollLeft = () => {
      const cards = [...el.querySelectorAll<HTMLElement>("[data-carousel-card]")];
      const n = cards.length;
      if (n <= 1) return;
      const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
      let best = 0;
      let bestDist = Infinity;
      for (let i = 0; i < n; i++) {
        const idealLeft = scrollLeftToAlignCardStart(el, cards[i]);
        const clampedIdeal = Math.max(0, Math.min(maxScroll, idealLeft));
        const dist = Math.abs(el.scrollLeft - clampedIdeal);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      }
      setCurrentIndex(best);
    };
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        syncFromScrollLeft();
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      el.removeEventListener("scroll", onScroll);
    };
  }, [scrollLeftToAlignCardStart]);

  return (
    <div className="w-full py-0" aria-labelledby="home-ultimos-publicados-heading">
      <div className="mx-auto w-full max-w-5xl px-0">
        <h2
          id="home-ultimos-publicados-heading"
          className="text-center text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl md:text-3xl"
        >
          Más de {negociosLabel.toLocaleString("es-CL")} negocios ya están publicados
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm font-medium leading-relaxed text-slate-600 sm:text-[15px]">
          Algunos de los últimos en publicarse o actualizarse; deslizá o usá los botones para ver más.
        </p>

        <div
          {...(multiSlide
            ? {
                onMouseEnter: () => setIsHovered(true),
                onMouseLeave: () => setIsHovered(false),
              }
            : {})}
        >
          <div className="relative mt-5">
            {multiSlide ? (
              <>
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    goPrev();
                  }}
                  onClick={goPrev}
                  className="pointer-events-auto absolute left-2 top-1/2 z-20 hidden size-11 -translate-y-1/2 touch-manipulation items-center justify-center rounded-full border-2 border-teal-600 bg-white shadow-lg hover:bg-teal-50 md:inline-flex"
                  aria-label="Anterior"
                >
                  <ChevronLeft className="size-6 text-teal-800" aria-hidden />
                </button>
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    goNext();
                  }}
                  onClick={goNext}
                  className="pointer-events-auto absolute right-2 top-1/2 z-20 hidden size-11 -translate-y-1/2 touch-manipulation items-center justify-center rounded-full border-2 border-teal-600 bg-white shadow-lg hover:bg-teal-50 md:inline-flex"
                  aria-label="Siguiente"
                >
                  <ChevronRight className="size-6 text-teal-800" aria-hidden />
                </button>
              </>
            ) : null}
            <div
              ref={scrollerRef}
              className="home-carousel-scroll flex flex-nowrap gap-4 overflow-x-auto overflow-y-hidden scroll-smooth snap-x snap-mandatory pb-3 pl-0.5 pr-6 pt-1 [-webkit-overflow-scrolling:touch] md:gap-5 lg:gap-6 lg:pr-0 focus:outline-none"
              role="list"
              aria-label="Emprendimientos publicados recientemente"
              tabIndex={0}
              onPointerDownCapture={bumpInteractionPause}
              onWheelCapture={bumpInteractionPause}
              onTouchStartCapture={bumpInteractionPause}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") {
                  e.preventDefault();
                  goNext();
                }
                if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  goPrev();
                }
              }}
            >
              {previewCards.map((props) => (
                <div
                  key={props.slug}
                  data-carousel-card
                  role="listitem"
                  className="group shrink-0 snap-start transition-transform duration-200 ease-out will-change-transform hover:-translate-y-[2px] w-[min(92vw,22rem)] md:w-[calc((100%-1.25rem)/2)] lg:w-[calc((100%-3rem)/3)]"
                >
                  <div className="home-carousel-card-shell flex h-full min-h-[520px] flex-col rounded-3xl border border-slate-200/80 bg-white p-1 shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition-[box-shadow,transform] duration-200 ease-out group-hover:shadow-[0_14px_34px_rgba(15,23,42,0.10)]">
                    <div className="relative">
                      <div className="pointer-events-none absolute left-3 top-3 z-10 inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[12px] font-semibold text-emerald-900">
                        Disponible ahora
                      </div>
                      <EmprendedorSearchCard {...props} homeCarousel />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {multiSlide ? (
              <div
                className="pointer-events-none absolute inset-y-0 right-0 w-14 bg-gradient-to-l from-white via-white/70 to-transparent"
                aria-hidden
              />
            ) : null}
          </div>

          {multiSlide ? (
            <div className="mt-4 flex items-center justify-center gap-3 md:hidden">
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  goPrev();
                }}
                onClick={goPrev}
                className="inline-flex h-11 min-w-[7.5rem] touch-manipulation items-center justify-center gap-1 rounded-full border-2 border-teal-600 bg-white px-4 text-sm font-semibold text-teal-900 shadow-md active:bg-teal-50"
                aria-label="Anterior"
              >
                <ChevronLeft className="size-5 shrink-0" aria-hidden />
                Anterior
              </button>
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  goNext();
                }}
                onClick={goNext}
                className="inline-flex h-11 min-w-[7.5rem] touch-manipulation items-center justify-center gap-1 rounded-full border-2 border-teal-600 bg-white px-4 text-sm font-semibold text-teal-900 shadow-md active:bg-teal-50"
                aria-label="Siguiente"
              >
                Siguiente
                <ChevronRight className="size-5 shrink-0" aria-hidden />
              </button>
            </div>
          ) : null}

          {multiSlide ? (
            <div
              className="mt-4 flex items-center justify-center gap-2 md:mt-5"
              role="tablist"
              aria-label="Posición del carrusel"
            >
              {previewCards.map((_, i) => (
                <button
                  key={`dot-${i}`}
                  type="button"
                  onClick={() => {
                    bumpInteractionPause();
                    void scrollToIndex(i);
                  }}
                  className={[
                    "h-2 w-2 rounded-full transition-colors",
                    i === currentIndex ? "bg-teal-700" : "bg-slate-300 hover:bg-slate-400",
                  ].join(" ")}
                  aria-label={`Ir al elemento ${i + 1} de ${previewCards.length}`}
                  aria-current={i === currentIndex ? "true" : undefined}
                />
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-8 flex justify-center">
          <Link
            href="/publicar"
            onClick={() =>
              postClientAnalyticsEvent({
                event_type: "cta_publicar_click",
                metadata: { source: "home" },
              })
            }
            className="inline-flex h-10 min-w-[min(100%,17rem)] items-center justify-center rounded-lg border border-slate-200 bg-white px-5 text-sm font-medium text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 sm:h-11"
          >
            Publica tu negocio gratis
          </Link>
        </div>
      </div>
    </div>
  );
}
