"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";

/**
 * Clave localStorage alineada con el patrón histórico:
 * `{persistPrefix}:bloque-base-colapsado` | `:bloque-atienden-colapsado`
 * con `persistPrefix` p.ej. `abrir-comuna:maipu` o `resultados:maipu`.
 */
export function accordionCollapsedStorageKey(
  persistPrefix: string,
  which: "base" | "atienden"
): string {
  const mid = which === "base" ? "base" : "atienden";
  return `${persistPrefix}:bloque-${mid}-colapsado`;
}

function AccordionChevron({
  collapsed,
  iconClassName,
}: {
  collapsed: boolean;
  iconClassName: string;
}) {
  return (
    <svg
      className={`h-5 w-5 transition-transform duration-200 ease-out ${
        collapsed ? "-rotate-90" : "rotate-0"
      } ${iconClassName}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export type TerritorialAccordionBlockProps = {
  /** Bloque “local” (oscuro) vs cobertura / atienden (sección clara, misma jerarquía visual). */
  variant: "local" | "cobertura";
  /** Prefijo estable, p. ej. `abrir-comuna:slug` o `resultados:slug`. */
  persistPrefix: string;
  which: "base" | "atienden";
  /** Base para `id` de título y panel (único en la página). */
  instanceId: string;
  title: ReactNode;
  subtitle: string;
  children: ReactNode;
  className?: string;
  /**
   * Si no hay valor en `localStorage` para este bloque, se usa este estado inicial.
   * Ej.: `/abrir-comuna` — base abierto (`false`), atienden cerrado (`true`).
   */
  defaultCollapsed?: boolean;
};

/**
 * Barra acordeón full width: título + subtítulo + chevron; mismo patrón en búsqueda y abrir-comuna.
 */
export default function TerritorialAccordionBlock({
  variant,
  persistPrefix,
  which,
  instanceId,
  title,
  subtitle,
  children,
  className = "",
  defaultCollapsed = false,
}: TerritorialAccordionBlockProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  useEffect(() => {
    try {
      const k = accordionCollapsedStorageKey(persistPrefix, which);
      const v = localStorage.getItem(k);
      if (v === "1") setCollapsed(true);
      else if (v === "0") setCollapsed(false);
    } catch {
      /* ignore */
    }
  }, [persistPrefix, which]);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(
          accordionCollapsedStorageKey(persistPrefix, which),
          next ? "1" : "0"
        );
      } catch {
        /* ignore */
      }
      return next;
    });
  }, [persistPrefix, which]);

  const isLocal = variant === "local";
  const sectionClass = isLocal
    ? "w-full min-w-0 overflow-hidden rounded-2xl border border-slate-800/50 shadow-lg"
    : "w-full min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-lg border-l-4 border-l-teal-600";
  const buttonClass = isLocal
    ? "flex w-full min-h-[4.5rem] items-start gap-3 bg-slate-900 px-4 py-4 text-left transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 sm:min-h-0 sm:items-center sm:gap-4 sm:px-5 sm:py-5"
    : "flex w-full min-h-[4.5rem] items-start gap-3 border-b border-slate-200/90 bg-white px-4 py-4 text-left transition-colors hover:bg-slate-50/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/25 focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:min-h-0 sm:items-center sm:gap-4 sm:px-5 sm:py-5";
  const titleClass = isLocal
    ? "block text-base font-black leading-snug tracking-tight text-white sm:text-lg"
    : "block text-base font-black leading-snug tracking-tight text-slate-900 sm:text-lg";
  const subtitleClass = isLocal
    ? "mt-1.5 block text-sm font-medium leading-relaxed text-slate-300"
    : "mt-1.5 block text-sm font-medium leading-relaxed text-slate-500";
  const chevronWrapClass = isLocal
    ? "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 sm:mt-0"
    : "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900/10 sm:mt-0";
  const panelClass = isLocal
    ? "border-t border-slate-800/25 bg-gradient-to-b from-amber-50/90 to-amber-50/60 px-4 py-5 sm:px-6 sm:py-6"
    : "border-t border-slate-200/90 bg-white px-4 py-5 sm:px-6 sm:py-6";

  const btnId = `${instanceId}-titulo`;
  const panelId = `${instanceId}-panel`;

  return (
    <section className={`${sectionClass} ${className}`.trim()}>
      <button
        type="button"
        id={btnId}
        onClick={toggle}
        className={buttonClass}
        aria-expanded={!collapsed}
        aria-controls={panelId}
      >
        <span className="min-w-0 flex-1">
          <span className={titleClass}>{title}</span>
          <span className={subtitleClass}>{subtitle}</span>
        </span>
        <span className={chevronWrapClass} aria-hidden>
          <AccordionChevron
            collapsed={collapsed}
            iconClassName={isLocal ? "text-white" : "text-slate-800"}
          />
        </span>
      </button>
      <div
        id={panelId}
        className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
          collapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
        }`}
        aria-hidden={collapsed}
      >
        <div className="min-h-0 overflow-hidden">
          <div className={panelClass}>
            <div className="w-full min-w-0">{children}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
