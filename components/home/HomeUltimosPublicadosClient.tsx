"use client";

import EmprendedorSearchCard, {
  type EmprendedorSearchCardProps,
} from "@/components/search/EmprendedorSearchCard";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { postClientAnalyticsEvent } from "@/lib/postClientAnalyticsEvent";

type Props = {
  cards: EmprendedorSearchCardProps[];
  /** Suma de negocios en comunas activas (API home); opcional. */
  totalNegociosActivos?: number | null;
};

/** Un paso de scroll: lento y suave (evita sensación de slider / banner). */
const SCROLL_STEP_DURATION_MS = 2800;

/** Silencio entre movimientos: ritmo sobrio. */
const PAUSE_BETWEEN_STEPS_MS = 15000;

/** Sin movimiento al cargar: no “ataca” al entrar. */
const INITIAL_IDLE_MS = 14000;

const RESUME_AFTER_INTERACTION_MS = 22000;

function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

export default function HomeUltimosPublicadosClient({
  cards,
  totalNegociosActivos = null,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [hoverPaused, setHoverPaused] = useState(false);
  const [interactPaused, setInteractPaused] = useState(false);
  const interactTimerRef = useRef<number | null>(null);
  const hoverPausedRef = useRef(false);
  const interactPausedRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const directionRef = useRef<1 | -1>(1);

  const [respectReducedMotion, setRespectReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setRespectReducedMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    hoverPausedRef.current = hoverPaused;
  }, [hoverPaused]);

  useEffect(() => {
    interactPausedRef.current = interactPaused;
  }, [interactPaused]);

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

  const cancelScrollAnimation = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const clearLoopTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const animateScrollTo = useCallback(
    (targetLeft: number): Promise<void> => {
      const el = scrollerRef.current;
      if (!el) return Promise.resolve();

      cancelScrollAnimation();
      const start = el.scrollLeft;
      const delta = targetLeft - start;
      if (Math.abs(delta) < 1) return Promise.resolve();

      return new Promise((resolve) => {
        const t0 = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - t0) / SCROLL_STEP_DURATION_MS);
          const e = easeInOutSine(t);
          el.scrollLeft = start + delta * e;
          if (t < 1) {
            rafRef.current = requestAnimationFrame(tick);
          } else {
            rafRef.current = null;
            resolve();
          }
        };
        rafRef.current = requestAnimationFrame(tick);
      });
    },
    [cancelScrollAnimation]
  );

  const animateScrollToRef = useRef(animateScrollTo);
  animateScrollToRef.current = animateScrollTo;

  useEffect(() => {
    if (cards.length <= 1 || respectReducedMotion) return;

    let cancelled = false;

    const schedule = (ms: number, fn: () => void) => {
      clearLoopTimer();
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        if (!cancelled) fn();
      }, ms);
    };

    const stepOnce = async () => {
      const el = scrollerRef.current;
      if (!el) return;

      const first = el.querySelector<HTMLElement>("[data-carousel-card]");
      if (!first) return;

      const styles = window.getComputedStyle(el);
      const gapRaw = styles.columnGap || styles.gap || "16px";
      const gap = Number.parseFloat(gapRaw) || 16;
      const stride = first.getBoundingClientRect().width + gap;
      const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);

      let dir = directionRef.current;
      let target = el.scrollLeft + dir * stride;

      if (dir === 1 && el.scrollLeft >= maxScroll - 2) {
        dir = -1;
        directionRef.current = -1;
        target = el.scrollLeft - stride;
      } else if (dir === -1 && el.scrollLeft <= 2) {
        dir = 1;
        directionRef.current = 1;
        target = el.scrollLeft + stride;
      }

      target = Math.max(0, Math.min(maxScroll, target));
      await animateScrollToRef.current(target);
    };

    const loop = () => {
      if (cancelled) return;

      if (hoverPausedRef.current || interactPausedRef.current) {
        schedule(400, loop);
        return;
      }

      void stepOnce().then(() => {
        if (cancelled) return;
        schedule(PAUSE_BETWEEN_STEPS_MS, loop);
      });
    };

    schedule(INITIAL_IDLE_MS, loop);

    return () => {
      cancelled = true;
      clearLoopTimer();
      cancelScrollAnimation();
    };
  }, [cancelScrollAnimation, cards.length, clearLoopTimer, respectReducedMotion]);

  useEffect(() => {
    if (hoverPaused || interactPaused) {
      cancelScrollAnimation();
    }
  }, [hoverPaused, interactPaused, cancelScrollAnimation]);

  const minNegocios = 31;
  const negociosLabel = Math.max(
    minNegocios,
    totalNegociosActivos != null && totalNegociosActivos > 0 ? totalNegociosActivos : 0
  );

  return (
    <div className="w-full py-2" aria-labelledby="home-ultimos-publicados-heading">
      <div className="mx-auto w-full max-w-5xl px-0">
        <h2
          id="home-ultimos-publicados-heading"
          className="text-center text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl md:text-3xl"
        >
          Más de {negociosLabel.toLocaleString("es-CL")} negocios ya están activos en tu comuna
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm font-medium leading-relaxed text-slate-600 sm:text-[15px]">
          Estos son algunos de los servicios disponibles
        </p>

        <div className="relative mt-8">
          <div
            ref={scrollerRef}
            className="home-carousel-scroll flex gap-4 overflow-x-auto overflow-y-hidden pb-3 pl-0.5 pr-1 pt-1 [-webkit-overflow-scrolling:touch]"
            role="list"
            aria-label="Emprendimientos publicados recientemente"
            onMouseEnter={() => setHoverPaused(true)}
            onMouseLeave={() => setHoverPaused(false)}
            onPointerDownCapture={bumpInteractionPause}
            onWheelCapture={bumpInteractionPause}
            onTouchStartCapture={bumpInteractionPause}
          >
            {cards.map((props) => (
              <div
                key={props.slug}
                data-carousel-card
                role="listitem"
                className="group w-[min(92vw,22rem)] shrink-0 transition-transform duration-200 ease-out will-change-transform hover:-translate-y-[2px]"
              >
                <div className="home-carousel-card-shell rounded-3xl border border-slate-200/80 bg-white p-1 shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition-[box-shadow,transform] duration-200 ease-out group-hover:shadow-[0_14px_34px_rgba(15,23,42,0.10)]">
                  <div className="relative">
                    <div className="pointer-events-none absolute left-3 top-3 z-10 inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[12px] font-semibold text-emerald-900">
                      Disponible ahora
                    </div>
                    <EmprendedorSearchCard {...props} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Indicación sutil de que hay más contenido a la derecha */}
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-14 bg-gradient-to-l from-white via-white/70 to-transparent"
            aria-hidden
          />
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
