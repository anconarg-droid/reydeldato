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

  return (
    <div className="w-full" aria-labelledby="home-ultimos-publicados-heading">
      <div className="mx-auto w-full max-w-5xl px-0">
        <p className="mx-auto mb-4 max-w-2xl text-center text-base font-bold leading-snug text-slate-900 sm:text-lg">
          Negocios reales ya publicados en tu comuna
        </p>
        {totalNegociosActivos != null && totalNegociosActivos > 0 ? (
          <p className="mx-auto mb-6 max-w-xl text-center text-sm font-medium text-slate-700">
            Más de{" "}
            <span className="tabular-nums font-bold text-slate-900">
              {totalNegociosActivos.toLocaleString("es-CL")}
            </span>{" "}
            negocios ya están activos
          </p>
        ) : null}
        <h2
          id="home-ultimos-publicados-heading"
          className="text-center text-lg font-semibold tracking-tight text-slate-900 sm:text-xl md:text-2xl"
        >
          Así se ven los servicios en tu comuna
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm leading-relaxed text-slate-600 sm:text-[15px]">
          Fichas reales que aparecen cuando alguien busca
        </p>

        <div
          ref={scrollerRef}
          className="mt-6 flex gap-4 overflow-x-auto overflow-y-hidden pb-2 pl-0.5 pt-0.5 [-webkit-overflow-scrolling:touch] scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent"
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
              className="w-[min(92vw,22rem)] shrink-0"
            >
              <EmprendedorSearchCard {...props} />
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-center">
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
            Si publicas, te encuentran cuando te necesitan en tu comuna
          </Link>
        </div>
      </div>
    </div>
  );
}
